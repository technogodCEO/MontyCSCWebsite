# Montgomery Computer Science Club Website — Design

**Date:** 2026-08-22
**Status:** Approved, ready for planning

## Purpose & Audience

A brand-new, unified website for the Montgomery Computer Science Club (CSC), replacing the current site at montycompsci.netlify.app. One site serves everyone: prospective members deciding whether to join, current members checking activities, and outside visitors (faculty, admins). The site is **recruiting-first** for now — the primary success metric is a visitor understanding what the club does and signing up.

Nothing from the old site's implementation carries over (assumed unmaintainable, pre-dates AI-assisted tooling). Brand assets to keep: the club's logos and its green/gold color scheme (school colors).

Explicit non-goal, stated up front: this must not look "vibecoded" — generic AI-template aesthetics are the thing most actively being designed against.

## Sitemap

- **Home** — single flowing page: Hero → What We Do teaser → Showcase highlights → Why Join → FAQ teaser → Sign-up CTA
- **Activities/Workshops** — dedicated page: weekly schedule, topics/curriculum, meeting logistics (for current and prospective members)
- **Events** — MontyHacks, ACSL, guest talks
- **Showcase** — hackathon projects, trailer, gallery (existing Devpost material from the last MontyHacks)
- **Officers/Team** — placeholder-ready; can launch with partial data (see Content Model below)
- **FAQ** — full page; homepage has a teaser linking here
- **Sign Up** — join form
- Contact/socials live in the footer, no dedicated page

## Tech Stack

- **Astro** as the base framework — static-first rendering (fast, strong SEO, no backend required for most pages), with **Vue** components as interactive islands.
- **TypeScript** throughout, especially the interactive components — catches integration bugs early, valuable precisely because contributors won't be equally experienced.
- **Tailwind CSS** for styling — a config-driven design system (colors, spacing, fonts defined once) keeps a mixed-skill team visually consistent instead of each contributor inventing one-off values.
- **View Transitions with `transition:persist`** — Astro's client-side soft-navigation feature. Lets the ambient hero/graph component's live DOM and state survive navigation between pages (see Hero Component below) while every route still ships as static HTML (SEO, no backend).
- **npm** as package manager — zero extra install, everyone already has it with Node; chosen over pnpm for team accessibility over raw speed.
- **ESLint + Prettier**, enforced via **GitHub Actions CI** on every PR (build + typecheck + lint).
- **Deployment: Vercel** (not Netlify — team has migrated away from Netlify generally). Vercel has first-class Astro support and per-PR preview deployments, which the contribution workflow depends on.

### Why not Vue SPA or Nuxt
A plain Vue/Vite SPA was rejected: client-rendered blank-shell pages hurt SEO and initial load, which matters for a recruiting site people find via search or shared links. Nuxt was rejected as unnecessary overhead: the site has and is expected to keep having very little backend, so Nuxt's server-side capabilities (the main reason to pick it over Astro) aren't needed. Astro + View Transitions gets the "feels like a persistent app" quality the site wants without paying either cost.

### SEO & basic instrumentation
Since search/shared-link discovery is explicitly part of the recruiting strategy, each page needs standard meta tags (title, description) and Open Graph/Twitter card tags (so shared links preview well), plus a generated sitemap.xml — Astro's official sitemap integration covers this with minimal setup. For measuring the stated success metric ("a visitor signing up"), the simplest instrumentation is counting rows in the sign-up Google Sheet — no separate analytics platform is required at launch, though lightweight, privacy-respecting page-view analytics (e.g. Vercel Analytics) can be added later if the club wants traffic-level insight, not just conversions.

## Code Conventions

```
src/
  components/
    ui/          — small reusable pieces (Button, Card, TerminalPanel)
    sections/    — page-section-sized components (Hero, WhatWeDo, Showcase)
    graph/       — the node/terminal hero engine, isolated
  layouts/       — shared page shells (hosts the persistent ambient graph, nav, footer)
  pages/         — one file per route; thin composition layer only
  content/       — Markdown/JSON collections (officers, workshops, events)
  styles/        — Tailwind config/theme tokens
```

