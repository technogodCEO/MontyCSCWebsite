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

## Contributing to this file

If you land a chunk (or take on roadmap work), update the relevant table row/section
in the same PR — keep this file reflecting reality, not the plan's intent.
