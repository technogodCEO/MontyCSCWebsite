<script setup lang="ts">
import { computed, ref } from 'vue';
import { graphNodes } from './graphNodes';
import TerminalPanel from './TerminalPanel.vue';

const props = withDefaults(
  defineProps<{
    /**
     * When true, renders the compact "shrunk into the corner" presentation used
     * on interior pages (mounted inside NavBar's ambient-graph slot). When false
     * (default), renders the full spread-out hero presentation used on the
     * homepage. Both presentations share the same node data, click handling,
     * and terminal panel — only layout/sizing classes differ — so a single
     * component covers both rather than duplicating logic across two files.
     */
    ambient?: boolean;
  }>(),
  { ambient: false },
);

const activeNodeId = ref<string | null>(null);

// Checked synchronously (not in onMounted) so the class is correct on the very
// first render — SSR has no window, so this only ever applies client-side,
// which matches when the entrance animation would run anyway.
const skipEntranceAnimation = ref(
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false,
);

const activeNode = computed(() => graphNodes.find((node) => node.id === activeNodeId.value) ?? null);

function selectNode(event: MouseEvent, id: string) {
  event.preventDefault();
  activeNodeId.value = id;
}

function closePanel() {
  activeNodeId.value = null;
}

// Fixed v1 layout positions (no physics simulation) — differ between the full
// hero spread and the compact ambient cluster.
const fullPositions: Record<string, string> = {
  workshops: 'top-[8%] left-[12%]',
  hackathons: 'top-[15%] right-[10%]',
  talks: 'bottom-[20%] left-[18%]',
  showcase: 'bottom-[10%] right-[16%]',
};

const ambientPositions: Record<string, string> = {
  workshops: 'top-0 left-0',
  hackathons: 'top-0 left-6',
  talks: 'top-0 left-12',
  showcase: 'top-0 left-[4.5rem]',
};

function positionClass(id: string) {
  return props.ambient ? ambientPositions[id] : fullPositions[id];
}
</script>

<template>
  <div
    class="relative font-mono"
    :class="[
      ambient ? 'h-8 w-28' : 'h-[420px] w-full',
      { 'animate-entrance': !skipEntranceAnimation },
    ]"
  >
    <a
      v-for="node in graphNodes"
      :key="node.id"
      :href="node.href"
      :data-node-id="node.id"
      class="absolute flex items-center justify-center rounded-full border transition-opacity duration-200"
      :class="[
        positionClass(node.id),
        ambient
          ? 'bg-near-black border-accent-green/50 text-accent-green h-2 w-2 text-[0px]'
          : 'bg-near-black border-accent-green text-warm-white hover:border-gold px-4 py-2 text-sm',
        activeNodeId && activeNodeId !== node.id ? 'opacity-30' : 'opacity-100',
      ]"
      @click="selectNode($event, node.id)"
    >
      <span v-if="!ambient">{{ node.label }}</span>
      <span
        v-else
        class="sr-only"
      >{{ node.label }}</span>
    </a>

    <TerminalPanel
      :lines="activeNode?.terminalLines ?? []"
      :open="!!activeNode"
      :class="ambient ? 'md:top-10 md:right-0' : 'md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2'"
      @close="closePanel"
    />
  </div>
</template>

<style scoped>
@keyframes hero-graph-entrance {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-entrance {
  animation: hero-graph-entrance 0.5s ease-out;
}
</style>
