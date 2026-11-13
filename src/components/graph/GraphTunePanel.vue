<script setup lang="ts">
/**
 * Dev-only physics tuning overlay for the hero graph (spec §7). Shown when the
 * dev server URL has `?graph-tune`. Never shipped: HeroGraph only imports it
 * behind `import.meta.env.DEV`, which is statically false in production builds.
 *
 * Sliders write straight into HeroGraph's reactive params object (the
 * simulation reads it live). Once a feel is signed off, copy the values shown
 * here into FORCE_PARAMS in forceGraph.ts.
 */
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import type { ForceParams } from './forceGraph';
import { RIPPLE_PARAMS, type RippleParams } from './rippleField';

const props = defineProps<{ params: ForceParams }>();
const emit = defineEmits<{ (e: 'change'): void }>();

/** Slider ranges per param — wide enough to explore, narrow enough to stay sane. */
const controls: { key: keyof ForceParams; min: number; max: number; step: number }[] = [
  { key: 'anchorStrength', min: 0, max: 0.3, step: 0.005 },
  { key: 'ringLinkStrength', min: 0, max: 1, step: 0.01 },
  { key: 'diagonalLinkStrength', min: 0, max: 1, step: 0.01 },
  { key: 'velocityDecay', min: 0.05, max: 0.9, step: 0.01 },
  { key: 'throwSpeedCap', min: 0, max: 5, step: 0.1 },
  { key: 'collisionPadding', min: 0, max: 40, step: 1 },
  { key: 'boundsStrength', min: 0, max: 1, step: 0.01 },
];

/**
 * Ripple field settings. RIPPLE_PARAMS is a plain shared object the field reads
 * every frame; wrapping it in reactive() mutates that same object, so slider
 * changes apply live while the readouts below stay reactive.
 */
const ripple = reactive(RIPPLE_PARAMS);
const rippleControls: { key: keyof RippleParams; min: number; max: number; step: number }[] = [
  { key: 'restOpacity', min: 0, max: 0.2, step: 0.005 },
  { key: 'peakOpacity', min: 0, max: 1, step: 0.01 },
  { key: 'speed', min: 0.1, max: 2, step: 0.05 },
  { key: 'bandWidth', min: 10, max: 120, step: 1 },
  { key: 'maxRadius', min: 100, max: 1200, step: 10 },
];

function updateRipple(key: keyof RippleParams, value: string) {
  ripple[key] = Number(value);
}

function update(key: keyof ForceParams, value: string) {
  // eslint-disable-next-line vue/no-mutating-props -- deliberately shared with HeroGraph's simulation
  props.params[key] = Number(value);
  emit('change');
}

// Simple FPS readout, averaged over each second.
const fps = ref(0);
let frames = 0;
let windowStart = 0;
let rafId = 0;
function count(now: number) {
  if (!windowStart) windowStart = now;
  frames++;
  if (now - windowStart >= 1000) {
    fps.value = Math.round((frames * 1000) / (now - windowStart));
    frames = 0;
    windowStart = now;
  }
  rafId = requestAnimationFrame(count);
}
onMounted(() => (rafId = requestAnimationFrame(count)));
onBeforeUnmount(() => cancelAnimationFrame(rafId));

/** Copy the current values, ready to paste into FORCE_PARAMS / RIPPLE_PARAMS. */
async function copyValues() {
  // Both blocks: paste FORCE_PARAMS into forceGraph.ts, RIPPLE_PARAMS into rippleField.ts.
  const values = { FORCE_PARAMS: props.params, RIPPLE_PARAMS: ripple };
  await navigator.clipboard?.writeText(JSON.stringify(values, null, 2));
}
</script>

<template>
  <div
    class="bg-near-black/95 border-accent-green/40 text-warm-white fixed right-4 bottom-4 z-50 max-h-[90vh] w-72 overflow-y-auto rounded-lg border p-3 text-left text-xs shadow-xl"
  >
    <div class="mb-2 flex items-center justify-between">
      <span class="text-accent-green">graph-tune</span>
      <span>{{ fps }} fps</span>
    </div>
    <label
      v-for="c in controls"
      :key="c.key"
      class="mb-1 block"
    >
      <span class="flex justify-between">
        <span>{{ c.key }}</span>
        <span class="text-gold">{{ params[c.key] }}</span>
      </span>
      <input
        type="range"
        class="w-full"
        :min="c.min"
        :max="c.max"
        :step="c.step"
        :value="params[c.key]"
        @input="update(c.key, ($event.target as HTMLInputElement).value)"
      >
    </label>
    <div class="text-accent-green mt-3 mb-1">
      ripple
    </div>
    <label
      v-for="c in rippleControls"
      :key="c.key"
      class="mb-1 block"
    >
      <span class="flex justify-between">
        <span>{{ c.key }}</span>
        <span class="text-gold">{{ ripple[c.key] }}</span>
      </span>
      <input
        type="range"
        class="w-full"
        :min="c.min"
        :max="c.max"
        :step="c.step"
        :value="ripple[c.key]"
        @input="updateRipple(c.key, ($event.target as HTMLInputElement).value)"
      >
    </label>
    <button
      type="button"
      class="border-accent-green/50 hover:text-gold mt-2 w-full rounded border py-1"
      @click="copyValues"
    >
      copy values
    </button>
  </div>
</template>
