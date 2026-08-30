# Refinement C — Hero Graph Edges + Ambient Animation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the v1 hero graph visible connecting edges (near-mesh) and cheap ambient motion — per-node drift with edges that track node centres, plus a single stochastic "packet" traversing one edge at a time.

**Architecture:** Replace `HeroGraph.vue`'s Tailwind-class node positioning with numeric percentage coordinates in reactive state. One `requestAnimationFrame` loop computes each node's drift offset from a sine of elapsed time; nodes (HTML `<a>`) and edges (SVG `<line>` in an overlay) both read the same live coordinates. The packet is an HTML element positioned by lerping between two live node centres. `prefers-reduced-motion`, tab-hidden, and scrolled-out-of-view all halt the loop. Still no physics — drift is authored motion, not simulation. This is not the v2 force graph.

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, Astro island (`client:load`, `transition:persist`), Vitest + happy-dom + `@vue/test-utils`.

**Spec:** `docs/superpowers/specs/2026-08-30-design-refinement-pass-design.md` §2.

---

## Context for the implementer

Read these first:
- `src/components/graph/HeroGraph.vue` — the component being reworked
- `src/components/graph/graphNodes.ts` — node data (id, label, href, terminalLines)
- `src/components/graph/HeroGraph.test.ts` — existing tests (must keep passing, with edits)
- `src/components/graph/TerminalPanel.vue` — unchanged; opened on node click
- `src/layouts/Layout.astro:31-33` — mounts the ambient instance in the NavBar slot with `transition:persist`; `src/components/sections/Hero.astro:20` — mounts the full instance

Key existing behaviours that MUST survive:
- Every node is a real focusable `<a href>` (accessibility fallback). 4 nodes.
- Clicking a node opens `TerminalPanel` with that node's `terminalLines`; other nodes dim to `opacity-30`.
- `prefers-reduced-motion` is read **synchronously** at setup (not in `onMounted`) so first render is correct — see the existing `skipEntranceAnimation` ref. Follow that pattern for the new `prefersReducedMotion` ref (reuse one ref for both).
- `ambient` prop switches between the full hero spread and the compact NavBar cluster. Both share node data, click handling, and the panel.
- The component stays mounted across navigation (`transition:persist`), so the rAF loop must be cancelled on unmount and paused when hidden — a leak here runs forever on every page.

Verification after each task: `npm run test -- src/components/graph/HeroGraph.test.ts && npm run lint`. Full gate at the end: `npm run build && npm run test && npm run lint`.

---

## Files touched

| File | Change |
|---|---|
| `src/components/graph/graphNodes.ts` | add `base` + `drift` coords per node, `ambientBase` coords, `graphEdges` list, types |
| `src/components/graph/HeroGraph.vue` | coordinate state, rAF drift loop, SVG edge overlay, packet, visibility/IO pausing, reduced-motion gating |
| `src/components/graph/HeroGraph.test.ts` | update reduced-motion test; add edge / ambient / packet tests |

---

## Task 1: Extend `graphNodes.ts` with coordinates and edges

**Files:**
- Modify: `src/components/graph/graphNodes.ts`
- Test: `src/components/graph/graphNodes.test.ts` (new)

- [ ] **Step 1: Write failing tests for the new data shape**