- **Pages are composition-only**: a page file imports `Layout` + the section components it needs, fetches whatever content-collection data those sections require, and renders them in order. No markup logic lives in `pages/*.astro` — skimming the `pages/` folder should tell you the whole site's structure.
- **Naming**: PascalCase for component files, kebab-case for content files/routes, camelCase for variables/functions.
- **Component placement**: reused 2+ places or a self-contained visual unit → `components/`; a full page section used once → still its own component in `sections/`, to keep page files short.
- **Comments**: explain *why*, not *what* — code should be semantic enough to read on its own. This matters most in the graph component (e.g. physics constants), since that's the piece future non-AI-assisted contributors will find hardest to safely modify.

## Contribution Workflow

Given the team includes contributors of mixed skill level and not everyone has AI assistance available, the workflow favors low-friction entry with a safety net rather than self-serve or a heavy process:

1. Content lives in **schema-validated** Astro content collections (Zod schemas) — malformed edits fail the build with a clear error instead of silently breaking the live site.
2. Non-coders edit content files directly via **GitHub's web UI**, which auto-creates a branch + PR — no local dev setup required.
3. **Vercel generates a preview deploy per PR** — reviewers see the actual rendered page before merging, catching issues schema validation alone wouldn't (e.g. "technically valid but looks wrong").
4. **Review required by default** — an officer approves and merges. Trusted individuals can be granted looser rules later, but the default protects the live recruiting site from unreviewed mistakes.
5. A plain-language `CONTRIBUTING.md` (screenshot-friendly) walks through common tasks like adding a workshop entry or officer bio via GitHub's UI.

The complex/custom pieces (notably the graph component) are explicitly **not** meant to be handed to teammates to build or modify solo — those are built collaboratively by the site's primary developer with AI assistance, since debugging that code without AI help is a rough experience even for a competent dev. Teammates' contribution lane is the structured content files, which require no JS/physics knowledge.

## Design System

### Typography
- **Headings**: Space Grotesk — geometric, techy character, avoids the generic "Inter-everywhere" SaaS look
- **Body**: Inter — highly readable at small sizes, broad glyph support
- **Monospace (terminal accents)**: JetBrains Mono — an actual code-editor font, reads as authentic developer culture rather than a stylized fake terminal font

### Color
- Deep green (`#0b3d24`-ish) — dark section backgrounds
- Bright green accent (`#3ea86b`-ish) — the workhorse color: links, node/edge graphics, borders, secondary buttons, general UI
- Gold (`#c9a227`, rich/deep tone) — reserved for the primary CTA and true high-emphasis moments only. Deliberately rare: its impact comes from scarcity, not from being used everywhere.
- Near-black (`#0d1117`) — terminal panel backgrounds
- Warm off-white (`#f5f4ee`) — light section backgrounds (avoids stark clinical white)
- Neutral grays for body text/borders; standard semantic colors (success/error/warning) for sign-up form validation

### Light/Dark
No user-facing theme toggle. Light/dark is a **fixed, authored design device**: dark sections carry the hero/terminal drama, light sections are used sparingly, specifically where reading-heavy content (e.g. FAQ) benefits from higher legibility. The site **leans dark overall** — dark is the dominant mode, not a 50/50 split. Rationale: this is a browsed-once recruiting site, not a long-session tool, so the usual case for a dark-mode toggle (reduced eye strain over time) doesn't apply, and controlling the light/dark split ourselves lets it function as intentional pacing rather than a user-configurable variable that has to be validated in both directions everywhere.

