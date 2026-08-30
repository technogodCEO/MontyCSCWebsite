<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { graphNodes, graphEdges } from './graphNodes';
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
const prefersReducedMotion = ref(
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false,
);
// keep skipEntranceAnimation as an alias so the template class check is unchanged
const skipEntranceAnimation = prefersReducedMotion;

const activeNode = computed(() => graphNodes.find((node) => node.id === activeNodeId.value) ?? null);

function selectNode(event: MouseEvent, id: string) {
  event.preventDefault();
  activeNodeId.value = id;
}

function closePanel() {
  activeNodeId.value = null;
}

/** Resting coordinate lookup — full layout vs compact cluster. */
function restingPos(id: string) {
  const node = graphNodes.find((n) => n.id === id)!;
  return props.ambient ? node.ambientBase : node.base;
}

/** Edges to draw: full hero gets the near-mesh, the ambient cluster gets the ring only. */
const visibleEdges = computed(() =>
  props.ambient ? graphEdges.filter((e) => e.kind === 'ring') : graphEdges,
);

/**
 * Live positions, keyed by node id, as {x, y} percentages. Seeded at rest;
 * Task 3's rAF loop mutates these each frame. Edges and nodes both read here.
 */
const livePositions = ref<Record<string, { x: number; y: number }>>(
  Object.fromEntries(graphNodes.map((n) => [n.id, { ...restingPos(n.id) }])),
);

function pos(id: string) {
  return livePositions.value[id];
}

/** Motion runs only in the full hero, only when motion is allowed. */
const animated = !props.ambient && !prefersReducedMotion.value;

let rafId: number | null = null;
let startTime = 0;
const rootRef = ref<HTMLElement | null>(null);

const PACKET_TRAVEL_MS = 1400;
const PACKET_GAP_MIN_MS = 3000;
const PACKET_GAP_MAX_MS = 7000;

const packet = ref<{ from: string; to: string; progress: number } | null>(null);
let packetNextAt = PACKET_GAP_MIN_MS; // first packet a few seconds in
let packetRunStart = 0;

function scheduleNextPacket(t: number) {
  packetNextAt = t + PACKET_GAP_MIN_MS + Math.random() * (PACKET_GAP_MAX_MS - PACKET_GAP_MIN_MS);
  packet.value = null;
}

function advancePacket(t: number) {
  if (packet.value) {
    const elapsed = t - packetRunStart;
    const p = elapsed / PACKET_TRAVEL_MS;
    if (p >= 1) {
      scheduleNextPacket(t);
    } else {
      packet.value = { ...packet.value, progress: p };
    }
    return;
  }
  if (t >= packetNextAt) {
    const edge = graphEdges[Math.floor(Math.random() * graphEdges.length)];
    const reversed = Math.random() < 0.5;
    packet.value = {
      from: reversed ? edge.to : edge.from,
      to: reversed ? edge.from : edge.to,
      progress: 0,
    };
    packetRunStart = t;
  }
}

/** Current packet position (percentage), lerped between the two live node centres. */
const packetPos = computed(() => {
  if (!packet.value) return null;
  const a = pos(packet.value.from);
  const b = pos(packet.value.to);
  const p = packet.value.progress;
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
});

function tick(now: number) {
  if (!startTime) startTime = now;
  const t = now - startTime;
  for (const node of graphNodes) {
    const { ax, ay, fx, fy, px, py } = node.drift;
    livePositions.value[node.id] = {
      x: node.base.x + Math.sin(t * fx + px) * ax,
      y: node.base.y + Math.cos(t * fy + py) * ay,
    };
  }
  advancePacket(t);
  rafId = requestAnimationFrame(tick);
}

function startLoop() {
  if (!animated || rafId !== null || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  rafId = requestAnimationFrame(tick);
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function onVisibilityChange() {
  if (document.hidden) stopLoop();
  else startLoop();
}

onMounted(() => {
  if (!animated) return;
  document.addEventListener('visibilitychange', onVisibilityChange);

  if (typeof IntersectionObserver !== 'undefined' && rootRef.value) {
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? startLoop() : stopLoop()),
      { threshold: 0 },
    );
    io.observe(rootRef.value);
    onBeforeUnmount(() => io.disconnect());
  } else {
    startLoop();
  }
});

onBeforeUnmount(() => {
  stopLoop();
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }
});
</script>

<template>
  <div
    ref="rootRef"
    class="relative font-mono"
    :class="[
      ambient ? 'h-8 w-20' : 'h-[420px] w-full',
      { 'animate-entrance': !skipEntranceAnimation },
    ]"
  >
    <svg
      data-testid="graph-edges"
      class="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <line
        v-for="(edge, i) in visibleEdges"
        :key="i"
        :x1="pos(edge.from).x"
        :y1="pos(edge.from).y"
        :x2="pos(edge.to).x"
        :y2="pos(edge.to).y"
        vector-effect="non-scaling-stroke"
        :stroke-width="edge.kind === 'diagonal' ? 1 : 1.25"
        class="stroke-accent-green"
        :class="edge.kind === 'diagonal' ? 'opacity-25' : 'opacity-50'"
      />
    </svg>

    <div
      v-if="animated"
      data-testid="graph-packet-layer"
      class="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      <span
        v-if="packetPos"
        class="bg-gold absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        :style="{ left: packetPos.x + '%', top: packetPos.y + '%' }"
      />
    </div>

    <a
      v-for="node in graphNodes"
      :key="node.id"
      :href="node.href"
      :data-node-id="node.id"
      class="focus-visible:ring-gold absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-near-black"
      :style="{ left: pos(node.id).x + '%', top: pos(node.id).y + '%' }"
      :class="[
        ambient
          ? 'bg-near-black border-accent-green/50 text-accent-green h-2 w-2'
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
      :label="activeNode ? `${activeNode.label} details` : undefined"
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
