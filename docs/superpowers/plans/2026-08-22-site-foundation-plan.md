# Site Foundation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable v1 of the Montgomery CSC website — scaffold, design system, persistent Layout, content collections, the v1 (fixed-node) hero, every sitemap page with plausible placeholder content, and a working sign-up form UI (backend function stubbed pending real Google credentials).

**Architecture:** Astro (static-first, file-based routing) with Vue 3 islands for interactivity (`client:load`/`client:visible` as appropriate), styled with Tailwind CSS using a config-driven token system. Content lives in Zod-validated Astro content collections. The hero/graph is an isolated Vue component (`components/graph/`) mounted inside the shared `Layout.astro` so it can use `transition:persist` across page navigations.

**Tech Stack:** Astro, Vue 3, TypeScript, Tailwind CSS, Zod (via Astro content collections), Vitest + @vue/test-utils for component logic, ESLint + Prettier, GitHub Actions, Vercel.

**Reference:** Full design rationale in `docs/superpowers/specs/2026-08-22-montycsc-website-design.md` — read it before starting if anything below is ambiguous.

---

## Chunk 1: Project Scaffold & Tooling

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `tailwind.config.mjs`, `postcss.config.mjs`
- Create: `eslint.config.js`, `.prettierrc.json`
- Create: `.github/workflows/ci.yml`
- Create: `vercel.json` (only if defaults need overriding — try without first)

- [ ] **Step 1: Scaffold the Astro project**

Run: `npm create astro@latest . -- --template minimal --typescript strict --no-install --no-git`
(We already have git initialized — don't let it re-init.)

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install
npx astro add vue tailwind sitemap --yes
npm install -D vitest @vue/test-utils happy-dom eslint prettier eslint-plugin-vue @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

- [ ] **Step 3: Configure the sitemap integration**

In `astro.config.mjs`, ensure `site` is set (required for `@astrojs/sitemap` to generate absolute URLs) — use a placeholder production URL for now:
```js
export default defineConfig({
  site: 'https://montycsc.example.com', // TODO: replace with real production domain once known
  integrations: [vue(), tailwind(), sitemap()],
});
```

- [ ] **Step 4: Verify the default site builds**

Run: `npm run build`
Expected: build succeeds, `dist/` is created.

- [ ] **Step 5: Add npm scripts**

In `package.json`, ensure `scripts` includes:
```json
{
  "dev": "astro dev",
  "build": "astro check && astro build",
  "preview": "astro preview",
  "test": "vitest run",
  "lint": "eslint . --ext .ts,.vue,.astro",
  "format": "prettier --write ."
}
```

- [ ] **Step 6: Add ESLint config**

Create `eslint.config.js` with TypeScript + Vue recommended rules (flat config). Keep it minimal — recommended presets only, no custom rule tuning yet.

- [ ] **Step 7: Add Prettier config**

Create `.prettierrc.json`:
```json
{ "semi": true, "singleQuote": true, "printWidth": 100 }
```

- [ ] **Step 8: Add CI workflow**

Create `.github/workflows/ci.yml`:
```yaml
name: CI
on: [pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

- [ ] **Step 9: Verify lint and test scripts run clean on the empty scaffold**

Run: `npm run lint && npm run test && npm run build`
Expected: all succeed (test step passes trivially — no tests yet); build should also emit a `sitemap-index.xml` in `dist/`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro+Vue+Tailwind project with CI"
```

---

## Chunk 2: Design Tokens & Layout

> **Note:** This chunk was written assuming Tailwind v3's JS config file. Chunk 1's implementation installed Tailwind v4 (Astro 7.2.4's `astro add tailwind` default), which uses CSS-first configuration via an `@theme` block instead of `tailwind.config.mjs`. Steps 1-2 below have been updated accordingly — there is no `tailwind.config.mjs` to create or modify.

**Files:**
- Modify: `src/styles/global.css` (already exists from Chunk 1 scaffold, currently just `@import "tailwindcss";`)
- Create: `src/layouts/Layout.astro`
- Create: `src/components/ui/NavBar.astro`
- Create: `src/components/ui/Footer.astro`
- Test: `src/layouts/Layout.test.ts` (smoke test via Astro container API — see Step 6)

- [ ] **Step 1: Define design tokens and global styles (Tailwind v4 CSS-first)**

Modify `src/styles/global.css` to define theme tokens via an `@theme` block, which Tailwind v4 uses to auto-generate utility classes (e.g. `--color-deep-green` → `bg-deep-green`/`text-deep-green`, `--font-heading` → `font-heading`):
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
@import "tailwindcss";

@theme {
  --color-deep-green: #0b3d24;
  --color-accent-green: #3ea86b;
  --color-gold: #c9a227;
  --color-near-black: #0d1117;
  --color-warm-white: #f5f4ee;

  --font-heading: "Space Grotesk", sans-serif;
  --font-body: Inter, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
}

body {
  @apply font-body text-near-black bg-warm-white;
}
```

- [ ] **Step 2: Verify token utilities are generated**

Run `npm run dev`, temporarily add `class="bg-deep-green text-gold font-heading"` to an element in `src/pages/index.astro`, confirm in the browser the styles apply (deep green background, gold text, Space Grotesk font), then remove the temporary class (real usage comes in Chunk 5's pages).

- [ ] **Step 3: Build NavBar and Footer**

`NavBar.astro` — minimal nav: logo placeholder + links to Home/Activities/Events/Showcase/Officers/FAQ/Sign Up. Uses accent-green text on the deep-green/near-black background (nav sits in a dark strip regardless of the section below it, per "leans dark" design rule). Reserve a slot/corner region (e.g. a fixed-width `<div id="ambient-graph-slot">` at the nav's trailing edge) for the shrunk ambient graph mounted in Chunk 4 Step 7 — per the spec, the nav is where the ambient graph corner presentation lives.

`Footer.astro` — contact email, Instagram/Facebook/Linktree links (use `montycompsci@gmail.com` and placeholder social URLs — real ones to be supplied later, marked with an HTML comment `<!-- TODO: real social links -->`).

- [ ] **Step 4: Build Layout.astro**

```astro
---
// src/layouts/Layout.astro
import NavBar from '../components/ui/NavBar.astro';
import Footer from '../components/ui/Footer.astro';
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
}
const { title, description = 'Montgomery Computer Science Club — explore computer science with peers and trained instructors.' } = Astro.props;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title} · Montgomery CSC</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
  </head>
  <body>
    <NavBar />
    <slot />
    <Footer />
  </body>
