# Hero Ripple Field (Design)

**Date:** 2026-11-13
**Status:** Draft. Open questions at the end need an answer before planning.
**Branch:** `claude/happy-hopper-mkbbui`

A faint field of monospace characters behind the hero graph. Graph events send a
ripple through it: the wavefront brightens the characters it passes and re-rolls
them, like memory being rewritten.

This was raised on 2026-10-16 after seeing a similar effect in the Claude desktop
app. The decision then, recorded in the v2 spec's "Out of scope"
(`docs/superpowers/specs/2026-10-16-hero-graph-v2-force-graph-design.md`), was
that it's worth doing only if it:

- **serves the graph instead of competing with it**: ripples come from graph
  events, never from clicks on empty space;
- **uses CS-flavoured glyphs** rather than base64, so it reads as ours rather
  than borrowed;
- **comes after v2**, which shipped in technogodCEO/MontyCSCWebsite#9 and was
  signed off on real devices 2026-11-12.

This document turns those constraints into concrete decisions.

---

## 1. What the visitor sees

| Moment | Field behaviour |
|---|---|
| Page load / idle | A static grid of hex characters at very low opacity behind the graph. **Nothing animates**: there's no idle cost. |
| Drop a dragged node | A ripple spreads from where the node was released. Its strength scales with the throw speed: a gentle set-down gives a small ripple, a flick a bigger one. |
| Click / tap a node (panel opens) | A smaller, quicker ripple from that node. The same happens when the panel is opened with keyboard Enter, so keyboard users get the same feedback. |
| Anything else (empty-space clicks, scrolling, hovering) | Nothing. |

The field is a texture, not content: it carries no information and is never
something to read.

### Look

- **Glyphs:** lowercase hex, `0–9 a–f`, in JetBrains Mono (`--font-mono`), the
  same face as the terminal panels.
- **Colour:** `accent-green` only. At rest, about 6% opacity. At a ripple's
  wavefront, up to about 35%. No gold: gold stays reserved for the CTA and the
  packet.
- **Cell size:** about 12 px type on a roughly 8 × 16 px grid. A 1000 × 420 hero
  is about 125 × 26 ≈ 3,300 cells.
- **Edges:** the field fades out toward the hero box's edges (a CSS
  `mask-image` gradient), so it reads as a haze around the graph rather than a
  hard rectangle of text.
- **Wavefront:** a ring about 40 px wide that expands at about 0.6 px/ms and
  fades as it grows. A cell brightens as the ring crosses it and re-rolls its
  glyph once, at the moment of peak brightness, then fades back to rest opacity
  with its new character. The field slowly accumulates changes, which is the
  "memory being rewritten" idea.

---

## 2. Rules that keep it from competing

- **Only graph events trigger ripples** (node drop, node open). Clicks on empty
  space do nothing, which also keeps v2's rule that empty space stays free for
  page scrolling on touch screens.
- **At most 3 ripples at once.** A fourth replaces the oldest, so rapid clicking
  can't flood the field.
- **The field sits behind everything.** Layer order, bottom to top: field canvas,
  edge SVG, packet, nodes, terminal panel. Node pills already have an opaque
  `bg-near-black` background, so labels stay fully legible.
- **It never touches the headline or subhead.** The field fills only the
  `HeroGraph` box, not the whole hero section.
- **The edges stay readable.** At rest the glyphs (about 6%) sit well under the
  diagonal edges (25%) and ring edges (50%); at a wavefront peak (35%) they
  briefly approach the diagonals, which is acceptable for a moment of motion.

---

## 3. Contexts

| Context | Behaviour |
|---|---|
| Full hero, motion allowed (any width) | Static field plus ripples. Phones get ripples on tap too: tapping is how the panel opens there, and v2's phone fallback only removed drag. |
| `prefers-reduced-motion: reduce` | Static field only, no ripples. The rest state is fully static, so it's safe to show. |
| Ambient NavBar cluster | No field at all (the box is about 80 × 32 px). |
| Before hydration / no JS | The canvas is empty, so the hero looks exactly as it does today. |
| Tab hidden / hero off-screen | Nothing to pause at idle. A ripple in flight stops with the graph loop, and the field is redrawn at rest when the loop resumes. |

A `RIPPLE_ENABLED` constant in `HeroGraph.vue` turns the whole feature off,
field included, in one line, mirroring v2's `DRAG_ENABLED`.

---

## 4. Architecture

Same split as v2: a framework-free model that's unit-testable, plus a thin
rendering component.

### 4.1 `rippleField.ts` (new, pure TS)

- `createRippleField({ cols, rows, seed })`: the glyph grid. Uses a small seeded
  PRNG (mulberry32), so tests and server-free first paint are deterministic.
- `addRipple(x, y, strength)`: x and y in px; strength 0–1 controls the ripple's
  maximum radius and peak brightness. Enforces the 3-ripple cap.
- `step(dtMs)`: advances every ripple, re-rolls the glyphs the wavefront has just
  passed, and retires finished ripples. Returns the list of **dirty cells** (those
  whose brightness or glyph changed this frame), so the renderer only redraws those.
- `intensityAt(col, row)`: current brightness, 0 = rest.
- `isActive()`: whether any ripple is still running.
- `resize(cols, rows)`: keeps the existing glyphs where the grid overlaps and
  seeds new cells.