### Components
- **Buttons**: primary = filled gold (`#c9a227`) with near-black text (~9:1 contrast, verified); secondary = **dark sections only** get the terminal-style outlined button (JetBrains Mono label, e.g. `learn_more()`) — light sections use a plain outlined button in Inter instead, since the terminal motif doesn't translate to light backgrounds (real terminals are dark; forcing the look onto a light theme reads wrong, the same way a light-themed IDE clashes with "hacker terminal" expectations)
- **Cards**: consistent border-radius, subtle border or soft shadow depending on section
- **Nav**: minimal, persistent, hosts the shrunk ambient graph in a corner
- **Spacing & breakpoints**: Tailwind defaults — no reason to diverge from a well-understood standard

## Hero / Graph Component

The site's signature visual element, fusing the two motifs that tested best against "Hacknet"-style references: a **network/graph** (nodes = CS/algorithms) and a **terminal** (code culture). Persistent across the whole site via `transition:persist`, not just the homepage — it survives navigation, shrinking into an ambient background element on interior pages so the visual language stays consistent site-wide rather than "dying" the moment you leave the homepage.

### v1 (launch scope)
- **Fixed-position nodes** (no physics simulation) representing Workshops / Hackathons / Guest Talks / Showcase. ACSL and other `competition`-type Events entries are page-only content (surfaced on the Events page) rather than getting their own hero node — the hero highlights the four flagship categories, not every individual event
- Clicking a node "connects" and opens a terminal-styled panel with that section's content, other nodes dim
- Prototyped and validated interactively during design (click-to-expand behavior confirmed to feel right)
- Deliberately scoped to avoid the engineering risk of live physics — buildable on the project's timeline
- **Mobile/small screens**: same fixed node layout, scaled/re-flowed for narrow viewports (nodes stack into a single column or tighter cluster rather than the desktop spread); tapping a node opens its terminal panel as a full-screen overlay (rather than an inline panel competing for limited vertical space), dismissed via a close control or tapping outside. No drag physics involved at v1, so mobile has no reduced-fidelity fallback to design — the same interaction works at every size, just with the panel presentation flexing between inline (desktop/tablet) and full-screen (phone)

### v2 (roadmap, post-launch)
- Full **draggable force-directed graph** (`d3-force` or similar) — every node physically draggable, edges behave like springs, nodes route into real pages
- Explicitly **not** a launch requirement. Honest scope assessment: this is likely the single most expensive component on the site — a technically-working version is achievable quickly, but a version that *feels* right (tuned physics, no jitter, responsive drag, no janky collisions) is substantially more effort, realistically 1-2+ weeks of focused iteration
- Highest-risk, highest-reward piece: done well it's the standout "wow" moment; underbaked it reads as more broken than not having it at all — so it should not be rushed or forced onto the launch deadline
- Requirements when built: isolated/swappable component (drops in to replace v1 without a rebuild), touch-drag support on mobile with a simplified non-physics fallback for small screens, respects `prefers-reduced-motion`, real focusable `<a>`-based nodes underneath the visuals for keyboard/screen-reader navigation
- Built collaboratively (primary developer + Claude), not delegated to teammates without AI assistance

### Performance & accessibility constraints (both versions)
- Must be cheap enough to run continuously as an ambient background (CPU/battery)
- Must respect `prefers-reduced-motion` (static fallback)
- Node interactions must have a real navigable/accessible fallback, not rely on mouse-only interaction

## Content Model

Astro content collections, schema-validated (Zod). Example — officers:

```yaml
# content/officers/jane-doe.md
name: "Jane Doe"        # required
role: "President"       # required
photo: "/officers/jane-doe.jpg"   # optional
bio: "..."                        # optional
links:                             # optional
  linkedin: "..."
  github: "..."
```

Only `name` and `role` are required, so a complete, valid entry takes seconds to create. Missing optional fields degrade gracefully rather than looking broken:
- No `photo` → generic brand-colored avatar placeholder, never a broken-image icon
- No `bio` → the bio area doesn't render at all (no "coming soon" filler)
- No `links` → the social icon row doesn't render

This lets the Officers page (and similarly-structured collections like Workshops/Events) launch with minimal data and visually improve automatically as teammates fill in details — no code changes required.