Create `src/components/graph/graphNodes.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { graphNodes, graphEdges } from './graphNodes';

describe('graph data', () => {
  test('every node has a full-layout base coord and drift params', () => {
    for (const n of graphNodes) {
      expect(n.base.x).toBeGreaterThan(0);
      expect(n.base.x).toBeLessThan(100);
      expect(n.base.y).toBeGreaterThan(0);
      expect(n.base.y).toBeLessThan(100);
      expect(n.drift.ax).toBeGreaterThan(0);
      expect(n.drift.ay).toBeGreaterThan(0);
    }
  });

  test('base positions are not mirror-symmetric (no X-in-a-box)', () => {
    const xs = graphNodes.map((n) => n.base.x).sort((a, b) => a - b);
    const ys = graphNodes.map((n) => n.base.y).sort((a, b) => a - b);
    // reject a layout where the four points form two mirrored pairs
    expect(Math.abs(xs[0] + xs[3] - (xs[1] + xs[2]))).toBeGreaterThan(4);
    expect(Math.abs(ys[0] + ys[3] - (ys[1] + ys[2]))).toBeGreaterThan(4);
  });

  test('edges reference real node ids; 4 ring + 2 diagonal', () => {
    const ids = new Set(graphNodes.map((n) => n.id));
    for (const e of graphEdges) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
    }
    expect(graphEdges.filter((e) => e.kind === 'ring')).toHaveLength(4);
    expect(graphEdges.filter((e) => e.kind === 'diagonal')).toHaveLength(2);
  });

  test('ring forms a closed loop touching every node', () => {
    const ring = graphEdges.filter((e) => e.kind === 'ring');
    const degree = new Map<string, number>();
    for (const e of ring) {
      degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
      degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
    }
    expect([...degree.values()]).toEqual([2, 2, 2, 2]);
    expect(degree.size).toBe(4);
  });
});
```

- [ ] **Step 2: Run, watch it fail**

Run: `npm run test -- src/components/graph/graphNodes.test.ts`
Expected: FAIL — `graphEdges` undefined, `n.base` undefined.

- [ ] **Step 3: Implement the new data**

Rewrite `src/components/graph/graphNodes.ts`:

```ts
export interface GraphNode {
  id: string;
  label: string;
  href: string; // real page this node routes to — required for the accessible fallback
  terminalLines: string[];
  /**
   * Resting position for the full (non-ambient) hero, as a percentage of the
   * hero container. Deliberately irregular — a symmetric layout makes the mesh
   * edges read as a literal X-in-a-box rather than a graph.
   */
  base: { x: number; y: number };
  /**
   * Per-node ambient drift. Position at time t (ms) is
   *   x = base.x + sin(t * fx + px) * ax
   *   y = base.y + cos(t * fy + py) * ay
   * Amplitudes are in percentage points (~1–2); frequencies are small so a full
   * cycle takes ~15–20s. Phases are offset per node so they don't drift in unison.
   */
  drift: { ax: number; ay: number; fx: number; fy: number; px: number; py: number };
  /** Resting position for the compact NavBar cluster (percentage of that small box). */
  ambientBase: { x: number; y: number };
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: 'ring' | 'diagonal';
}

export const graphNodes: GraphNode[] = [
  {
    id: 'workshops',
    label: 'Workshops',
    href: '/activities',
    terminalLines: [
      '$ connect --node workshops',
      '> Weekly sessions on Python, ML,',
      '> and CS fundamentals.',
      '> No experience required.',
    ],
    base: { x: 22, y: 27 },
    drift: { ax: 1.6, ay: 1.3, fx: 0.00042, fy: 0.00051, px: 0, py: 1.7 },
    ambientBase: { x: 12, y: 52 },
  },
  {
    id: 'hackathons',
    label: 'Hackathons',
    href: '/events',
    terminalLines: ['$ connect --node hackathons', '> MontyHacks — our flagship', '> one-day hackathon.'],
    base: { x: 79, y: 18 },
    drift: { ax: 1.3, ay: 1.8, fx: 0.00037, fy: 0.00046, px: 2.1, py: 0.6 },
    ambientBase: { x: 38, y: 28 },
  },
  {
    id: 'talks',
    label: 'Guest Talks',
    href: '/events',
    terminalLines: ['$ connect --node guest_talks', '> Speakers from universities', '> and industry.'],
    base: { x: 29, y: 75 },
    drift: { ax: 1.8, ay: 1.1, fx: 0.00048, fy: 0.00033, px: 1.2, py: 3.0 },
    ambientBase: { x: 62, y: 62 },
  },
  {
    id: 'showcase',
    label: 'Showcase',
    href: '/showcase',
    terminalLines: ['$ connect --node showcase', '> Projects from MontyHacks', '> and beyond.'],
    base: { x: 73, y: 66 },
    drift: { ax: 1.1, ay: 1.6, fx: 0.0004, fy: 0.00058, px: 3.4, py: 2.2 },
    ambientBase: { x: 87, y: 46 },
  },
];

// Near-mesh: the four flagship categories all connect. Ring is the visible
// perimeter (workshops → hackathons → showcase → talks → workshops); the two
// diagonals are rendered fainter so the shape doesn't collapse into a box.
export const graphEdges: GraphEdge[] = [
  { from: 'workshops', to: 'hackathons', kind: 'ring' },
  { from: 'hackathons', to: 'showcase', kind: 'ring' },
  { from: 'showcase', to: 'talks', kind: 'ring' },
  { from: 'talks', to: 'workshops', kind: 'ring' },
  { from: 'workshops', to: 'showcase', kind: 'diagonal' },
  { from: 'hackathons', to: 'talks', kind: 'diagonal' },
];
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/components/graph/graphNodes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/graph/graphNodes.ts src/components/graph/graphNodes.test.ts
git commit -m "feat: node coordinates + near-mesh edge data for hero graph"
```

