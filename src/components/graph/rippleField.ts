/**
 * Model for the hero ripple field: a grid of faint hex glyphs that graph events
 * send ripples through. Framework-free (no Vue, no DOM, no canvas) so it can be
 * unit-tested directly — RippleField.vue owns the drawing.
 *
 * Coordinates are pixels within the field. A ripple is an expanding ring; a cell
 * brightens while the ring's band covers it and re-rolls its glyph once, at the
 * moment the ring's centre line crosses it, so the field slowly "rewrites" itself.
 *
 * See docs/superpowers/specs/2026-11-13-hero-ripple-field-design.md.
 */

/** Master switch: false removes the field and stops HeroGraph sending ripples. */
export const RIPPLE_ENABLED = true;

/** Window event HeroGraph dispatches and RippleField listens for. */
export const RIPPLE_EVENT = 'hero-ripple';

/** Payload of RIPPLE_EVENT: where (viewport coords) and how strong (0–1). */
export interface RippleEventDetail {
  clientX: number;
  clientY: number;
  strength: number;
}

export const GLYPHS = '0123456789abcdef';

/** Grid cell size in CSS px (12px JetBrains Mono is ~7.2px wide). */
export const CELL_W = 8;
export const CELL_H = 16;

/** At most this many ripples at once; a new one replaces the oldest. */
export const MAX_RIPPLES = 3;

export interface RippleParams {
  /** Glyph opacity with no ripple nearby. */
  restOpacity: number;
  /** Glyph opacity at the centre of a full-strength wavefront. */
  peakOpacity: number;
  /** Wavefront speed, px per ms. */
  speed: number;
  /** Width of the bright band, px. */
  bandWidth: number;
  /** Radius a full-strength ripple reaches before it has faded out, px. */
  maxRadius: number;
}

/**
 * Mutable on purpose: the dev tuning panel (`?graph-tune`) edits it in place and
 * the field reads it every frame.
 */
export const RIPPLE_PARAMS: RippleParams = {
  restOpacity: 0.06,
  peakOpacity: 0.35,
  speed: 0.6,
  bandWidth: 40,
  maxRadius: 520,
};

/** Small deterministic PRNG (mulberry32) so glyphs are reproducible in tests. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Ripple {
  x: number;
  y: number;
  strength: number;
  /** Current ring radius, px. */
  radius: number;
}

export interface StepResult {
  /** Cell indices whose brightness or glyph changed this frame — the only ones to redraw. */
  dirty: number[];
  /** Cell indices whose glyph was re-rolled this frame (a subset of `dirty`). */
  rolled: number[];
}

export interface RippleField {
  readonly cols: number;
  readonly rows: number;
  glyphAt(index: number): string;
  /** 0 = at rest, 1 = brightest. */
  intensityAt(index: number): number;
  addRipple(x: number, y: number, strength: number): void;
  step(dtMs: number): StepResult;
  isActive(): boolean;
  resize(cols: number, rows: number): void;
}

export function createRippleField(opts: {
  cols: number;
  rows: number;
  seed?: number;
  params?: RippleParams;
}): RippleField {
  const params = opts.params ?? RIPPLE_PARAMS;
  const rand = mulberry32(opts.seed ?? 1);
  const randomGlyph = () => GLYPHS[Math.floor(rand() * GLYPHS.length)];

  let cols = opts.cols;
  let rows = opts.rows;
  let glyphs: string[] = Array.from({ length: cols * rows }, randomGlyph);
  let intensity = new Float32Array(cols * rows);
  let ripples: Ripple[] = [];

  /** How far a ripple of this strength travels before it's gone. */
  const reach = (r: Ripple) => params.maxRadius * r.strength;

  return {
    get cols() {
      return cols;
    },
    get rows() {
      return rows;
    },

    glyphAt: (i) => glyphs[i],
    intensityAt: (i) => intensity[i],

    addRipple(x, y, strength) {
      const s = Math.max(0, Math.min(1, strength));
      if (s === 0) return;
      ripples.push({ x, y, strength: s, radius: 0 });
      // Cap concurrent ripples so rapid clicking can't flood the field.
      if (ripples.length > MAX_RIPPLES) ripples.shift();
    },

    step(dtMs) {
      const dirty: number[] = [];
      const rolled: number[] = [];
      // Nothing running and nothing still lit: no work at all.
      if (ripples.length === 0) return { dirty, rolled };

      const prevRadius = ripples.map((r) => r.radius);
      for (const r of ripples) r.radius += params.speed * Math.max(0, dtMs);

      const halfBand = params.bandWidth / 2;
      for (let row = 0; row < rows; row++) {
        const cy = row * CELL_H + CELL_H / 2;
        for (let col = 0; col < cols; col++) {
          const i = row * cols + col;
          const cx = col * CELL_W + CELL_W / 2;
          let next = 0;
          let roll = false;
          for (let k = 0; k < ripples.length; k++) {
            const rp = ripples[k];
            const d = Math.hypot(cx - rp.x, cy - rp.y);
            // The ring's centre line crossed this cell this frame: re-roll it once.
            if (prevRadius[k] < d && d <= rp.radius) roll = true;
            const off = Math.abs(d - rp.radius);
            if (off > params.bandWidth) continue; // hard cut-off keeps far cells exactly at rest
            const fade = Math.max(0, 1 - rp.radius / reach(rp)); // ring dims as it grows
            const band = Math.exp(-((off / halfBand) ** 2));
            next += band * fade * (0.5 + 0.5 * rp.strength);
          }
          next = next < 0.003 ? 0 : Math.min(1, next);
          if (roll) {
            glyphs[i] = randomGlyph();
            rolled.push(i);
          }
          if (roll || Math.abs(next - intensity[i]) > 0.002 || (next === 0 && intensity[i] !== 0)) {
            intensity[i] = next;
            dirty.push(i);
          }
        }
      }

      // Retire ripples whose band has fully passed their reach.
      ripples = ripples.filter((r) => r.radius < reach(r) + params.bandWidth);
      return { dirty, rolled };
    },

    isActive: () => ripples.length > 0,

    resize(newCols, newRows) {
      if (newCols === cols && newRows === rows) return;
      // Keep glyphs where old and new grids overlap; seed the rest.
      const next: string[] = new Array(newCols * newRows);
      for (let row = 0; row < newRows; row++) {
        for (let col = 0; col < newCols; col++) {
          next[row * newCols + col] =
            row < rows && col < cols ? glyphs[row * cols + col] : randomGlyph();
        }
      }
      glyphs = next;
      cols = newCols;
      rows = newRows;
      intensity = new Float32Array(cols * rows);
      ripples = [];
    },
  };
}
