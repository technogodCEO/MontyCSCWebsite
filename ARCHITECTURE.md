# Architecture

Technical reference for developers working on this codebase. For the "why" behind
these decisions, see [`docs/superpowers/specs/2026-08-22-montycsc-website-design.md`](docs/superpowers/specs/2026-08-22-montycsc-website-design.md).
For non-technical content edits, see [`CONTRIBUTING.md`](CONTRIBUTING.md) instead —
this doc assumes you're changing code, not just a workshop schedule.

## Stack

- **[Astro](https://astro.build)** (v7) — static-first site generator, file-based
  routing under `src/pages/`. Every page ships as static HTML by default; no backend
  unless a route opts out (see the sign-up API route, planned in Chunk 6).
- **[Vue 3](https://vuejs.org)** — the only place with client-side interactivity is
  the hero graph (`src/components/graph/`), mounted as an Astro "island" via
  `client:load`. Everything else is plain `.astro` components (server-rendered only).
- **Tailwind CSS v4** — CSS-first config. There is **no `tailwind.config.mjs`** — all
  design tokens (colors, fonts) are declared directly in `src/styles/global.css` via
  an `@theme` block, which Tailwind auto-generates utility classes from (e.g.
  `--color-deep-green` → `bg-deep-green` / `text-deep-green`). If you need a new
  color/font/spacing token, add it there, not in a config file.
- **Zod**, via Astro content collections — schema-validated Markdown content (see
  Content Collections below).
- **Vitest** + `@vue/test-utils` + `happy-dom` — unit/component tests, config in
  `vitest.config.ts` (delegates to Astro's own Vite config via `getViteConfig`).
- **ESLint (flat config) + Prettier** — `eslint.config.js`, `.prettierrc.json`.
- **GitHub Actions** (`.github/workflows/ci.yml`) — lint + test + build on every PR.
- **Vercel** — deployment target (not Netlify — see project memory: the team
  migrated away from Netlify generally).

## Directory layout

```
src/
  components/
    graph/        Vue island: the hero/ambient node graph (client-side)
    sections/     Astro, page-section building blocks (WhatWeDo, Hero, etc.) — planned
    ui/            Astro, shared chrome: NavBar, Footer, OfficerCard (planned)
  content/
    officers/      one .md file per officer
    workshops/     one .md file per weekly workshop
    events/        one .md file per event (MontyHacks, ACSL, guest talks)
    showcase/      one .md file per showcase project
  content.config.ts   Zod schemas + collection loaders for the above
  layouts/
    Layout.astro    the one shared page shell — NavBar + slot + Footer
  pages/            file-based routes (currently just index.astro; activities/
                    events/showcase/officers/faq/signup are planned per the
                    site-foundation plan, Chunk 5-6)
  styles/
    global.css      Tailwind import + @theme design tokens
```

## Page composition pattern

Every page is `Layout.astro` + section components + a `getCollection()` call, kept
deliberately thin — pages compose, they don't contain logic. `src/pages/index.astro`
is the only page that exists so far; it's the template to copy for new routes.

`Layout.astro` is the single shared shell: it renders `<NavBar>`, a default `<slot />`
for page content, and `<Footer>`. All `<head>` meta (title, description, Open Graph,
Twitter card) is set here via `Props` (`title`, optional `description`) — pages don't
manage their own `<head>`.

## The hero graph (`src/components/graph/`)

This is the one non-trivial interactive piece and the one Vue component tree in the
codebase. It's a fixed-position "node graph" (v1 — no physics/dragging, see
"Not in scope" below) representing site sections (Workshops, Hackathons, Guest Talks,
Showcase) as clickable nodes that open a terminal-styled info panel.

- **`graphNodes.ts`** — the single source of truth for node data (`id`, `label`,
  `href`, `terminalLines`). Add a new node here; both presentations pick it up
  automatically.
- **`HeroGraph.vue`** — one component serves *two* presentations via an `ambient`
  prop:
  - `ambient={false}` (default) — full spread-out hero, used on the homepage.
  - `ambient={true}` — shrunk into a small cluster, mounted persistently in
    `NavBar`'s `ambient-graph` slot on every page via `Layout.astro`.

  Both share the same click handling, active-node state, and `TerminalPanel`; only
  position/sizing classes differ (`fullPositions` vs. `ambientPositions`).
- **`TerminalPanel.vue`** — dumb display component (`lines`, `open` props; emits
  `close`). Renders full-screen on mobile, an inset panel on `md:` and up (CSS-only
  breakpoint, no JS viewport detection).
- **Accessibility**: every node renders as a real `<a href>` (not a `<button>`), so
  it's a working link even with JS disabled or before hydration — `@click` just
  intercepts with `preventDefault` to show the panel instead of navigating.
- **Reduced motion**: `prefers-reduced-motion` is checked synchronously at setup
  (not `onMounted`) so the entrance-animation class is correct on the very first
  client render.
- **Persistence across navigation**: the ambient instance is mounted with
  `transition:persist="hero-graph"` in `Layout.astro`, so its Vue instance and DOM
  state survive Astro's client-side view transitions between pages instead of
  remounting.

## Content collections (`src/content.config.ts`)

Four collections — `officers`, `workshops`, `events`, `showcase` — each backed by a
`glob()` loader over its `src/content/<name>/` directory and a Zod schema. Two things
worth knowing:

1. **Raw schemas are exported separately** (`officerSchema`, `workshopSchema`, etc.)
   in addition to being passed into `defineCollection()`. This lets them be
   unit-tested directly with plain objects (`content.config.test.ts`) without needing
   a full Astro content build.
2. **Schemas favor optional fields** deliberately — e.g. an officer only requires
   `name` and `role`; `photo`/`bio`/`links` are optional. Pages consuming this data
   must render graceful fallbacks (generic avatar, no bio block, no social row) rather
   than assuming every field is present — this is intentional, not a gap, so the site
   can launch with partial data.

Content files are plain Markdown with frontmatter matching the schema; the body is
currently unused by any page but validated as Markdown regardless. Files are
marked `<!-- PLACEHOLDER: verify/replace before launch -->` where the content itself
(names, dates, copy) is a stand-in, not real club data yet.

## Design tokens

All colors/fonts are declared once in `src/styles/global.css`'s `@theme` block, not
duplicated per-component:

| Token | Value | Use |
|---|---|---|
| `--color-deep-green` | `#0b3d24` | brand primary, dark sections (e.g. Footer) |
| `--color-accent-green` | `#3ea86b` | nav text, links, graph node borders |
| `--color-gold` | `#c9a227` | hover states, accents |
| `--color-near-black` | `#0d1117` | body text, nav/graph background |
| `--color-warm-white` | `#f5f4ee` | body background, text on dark |
| `--font-heading` | Space Grotesk | headings, logo |
| `--font-body` | Inter | body copy (default on `<body>`) |
| `--font-mono` | JetBrains Mono | the hero graph's terminal styling |

The site "leans dark" by design — nav and footer are dark strips regardless of the
section below them; the terminal panel is dark-only (no light-mode variant).

## Testing

- `npm run test` runs Vitest once (`--passWithNoTests`, so an empty suite isn't a
  failure while pages/sections are still being built out).
- Astro components (`.astro` files) are tested via Astro's experimental container
  API (see `Layout.test.ts`) — `container.renderToString()` against real props/slots.
- Vue components are tested with `@vue/test-utils`'s `mount()` (see
  `HeroGraph.test.ts`) — including mocking `window.matchMedia` to test the
  reduced-motion branch.
- Schema logic is tested by importing the raw Zod schemas directly (see
  `content.config.test.ts`), not by exercising Astro's content-collection machinery.

## CI (`.github/workflows/ci.yml`)

On every PR: checkout → Node 20 setup (npm cache) → `npm ci` → `npm run lint` →
`npm run test` → `npm run build`. `npm run build` runs `astro check` (typecheck) before
`astro build`, so a type error fails CI even if lint/tests pass.

## Deliberately out of scope (for now)

See the plan's ["What's Deliberately Not in This Plan"](docs/superpowers/plans/2026-08-22-site-foundation-plan.md#whats-deliberately-not-in-this-plan)
section for the authoritative list. In short: no physics/draggable graph (v1 uses
fixed positions), no real Google Sheets write for sign-ups (stubbed, logs instead),
no real content/photos/social links (placeholders throughout, marked accordingly),
and no Vercel project setup (one-time dashboard action, not a code change).