---

## Task 2: Render static edges (no motion yet)

Build the SVG edge overlay against **resting** coordinates first — motion comes in Task 3. This keeps the diff reviewable.

**Files:**
- Modify: `src/components/graph/HeroGraph.vue`
- Test: `src/components/graph/HeroGraph.test.ts`

- [ ] **Step 1: Add failing edge-render tests**

In `src/components/graph/HeroGraph.test.ts` add:

```ts
test('full hero renders the near-mesh: 6 edge lines', () => {
  const wrapper = mount(HeroGraph);
  expect(wrapper.find('[data-testid="graph-edges"]').exists()).toBe(true);
  expect(wrapper.findAll('[data-testid="graph-edges"] line')).toHaveLength(6);
});

test('ambient cluster renders ring edges only: 4 lines, no diagonals', () => {
  const wrapper = mount(HeroGraph, { props: { ambient: true } });
  expect(wrapper.findAll('[data-testid="graph-edges"] line')).toHaveLength(4);
});
```

- [ ] **Step 2: Run, watch fail**

Run: `npm run test -- src/components/graph/HeroGraph.test.ts`
Expected: FAIL — no `graph-edges` element.

- [ ] **Step 3: Implement the overlay**

In `HeroGraph.vue` `<script setup>`, after the imports, add:

```ts
import { graphNodes, graphEdges } from './graphNodes';
// (replace the existing `import { graphNodes } from './graphNodes';`)

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
```

In the `<template>`, immediately inside the root `<div>` and **before** the `v-for` of `<a>` nodes, add the overlay:

```vue
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
```

`preserveAspectRatio="none"` lets the 0–100 space map to the container's real aspect ratio; `vector-effect="non-scaling-stroke"` keeps line weight uniform despite the non-uniform scale.

- [ ] **Step 4: Switch nodes to coordinate positioning (full mode)**

Replace the `fullPositions` / `ambientPositions` / `positionClass` block with nothing (delete it) and change the `<a>` element so full mode is coordinate-driven while ambient keeps a compact inline position too (now also coordinate-driven via `pos()`):

```vue
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
```

