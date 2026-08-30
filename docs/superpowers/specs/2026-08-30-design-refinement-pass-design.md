# Design Refinement Pass — Design

**Date:** 2026-08-30
**Status:** Approved, ready for planning
**Branch:** `feat/design-refinement` (retargets to `main` once the `feat/site-foundation` → `main` PR merges)

Refinement of the shipped v1 foundation, raised after reviewing the site running
locally. Supersedes the "Design refinement pass" section of
`documentation/ROADMAP.md`. Three largely independent items, recorded together so
the shared decisions (palette usage, button treatment) stay consistent, then
split into separate implementation plans.

The original design record is
`docs/superpowers/specs/2026-08-22-montycsc-website-design.md`; this document
amends it where noted.

---

## 1. Kill light sections

### Problem

The original call — "leans dark, light sections used sparingly for
reading-heavy content" — isn't working in practice. Contrast reads poorly and the
`bg-warm-white` sections feel like a mismatch against the rest of the site. Only
three surfaces are actually light: the FAQ page, the sign-up page, and the FAQ
teaser on the home page.

### Decision

- **`bg-warm-white` as a background is removed entirely.** `warm-white` survives
  only as a text color on dark surfaces.
- The `body` default flips from `text-near-black bg-warm-white` to dark.
- The three dark treatments already present in the codebase carry every section:
  - near-black flat (`bg-near-black`) — the default "terminal" ground
  - deep-green flat (`bg-deep-green`) — the "reading" surface
  - deep-green panels on a near-black page — collections / repeating items
- **Which treatment a given section uses is a judgment call at implementation
  time**, chosen for contrast against its neighbours. No formal surface taxonomy,
  no alternation rule. The one specific call: FAQ questions render as bordered
  deep-green panels on a near-black page, so that page doesn't feel flat.

### Palette

Unchanged. No `@theme` token edits in `src/styles/global.css`. Roles:

| Token | Role |
|---|---|
| `accent-green` | primary — links, node/edge graphics, borders, secondary buttons, general UI |
| `near-black` | the dark ground (its own thing, not "a shade of green") |
| `warm-white` | primary text color on dark |
| `gold` | accent — primary CTA and true high-emphasis only; deliberately rare |
| `deep-green` | secondary dark surface |

### Simplification

The original spec's button rule had two branches: dark sections get the
terminal-style outlined button (`learn_more()` in JetBrains Mono), light sections
get a plain Inter outlined button. **With no light sections, the light branch is
deleted** — every button is a dark-section button.

### Files

- `src/styles/global.css` — `body` background/text
- `src/pages/faq.astro`
- `src/components/sections/FaqList.astro`
- `src/components/sections/FaqTeaser.astro`
- `src/pages/signup.astro`
- `src/components/sections/SignUpForm.vue`

### Amends original spec

- "Design System → Light/Dark": light sections are no longer part of the system.
- "Design System → Components → Buttons": drop the light-section button branch.
- "Color → Warm off-white": now a text color only, not a section background.

---

## 2. Hero graph — connecting edges + ambient animation

### Problem

The v1 hero renders nodes with no visible edges — the "graph" part of the
network/graph motif doesn't read. It's also fully static.

This is **not** the v2 force-directed graph (still roadmap). Nodes stay
fixed-position; we add edges and lightweight ambient motion.

### Topology

Near-mesh over the existing four nodes (Workshops / Hackathons / Guest Talks /
Showcase):

- 4 ring edges (workshops–hackathons–showcase–guest_talks–workshops)
- 2 diagonal edges (workshops–showcase, hackathons–guest_talks), rendered fainter
  than the ring

No new central node. The four flagship categories connect to each other.

### Node positions

The current fixed positions in `HeroGraph.vue` (`fullPositions`) are near-
symmetric, which with mesh edges reads as an X-in-a-box. Replace with
deliberately irregular offsets so the mesh reads as an organic graph. The compact
`ambientPositions` are unaffected.