Workshops:

```yaml
# content/workshops/intro-to-python.md
title: "Intro to Python"       # required
day: "Wednesdays"              # required
time: "3:30–4:30pm"            # required
level: "beginner"              # required — beginner | intermediate | advanced
description: "..."             # optional
```

Events:

```yaml
# content/events/montyhacks-2026.md
title: "MontyHacks 2026"       # required
date: "2026-11-14"             # required
type: "hackathon"              # required — hackathon | competition | talk
description: "..."             # optional
link: "..."                    # optional — registration/details URL
```

Showcase (one entry per hackathon project):

```yaml
# content/showcase/project-name.md
title: "Project Name"          # required
event: "MontyHacks 2026"       # required — links back to an Events entry
team: ["Name One", "Name Two"] # optional
devpostUrl: "..."              # optional
image: "/showcase/project.jpg" # optional — falls back to a brand-styled placeholder card, same pattern as Officers' avatar fallback
description: "..."             # optional
```

The trailer and general gallery (not tied to a single project) are handled as static assets referenced directly by the Showcase page/section, not as a content collection entry, since there's only one trailer rather than a repeating list.

## Sign-Up Form

Custom-built form matching the site's design system (not a generic embedded Google Form, which would visually break the aesthetic), submitting to a **single Vercel serverless function** that writes entries to a Google Sheet. This is the smallest possible "backend" — one function, not real infrastructure — while keeping full data ownership (vs. a third-party form service) and a fully on-brand UI (vs. embedding an external form).

The function authenticates to the Google Sheets API via a Google service account, with its credentials stored as a Vercel environment variable (never committed to the repo). The endpoint should have basic spam/abuse protection (e.g. a honeypot field, plus simple rate limiting) since it's a publicly reachable POST endpoint — lightweight given the site's expected traffic, not a full anti-bot system.

**Failure handling**: if the serverless function fails to write to the Sheet (API error, rate limit, network failure), the form shows an inline error message and preserves whatever the visitor already typed (no data loss, no silent failure) so they can retry without re-entering everything. The function logs failures server-side (Vercel's function logs are sufficient at this scale — no separate monitoring service needed) so officers can notice a pattern of failures rather than only finding out when someone complains.

**Data handling note**: the form is likely collecting contact info from students, some of whom may be minors. Collect only what's needed to follow up (name, email/contact, maybe grade level) — nothing more — and treat the destination Sheet as access-restricted to officers, not broadly shared. This spec doesn't define a formal retention/deletion policy; that's worth a short conversation with the club's staff advisor before launch, since it's a school-affiliated club handling student data, but doesn't block building the form itself.

## Explicitly Out of Scope (for now)

- User-toggleable dark/light mode
- Blog/news feed, resources library, alumni page — valuable for retention/ops but lower priority than recruiting-focused pages given current goals
- v2 draggable graph is roadmap, not launch scope

## Phasing Note

This spec deliberately covers the whole site's design in one document, but it spans several largely independent subsystems — the static pages/content, the v1 hero/graph component, the contribution tooling, and the sign-up backend. It's expected to be **decomposed into separate implementation plans/phases** downstream (e.g. site shell + core pages, hero/graph component, content collections + contribution workflow, sign-up form + serverless function) rather than built as one undifferentiated plan.

Post-launch design refinement ideas (dark theme, graph edges/animation, CLI typewriter effects) raised after reviewing the v1 foundation live are tracked in `documentation/ROADMAP.md` rather than here, to keep this spec as the original design record and the roadmap as the up-to-date "what's next" doc.

None of these are scoped or feasibility-checked yet (e.g. the pervasive typewriter-heading idea has real accessibility implications — screen readers and `prefers-reduced-motion` need real thought before this goes further, similar to how the v2 graph's mobile/a11y requirements were worked out before greenlighting it). Treat as a future design-refinement pass, not an immediate build target.
