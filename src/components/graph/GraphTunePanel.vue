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
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { ForceParams } from './forceGraph';

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

/** Copy the current values as a snippet ready to paste into FORCE_PARAMS. */
async function copyValues() {
  await navigator.clipboard?.writeText(JSON.stringify(props.params, null, 2));
}
</script>

<template>
  <div
    class="bg-near-black/95 border-accent-green/40 text-warm-white fixed right-4 bottom-4 z-50 w-72 rounded-lg border p-3 text-left text-xs shadow-xl"
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
    <button
      type="button"
      class="border-accent-green/50 hover:text-gold mt-2 w-full rounded border py-1"
      @click="copyValues"
    >
      copy values
    </button>
  </div>
</template>
