<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { graphNodes, graphEdges } from './graphNodes';
import { createForceGraph, FORCE_PARAMS, type ForceGraph } from './forceGraph';
import TerminalPanel from './TerminalPanel.vue';

/**
 * Master switch for v2 drag. With it off, the hero keeps the simulation-driven
 * drift but nodes can't be grabbed — lets the physics refactor merge before the
 * drag feel is signed off (spec §7).
 */
const DRAG_ENABLED = true;
/** Pointer travel (px) before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD_PX = 6;
/** Below this width the hero falls back to v1 behaviour: no drag, swipes scroll the page. */
const DRAG_MIN_WIDTH_QUERY = '(min-width: 640px)';
/** How far back (ms) to look at pointer movement when computing a throw's velocity. */
const THROW_SAMPLE_MS = 50;

// Dev-only physics tuning overlay (?graph-tune). `import.meta.env.DEV` is
// statically false in production builds, so the panel's chunk is never emitted.
const GraphTunePanel = import.meta.env.DEV
  ? defineAsyncComponent(() => import('./GraphTunePanel.vue'))
  : null;

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
  // The browser fires a click after every pointerup, including the end of a
  // drag. A drag must never open the panel, so swallow that one click.
  if (didDrag) {
    didDrag = false;
    return;
  }
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
 * the rAF loop copies the force simulation's positions in each frame. Edges,
 * nodes and the packet all read here.
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

/**
 * Live, mutable copy of the physics params. The simulation reads this object
 * directly, so the dev tuning panel can change values without a reload.
 */
const tuneParams = reactive({ ...FORCE_PARAMS });
/** Set in onMounted (not during setup) so the server-rendered HTML matches on hydration. */
const showTunePanel = ref(false);

// ---------------------------------------------------------------------------
// Drag (spec §2, §4)
// ---------------------------------------------------------------------------

/**
 * Wide enough for drag? Starts false and is set in onMounted (then kept live,
 * so rotating a tablet switches mode cleanly). Not read synchronously like
 * prefersReducedMotion: it drives classes, and the server-rendered HTML has no
 * window, so reading it during setup would cause a hydration mismatch.
 */
const wideEnough = ref(false);

/** Drag is on only for the full hero, with motion allowed, on wide screens, with no panel open. */
const dragEnabled = computed(
  () => DRAG_ENABLED && animated && wideEnough.value && !activeNodeId.value,
);

/** The node currently being dragged (past the threshold) — drives edge highlighting and cursor. */
const draggingId = ref<string | null>(null);

/** A press on a node that hasn't yet moved far enough to count as a drag. */
let press: { id: string; pointerId: number; startX: number; startY: number } | null = null;
/** Set when a drag finishes so the click that follows it is swallowed (see selectNode). */
let didDrag = false;
/** Recent pointer positions (px, ms) for computing the throw velocity on release. */
let samples: { x: number; y: number; t: number }[] = [];

/** Pointer position relative to the hero box, in px. */
function localPoint(event: PointerEvent) {
  const rect = rootRef.value!.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function onPointerDown(event: PointerEvent, id: string) {
  // Primary button / single touch only; ignore right-click and extra fingers.
  if (!dragEnabled.value || !event.isPrimary || event.button !== 0) return;
  // A stale flag (drag ended outside, so no click followed) must not eat this click.
  didDrag = false;
  press = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY };
  samples = [];
  // Keep receiving moves even if the pointer leaves the node or the hero.
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (!press || event.pointerId !== press.pointerId) return;
  const p = localPoint(event);

  if (!draggingId.value) {
    const moved = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
    if (moved < DRAG_THRESHOLD_PX) return;
    // Crossed the threshold: this press is now a drag, not a click.
    draggingId.value = press.id;
    didDrag = true;
    // Start from where the press began, so the node doesn't jump by the threshold distance.
    const rect = rootRef.value!.getBoundingClientRect();
    graph?.dragStart(press.id, press.startX - rect.left, press.startY - rect.top);
  }

  graph?.dragMove(p.x, p.y);
  samples.push({ ...p, t: event.timeStamp });
  // Only the last THROW_SAMPLE_MS matter for velocity.
  while (samples.length > 2 && event.timeStamp - samples[0].t > THROW_SAMPLE_MS) samples.shift();
}

/** Pointer velocity (px/ms) over the last few samples — the "throw". */
function releaseVelocity() {
  if (samples.length < 2) return { vx: 0, vy: 0 };
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dt = last.t - first.t;
  if (dt <= 0) return { vx: 0, vy: 0 };
  return { vx: (last.x - first.x) / dt, vy: (last.y - first.y) / dt };
}

function endPress(event: PointerEvent, withThrow: boolean) {
  if (!press || event.pointerId !== press.pointerId) return;
  if (draggingId.value) {
    const { vx, vy } = withThrow ? releaseVelocity() : { vx: 0, vy: 0 };
    graph?.dragEnd(vx, vy);
    draggingId.value = null;
  }
  press = null;
  samples = [];
}

function onPointerUp(event: PointerEvent) {
  endPress(event, true);
}