### Architecture change

`HeroGraph` moves from CSS-class-string positioning to **numeric coordinates in
reactive state**:

- Each node has a base `{x, y}` plus per-node drift parameters (own phase,
  amplitude, frequency for x and y — a sine/cosine of elapsed time).
- A single `requestAnimationFrame` loop updates a reactive array of current
  `{x, y}` per node each frame.
- Node `<a>` elements are positioned from that state (e.g. `translate()`), and
  the SVG `<line>` elements bind `x1/y1/x2/y2` to the same state — so edges stay
  attached to node centres as they drift.
- Edge list (which pairs connect, and ring-vs-diagonal styling) is static data,
  co-located with `graphNodes` (e.g. `graphEdges` in `graphNodes.ts`).

Cost: 4 nodes + 6 lines + 1 packet, one rAF loop. Trivial. The loop should also
pause when the tab is hidden (`document.visibilitychange`) and when the graph is
scrolled out of view (`IntersectionObserver`) to protect battery, per the
existing "cheap enough to run ambiently" constraint.

### Animation — full hero only

- **Individual node drift** — continuous, subtle (a few px), each node on its own
  slow loop. Edges follow.
- **Traveling packet** — a single gold dot traverses one edge at a time.
  Stochastic: random edge from the full set (ring + diagonals), random direction
  along it, randomised delay between packets (~3–7s). Never more than one at once.
  Gold is acceptable here because the packet is infrequent and small — scarcity
  is preserved.

### Ambient nav version

Static ring edges only. No drift, no packet — the nodes are ~2px a few px apart,
so motion there is invisible noise. The `ambient` prop already branches
presentation; this is another branch.

### Reduced motion

`prefers-reduced-motion: reduce` → the rAF loop never starts. Nodes sit at base
coordinates, edges render static, no packet. (Matches the existing
`skipEntranceAnimation` pattern, which is checked synchronously for correct first
render.)

### Accessibility

Unchanged from v1: nodes are real focusable `<a>` elements with `href` to the
real page; edges and packet are decorative SVG with no semantic role. The graph
remains keyboard/screen-reader navigable exactly as now.

### Files

- `src/components/graph/HeroGraph.vue` — major rework (coordinate state, rAF
  loop, SVG edge layer, packet, irregular positions, visibility/IO pausing)
- `src/components/graph/graphNodes.ts` — add `graphEdges` data; node base
  coordinates as numbers
- `src/components/graph/HeroGraph.spec.ts` (or equivalent) — update for the new
  structure; assert edges render, reduced-motion yields static output, ambient
  version has no packet

### Amends original spec

- "Hero / Graph Component → v1": v1 now includes static-position nodes **with
  visible edges and ambient drift + packet animation**. The "fixed-position
  nodes (no physics simulation)" wording stands — drift is authored motion, not
  simulation.

---

## 3. CLI / terminal motif — make it pervasive

### Problem

The terminal motif only appears in the graph's terminal panels. It should be a
site-wide texture.

### `>` prompt prefix

A static `> ` prefix on every `h1` and `h2` site-wide, via CSS `::before`
(JetBrains Mono, `accent-green`). Always rendered — present regardless of whether
the typewriter animation runs. `h3` and below get the prefix too but no
animation.

### Typewriter headings

Scope: **`h1` and section `h2` only.**

- `h1` types in on initial load.
- `h2` types in when scrolled into view — `IntersectionObserver`, fires once,
  threshold ~15% visible.
- `h3`+ never animate.
- Typing speed brisk (not a slow reveal); a block cursor (`▋`) shows during
  typing and is removed on completion.

**Accessibility:**

- The real heading text is always in the DOM as the element's accessible name
  (`aria-label` on the heading, or an `sr-only` copy), so screen readers announce
  the complete heading immediately — never a partial/gibberish string.