</html>
```

(The persistent ambient graph mounts here too, once Chunk 4 exists — leave a `<!-- TODO: mount HeroGraph ambient instance, transition:persist -->` comment for now so Chunk 4 has an obvious hook point.)

- [ ] **Step 5: Verify it renders**

Run: `npm run dev`, visit `http://localhost:4321` — expect Astro's default page wrapped in the new Layout if you temporarily wire `pages/index.astro` to use it, or skip visual check and rely on Step 6's automated smoke test if `pages/index.astro` isn't wired yet.

- [ ] **Step 6: Write a smoke test for Layout**

Create `src/layouts/Layout.test.ts` using Astro's experimental container API (or, if that's unavailable in the installed Astro version, skip automated testing for this file and note manual verification in the commit message — Astro component testing tooling varies by version, check `astro --version` compatibility first).

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Layout from './Layout.astro';

test('renders title in head', async () => {
  const container = await AstroContainer.create();
  const result = await container.renderToString(Layout, {
    props: { title: 'Home' },
    slots: { default: 'content' },
  });
  expect(result).toContain('Home · Montgomery CSC');
  expect(result).toContain('content');
});
```

- [ ] **Step 7: Run the test**

Run: `npm run test`
Expected: PASS (or, if container API isn't available for the installed Astro version, remove this test file and note why in the commit message — don't block the chunk on a tooling gap).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: design tokens, global styles, and shared Layout"
```

---

## Chunk 3: Content Collections