/** Interrupted (e.g. the browser took over for a gesture): release in place, no throw. */
function onPointerCancel(event: PointerEvent) {
  endPress(event, false);
}

/** The tuning panel changed a value that needs re-applying (link/collision settings). */
function onTuneChange() {
  graph?.applyParams();
}

/** Is this edge attached to the node being dragged? Those brighten while held (spec open question 4). */
function edgeIsHeld(edge: { from: string; to: string }) {
  return draggingId.value !== null && (edge.from === draggingId.value || edge.to === draggingId.value);
}

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

/** Physics (pixels). Only exists while animated; null under reduced motion / ambient. */
let graph: ForceGraph | null = null;
/** Hero box size in px — needed to convert simulation pixels back to percentages. */
let boxSize = { w: 0, h: 0 };
let lastFrame = 0;

/** Copy the simulation's pixel positions into the percentage state the template reads. */
function syncPositions() {
  if (!graph || !boxSize.w || !boxSize.h) return;
  const px = graph.positions();
  for (const node of graphNodes) {
    livePositions.value[node.id] = {
      x: (px[node.id].x / boxSize.w) * 100,
      y: (px[node.id].y / boxSize.h) * 100,
    };
  }
}

/** Measure each label pill so collision and bounds use real sizes. */
function measureNodes() {
  if (!graph || !rootRef.value) return;
  const sizes: Record<string, { w: number; h: number }> = {};
  for (const el of rootRef.value.querySelectorAll<HTMLElement>('a[data-node-id]')) {
    sizes[el.dataset.nodeId!] = { w: el.offsetWidth, h: el.offsetHeight };
  }
  graph.setNodeSizes(sizes);
}

/**
 * Start the simulation once the box has a real size (or resize it if it already
 * exists). A zero-size box means no layout yet (or a test environment) — the
 * nodes simply keep their resting percentages until a real size arrives.
 */
function onBoxSize(w: number, h: number) {
  if (!w || !h) return;
  boxSize = { w, h };
  if (!graph) {
    graph = createForceGraph(graphNodes, graphEdges, w, h, tuneParams);
  } else {
    graph.resize(w, h);
  }
  measureNodes();
}

function tick(now: number) {
  if (!startTime) startTime = now;
  const t = now - startTime;
  // dt is 0 on the first frame after (re)starting, so a pause never becomes one huge step.
  const dt = lastFrame ? now - lastFrame : 0;
  lastFrame = now;
  if (graph) {
    graph.tick(dt);
    syncPositions();
  }
  advancePacket(t);
  rafId = requestAnimationFrame(tick);
}

function startLoop() {
  if (!animated || rafId !== null || typeof requestAnimationFrame !== 'function') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  lastFrame = 0;
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

  showTunePanel.value =
    !!GraphTunePanel && new URLSearchParams(window.location.search).has('graph-tune');

  // Track the drag width breakpoint live.
  const wideQuery = window.matchMedia?.(DRAG_MIN_WIDTH_QUERY);
  if (wideQuery) {
    wideEnough.value = wideQuery.matches;
    const onWideChange = (e: MediaQueryListEvent) => (wideEnough.value = e.matches);
    wideQuery.addEventListener('change', onWideChange);
    onBeforeUnmount(() => wideQuery.removeEventListener('change', onWideChange));
  }

  // The simulation works in pixels, so it needs the box size — now and on every resize.
  if (rootRef.value) {
    const rect = rootRef.value.getBoundingClientRect();
    onBoxSize(rect.width, rect.height);
  }
  if (typeof ResizeObserver !== 'undefined' && rootRef.value) {
    const ro = new ResizeObserver(([entry]) =>
      onBoxSize(entry.contentRect.width, entry.contentRect.height),
    );
    ro.observe(rootRef.value);
    onBeforeUnmount(() => ro.disconnect());
  }
  // Label widths change once the web font loads; re-measure then.
  document.fonts?.ready.then(measureNodes);

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
        class="stroke-accent-green transition-opacity duration-150"
        :class="edgeIsHeld(edge) ? 'opacity-80' : edge.kind === 'diagonal' ? 'opacity-25' : 'opacity-50'"
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
      draggable="false"
      class="focus-visible:ring-gold absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border outline-none transition-opacity duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-near-black"
      :style="{ left: pos(node.id).x + '%', top: pos(node.id).y + '%' }"
      :class="[
        ambient
          ? 'bg-near-black border-accent-green/50 text-accent-green h-2 w-2'
          : 'bg-near-black border-accent-green text-warm-white hover:border-gold px-4 py-2 text-sm',
        activeNodeId && activeNodeId !== node.id ? 'opacity-30' : 'opacity-100',
        // touch-none only where drag is on: elsewhere a swipe over a node must still scroll the page.
        dragEnabled ? 'cursor-grab touch-none select-none' : '',
        draggingId === node.id ? 'z-10 cursor-grabbing' : '',
      ]"
      @click="selectNode($event, node.id)"
      @pointerdown="onPointerDown($event, node.id)"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @dragstart.prevent
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

    <component
      :is="GraphTunePanel"
      v-if="showTunePanel"
      :params="tuneParams"
      @change="onTuneChange"
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