- The animated character reveal lives in an `aria-hidden="true"` span.
- `prefers-reduced-motion: reduce` → full text renders instantly, no cursor, no
  `IntersectionObserver` gating. The `>` prefix stays.

Implementation: a shared component — `src/components/ui/CliHeading.astro` for the
static-rendered case, driving a tiny client script for the animation, or a small
Vue island if that's cleaner for the IO + reduced-motion logic. The component
takes the heading level and text. Sections/pages migrate their raw `<h1>`/`<h2>`
to it.

### Secondary button hover-retype

The terminal-style secondary buttons (JetBrains Mono, `fn()` labels) retype their
label to an authored command string on hover:

| Base | Alt (on hover) |
|---|---|
| `learn_more()` | `cd ./activities` |
| `see_projects()` | `open ./showcase` |
| `read_faq()` | `man montycsc` |
| `sign_up()` | `./join --now` |

- Each button owns its own base/alt pair (a prop) — the alt is a meaningful
  command for that action, not always `cd`.
- Animation is fast (~12ms/char): near-instant delete of the base, then quick
  retype of the alt. Reverse on mouse-leave.
- Accessible name is constant via `aria-label` (the human label, e.g.
  "Learn more"); the visual animated label is `aria-hidden`.
- No hover on touch → plain label. `prefers-reduced-motion` → plain label with
  the existing color/border hover, no retype.

Implementation: a shared button component / variant —
`src/components/ui/CliButton.astro` (or `.vue` if the retype logic wants a
component island). Existing terminal-style buttons migrate to it.

### Primary CTA hover

The gold primary CTA does **not** retype — label stays "Sign Up", gold stays
gold. Its hover treatment: a `>` slides in from the left, the label shifts right
to make room, and the `>` blinks (cursor-style) once in place. This deliberately
echoes the heading prefix so the CTA and the headings share one gesture, while
staying distinct from the secondary retype.

`prefers-reduced-motion: reduce` → the `>` appears static (no slide, no blink).

### Files

- `src/styles/global.css` — `h1`/`h2`/`h3` `::before` prefix
- `src/components/ui/CliHeading.astro` (new) — typewriter heading
- `src/components/ui/CliButton.astro` (new) — secondary retype button
- `src/components/ui/` — primary CTA button treatment (new component or extend
  existing)
- small shared util for `IntersectionObserver` + reduced-motion detection
- every section/page rendering an `h1`/`h2` or a secondary/primary button:
  `Hero.astro`, `WhatWeDo.astro`, `ShowcaseHighlights.astro`, `WhyJoin.astro`,
  `FaqTeaser.astro`, `JoinCta.astro`, `FaqList.astro`, all `src/pages/*.astro`,
  `SignUpForm.vue`

This is the widest-touching of the three items.

### Amends original spec

- "Design System → Components → Buttons": secondary buttons gain a hover-retype
  behaviour; primary CTA gains a `>`-slide hover.
- New: "Design System → Typography" — headings carry a `>` prefix and a
  typewriter-in behaviour (h1/h2), with the a11y contract above.

---

## Delivery

One shared spec (this document), then three separate implementation plans, each
its own PR, all branched off `feat/design-refinement`:

| Plan | Scope | Depends on |
|---|---|---|
| **A — Kill light sections** | Item 1. Small, foundational. | — |
| **B — CLI/terminal motif** | Item 3. Widest-touching. | A (button treatment lands on dark-only buttons) |
| **C — Hero graph edges + animation** | Item 2. Self-contained. | — (any order) |

`feat/design-refinement` is currently based on `feat/site-foundation`. Once the
`feat/site-foundation` → `main` PR merges, the branch (and any open plan
branches) retarget to `main`.

## Out of scope

- v2 force-directed draggable graph — still roadmap.
- Any `@theme` token value changes.
- Reworking the FAQ/sign-up *copy* — only their surfaces change.
- A new central graph node.
