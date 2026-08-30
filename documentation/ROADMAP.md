# State & Roadmap

Where the site-foundation build stands, and what comes after it. For the detailed
step-by-step, see the [implementation plan](../docs/superpowers/plans/2026-08-22-site-foundation-plan.md);
for the underlying design decisions, see the [design spec](../docs/superpowers/specs/2026-08-22-montycsc-website-design.md).

> This file describes chunk-level status at a point in time — it will drift as work
> lands. Treat the plan doc's checkboxes as the source of truth for step-level detail;
> this is the human-readable summary.

## Current state (site-foundation milestone)

| Chunk | What it delivers | Status |
|---|---|---|
| 1. Scaffold & Tooling | Astro+Vue+Tailwind project, CI, lint/test/build scripts | ✅ Done |
| 2. Design Tokens & Layout | `@theme` tokens, shared `Layout.astro`, NavBar, Footer | ✅ Done |
| 3. Content Collections | Zod-validated `officers`/`workshops`/`events`/`showcase` collections + placeholder entries | ✅ Done |
| 4. Hero v1 Graph Component | `HeroGraph.vue`/`TerminalPanel.vue`, fixed-position nodes, a11y fallback, reduced-motion support, persists across nav | ✅ Done |
| 5. Pages | All sitemap pages (home, activities, events, showcase, officers, FAQ) with real copy + section components | ✅ Done |
| 6. Sign-Up Form | `SignUpForm.vue` + `/api/signup` route (honeypot, rate limit; Sheets write stubbed) | ✅ Done |
| 7. Contribution Docs | `CONTRIBUTING.md` for non-technical editors | ✅ Done |

All 7 chunks of the site-foundation plan are complete.

Also done, outside the original plan: `documentation/ARCHITECTURE.md` (technical
reference), this file, and a root `README.md`, added at project-owner request.

## Known gaps / deliberate placeholders (launch-blocking, tracked)

These are intentional per the design spec — not bugs — but need real values before
public launch:

- **Sign-up backend** — `/api/signup` logs submissions instead of writing to Google
  Sheets, until the club provisions a Google Cloud service account and its
  credentials are set as Vercel env vars (`GOOGLE_SERVICE_ACCOUNT_EMAIL`,
  `GOOGLE_SERVICE_ACCOUNT_KEY`, `TARGET_SHEET_ID`).
- **Real content** — officer names/photos, exact workshop schedule, real event dates,
  and real social links (Instagram/Facebook/Linktree) are all placeholder values
  marked with `<!-- PLACEHOLDER -->` / `<!-- TODO -->` comments in the content files
  and `Footer.astro`.
- **Showcase assets** — trailer video and gallery photos from the last MontyHacks
  need to be dropped into `public/showcase/` (see `public/showcase/README.md`) — the
  page is built to degrade gracefully without them.
- **Production domain** — `astro.config.mjs`'s `site` field is a placeholder
  (`https://montycsc.example.com`), needed for correct sitemap/OG URLs.
- **Vercel project connection** — one-time dashboard action (connect the GitHub repo
  to a Vercel project), not a code change; not done as part of this build.

## Roadmap beyond this milestone

Not scoped into the current build — captured here so they aren't lost, not because
work has started on any of them:

- **v2 draggable force-graph hero** — the current hero graph (Chunk 4) uses fixed
  node positions with no physics simulation. A v2 with a real force-directed,
  draggable graph is an explicit roadmap item per the design spec, deferred to keep
  v1 shippable.
- **Lightweight page-view analytics** — the spec suggests Vercel Analytics as an
  optional later add if the club wants traffic-level insight beyond sign-up-count
  (the simplest v1 success metric: rows in the sign-up sheet).
- **Real Google Sheets integration** — see "Known gaps" above; this is the natural
  next step once the club has the credentials.

### Design refinement pass (specced 2026-08-30, plans ready)

Raised after seeing the v1 foundation running locally. Now designed and planned:
see [the design spec](../docs/superpowers/specs/2026-08-30-design-refinement-pass-design.md)
and three implementation plans in `docs/superpowers/plans/` (`2026-08-30-refinement-{a,b,c}-*.md`).
Delivered as three independent PRs off `feat/design-refinement`:

- **A — kill light sections** (foundational, lands first)
- **B — pervasive CLI/terminal motif** (`>`-prefixed typewriter headings, secondary
  button hover-retype, primary CTA `>`-slide; depends on A)
- **C — hero graph edges + ambient animation** (near-mesh edges, per-node drift,
  stochastic packet; independent)

Original notes below, retained for context.

- **Reconsider light sections almost entirely.** The original "leans dark, light
  sections used sparingly for reading-heavy content" call isn't working in practice —
  contrast reads poorly and light sections feel like a mismatch against the rest of
  the site. Lean toward killing white/light backgrounds much more aggressively than
  originally planned; likely means reworking FAQ and any other light-section content
  to work on dark backgrounds instead, rather than tuning the existing light palette.
- **Hero graph needs visible connecting lines between nodes, plus real animation.**
  Currently the nodes render without visible edges connecting them — the "graph" part
  of the network/graph motif isn't actually reading as a graph. Add SVG (or similar)
  lines between nodes, and some form of ambient animation (subtle motion/pulse on the
  lines or nodes) so it doesn't feel static. Needs to still respect
  `prefers-reduced-motion` and stay cheap enough to run ambiently, per the existing
  performance constraints.
- **The CLI/terminal motif is underrepresented outside the graph's terminal panels.**
  Ideas to make it more pervasive across the site:
  - Headings draw in with a typewriter effect by default, prefixed with a `>` prompt
    symbol (CLI-style), consistent everywhere a heading appears.
  - For headings further down a page, the typewriter animation triggers on scroll
    into view rather than only on initial load.
  - Buttons get a CLI-themed typewriter animation on hover, retyping to different
    text (like a terminal command changing) rather than a simple color/opacity hover
    state.

  None of these are scoped or feasibility-checked yet (e.g. the pervasive
  typewriter-heading idea has real accessibility implications — screen readers and
  `prefers-reduced-motion` need real thought before this goes further, similar to how
  the v2 graph's mobile/a11y requirements were worked out before greenlighting it).

### Sign-up: temporary external Google Form

Decided but not yet actioned: point sign-up traffic at an external Google Form for
now (URL not finalized yet) rather than launching on the custom form + unconfigured
Sheets backend. When the URL is ready: swap the NavBar/CTA links to it, keep
`signup.astro` / `SignUpForm.vue` / `/api/signup` fully intact but unlinked from
navigation (dormant, not deleted) so it's a one-line change to flip back later.

## Contributing to this file

If you land a chunk (or take on roadmap work), update the relevant table row/section
in the same PR — keep this file reflecting reality, not the plan's intent.