**Files:**
- Create: `src/content/config.ts`
- Create: `src/content/officers/*.md` (2-3 placeholder entries)
- Create: `src/content/workshops/*.md` (3-4 entries)
- Create: `src/content/events/*.md` (MontyHacks + ACSL + one guest talk)
- Create: `src/content/showcase/*.md` (2-3 entries)
- Test: `src/content/config.test.ts`

- [ ] **Step 1: Define schemas**

Create `src/content/config.ts`:
```ts
import { defineCollection, z } from 'astro:content';

const officers = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    photo: z.string().optional(),
    bio: z.string().optional(),
    links: z.object({ linkedin: z.string().optional(), github: z.string().optional() }).optional(),
  }),
});

const workshops = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    day: z.string(),
    time: z.string(),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    description: z.string().optional(),
  }),
});

const events = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    type: z.enum(['hackathon', 'competition', 'talk']),
    description: z.string().optional(),
    link: z.string().optional(),
  }),
});

const showcase = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    event: z.string(),
    team: z.array(z.string()).optional(),
    devpostUrl: z.string().optional(),
    image: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const collections = { officers, workshops, events, showcase };
```

- [ ] **Step 2: Write a schema validation test**

Create `src/content/config.test.ts` — a minimal test asserting a valid officer object parses and an invalid one (missing `name`) throws, using the `officers` schema directly:
```ts
import { describe, expect, test } from 'vitest';
// Import the raw zod schema shape if exported, or duplicate the minimal required-field check —
// Astro content collections aren't directly unit-testable in isolation without a running build,
// so this test targets the schema logic itself.
```
(If schema isn't easily importable standalone, skip the isolated unit test and instead rely on Chunk 3 Step 5's build-time validation as the real test — note this in the commit message. Don't force an awkward test around Astro's content collection internals.)

- [ ] **Step 3: Add placeholder officer entries**

Create 2-3 files like `src/content/officers/jane-doe.md`:
```md
---
name: "President Name"
role: "President"
---
```
(Deliberately minimal — only required fields — demonstrating the graceful-degradation pattern from the spec. Use generic placeholder names clearly marked for the club to replace, e.g. "President Name", "Vice President Name".)

- [ ] **Step 4: Add workshop, event, and showcase entries**

Base content on what's known from the old site (weekly workshops on intro CS/Python/ML, MontyHacks hackathon, ACSL competition, guest talks from universities/industry) and the Devpost material mentioned during design. Write plausible, clearly-placeholder copy — e.g. workshop descriptions consistent with "no experience required," event dates left as reasonable near-future placeholders. Mark each file with an HTML comment `<!-- PLACEHOLDER: verify/replace before launch -->` at the top of the body.

- [ ] **Step 5: Verify the build validates content**

Run: `npm run build`
Expected: succeeds. Then temporarily break one file (remove a required field), rebuild, confirm it fails with a clear Zod error, then restore the file.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: content collections with schema validation and placeholder content"
```

---

## Chunk 4: Hero v1 Graph Component

**Files:**
- Create: `src/components/graph/HeroGraph.vue`
- Create: `src/components/graph/TerminalPanel.vue`
- Create: `src/components/graph/graphNodes.ts`
- Test: `src/components/graph/HeroGraph.test.ts`
- Modify: `src/layouts/Layout.astro` (mount ambient instance)

- [ ] **Step 1: Define node data**

Create `src/components/graph/graphNodes.ts`:
```ts
export interface GraphNode {
  id: string;
  label: string;
  href: string; // real page this node routes to — required for the accessible fallback
  terminalLines: string[];
}

export const graphNodes: GraphNode[] = [
  { id: 'workshops', label: 'Workshops', href: '/activities', terminalLines: ['$ connect --node workshops', '> Weekly sessions on Python, ML,', '> and CS fundamentals.', '> No experience required.'] },
  { id: 'hackathons', label: 'Hackathons', href: '/events', terminalLines: ['$ connect --node hackathons', '> MontyHacks — our flagship', '> one-day hackathon.'] },
  { id: 'talks', label: 'Guest Talks', href: '/events', terminalLines: ['$ connect --node guest_talks', '> Speakers from universities', '> and industry.'] },
  { id: 'showcase', label: 'Showcase', href: '/showcase', terminalLines: ['$ connect --node showcase', '> Projects from MontyHacks', '> and beyond.'] },
];
```

- [ ] **Step 2: Write the failing test for node selection logic**

Create `src/components/graph/HeroGraph.test.ts`:
```ts
import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import HeroGraph from './HeroGraph.vue';