Nodes are now centre-anchored (`-translate-x-1/2 -translate-y-1/2`) so edges meet their centres. Keep the `<span>` label / `sr-only` logic unchanged. Keep the `TerminalPanel` unchanged.

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/components/graph/HeroGraph.test.ts`
Expected: PASS — including the pre-existing click/anchor/reduced-motion tests.

- [ ] **Step 6: Visual check**

`npm run dev` → homepage: four nodes in an irregular spread with green edges (ring solid-ish, diagonals faint), no motion yet. NavBar cluster: tiny nodes with a faint ring, no diagonals. Nothing overlaps the headline badly; tune `base` values in `graphNodes.ts` if a node sits under the copy or an edge crosses a label awkwardly.

- [ ] **Step 7: Commit**

```bash
git add src/components/graph/HeroGraph.vue src/components/graph/HeroGraph.test.ts
git commit -m "feat: static near-mesh edges on the hero graph"
```

---

## Task 3: Per-node drift loop (edges follow)

**Files:**
- Modify: `src/components/graph/HeroGraph.vue`
- Test: `src/components/graph/HeroGraph.test.ts`

- [ ] **Step 1: Add a failing test for reduced-motion staying static**

Update the existing reduced-motion test and add one:

```ts
test('respects prefers-reduced-motion by skipping entrance animation class', () => {
  mockReducedMotion(true);
  const wrapper = mount(HeroGraph);
  expect(wrapper.classes()).not.toContain('animate-entrance');
});

test('reduced-motion: nodes sit exactly at their resting coordinates', () => {
  mockReducedMotion(true);
  const wrapper = mount(HeroGraph);
  const a = wrapper.get('[data-node-id="workshops"]');
  // base.x/base.y for workshops is 22 / 27
  expect(a.attributes('style')).toContain('left: 22%');
  expect(a.attributes('style')).toContain('top: 27%');
});
```

Add a shared helper at the top of the test file (replacing the inline `window.matchMedia` assignment):

```ts
function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => mockReducedMotion(false));
```

(Import `beforeEach` from `vitest`.)

- [ ] **Step 2: Run, watch the new test fail**

Run: `npm run test -- src/components/graph/HeroGraph.test.ts`
Expected: the "resting coordinates" test FAILS only if drift mutates on mount; with no loop yet it passes. It's the regression guard for Step 3 — proceed.

- [ ] **Step 3: Implement the loop**

In `HeroGraph.vue`, reuse the reduced-motion check for one ref:

```ts
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const prefersReducedMotion = ref(
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false,
);
// keep skipEntranceAnimation as an alias so the template class check is unchanged
const skipEntranceAnimation = prefersReducedMotion;

/** Motion runs only in the full hero, only when motion is allowed. */
const animated = !props.ambient && !prefersReducedMotion.value;

let rafId: number | null = null;
let startTime = 0;
const rootRef = ref<HTMLElement | null>(null);

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
  advancePacket(t); // defined in Task 4; add a no-op stub for now
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
```

Add a temporary stub near the loop (removed in Task 4):

```ts
function advancePacket(_t: number) {}
```

Bind the root element:

```vue
<div
  ref="rootRef"
  class="relative font-mono"
  ...
>
```

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/components/graph/HeroGraph.test.ts`
Expected: PASS. The "resting coordinates" test passes because `animated` is `false` under mocked reduced-motion, so the loop never starts and `livePositions` stays seeded at `base`. Non-reduced tests may start the loop; that's fine — `mount` tears down between tests and `onBeforeUnmount` cancels it. If happy-dom logs an unhandled rAF, add `afterEach(() => wrapper?.unmount())`.

- [ ] **Step 5: Visual check**

`npm run dev` → homepage: nodes drift gently, each on its own slow path; edges stay glued to node centres (this is the whole point — confirm no detachment). Amplitude should be barely-there, not bouncy. Tune `drift.ax/ay` down if it's distracting. Switch to another page and back (View Transitions) — motion continues, no stutter, no doubled loop. Open DevTools Performance for a few seconds: one rAF callback, negligible cost.

- [ ] **Step 6: Commit**

```bash
git add src/components/graph/HeroGraph.vue src/components/graph/HeroGraph.test.ts
git commit -m "feat: ambient per-node drift with edges tracking node centres"
```

---

## Task 4: Stochastic packet

