# Hero Graph v2: Draggable Force Graph (Implementation Plan)

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hero graph's authored sine drift with a `d3-force` simulation
that visitors can drag and throw, keeping v1's click-to-open terminal panel,
accessibility, reduced-motion and ambient-cluster behaviour unchanged.

**Architecture:** A framework-free physics module (`forceGraph.ts`) wraps a stopped
d3 simulation and is stepped from `HeroGraph.vue`'s existing rAF loop at a fixed
60 Hz. It works in pixels; `HeroGraph` converts back to the percentages the
template already uses. Pointer handlers on the node `<a>` elements turn a press into
a drag after 6 px and swallow the click that follows a drag.

**Tech stack:** Vue 3 `<script setup>` + TypeScript, `d3-force` v3, Vitest +
happy-dom + `@vue/test-utils`.

**Spec:** `docs/superpowers/specs/2026-10-16-hero-graph-v2-force-graph-design.md`

---

## Files touched

| File | Change |
|---|---|
| `package.json`, `package-lock.json` | add `d3-force`, dev `@types/d3-force` |
| `src/components/graph/forceGraph.ts` (new) | physics module and `FORCE_PARAMS` |
| `src/components/graph/forceGraph.test.ts` (new) | physics unit tests |
| `src/components/graph/HeroGraph.vue` | simulation loop, ResizeObserver, pointer drag, edge highlight, tune panel hook |
| `src/components/graph/HeroGraph.test.ts` | drag/click and gating tests |
| `src/components/graph/GraphTunePanel.vue` (new) | dev-only sliders + FPS readout |
| `documentation/ARCHITECTURE.md`, `documentation/ROADMAP.md` | describe v2 |

Verification after each task: `npm run test && npm run lint`. Full gate at the end:
`npm run build && npm run test && npm run lint`.

---

## Task 1: Dependency

- [x] Add `d3-force@^3` and dev `@types/d3-force@^3`. Use npm 11
      (`npx npm@11 i …`): npm 10 strips the `libc` fields from the existing
      lockfile and produces a noisy diff.

## Task 2: Physics module (`forceGraph.ts`)

- [x] Write `forceGraph.test.ts` first:
  - rests exactly at home with drift off (no jitter after 10 s)
  - a dragged node follows the pointer exactly
  - dragging one node moves its ring neighbours
  - after release every node is back within 3 px of home in 2 s
  - a hard throw never leaves the box (checked every frame for 3 s)
  - throw speed is capped
  - dragging past the box edge keeps the node inside
  - resize moves homes to the new box
  - with drift on, every node moves but stays within 40 px of home
  - a 60 s frame (tab was hidden) doesn't lurch
- [x] Implement: `createForceGraph(nodes, edges, w, h, params)` returning
      `tick`, `resize`, `setNodeSizes`, `dragStart/Move/End`, `positions`,
      `applyParams`. Custom anchor force (d3's `forceX` caches targets, so it can't
      drift), `forceLink` with rest length equal to the home distance,
      `forceCollide` with radius capped at half the nearest home distance, a soft
      bounds force plus a hard clamp, alpha held at 1.
- [x] Found while testing: a longer "slack" rest length for diagonals pushed nodes
      ~4 px off home, because d3 springs push as well as pull. Removed the
      parameter; the spec is updated.

## Task 3: Wire the simulation into `HeroGraph.vue`

- [x] Replace the sine-of-time position update with `graph.tick(dt)` +
      `syncPositions()` (px → %). `dt` is 0 on the first frame after a restart.
- [x] Create the graph once the root has a real size (`getBoundingClientRect` on
      mount, then `ResizeObserver`). A zero size (no layout / tests) leaves nodes at
      their resting percentages, so the existing reduced-motion and SSR tests still
      hold.
- [x] Measure label pills for collision/bounds on mount, on resize and after
      `document.fonts.ready`.
- [x] Packet logic unchanged (it reads the same live positions).

## Task 4: Drag

- [x] Tests first in `HeroGraph.test.ts` (`matchMedia` mock now also answers the
      `(min-width: 640px)` query):
  - wide screen: nodes get `touch-none`
  - drag past the threshold → no panel
  - press moving < 6 px → panel opens
  - after a drag, the next plain click opens the panel
  - while dragging, the held node's 3 edges are at `opacity-80`, and none after release
  - phone width, reduced motion, ambient cluster: no `touch-none`, no drag
- [x] `dragEnabled = DRAG_ENABLED && animated && wideEnough && !activeNodeId`.
      `wideEnough` is set in `onMounted` (not during setup) and kept live via a
      `change` listener, to avoid a hydration class mismatch.
- [x] Pointer handlers: `pointerdown` (primary button only, pointer capture,
      resets a stale `didDrag`), `pointermove` (threshold, then `dragStart` from the
      press origin so the node doesn't jump, `dragMove`, velocity samples over the
      last 50 ms), `pointerup` (throw), `pointercancel` (release without throw).
- [x] `selectNode` swallows the one click after a drag.
- [x] `draggable="false"` + `@dragstart.prevent` so the browser's native
      link-drag doesn't hijack the gesture; `touch-none select-none cursor-grab`
      only when drag is enabled.

## Task 5: Dev tuning panel

- [x] `GraphTunePanel.vue`: sliders bound to a reactive copy of `FORCE_PARAMS`,
      FPS readout, "copy values" button. Shown with `?graph-tune`, loaded through
      `defineAsyncComponent` behind `import.meta.env.DEV`.
- [x] Confirmed the production build output contains no trace of it.

## Task 6: Verification

- [x] `npm run test` (all suites), `npm run lint`, `npm run build` clean.
- [x] Headless Chromium at 1280 × 900: dragging Showcase moves it with the
      pointer, release returns it home, no panel opens after the drag, a plain
      click opens it. At 390 × 844 (touch): no drag classes. The only hydration
      warning is the pre-existing `slot="ambient-graph"` one, also present on `main`.
- [ ] **Feel checklist on real hardware** (spec §7): laptop trackpad, mouse,
      iPad/Android tablet, school Chromebook. Tune with `?graph-tune`, then paste
      the copied values into `FORCE_PARAMS`. If tuning runs long, set
      `DRAG_ENABLED = false` and merge with drift only.

## Task 7: Docs

- [x] `ARCHITECTURE.md`: describe `forceGraph.ts`, drag rules and the tune panel;
      drop "no physics" from the out-of-scope list.
- [x] `ROADMAP.md`: mark v2 built; add the character-ripple follow-up.
- [x] Spec: mark approved, record the two implementation-time revisions (constant
      alpha, no diagonal slack).

---

## Done when

- All automated checks pass and the feel checklist is signed off on real devices.
- Keyboard and screen-reader behaviour is unchanged from v1.

## Out of scope

The character ripple background (separate follow-up spec), new nodes or edges,
and physics in the NavBar cluster.