describe('HeroGraph', () => {
  test('clicking a node opens its terminal panel with matching content', async () => {
    const wrapper = mount(HeroGraph);
    await wrapper.get('[data-node-id="workshops"]').trigger('click');
    expect(wrapper.find('[data-testid="terminal-panel"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Weekly sessions on Python');
  });

  test('every node renders as a real anchor tag for accessibility', () => {
    const wrapper = mount(HeroGraph);
    const anchors = wrapper.findAll('a[data-node-id]');
    expect(anchors.length).toBe(4);
  });

  test('respects prefers-reduced-motion by skipping entrance animation class', () => {
    // Mock matchMedia to report reduced motion, then assert the animation class is absent.
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    const wrapper = mount(HeroGraph);
    expect(wrapper.classes()).not.toContain('animate-entrance');
  });
});
```

- [ ] **Step 3: Run the tests to confirm they fail**

Run: `npm run test -- HeroGraph`
Expected: FAIL (component doesn't exist yet).

- [ ] **Step 4: Implement TerminalPanel.vue**

A small, focused component: props `lines: string[]`, `open: boolean`; renders the terminal-window chrome (three dots, monospace lines) styled per the spec's dark-only terminal treatment. Emits `close`.

- [ ] **Step 5: Implement HeroGraph.vue**

- Renders each `graphNodes` entry as a real `<a :href>` styled as a node (not a `<button>` — this is the accessibility requirement from the spec: a keyboard/screen-reader user gets a working link even with JS disabled or before hydration).
- On click, `preventDefault`, set `activeNodeId`, show `TerminalPanel` with that node's `terminalLines`, dim other nodes (`opacity` class binding).
- Checks `window.matchMedia('(prefers-reduced-motion: reduce)')` on mount; conditionally applies an `animate-entrance` class only when motion is not reduced.
- On mobile (viewport width below Tailwind's `md` breakpoint via a `matchMedia` check or CSS-only approach), the panel renders full-screen rather than inline — prefer a CSS-only solution (fixed positioning + `md:` variants) over JS viewport detection where possible, per the spec's mobile behavior note.

- [ ] **Step 6: Run the tests to confirm they pass**

Run: `npm run test -- HeroGraph`
Expected: PASS

- [ ] **Step 7: Mount the ambient instance in Layout**

In `Layout.astro`, replace the `TODO` comment from Chunk 2 with a mount point that targets the `#ambient-graph-slot` reserved in `NavBar.astro` (Chunk 2 Step 4) — do not introduce a second, separate mount location:
```astro
<NavBar>
  <HeroGraph client:load transition:persist ambient={true} slot="ambient-graph" />
</NavBar>
```
(Adjust `NavBar.astro` to expose a named `<slot name="ambient-graph" />` at the `#ambient-graph-slot` div, rather than the component being mounted independently elsewhere in `Layout.astro`'s body — this keeps a single source of truth for where the ambient graph lives, matching the spec's "nav hosts the shrunk ambient graph in a corner.")

The `ambient` prop signals the shrunk/corner presentation for interior pages — full presentation is the homepage Hero section's job, see Chunk 5. If a single component can't cleanly serve both the full hero and the ambient corner widget, split into `HeroGraph.vue` (full) and `AmbientGraph.vue` (shrunk) sharing `graphNodes.ts` — use judgment here based on how much actually ends up shared once both are written.

- [ ] **Step 8: Manual visual check**

Run: `npm run dev`, visit the homepage (once Chunk 5 wires it in) and an interior page, confirm the graph persists across a client-side navigation and doesn't remount/reset (check via browser dev tools — no flash/reset of the panel state if one was left open... though closing panels on navigation is reasonable UX too; use judgment and note the choice).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: v1 hero graph component with terminal panels, a11y fallback, and reduced-motion support"
```

---

## Chunk 5: Pages

**Files:**
- Create: `src/components/sections/Hero.astro`, `WhatWeDo.astro`, `ShowcaseHighlights.astro`, `WhyJoin.astro`, `FaqTeaser.astro`, `JoinCta.astro`
- Create: `src/pages/index.astro`, `activities.astro`, `events.astro`, `showcase.astro`, `officers.astro`, `faq.astro`
- Test: manual build + visual check per page (content-composition pages don't carry the same unit-test value as component logic — verify via `astro check` + build + dev-server look)

- [ ] **Step 1: Build homepage section components**

Each section in `components/sections/` is self-contained, pulls whatever content-collection data it needs via props passed from `index.astro` (per the "pages are composition-only" convention). `Hero.astro` wraps `HeroGraph` in its full (non-ambient) presentation, with the headline/subhead copy from the design mockups ("Explore Computer Science" / weekly workshops, hackathons, community pitch).

- [ ] **Step 2: Compose index.astro**

```astro
---
import Layout from '../layouts/Layout.astro';
import Hero from '../components/sections/Hero.astro';
import WhatWeDo from '../components/sections/WhatWeDo.astro';
import ShowcaseHighlights from '../components/sections/ShowcaseHighlights.astro';
import WhyJoin from '../components/sections/WhyJoin.astro';
import FaqTeaser from '../components/sections/FaqTeaser.astro';
import JoinCta from '../components/sections/JoinCta.astro';
import { getCollection } from 'astro:content';

const workshops = await getCollection('workshops');
const showcaseEntries = await getCollection('showcase');
---
<Layout title="Home">
  <Hero />
  <WhatWeDo workshops={workshops} />
  <ShowcaseHighlights entries={showcaseEntries} />
  <WhyJoin />
  <FaqTeaser />
  <JoinCta />
</Layout>
```

- [ ] **Step 3: Build activities.astro, events.astro, showcase.astro, officers.astro, faq.astro**

Each follows the same thin-composition pattern: `Layout` + one or two page-specific section components + a `getCollection()` fetch for the relevant collection. Officers page renders the graceful-degradation fallbacks specified (generic avatar if no photo, no bio block if absent, no social row if absent) — build this logic into a small `OfficerCard.astro` component under `components/ui/` since it's reused per-officer.

For `showcase.astro` specifically: per the spec, the trailer and general gallery are static assets, not collection entries. Add a `public/showcase/` directory with a placeholder note (`public/showcase/README.md`: "drop trailer.mp4 and gallery images here") since the real trailer/photos aren't available in this repo yet. Build the page to reference `/showcase/trailer.mp4` via a `<video>` element and loop over a small hardcoded array of gallery image paths — guard the video/gallery rendering so a missing file doesn't break the page (e.g. the `<video>` tag degrades gracefully with no poster if the file is absent; don't hardcode gallery image paths that don't exist yet, leave the array empty with a comment marking where to add them once real assets arrive).

- [ ] **Step 4: Wire nav links**

Update `NavBar.astro` from Chunk 2 to point at the real routes now that they exist.

- [ ] **Step 5: Full build check**

Run: `npm run build && npm run preview`
Visit every route, confirm no console errors, confirm the ambient graph shows correctly on interior pages and persists across navigation.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: build out all sitemap pages with v1 hero and placeholder content"
```

---

## Chunk 6: Sign-Up Form

**Files:**
- Create: `src/pages/sign-up.astro`
- Create: `src/components/sections/SignUpForm.vue`
- Create: `src/pages/api/signup.ts` (Vercel serverless function, Astro API route)
- Test: `src/pages/api/signup.test.ts`

- [ ] **Step 1: Write the failing test for the API route's validation logic**

```ts
import { describe, expect, test } from 'vitest';
import { POST } from './signup';

describe('POST /api/signup', () => {
  test('rejects a request missing required fields', async () => {
    const request = new Request('http://localhost/api/signup', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST({ request } as any);
    expect(response.status).toBe(400);
  });

  test('rejects a request with the honeypot field filled in (bot)', async () => {
    const request = new Request('http://localhost/api/signup', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'a@b.com', _honeypot: 'filled' }),
    });
    const response = await POST({ request } as any);
    expect(response.status).toBe(400);
  });

  test('rate-limits repeated submissions from the same IP', async () => {
    const makeRequest = () =>
      POST({
        request: new Request('http://localhost/api/signup', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test', email: 'a@b.com' }),
        }),
        clientAddress: '1.2.3.4',
      } as any);
    for (let i = 0; i < 3; i++) await makeRequest();
    const fourth = await makeRequest();
    expect(fourth.status).toBe(429);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `npm run test -- signup`
Expected: FAIL (route doesn't exist).

- [ ] **Step 3: Implement the API route**

```ts
// src/pages/api/signup.ts
import type { APIRoute } from 'astro';

export const prerender = false;

// Simple in-memory rate limit: N submissions per IP per window. Resets on cold start/redeploy,
// which is an acceptable tradeoff at this site's traffic scale — a persistent store (e.g. Vercel KV)
// would be the upgrade if abuse ever becomes a real problem, but is unwarranted complexity for launch.
const submissionLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (submissionLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  submissionLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (isRateLimited(clientAddress)) {
    return new Response(JSON.stringify({ error: 'Too many submissions, try again shortly' }), { status: 429 });
  }

  const body = await request.json();
  if (!body.name || !body.email) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }
  if (body._honeypot) {
    return new Response(JSON.stringify({ error: 'Rejected' }), { status: 400 });
  }

  // TODO: real Google Sheets write via service account.
  // Requires GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY, and TARGET_SHEET_ID
  // as Vercel environment variables (not committed). Until those exist, this logs and
  // returns success so the form UI is fully testable end-to-end minus the actual write.
  console.log('Sign-up submission (Sheets write not yet configured):', body);

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 4: Run to confirm the tests pass**

Run: `npm run test -- signup`
Expected: PASS

- [ ] **Step 5: Build the form UI**

`SignUpForm.vue` — fields per the spec's minimal-collection principle (name, email/contact, grade level — nothing more), a hidden `_honeypot` input (visually hidden, not `display:none` — use an off-screen technique so bots that skip hidden fields still fill it), inline error display on failure, and preserves entered values on failure (don't clear the form).

