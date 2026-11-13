<script setup lang="ts">
/**
 * The hero's background character field (hybrid extent: full section width,
 * fading in just below the subhead). Mounted by Hero.astro as its own island,
 * behind everything in the hero section. HeroGraph tells it where to ripple by
 * dispatching RIPPLE_EVENT on window — the two islands share no Vue state.
 *
 * Drawing is incremental: the canvas itself holds the resting field, and each
 * frame only the cells the model reports as dirty are cleared and redrawn. The
 * rAF loop runs only while a ripple is active, so at idle this costs nothing.
 *
 * See docs/superpowers/specs/2026-11-13-hero-ripple-field-design.md.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import {
  CELL_H,
  CELL_W,
  createRippleField,
  RIPPLE_EVENT,
  RIPPLE_PARAMS,
  type RippleEventDetail,
  type RippleField,
} from './rippleField';

/** Gap (px) kept clear between the subhead and where the field starts fading in. */
const TOP_GAP_PX = 8;
/** Cap the backing-store scale so 3× phones don't allocate huge canvases. */
const MAX_DPR = 2;
/** Glyph colour, matching --color-accent-green (#3ea86b). Opacity is applied per cell. */
const GLYPH_RGB = '62, 168, 107';
const FONT = '12px "JetBrains Mono", monospace';

const canvasRef = ref<HTMLCanvasElement | null>(null);
/**
 * CSS box for the canvas, in px: from just below the subhead to the bottom of
 * the section. Set explicitly — a canvas is a replaced element, so with `top`
 * and `bottom` alone it would size itself from its (DPR-scaled) backing store.
 */
const box = ref({ top: 0, width: 0, height: 0 });

let field: RippleField | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let rafId: number | null = null;
let lastFrame = 0;
let reducedMotion = false;

/** Draw one cell at its current glyph and brightness (clearing it first). */
function drawCell(i: number) {
  if (!ctx || !field) return;
  const col = i % field.cols;
  const row = Math.floor(i / field.cols);
  const x = col * CELL_W;
  const y = row * CELL_H;
  const { restOpacity, peakOpacity } = RIPPLE_PARAMS;
  const alpha = restOpacity + (peakOpacity - restOpacity) * field.intensityAt(i);
  ctx.clearRect(x, y, CELL_W, CELL_H);
  ctx.fillStyle = `rgba(${GLYPH_RGB}, ${alpha})`;
  ctx.fillText(field.glyphAt(i), x, y + 2);
}

/** Redraw the whole field (first paint, resize, font load). */
function drawAll() {
  if (!ctx || !field || !canvasRef.value) return;
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
  for (let i = 0; i < field.cols * field.rows; i++) drawCell(i);
}

/**
 * Size the canvas to the area below the subhead and (re)build the grid to
 * match. The section is `relative`, so `top` is measured from its top edge.
 */
function layout() {
  const canvas = canvasRef.value;
  // closest(), not parentElement: Astro wraps islands in an <astro-island> element.
  const section = canvas?.closest('section');
  if (!canvas || !section) return;

  const sectionRect = section.getBoundingClientRect();
  const subhead = section.querySelector('[data-hero-subhead]');
  const top = subhead ? subhead.getBoundingClientRect().bottom - sectionRect.top + TOP_GAP_PX : 0;

  const w = sectionRect.width;
  const h = Math.max(0, sectionRect.height - top);
  if (!w || !h) return; // no layout yet (or a test environment)
  box.value = { top, width: w, height: h };

  const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx = canvas.getContext('2d');
  if (!ctx) return;
  // Resizing the canvas resets its state, so the transform and font go back on every layout.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = FONT;
  ctx.textBaseline = 'top';

  const cols = Math.ceil(w / CELL_W);
  const rows = Math.ceil(h / CELL_H);
  if (!field) field = createRippleField({ cols, rows, seed: 2026 });
  else field.resize(cols, rows);
  drawAll();
}

function frame(now: number) {
  const dt = lastFrame ? now - lastFrame : 0;
  lastFrame = now;
  if (!field) return;
  // Cap dt so a ripple running when the tab was hidden doesn't jump to its end.
  const { dirty } = field.step(Math.min(dt, 100));
  for (const i of dirty) drawCell(i);
  // Stop as soon as nothing is moving: zero cost at idle.
  rafId = field.isActive() ? requestAnimationFrame(frame) : null;
}

function onRipple(event: Event) {
  if (reducedMotion || !field || !canvasRef.value) return;
  const { clientX, clientY, strength } = (event as CustomEvent<RippleEventDetail>).detail;
  const rect = canvasRef.value.getBoundingClientRect();
  field.addRipple(clientX - rect.left, clientY - rect.top, strength);
  if (rafId === null) {
    lastFrame = 0;
    rafId = requestAnimationFrame(frame);
  }
}

onMounted(() => {
  reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  layout();
  window.addEventListener(RIPPLE_EVENT, onRipple);

  // Re-layout when the section changes size (viewport resize, subhead rewrap).
  const section = canvasRef.value?.closest('section');
  if (typeof ResizeObserver !== 'undefined' && section) {
    const ro = new ResizeObserver(() => layout());
    ro.observe(section);
    onBeforeUnmount(() => ro.disconnect());
  }

  // Redraw once JetBrains Mono is ready, so the fallback font never sticks.
  document.fonts?.load(FONT).then(drawAll, () => {});
});

onBeforeUnmount(() => {
  window.removeEventListener(RIPPLE_EVENT, onRipple);
  if (rafId !== null) cancelAnimationFrame(rafId);
});
</script>

<template>
  <canvas
    ref="canvasRef"
    data-testid="ripple-field"
    aria-hidden="true"
    class="ripple-field pointer-events-none absolute left-0 -z-10"
    :style="{ top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' }"
  />
</template>

<style scoped>
/*
 * Fades: in from the top (just below the subhead), out at the left/right edges
 * and toward the bottom — so the field reads as a haze, not a block of text.
 * Two gradients intersected; -webkit- prefixed for Safari.
 */
.ripple-field {
  --ripple-mask:
    linear-gradient(to bottom, transparent, black 80px, black 85%, transparent),
    linear-gradient(to right, transparent, black 15%, black 85%, transparent);
  mask-image: var(--ripple-mask);
  mask-composite: intersect;
  -webkit-mask-image: var(--ripple-mask);
  -webkit-mask-composite: source-in;
}
</style>
