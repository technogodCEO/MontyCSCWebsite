# Hero Ripple Field (Implementation Plan)

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A faint field of hex characters across the hero below the subhead.
Dropping a dragged node or opening a node's panel sends a ripple through it that
brightens and re-rolls the characters it passes.

**Architecture:** A DOM-free model (`rippleField.ts`) owns the glyph grid and
ripple maths and reports which cells changed each step. `RippleField.vue` is its
own island in `Hero.astro`: one canvas that redraws only changed cells, running a
rAF loop only while a ripple is active. `HeroGraph.vue` dispatches a `hero-ripple`
window event with the node's viewport centre and a strength.

**Spec:** `docs/superpowers/specs/2026-11-13-hero-ripple-field-design.md`
(hybrid extent and the architecture revisions are recorded there).

---

## Files touched

| File | Change |
|---|---|
| `src/components/graph/rippleField.ts` (new) | Model, seeded PRNG, `RIPPLE_PARAMS`, `RIPPLE_ENABLED`, event name/type |
| `src/components/graph/rippleField.test.ts` (new) | Model tests |
| `src/components/graph/RippleField.vue` (new) | Canvas island: layout below the subhead, DPR, edge masks, incremental drawing |
| `src/components/graph/RippleField.test.ts` (new) | Component tests with a faked section and 2D context |
| `src/components/sections/Hero.astro` | `relative isolate overflow-hidden`; `data-hero-subhead`; mounts the field |
| `src/components/graph/HeroGraph.vue` | `sendRipple()` on open (0.3) and drop (0.4–1 by throw speed) |
| `src/components/graph/HeroGraph.test.ts` | Ripple event tests |
| `src/components/graph/GraphTunePanel.vue` | Ripple sliders; "copy values" now copies both param blocks |
| `documentation/ARCHITECTURE.md`, `documentation/ROADMAP.md` | Describe the field |

Verification after each task: `npm run test && npm run lint`. Full gate at the end:
`npm run build && npm run test && npm run lint`.

---

## Task 0: Decide the extent

- [x] Prototype all three extents on the real homepage (graph box, whole section,
      hybrid) with an injected canvas; screenshot desktop and phone mid-ripple.
      Owner chose the hybrid.

## Task 1: Model (`rippleField.ts`)

- [x] Tests first: deterministic seed and hex-only glyphs; no work with no
      ripples; brightens near the wavefront and leaves far cells at exactly 0;
      re-rolls each cell at most once per ripple; returns exactly to rest; cap of
      3; weaker ripples die sooner; a full ripple ends in under 1.5 s; resize
      keeps overlapping glyphs; strength 0 is a no-op.
- [x] Implement. A hard cut-off at one band width keeps the Gaussian's tails from
      marking the whole grid dirty every frame.

## Task 2: Canvas island (`RippleField.vue`)

- [x] Find the section with `closest('section')` (Astro wraps islands in
      `<astro-island>`, so `parentElement` is wrong) and the subhead via
      `data-hero-subhead`; size the canvas from 8 px below the subhead to the
      section bottom.
- [x] Set the canvas CSS width/height explicitly: a canvas is a replaced
      element, so `top` and `bottom` alone would size it from its DPR-scaled
      backing store.
- [x] DPR capped at 2; `setTransform` and the font re-applied after every
      resize (resizing a canvas resets its state).
- [x] Masks: fade in over 80 px at the top, out at the left/right 15% and the
      bottom 15%; `-webkit-` prefixed for Safari.
- [x] Redraw the whole field after `document.fonts.load()` for JetBrains Mono.
- [x] Reduced motion: draw the rest field, ignore ripple events.
- [x] Tests (faked layout and 2D context): hidden canvas placed below the
      subhead; rest field drawn on mount with no loop started; a ripple event
      starts the loop; reduced motion ignores events; no listener after unmount
      (`enableAutoUnmount`, since every mount listens on `window`).

## Task 3: Triggers (`HeroGraph.vue`, `Hero.astro`)

- [x] `sendRipple(id, strength)` dispatches from the node's on-screen centre, only
      when `RIPPLE_ENABLED` and motion is allowed (so never in the ambient cluster).
- [x] Open: strength 0.3, after the post-drag click check, so a swallowed click
      sends nothing.
- [x] Drop: `0.4 + 0.6 × min(1, releaseSpeed / throwSpeedCap)`.
- [x] `Hero.astro`: section gets `relative isolate overflow-hidden` (the field's
      `-z-10` sits above the section background but behind content, and can't
      widen the page); subhead gets `data-hero-subhead`.
- [x] Tests: open sends one 0.3 ripple; drag-drop-click sends exactly one ripple
      in 0.4–1; none under reduced motion or in the ambient cluster.

## Task 4: Tuning panel

- [x] Ripple sliders bound to `reactive(RIPPLE_PARAMS)`, which mutates the
      shared object the field reads every frame.
- [x] "copy values" copies `{ FORCE_PARAMS, RIPPLE_PARAMS }`.
- [x] Confirmed the panel is still absent from the production build.

## Task 5: Verification

- [x] 84 tests pass; `npm run lint` and `npm run build` are clean.
- [x] Headless Chromium, 1280 × 900:
  - the field sits below the subhead, with no horizontal scroll;
  - a node drop and a node click each ripple;
  - the canvas is pixel-identical between two snapshots 1 s apart at idle (no
    idle drawing).
- [x] Reduced motion: field drawn, unchanged after a click.
- [x] Phone, 390 × 844 with touch: no horizontal scroll, and tapping a node ripples.
- [x] Three overlapping full ripples at 1920 × 1080 @2x: median frame 16.7 ms,
      p95 16.8 ms.
- [ ] **On-device check** (spec §5): trackpad, mouse, tablet, school
      Chromebook. Tune with `?graph-tune`; paste copied values into
      `RIPPLE_PARAMS`. If it can't be signed off, set `RIPPLE_ENABLED = false`.

## Task 6: Docs

- [x] Spec: approved status, hybrid extent, "Revisions during implementation".
- [x] `ARCHITECTURE.md`, `ROADMAP.md`.