### 4.2 `RippleField.vue` (new)

- One `<canvas>`, `aria-hidden="true"`, `pointer-events-none`, absolutely
  positioned to fill `HeroGraph`'s root as its first child.
- Sized for `devicePixelRatio`, so glyphs stay crisp on high-DPI screens.
- **Rest layer cached.** The full rest grid is drawn once to an offscreen canvas
  (after `document.fonts.ready`, so the fallback font is never cached), and again
  on resize. While a ripple runs, each frame copies the cached rest layer onto the
  visible canvas and draws only the dirty cells on top. When the last ripple ends,
  one final copy restores the rest state and drawing stops.
- Exposes `ripple(xPx, yPx, strength)` and `frame(dtMs)` through `defineExpose`.

### 4.3 `HeroGraph.vue` changes

- Mounts `<RippleField ref="field">` when `!ambient && RIPPLE_ENABLED`.
- **One loop, as in v2.** The existing rAF `tick` calls `field.frame(dt)`.
  The field has no timer of its own.
- **Triggers:**
  - In `endPress`, after `graph.dragEnd(vx, vy)`: ripple at the node's
    position. Strength comes from the throw speed:
    `0.4 + 0.6 × min(1, speed / throwSpeedCap)`.
  - In `selectNode`, when a panel actually opens (not on the swallowed
    post-drag click): ripple at the node, strength 0.3.
- Under reduced motion `animated` is false and no loop runs. The field still
  mounts and draws its rest layer once; `ripple()` is a no-op.

### 4.4 Tuning

The `?graph-tune` dev panel gains a "ripple" section: rest opacity, peak opacity,
wave speed, band width, and max radius. These live in a `RIPPLE_PARAMS` object
next to `FORCE_PARAMS`, with the same "copy values" flow.

---

## 5. Performance budget

| Item | Cost |
|---|---|
| Idle | Zero: no per-frame work, one cached bitmap on screen. |
| One ripple frame | One `drawImage` (the cached rest layer) plus `fillText` for the dirty cells, which at the wavefront is roughly a few hundred cells at most. |
| Memory | Two hero-sized canvases (visible plus cache) at device pixel ratio. At 1000 × 420 × DPR 2 that's about 3.4 MB each. Acceptable; DPR is capped at 2 to bound it on 3× phones. |

Acceptance on the same devices as v2's feel check (school Chromebook included):
no dropped frames in the performance panel during a ripple overlapping a drag.

---

## 6. Accessibility

- The canvas is `aria-hidden` with no accessible content; screen readers see no
  change from today.
- Ripples are short (under about 1.5 s), single, and low-contrast: no flashing,
  far below WCAG 2.3.1's three-flashes threshold.
- Reduced motion keeps only the static field (section 3).
- No new focusable elements; keyboard Enter on a node triggers the same small
  ripple as a click.

---

## 7. Files

| File | Change |
|---|---|
| `src/components/graph/rippleField.ts` (new) | Grid model, seeded PRNG, ripple maths, dirty-cell tracking, `RIPPLE_PARAMS` |
| `src/components/graph/rippleField.test.ts` (new) | Deterministic seed; ripple cap of 3; wavefront re-rolls each cell at most once per ripple; field returns exactly to rest when idle; `step` with no ripples reports no dirty cells; resize keeps overlapping glyphs |
| `src/components/graph/RippleField.vue` (new) | Canvas rendering, DPR sizing, cached rest layer |
| `src/components/graph/HeroGraph.vue` | Mount the field, call `frame(dt)` from `tick`, trigger on drop and on open, `RIPPLE_ENABLED` |
| `src/components/graph/HeroGraph.test.ts` | Field present in full hero, absent in ambient; a drag-and-drop and a node open each call `ripple`; the post-drag swallowed click does not; reduced motion mounts the field but triggers nothing |
| `src/components/graph/GraphTunePanel.vue` | Ripple sliders |
| `documentation/ARCHITECTURE.md`, `documentation/ROADMAP.md` | Describe the field; mark done |

happy-dom has no real canvas, so the component tests stub `getContext` and assert
calls, not pixels. Visual checks happen in a real browser (Playwright screenshots
mid-ripple plus the device check in section 5).

---

## Out of scope

- Ripples from anything other than graph events (empty-space clicks, scroll,
  cursor trail).
- The field anywhere outside the hero graph box, including other pages.
- Colour other than `accent-green`.
- WebGL; Canvas 2D is enough at this cell count.

## Open questions

Each has a recommended default (in bold) that the plan will use unless told otherwise.

1. **Glyph set:** hex, binary (`0`/`1`), or short code fragments? **Hex**: denser
   texture than binary, and unlike code fragments it never tempts anyone to read it.
2. **Show the field at rest, or only during a ripple?** **At rest, very faint
   (about 6%)**, so the ripple has something to travel through and the hero gains
   depth even when idle.
3. **Should the gold packet arriving at a node send a tiny ripple?** **No**: it
   would make the field animate every 3–7 s on its own, costing the zero-idle
   budget and diluting the link between ripples and what the visitor did.
4. **Field extent:** just the graph box, or the whole hero section behind the
   headline too? **Graph box only**: the headline stays on a clean background.