- [ ] **Step 6: Wire sign-up.astro**

Standard `Layout` + `SignUpForm` composition.

- [ ] **Step 7: Manual end-to-end check**

Run: `npm run dev`, submit the form, confirm the console log shows the payload and the UI shows a success state. Then submit with the honeypot manually filled (via browser dev tools) and confirm rejection.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: sign-up form with honeypot protection, Sheets write stubbed pending credentials"
```

---

## Chunk 7: Contribution Docs

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write CONTRIBUTING.md**

Plain-language, screenshot-free (screenshots can't be authored here, but structure it so they're easy to drop in later) walkthrough of: editing a workshop/event/officer entry via GitHub's web UI, what happens on PR (preview deploy via Vercel, review required), and where the design/tech spec lives for anyone who wants more context (`docs/superpowers/specs/2026-08-22-montycsc-website-design.md`).

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "docs: add CONTRIBUTING.md for non-technical content contributors"
```

---

## What's Deliberately Not in This Plan

- **v2 draggable force-graph hero** — roadmap item per the spec, not launch scope.
- **Real Google Sheets credentials/write** — stubbed; needs a Google Cloud service account the club creates, plus Vercel env vars set outside this repo.
- **Real content** — officer names, exact workshop schedule, real event dates, real photos, real social links are placeholder/marked for replacement; this plan produces a structurally complete, visually real site, not final copy.
- **Vercel project setup/first deploy** — connecting the GitHub repo to a Vercel project is a one-time dashboard action outside the codebase; not a code task.
