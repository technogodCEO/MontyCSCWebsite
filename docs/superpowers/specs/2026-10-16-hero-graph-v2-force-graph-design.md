# Hero Graph v2: Draggable Force Graph (Design)

**Date:** 2026-10-16
**Status:** Draft. Open questions at the end need an answer before planning.
**Branch:** `claude/happy-hopper-mkbbui`

Turns the hero graph's authored drift into a real physics simulation that visitors
can grab, drag and throw. This is the "v2" roadmap item from the original design
record (`docs/superpowers/specs/2026-08-22-montycsc-website-design.md`, "Hero / Graph
Component → v2"), which set these requirements:

- Isolated/swappable: drops in to replace v1 without a rebuild
- Touch-drag on mobile, with a simplified non-physics fallback for small screens
- Respects `prefers-reduced-motion`
- Real focusable `<a>` nodes underneath the visuals for keyboard/screen-reader use
- Cheap enough to run continuously as an ambient element

This document turns those into concrete decisions. It amends the original spec
and the refinement-pass spec
(`docs/superpowers/specs/2026-08-30-design-refinement-pass-design.md`, item 2)
where noted.

---

## 1. Where v1 is today

`src/components/graph/HeroGraph.vue` already has most of the plumbing v2 needs:

- Node positions live in reactive state (`livePositions`, percentages of the hero box).
- One `requestAnimationFrame` loop moves the nodes. It pauses when the tab is hidden
  (`visibilitychange`) or the hero is off-screen (`IntersectionObserver`).
- Edges (SVG `<line>`) and the gold packet read the same live positions.
- Under reduced motion, or in the ambient NavBar cluster, the loop never starts.
- Clicking a node (`<a href>`, default prevented) opens `TerminalPanel`.

What v1 lacks: positions are a pure function of time
(`base + sin(t·f + p)·a`), so nothing can push or pull a node. v2 replaces that
function with a simulation step and keeps everything else.

---

## 2. Interaction model

### What the visitor can do

| Input | Result |
|---|---|
| Press and drag a node | The node follows the pointer. Connected nodes are pulled along by their edges, and the rest of the graph reacts. |
| Release while moving | The node keeps its momentum (a "throw"), then springs back toward its home position along with the rest of the graph. |
| Click/tap a node without moving it | Same as v1: opens that node's terminal panel and dims the other nodes. |
| Keyboard: Tab to a node, press Enter | Same as v1: opens the terminal panel. Dragging is pointer-only and purely decorative. |
| Leave it alone | Nodes drift gently as in v1, now driven by the simulation (see 3.3). |

### Nodes spring home (recommended default)

After a drag, every node returns to its home position. A visitor can't leave the
hero in a broken or overlapping state, there's no "reset" control to design, and
the layout stays readable for the next visitor on a shared school computer.
The alternative (a node stays where it's dropped) is listed under open questions.

### Telling a click from a drag

A pointer-down on a node becomes a **drag** once the pointer moves more than
**6 px** from where it started. If it's released before that, it's a **click**.

- A drag must not open the terminal panel. The `click` event that fires after a
  drag gets swallowed, using a `didDrag` flag checked in the existing `selectNode`
  handler.
- A click behaves exactly as in v1. The `href` stays on the `<a>`, so middle-click
  and "open in new tab" still go to the real page.
- Pointer capture (`setPointerCapture`) keeps the drag tracking if the pointer
  leaves the node or the hero box.
- While the terminal panel is open, dragging is disabled. The panel is modal, and
  it would be strange for the graph to move behind it.

### Empty space does nothing

Pressing on empty hero space does nothing in v2. That keeps it free for a future
background effect (see "Out of scope") without any input conflict, and means
visitors on touch screens can still scroll the page by swiping over the hero.

---

## 3. Physics

### 3.1 Engine: `d3-force`, ticked manually

Use `d3-force` (v3; depends on `d3-dispatch`, `d3-quadtree`, `d3-timer`; roughly
6 KB gzipped together), but **don't let it run its own timer**. Create the
simulation with `.stop()` and call `simulation.tick()` from the existing rAF loop.
That keeps a single animation loop, and the existing visibility/off-screen pausing
works unchanged.

Why not hand-roll it: with 4 nodes the maths is small, but the original spec's
warning was about *feel*, meaning jitter, overshoot and collisions. `d3-force`'s
velocity damping, its link and collision forces, and its drag pinning (`fx`/`fy`)
are battle-tested for exactly that, so tuning time goes on feel, not integrator bugs.

The simulation objects are kept out of Vue's reactivity (`markRaw` / plain module
variables). After each tick, the loop copies 4 `{x, y}` pairs into the reactive
`livePositions` that the template already reads. Only those 4 pairs are reactive.

### 3.2 Coordinate space

v1 positions nodes in percentages of a box that's `100% × 420px`, so one unit of
x is a different distance from one unit of y. Physics needs equal units on both
axes, so v2 simulates in **pixels**:

- A `ResizeObserver` on the hero root measures its width and height.
- Each node's home position is `base` (still authored as percentages in
  `graphNodes.ts`) multiplied by the measured size.