**Files:**
- Modify: `src/components/graph/HeroGraph.vue`
- Test: `src/components/graph/HeroGraph.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
test('full hero (motion allowed) can mount a packet element', async () => {
  mockReducedMotion(false);
  const wrapper = mount(HeroGraph);
  // packet is absent until its first scheduled run; assert the layer exists
  expect(wrapper.find('[data-testid="graph-packet-layer"]').exists()).toBe(true);
});

test('reduced-motion: no packet layer at all', () => {
  mockReducedMotion(true);
  const wrapper = mount(HeroGraph);
  expect(wrapper.find('[data-testid="graph-packet-layer"]').exists()).toBe(false);
});

test('ambient cluster: no packet layer', () => {
  const wrapper = mount(HeroGraph, { props: { ambient: true } });
  expect(wrapper.find('[data-testid="graph-packet-layer"]').exists()).toBe(false);
});
```

- [ ] **Step 2: Run, watch fail**

Run: `npm run test -- src/components/graph/HeroGraph.test.ts`
Expected: FAIL — no packet layer.

- [ ] **Step 3: Implement the packet**

Replace the `advancePacket` stub with real state + logic:

```ts
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
```

In the template, after the `<svg>` overlay and before the nodes, add the packet layer (only when animated):

```vue
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
```

`animated` is a plain const evaluated at setup — expose it to the template by leaving it as a top-level `const` in `<script setup>` (it already is).

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/components/graph/HeroGraph.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Visual check**

`npm run dev` → watch the homepage graph for ~30s: a single small gold dot crosses one edge every few seconds, never two at once, varying edges and directions, not a clockwise walk. It should feel occasional, not busy. If it reads as too frequent, raise `PACKET_GAP_MIN_MS`. Confirm the dot rides the edge exactly (it uses the same live coords) even while nodes drift.

- [ ] **Step 6: Commit**

```bash
git add src/components/graph/HeroGraph.vue src/components/graph/HeroGraph.test.ts
git commit -m "feat: stochastic gold packet traversing hero graph edges"
```

---

## Task 5: Full verification + cleanup

- [ ] **Step 1: Remove dead code**

Confirm `fullPositions`, `ambientPositions`, `positionClass`, and the old single-import of `graphNodes` are gone. `advancePacket` stub is gone. No unused imports (`lint` will catch).

- [ ] **Step 2: Accessibility re-check**

- Tab through the homepage: focus reaches all four nodes as links, focus ring visible on `bg-near-black`.
- `<svg>` overlay and packet layer both carry `aria-hidden="true"` and `pointer-events-none` — clicks pass through to nodes.
- Clicking a node still opens the terminal panel; other nodes still dim.
- DevTools → Rendering → emulate `prefers-reduced-motion: reduce`, reload: graph is fully static (no drift, no packet), edges still drawn, nodes at rest.

- [ ] **Step 3: Performance re-check**

With motion on, leave the site open on an interior page for a minute (ambient instance persistent in NavBar — note it has `animated === false` because `ambient` is true, so it never starts a loop). Only the homepage full instance animates. Background the tab → `visibilitychange` stops the loop (add a `console.debug` temporarily to confirm, then remove).

- [ ] **Step 4: Final gate**

Run: `npm run build && npm run test && npm run lint`
Expected: `astro check` clean, all tests pass, no lint errors.

- [ ] **Step 5: Commit any tuning**

```bash
git add -A
git commit -m "chore: tune hero graph drift/packet timings after review"
```
(Skip if nothing changed.)

---

## Done when

- Homepage hero shows an irregular 4-node graph with a visible near-mesh (4 ring + 2 faint diagonal edges).
- Nodes drift individually; edges and packet track live node centres with no detachment.
- One gold packet at a time, stochastic edge/direction/interval.
- NavBar ambient cluster: static ring only, no drift, no packet.
- `prefers-reduced-motion` → entirely static; edges still rendered; no packet.
- rAF loop cancels on unmount, pauses on tab-hidden and out-of-view.
- `npm run build && npm run test && npm run lint` all green.

## Out of scope

v2 force-directed / draggable graph. No `d3-force`, no collision, no drag. Drift is a fixed sine, not a simulation.