- After each tick, positions convert back to percentages for `livePositions`, so
  the template's `left: x%` / `top: y%` styling and the `0 0 100 100` SVG viewBox
  stay unchanged.
- On resize, home positions are recomputed and the simulation is briefly
  re-energised (alpha bump) so nodes settle into the new box.

### 3.3 Forces

| Force | d3 API | Purpose |
|---|---|---|
| **Home anchor** | `forceX` / `forceY` with per-node targets | Pulls each node toward its home. The target is `home + drift(t)` using v1's existing sine parameters, so ambient drift comes "for free" and v1's drift data stays useful. |
| **Edge springs** | `forceLink(graphEdges)` | Ring edges are stiffer; diagonals are weaker and slightly longer. Each edge's rest length is its home-to-home distance, so the graph's resting shape is the authored layout. |
| **Collision** | `forceCollide` | Radius from each node's measured label pill (half its width, plus padding), so labels never overlap mid-throw. |
| **Bounds** | small custom force | Pushes nodes back inside the hero box (inset by their radius) so nothing gets thrown off-screen. Clamping positions directly makes nodes stick to the edge, so this is a soft force. |

No many-body (charge) force: with a fixed authored layout, the anchors and
collision already do its job, and charge is the usual source of jitter.

### 3.4 Keeping it alive without burning CPU

d3 simulations "cool" (alpha decays) and stop when settled. v2 wants ambient
drift forever, so while the hero is visible and motion is allowed it holds a small
`alphaTarget` (starting value 0.02). During a drag the target rises (0.3) so the
whole graph reacts, and it drops back on release.

Cost: 4 nodes, 6 links, one collision quadtree, one tick per frame, which is
negligible. Pausing (tab hidden, hero off-screen) stops the rAF loop and so stops
ticking. On resume, the elapsed time used for drift is not allowed to jump: the
anchor clock advances by frame time, capped per frame, so nodes don't lurch
after a long pause.

### 3.5 Throw

On release, the node's velocity comes from the pointer's last ~50 ms of movement,
capped to a maximum speed so a hard flick doesn't fling nodes through the bounds.
`fx`/`fy` are cleared and the simulation takes over.

### 3.6 Starting parameters (to be tuned)

Starting values, not final ones. Tuning is a planned step (section 7).

| Parameter | Start |
|---|---|
| Anchor strength (`forceX/Y.strength`) | 0.06 |
| Ring link strength / diagonal link strength | 0.5 / 0.15 |
| Diagonal rest-length multiplier | 1.05 |
| `velocityDecay` | 0.35 |
| Idle `alphaTarget` / drag `alphaTarget` | 0.02 / 0.3 |
| Drag threshold | 6 px |
| Throw speed cap | 1.5 px per ms |
| Collision padding | 8 px |

All live in one exported `FORCE_PARAMS` object in the new physics module, so tuning
means editing one place.

---

## 4. Screen sizes, touch and reduced motion

| Context | Behaviour |
|---|---|
| Desktop / laptop (fine pointer) | Full v2: drift, drag, throw, click. |
| Tablet and large touch screens (≥ 640 px wide, coarse pointer) | Full v2 with touch drag. Nodes get `touch-action: none` so a drag on a node doesn't scroll the page. Empty space still scrolls. |
| Phones (< 640 px wide) | **Non-physics fallback**: drift and packet as v1, tap opens the full-screen terminal panel as v1, no drag. Nodes keep normal `touch-action`, so swiping over the hero scrolls the page. Dragging on a phone fights scrolling and the nodes are too close together to throw meaningfully. |
| `prefers-reduced-motion: reduce` | Same as v1: static nodes at home, static edges, no packet, no drag. The simulation is never created. |
| Ambient NavBar cluster | Unchanged from v1: static ring, no physics, no drag. |

Drag being enabled is decided by one computed value:
`!ambient && !prefersReducedMotion && matchMedia('(min-width: 640px)')`, with the
width check kept live (a `MediaQueryList` change listener) so rotating a tablet
switches mode cleanly.

When drag is not enabled, motion still comes from the simulation (anchor drift
only) wherever v1 would animate, so there's one motion system instead of two. The
v1 sine-of-time loop is deleted.

---

## 5. Accessibility

- Nodes stay real `<a href>` elements, focusable in DOM order, with the same
  focus ring. The focus ring is drawn on the moving element, so it follows the node.
- Dragging is decorative and pointer-only. It doesn't need a keyboard equivalent
  because it conveys no information and leads nowhere that Enter on the node
  doesn't already reach. No ARIA drag attributes (`aria-grabbed` is deprecated and
  would imply a functional drag-and-drop).
- Edges, packet and any drag visuals stay `aria-hidden`.
- `TerminalPanel`'s focus management is untouched.
- The `cursor: grab` / `grabbing` styling only applies when drag is enabled.

---

## 6. Architecture and files

The physics lives in a framework-free module so it can be unit-tested without a
DOM, and `HeroGraph.vue` stays the only component (the `ambient` prop API is
unchanged, so `Hero.astro` and `Layout.astro` don't change).

| File | Change |
|---|---|
| `src/components/graph/forceGraph.ts` (new) | Pure TS: builds the d3 simulation from `graphNodes` / `graphEdges` and a box size; exposes `tick(dtMs)`, `resize(w, h)`, `dragStart(id, x, y)`, `dragMove(x, y)`, `dragEnd(vx, vy)`, `positions()`, and `FORCE_PARAMS`. No Vue, no DOM. |
| `src/components/graph/forceGraph.test.ts` (new) | Settles to home within N ticks; dragged node follows the pointer; neighbours move when one is dragged; nodes return home after release; nodes stay inside bounds after a hard throw; throw speed is capped; resize moves the homes. |
| `src/components/graph/HeroGraph.vue` | Replace the sine loop with `forceGraph.tick()`. Add `ResizeObserver`, pointer handlers (down/move/up/cancel with pointer capture), drag threshold, click suppression, `dragEnabled` computed, `touch-action` and cursor classes. Packet logic unchanged. |
| `src/components/graph/HeroGraph.test.ts` | Existing tests stay green. Add: drag past the threshold doesn't open the panel; sub-threshold press does; no drag listeners under reduced motion, in the ambient cluster, or below 640 px. |
| `src/components/graph/graphNodes.ts` | No data changes expected. Comments updated: `drift` now drives the anchor target rather than the position directly. |
| `package.json` / lockfile | Add `d3-force` (and `@types/d3-force` as a dev dependency). |
| `documentation/ROADMAP.md`, `documentation/ARCHITECTURE.md` | Mark v2 done; describe the physics module. |

happy-dom has no real layout, so component tests stub `ResizeObserver` with a
fixed box size and drive pointer events directly. Physics correctness is tested in
`forceGraph.test.ts`, not through the DOM.

---

## 7. Feel tuning

The original spec flagged feel as where the real cost is. The plan builds it in as
explicit steps rather than an afterthought:

1. **Dev-only tuning panel.** When `import.meta.env.DEV` is true and the URL has
   `?graph-tune`, a small overlay exposes sliders bound to `FORCE_PARAMS`, plus a
   readout of FPS and the current alpha. It isn't included in production builds.
2. **Feel checklist**, run on a laptop trackpad, a mouse, an iPad/Android tablet,
   and a school Chromebook if one is available:
   - Slow drag: the node stays under the pointer with no visible lag
   - Fast flick: no tunnelling through other nodes, nothing leaves the box
   - Release: graph settles home in roughly 1–2 s without visible oscillation
   - Idle: drift looks like v1's (subtle, a few px, unsynchronised)
   - No jitter at rest (watch a node for 10 s)
   - Click without moving: opens the panel every time; drag never does
   - Tablet: dragging a node doesn't scroll; swiping empty space does
   - Chromebook: no dropped frames in the performance panel during a drag
3. Tuned values are committed back into `FORCE_PARAMS` with a short note on what
   changed and why.

Plan the work so v2 can merge with the drift-only behaviour even if tuning runs
long, behind a single `DRAG_ENABLED` constant. That way the physics refactor lands
in small reviewable steps and drag is switched on only when it feels right.

---

## 8. Amends earlier specs

- Original spec, "Hero / Graph Component → v2": now specified by this document.
  "Nodes route into real pages" is clarified: clicking opens the terminal panel as
  in v1, and the `<a href>` still routes to the real page for keyboard Enter
  fallback, middle-click and screen readers.
- Refinement spec, item 2: the drift is now driven by a simulation anchor rather
  than set directly. The visible idle motion is meant to match v1's.

## Out of scope

- **Base64/character ripple background.** Discussed 2026-10-16 and judged worth
  doing only as a follow-up after v2 ships. It would sit behind the hero, triggered
  by graph events (node drop, node click) rather than clicks on empty space, using
  CS-flavoured glyphs (hex/binary) rather than base64. It gets its own spec. v2
  builds no hooks for it.
- New nodes or edges, or changes to the authored layout.
- Physics in the ambient NavBar cluster.
- Any `@theme` token changes.

## Open questions

Each has a recommended default (in bold) that the plan will use unless told otherwise.

1. **After a drag, do nodes spring home or stay where dropped?** **Spring home.**
2. **Phones: drag or no drag?** **No drag below 640 px** (v1 behaviour).
3. **Dependency: `d3-force` or a hand-rolled simulation?** **`d3-force`**, ticked
   manually from our own loop.
4. **Should dragging a node briefly highlight its edges (e.g. edges brighten
   while held)?** **Yes, subtle**: connected edges go from 50% to 80% opacity
   during a drag. Small cost, makes the "springs" visible.
