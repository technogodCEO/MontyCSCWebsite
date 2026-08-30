# Refinement B — Pervasive CLI / Terminal Motif — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push the terminal motif across the whole site: a static `>` prompt on every heading, a typewriter-in effect for page titles (`h1`, on load) and section headings (`h2`, on scroll), a hover-retype on secondary buttons, and a `>`-slide hover on the primary CTA — all with a real accessibility + reduced-motion contract.

**Architecture:** Three small, progressively-enhanced components, no per-element hydration. `CliHeading.astro` server-renders the real heading (correct text in the DOM for SEO + screen readers via `aria-label`) and marks it for a single shared vanilla script that runs the character animation against an `aria-hidden` span. `CliButton.astro` does the same for `fn()`-style secondary buttons, retyping an `aria-hidden` label on hover while the accessible name stays fixed. `CtaButton.astro` is pure CSS — a `>` slides in and blinks on hover. Every existing raw `<h1>/<h2>/<h3>` and button gets migrated to these components.

**Tech Stack:** Astro components + one bundled `<script>` module (vanilla TS, no framework), Tailwind v4 CSS-first (`@theme` + custom CSS in `src/styles/global.css`), Vitest + happy-dom.

**Spec:** `docs/superpowers/specs/2026-08-30-design-refinement-pass-design.md` §3.

**Depends on:** Plan A (kill light sections) merged first — the button work here assumes every button lives on a dark surface.

---

## Context for the implementer

- Tailwind v4, **no config file** — global custom CSS goes in `src/styles/global.css` alongside the `@theme` block. `@import "tailwindcss";` is already there.
- Fonts already loaded (`global.css:1`): Space Grotesk (`--font-heading`), Inter (`--font-body`), JetBrains Mono (`--font-mono`).
- Astro `<script>` tags in a component/layout are bundled, deferred, and run once — use one shared script imported from `Layout.astro`, not per-component inline scripts.
- The site uses View Transitions with `transition:persist` (see `Layout.astro`). **Client scripts must re-run on `astro:page-load`**, not just `DOMContentLoaded`, or enhancement breaks after the first soft navigation. Pattern:
  ```ts
  import { enhance } from './cli-motif';
  document.addEventListener('astro:page-load', enhance);
  ```
  `astro:page-load` fires on initial load *and* after every View Transition.
- Existing heading usages to migrate (from `git grep -n 'font-heading text-\|<h[123]'`):
  - **h1 (7):** `Hero.astro:13`, `pages/faq.astro:10`, `pages/signup.astro:10`, `pages/activities.astro:13`, `pages/events.astro:20`, `pages/officers.astro:13`, `pages/showcase.astro:31`
  - **section h2 (8):** `WhatWeDo.astro:19`, `WhyJoin.astro:22`, `ShowcaseHighlights.astro:19`, `FaqTeaser.astro` (post-Plan-A), `JoinCta.astro:10`, `ShowcaseGallery.astro:14`, `ShowcaseTrailer.astro:13`, `ShowcaseProjectGrid.astro:15`
  - **repeated-item h2 (2):** `EventList.astro:18`, `WorkshopList.astro:17` — these are per-item card titles; **prefix only, no typewriter**
  - **h3 card/reason titles (5):** `WhatWeDo.astro:33`, `WhyJoin.astro:28`, `ShowcaseHighlights.astro:37`, `ShowcaseProjectGrid.astro:32`, `OfficerCard.astro:40` — **prefix only, no typewriter**
  - Leave alone: `NavBar.astro:15` brand (`<a>`, not a heading), `FaqList.astro` `<dt>` (not a heading element), `SignUpForm.vue:64` success `<h2>` (transient state message, not a section heading)
- Existing secondary buttons to migrate to `CliButton` (all currently outline-gold `<a>` after Plan A): `WhatWeDo.astro:42`, `ShowcaseHighlights.astro:45`, `FaqTeaser.astro` (post-Plan-A). The inline text links in `EventList.astro:35` ("Learn more") stay plain underlined links — not buttons.
- Primary CTA to migrate to `CtaButton`: `JoinCta.astro:15` ("Sign Up" → `/signup`). It's the only filled-gold CTA button in the codebase.

Verification per task: `npm run test && npm run lint`. Final gate: `npm run build && npm run test && npm run lint`.

---

## Files created

| File | Responsibility |
|---|---|
| `src/components/ui/CliHeading.astro` | SSR heading + `aria-label` + `aria-hidden` text span + enhancement hooks |
| `src/components/ui/CliButton.astro` | SSR `fn()` secondary button, `aria-label` fixed, `aria-hidden` retype span |
| `src/components/ui/CtaButton.astro` | Primary CTA, `>`-slide + blink on hover (CSS only) |
| `src/scripts/cli-motif.ts` | Shared vanilla enhancer: typewriter (load + IO), button retype; reduced-motion aware; idempotent |
| `src/scripts/cli-motif.test.ts` | Unit tests for the enhancer against happy-dom |
| `src/components/ui/CliHeading.test.ts` | SSR-output tests (accessible name, no-JS fallback text) |
| `src/components/ui/CliButton.test.ts` | SSR-output tests (accessible name vs visible label) |

## Files modified

`src/styles/global.css`, `src/layouts/Layout.astro`, plus every file in the migration lists above.

---

## Task 1: Global `>` prefix + heading base class

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add the CLI heading + cursor CSS**

Append to `src/styles/global.css` (after the `body` rule):

```css
/* CLI/terminal motif — see docs/superpowers/specs/2026-08-30-design-refinement-pass-design.md §3 */

.cli-heading {
  position: relative;
}

/* Static prompt on every heading rendered through CliHeading. Always present —
   independent of whether the typewriter animation runs. */
.cli-heading::before {
  content: "> ";
  font-family: var(--font-mono);
  color: var(--color-accent-green);
  font-weight: 400;
}

.cli-cursor {
  display: inline-block;
  width: 0.55ch;
  margin-left: 0.05ch;
  background: var(--color-accent-green);
  color: transparent;
  animation: cli-blink 1s steps(1) infinite;
}
.cli-cursor::after { content: "\00a0"; }

@keyframes cli-blink {
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .cli-cursor { display: none; }
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: clean. Nothing renders `.cli-heading` yet — this is just the stylesheet.

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "style: CLI heading prefix + cursor styles"
```

---

## Task 2: `CliHeading` component + enhancement script

**Files:**
- Create: `src/components/ui/CliHeading.astro`
- Create: `src/scripts/cli-motif.ts`
- Create: `src/scripts/cli-motif.test.ts`
- Create: `src/components/ui/CliHeading.test.ts`
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Write failing SSR tests for `CliHeading`**

Create `src/components/ui/CliHeading.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import CliHeading from './CliHeading.astro';

describe('CliHeading SSR output', () => {
  test('renders the requested tag with the full text as accessible name', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliHeading, {
      props: { as: 'h1', text: 'Explore Computer Science' },
    });
    expect(html).toMatch(/<h1[^>]*aria-label="Explore Computer Science"/);
    // full text present in the DOM even before JS (SEO + no-JS)
    expect(html).toContain('Explore Computer Science');
  });

  test('h1 is marked for the load trigger', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliHeading, { props: { as: 'h1', text: 'Title' } });
    expect(html).toContain('data-cli-trigger="load"');
  });

  test('h2 is marked for the scroll trigger', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliHeading, { props: { as: 'h2', text: 'What We Do' } });
    expect(html).toContain('data-cli-trigger="scroll"');
  });

  test('animate=false omits the typewriter hook but keeps the class + text', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliHeading, {
      props: { as: 'h3', text: 'Intro to Python', animate: false },
    });
    expect(html).not.toContain('data-cli-heading');
    expect(html).toContain('cli-heading');
    expect(html).toContain('Intro to Python');
  });

  test('passes through extra classes', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliHeading, {
      props: { as: 'h2', text: 'X', class: 'font-heading text-3xl font-bold' },
    });
    expect(html).toMatch(/class="[^"]*font-heading[^"]*text-3xl[^"]*"/);
  });
});
```

- [ ] **Step 2: Run, watch fail**

Run: `npm run test -- src/components/ui/CliHeading.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `CliHeading.astro`**

```astro
---
// src/components/ui/CliHeading.astro
// Server-renders a real heading with the complete text as its accessible name.
// The visible text sits in an aria-hidden span so the shared cli-motif script
// can animate it character-by-character without screen readers ever seeing a
// partial string. The `>` prompt prefix is CSS (.cli-heading::before) and is
// always present, animation or not.
type Level = 'h1' | 'h2' | 'h3';

interface Props {
  as?: Level;
  text: string;
  /** Typewriter-in. Defaults on for h1/h2, off for h3. h1 types on load; h2 on scroll-in. */
  animate?: boolean;
  class?: string;
}

const { as: Tag = 'h2', text, animate = Tag !== 'h3', class: className } = Astro.props;
const trigger: 'load' | 'scroll' = Tag === 'h1' ? 'load' : 'scroll';
---

<Tag
  class:list={['cli-heading', className]}
  aria-label={text}
  data-cli-heading={animate ? '' : undefined}
  data-cli-trigger={animate ? trigger : undefined}
>
  <span aria-hidden="true" data-cli-text>{text}</span>
</Tag>
```

- [ ] **Step 4: Write failing tests for the enhancer**

Create `src/scripts/cli-motif.test.ts`:

```ts
// @vitest-environment happy-dom
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { enhance } from './cli-motif';

function reducedMotion(reduce: boolean) {
  window.matchMedia = ((q: string) => ({
    matches: reduce && q.includes('reduce'),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  document.body.innerHTML = '';
  reducedMotion(false);
  vi.useRealTimers();
});

describe('cli-motif enhance()', () => {
  test('reduced-motion: leaves full text, adds no cursor', () => {
    reducedMotion(true);
    document.body.innerHTML =
      '<h1 class="cli-heading" data-cli-heading data-cli-trigger="load" aria-label="Hi">' +
      '<span data-cli-text>Hi</span></h1>';
    enhance();
    expect(document.querySelector('[data-cli-text]')!.textContent).toBe('Hi');
    expect(document.querySelector('.cli-cursor')).toBeNull();
  });

  test('load trigger: starts typing from empty', () => {
    vi.useFakeTimers();
    document.body.innerHTML =
      '<h1 class="cli-heading" data-cli-heading data-cli-trigger="load" aria-label="Hello">' +
      '<span data-cli-text>Hello</span></h1>';
    enhance();
    const span = document.querySelector('[data-cli-text]')!;
    expect(span.textContent!.length).toBeLessThan(5); // cleared / mid-type
    vi.advanceTimersByTime(2000);
    expect(span.textContent).toBe('Hello');
  });

  test('is idempotent — second enhance() call does not re-animate a done heading', () => {
    vi.useFakeTimers();
    document.body.innerHTML =
      '<h1 class="cli-heading" data-cli-heading data-cli-trigger="load" aria-label="Done">' +
      '<span data-cli-text>Done</span></h1>';
    enhance();
    vi.advanceTimersByTime(2000);
    const span = document.querySelector('[data-cli-text]')!;
    span.textContent = 'MUTATED';
    enhance();
    expect(span.textContent).toBe('MUTATED'); // untouched second time
  });

  test('button retype swaps aria-hidden label on hover, keeps accessible name', () => {
    vi.useFakeTimers();
    document.body.innerHTML =
      '<a class="cli-button" data-cli-button data-base="read_faq()" data-alt="man montycsc" ' +
      'aria-label="Read the FAQ"><span data-cli-button-text>read_faq()</span></a>';
    enhance();
    const el = document.querySelector('.cli-button')!;
    el.dispatchEvent(new Event('mouseenter'));
    vi.advanceTimersByTime(1000);
    expect(el.querySelector('[data-cli-button-text]')!.textContent).toBe('man montycsc');
    expect(el.getAttribute('aria-label')).toBe('Read the FAQ');
    el.dispatchEvent(new Event('mouseleave'));
    vi.advanceTimersByTime(1000);
    expect(el.querySelector('[data-cli-button-text]')!.textContent).toBe('read_faq()');
  });

  test('reduced-motion: button shows base label, no retype on hover', () => {
    reducedMotion(true);
    document.body.innerHTML =
      '<a class="cli-button" data-cli-button data-base="read_faq()" data-alt="man montycsc" ' +
      'aria-label="Read the FAQ"><span data-cli-button-text>read_faq()</span></a>';
    enhance();
    const el = document.querySelector('.cli-button')!;
    el.dispatchEvent(new Event('mouseenter'));
    expect(el.querySelector('[data-cli-button-text]')!.textContent).toBe('read_faq()');
  });
});
```

- [ ] **Step 5: Run, watch fail**

Run: `npm run test -- src/scripts/cli-motif.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 6: Implement `src/scripts/cli-motif.ts`**

```ts
// src/scripts/cli-motif.ts
// Progressive enhancement for the CLI/terminal motif. Idempotent: safe to call
// on every astro:page-load. Does nothing meaningful under prefers-reduced-motion
// (the server already rendered the full, correct text).

const TYPE_MS_PER_CHAR = 14; // headings
const RETYPE_MS_PER_CHAR = 12; // buttons

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function typeInto(span: Element, full: string, msPerChar: number, onDone?: () => void) {
  const heading = span.parentElement!;
  let cursor = heading.querySelector('.cli-cursor') as HTMLElement | null;
  if (!cursor) {
    cursor = document.createElement('span');
    cursor.className = 'cli-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    heading.appendChild(cursor);
  }
  span.textContent = '';
  let i = 0;
  const step = () => {
    i += 1;
    span.textContent = full.slice(0, i);
    if (i < full.length) {
      window.setTimeout(step, msPerChar);
    } else {
      cursor?.remove();
      onDone?.();
    }
  };
  window.setTimeout(step, msPerChar);
}

function enhanceHeadings() {
  const nodes = document.querySelectorAll<HTMLElement>('[data-cli-heading]:not([data-cli-done])');
  nodes.forEach((el) => {
    el.setAttribute('data-cli-done', ''); // claim it now — idempotency guard
    const span = el.querySelector('[data-cli-text]');
    if (!span) return;
    const full = span.textContent ?? '';

    if (prefersReducedMotion()) return; // full text already in place

    if (el.getAttribute('data-cli-trigger') === 'load') {
      typeInto(span, full, TYPE_MS_PER_CHAR);
      return;
    }
    // scroll trigger
    if (typeof IntersectionObserver === 'undefined') return; // graceful: text stays
    span.textContent = ''; // hide until in view (aria-hidden span only)
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            io.disconnect();
            typeInto(span, full, TYPE_MS_PER_CHAR);
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
  });
}

function enhanceButtons() {
  const nodes = document.querySelectorAll<HTMLElement>('[data-cli-button]:not([data-cli-done])');
  nodes.forEach((el) => {
    el.setAttribute('data-cli-done', '');
    const span = el.querySelector('[data-cli-button-text]');
    const base = el.getAttribute('data-base') ?? '';
    const alt = el.getAttribute('data-alt') ?? '';
    if (!span || !alt) return;
    if (prefersReducedMotion()) return; // base label stays; CSS handles colour hover

    let timer: number | undefined;
    const retype = (to: string) => {
      window.clearTimeout(timer);
      const from = span.textContent ?? '';
      // delete `from` fast, then type `to`
      let i = from.length;
      const del = () => {
        i -= 1;
        span.textContent = from.slice(0, Math.max(0, i));
        if (i > 0) timer = window.setTimeout(del, RETYPE_MS_PER_CHAR);
        else {
          let j = 0;
          const add = () => {
            j += 1;
            span.textContent = to.slice(0, j);
            if (j < to.length) timer = window.setTimeout(add, RETYPE_MS_PER_CHAR);
          };
          add();
        }
      };
      del();
    };
    el.addEventListener('mouseenter', () => retype(alt));
    el.addEventListener('mouseleave', () => retype(base));
    el.addEventListener('focus', () => retype(alt));
    el.addEventListener('blur', () => retype(base));
  });
}

export function enhance() {
  enhanceHeadings();
  enhanceButtons();
}
```

- [ ] **Step 7: Run tests**

Run: `npm run test -- src/scripts/cli-motif.test.ts src/components/ui/CliHeading.test.ts`
Expected: PASS (all).

- [ ] **Step 8: Wire the script into the layout**

`src/layouts/Layout.astro`, add before `</body>` (after `<Footer />`):

```astro
    <Footer />
    <script>
      import { enhance } from '../scripts/cli-motif';
      document.addEventListener('astro:page-load', enhance);
    </script>
  </body>
```

`astro:page-load` fires on first load and after every View Transition, so persisted-DOM pages re-enhance correctly. The `:not([data-cli-done])` guards make re-runs cheap and safe.

- [ ] **Step 9: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add src/components/ui/CliHeading.astro src/scripts/cli-motif.ts \
  src/scripts/cli-motif.test.ts src/components/ui/CliHeading.test.ts src/layouts/Layout.astro
git commit -m "feat: CliHeading component + shared cli-motif enhancer"
```

---

## Task 3: Migrate all `h1` page titles

**Files:**
- Modify: `Hero.astro`, `pages/faq.astro`, `pages/signup.astro`, `pages/activities.astro`, `pages/events.astro`, `pages/officers.astro`, `pages/showcase.astro`

- [ ] **Step 1: Replace each `<h1>`**

For every file, import the component in the frontmatter:

```astro
import CliHeading from '../components/ui/CliHeading.astro';
// (Hero.astro is in components/sections/, so: '../ui/CliHeading.astro')
```

and replace the raw heading. Example — `Hero.astro:13`:

```astro
<h1 class="font-heading text-4xl font-bold md:text-6xl">Explore Computer Science</h1>
```
becomes
```astro
<CliHeading as="h1" text="Explore Computer Science" class="font-heading text-4xl font-bold md:text-6xl" />
```

Apply the same transform to:
| File:line | text |
|---|---|
| `pages/faq.astro:10` | `FAQ` |
| `pages/signup.astro:10` | `Sign Up` |
| `pages/activities.astro:13` | `Activities` |
| `pages/events.astro:20` | `Events` |
| `pages/officers.astro:13` | `Officers` |
| `pages/showcase.astro:31` | `Showcase` |

Keep each element's existing class string verbatim in `class`.

- [ ] **Step 2: Verify**

Run: `npm run build && npm run test && npm run lint`
Expected: clean. `npm run dev` → every page title shows `> ` prefix and types in on load, then a cursor that vanishes. Emulate reduced-motion → titles just appear with the prefix, no cursor.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: CLI typewriter on all page titles (h1)"
```

---

## Task 4: Migrate section `h2` headings (typewriter on scroll)

**Files:**
- Modify: `WhatWeDo.astro`, `WhyJoin.astro`, `ShowcaseHighlights.astro`, `FaqTeaser.astro`, `JoinCta.astro`, `ShowcaseGallery.astro`, `ShowcaseTrailer.astro`, `ShowcaseProjectGrid.astro`

- [ ] **Step 1: Replace each section `<h2>`**

Same pattern, `as="h2"` (defaults to `animate` on, `scroll` trigger). Example — `WhatWeDo.astro:19`:

```astro
<h2 class="font-heading text-3xl font-bold">What We Do</h2>
```
becomes
```astro
<CliHeading as="h2" text="What We Do" class="font-heading text-3xl font-bold" />
```

| File:line | text |
|---|---|
| `WhatWeDo.astro:19` | `What We Do` |
| `WhyJoin.astro:22` | `Why Join` |
| `ShowcaseHighlights.astro:19` | `From the Showcase` |
| `FaqTeaser.astro` (post-Plan-A `<h2>`) | `Got Questions?` |
| `JoinCta.astro:10` | `Ready to Join?` |
| `ShowcaseGallery.astro:14` | `Gallery` |
| `ShowcaseTrailer.astro:13` | `Trailer` |
| `ShowcaseProjectGrid.astro:15` | `Projects` |

- [ ] **Step 2: Verify**

Run: `npm run build && npm run test && npm run lint`
`npm run dev` → scroll the homepage: each section `h2` types in as it enters the viewport (once). Scroll back up and down — it does not re-type. Reduced-motion → headings just present with prefix.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: CLI typewriter on section headings (h2, scroll-triggered)"
```

---

## Task 5: Migrate repeated-item `h2` and card `h3` (prefix only)

**Files:**
- Modify: `EventList.astro`, `WorkshopList.astro`, `WhatWeDo.astro`, `WhyJoin.astro`, `ShowcaseHighlights.astro`, `ShowcaseProjectGrid.astro`, `OfficerCard.astro`

These are list/card titles — they get the `>` prefix and consistent styling but **no typewriter** (a page with 8 workshop cards should not fire 8 typing animations).

- [ ] **Step 1: Replace with `animate={false}`**

Example — `EventList.astro:18` (inside `.map()`):

```astro
<h2 class="font-heading text-xl font-semibold">{event.data.title}</h2>
```
becomes
```astro
<CliHeading as="h2" text={event.data.title} animate={false} class="font-heading text-xl font-semibold" />
```

| File:line | text expr | tag |
|---|---|---|
| `EventList.astro:18` | `{event.data.title}` | h2 |
| `WorkshopList.astro:17` | `{workshop.data.title}` | h2 |
| `WhatWeDo.astro:33` | `{workshop.data.title}` | h3 |
| `WhyJoin.astro:28` | `{reason.title}` | h3 (keep `text-gold`) |
| `ShowcaseHighlights.astro:37` | `{entry.data.title}` | h3 |
| `ShowcaseProjectGrid.astro:32` | `{project.data.title}` | h3 |
| `OfficerCard.astro:40` | `{name}` | h3 |

For h3 the `animate` default is already `false`, but pass it explicitly for clarity where these sit in loops. Preserve any extra classes (e.g. `WhyJoin`'s `text-gold`).

- [ ] **Step 2: Check heading nesting still reads sensibly**

`EventList`/`WorkshopList` items remain `h2` under the page `h1` — valid. Card `h3`s sit under a section `h2` on the homepage — valid. Don't downgrade levels.

- [ ] **Step 3: Verify**

Run: `npm run build && npm run test && npm run lint`
`npm run dev` → card/list titles show the `>` prefix, no animation. Check the prefix doesn't visually crowd tight card layouts (workshop cards) — if it does, note for a spec follow-up but keep consistent for now.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: CLI prefix on list + card headings (no typewriter)"
```

---

## Task 6: `CliButton` component

**Files:**
- Create: `src/components/ui/CliButton.astro`
- Create: `src/components/ui/CliButton.test.ts`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Write failing SSR tests**

Create `src/components/ui/CliButton.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import CliButton from './CliButton.astro';

describe('CliButton SSR output', () => {
  test('accessible name is the human label, not the fn() text', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliButton, {
      props: { label: 'Read the FAQ', base: 'read_faq()', alt: 'man montycsc', href: '/faq' },
    });
    expect(html).toMatch(/aria-label="Read the FAQ"/);
    expect(html).toContain('read_faq()'); // visible label
    expect(html).toContain('data-alt="man montycsc"');
    expect(html).toMatch(/href="\/faq"/);
  });

  test('visible label text is aria-hidden', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliButton, {
      props: { label: 'X', base: 'x()', alt: 'y', href: '/x' },
    });
    expect(html).toMatch(/aria-hidden="true"[^>]*data-cli-button-text|data-cli-button-text[^>]*/);
  });
});
```

- [ ] **Step 2: Run, watch fail** — `npm run test -- src/components/ui/CliButton.test.ts` → module not found.

- [ ] **Step 3: Implement `CliButton.astro`**

```astro
---
// src/components/ui/CliButton.astro
// Secondary "terminal" button. Renders an fn()-style label; the shared cli-motif
// script retypes it to `alt` on hover/focus. The accessible name is the plain
// human `label` and never changes.
interface Props {
  label: string; // accessible name, e.g. "Read the FAQ"
  base: string; // resting visible label, e.g. "read_faq()"
  alt: string; // hover/focus label, e.g. "man montycsc"
  href: string;
  class?: string;
}
const { label, base, alt, href, class: className } = Astro.props;
---

<a
  href={href}
  aria-label={label}
  data-cli-button
  data-base={base}
  data-alt={alt}
  class:list={[
    'cli-button border-accent-green text-accent-green hover:border-gold hover:text-gold',
    'inline-flex w-fit items-center rounded-md border px-4 py-2 font-mono text-sm transition-colors',
    className,
  ]}
>
  <span aria-hidden="true" data-cli-button-text>{base}</span>
</a>
```

- [ ] **Step 4: Add a min-width guard to `global.css`**

Retyping changes label length (`read_faq()` → `man montycsc`), which would jog layout. Add:

```css
.cli-button {
  min-width: 14ch;
  justify-content: center;
  white-space: nowrap;
}
```

Tune `14ch` if any `alt` string is longer (see Task 7 table — longest is `cd ./activities` at 15ch → use `16ch`).

- [ ] **Step 5: Run tests + lint** — `npm run test && npm run lint` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/CliButton.astro src/components/ui/CliButton.test.ts src/styles/global.css
git commit -m "feat: CliButton terminal-style secondary button"
```

---

## Task 7: Migrate secondary buttons to `CliButton`

**Files:**
- Modify: `WhatWeDo.astro`, `ShowcaseHighlights.astro`, `FaqTeaser.astro`

- [ ] **Step 1: Replace each outline `<a>` button**

| File | current text / href | `label` | `base` | `alt` |
|---|---|---|---|---|
| `WhatWeDo.astro:42-47` | "See all activities" → `/activities` | `See all activities` | `view_activities()` | `cd ./activities` |
| `ShowcaseHighlights.astro:45-50` | "Visit the full showcase" → `/showcase` | `Visit the full showcase` | `open_showcase()` | `ls ./showcase` |
| `FaqTeaser.astro` (post-Plan-A button) | "Read the FAQ" → `/faq` | `Read the FAQ` | `read_faq()` | `man montycsc` |

Example — `WhatWeDo.astro`:

```astro
<a href="/activities" class="border-gold text-gold hover:bg-gold hover:text-near-black w-fit rounded-full border px-5 py-2 font-body text-sm transition-colors">
  See all activities
</a>
```
becomes
```astro
<CliButton
  href="/activities"
  label="See all activities"
  base="view_activities()"
  alt="cd ./activities"
/>
```

Import `CliButton` in each frontmatter.

- [ ] **Step 2: Verify**

Run: `npm run build && npm run test && npm run lint`
`npm run dev` → each secondary button shows its `fn()` label in JetBrains Mono; hover retypes fast to the command and back; the button doesn't resize (min-width holds). Tab to it → same retype on focus. Reduced-motion → static `fn()` label, colour hover only. Accessible name (check DevTools a11y pane) is the human phrase.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: retype hover on secondary buttons"
```

---

## Task 8: `CtaButton` — primary CTA hover

**Files:**
- Create: `src/components/ui/CtaButton.astro`
- Create: `src/components/ui/CtaButton.test.ts`
- Modify: `src/styles/global.css`, `src/components/sections/JoinCta.astro`

- [ ] **Step 1: Failing SSR test**

Create `src/components/ui/CtaButton.test.ts`:

```ts
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import CtaButton from './CtaButton.astro';

describe('CtaButton SSR output', () => {
  test('renders label + an aria-hidden prompt glyph + href', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CtaButton, { props: { label: 'Sign Up', href: '/signup' } });
    expect(html).toContain('Sign Up');
    expect(html).toMatch(/href="\/signup"/);
    expect(html).toMatch(/aria-hidden="true"/);
    expect(html).toContain('cta-button');
  });
});
```

- [ ] **Step 2: Run, watch fail.**

- [ ] **Step 3: Implement `CtaButton.astro`**

```astro
---
// src/components/ui/CtaButton.astro
// Primary call-to-action. Gold, label fixed (no retype). On hover/focus a `>`
// prompt slides in from the left and blinks — echoing the heading prefix. All
// motion is CSS and disabled under prefers-reduced-motion.
interface Props {
  label: string;
  href: string;
  class?: string;
}
const { label, href, class: className } = Astro.props;
---

<a
  href={href}
  class:list={[
    'cta-button bg-gold text-near-black hover:bg-gold focus-visible:ring-gold',
    'relative inline-flex w-fit items-center overflow-hidden rounded-full px-6 py-2',
    'font-heading text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-near-black',
    className,
  ]}
>
  <span class="cta-button__prompt" aria-hidden="true">&gt;</span>
  <span class="cta-button__label">{label}</span>
</a>
```

- [ ] **Step 4: Add the hover CSS to `global.css`**

```css
.cta-button__prompt {
  position: absolute;
  left: 0.75rem;
  font-family: var(--font-mono);
  opacity: 0;
  transform: translateX(-0.35rem);
  transition: opacity 0.16s ease, transform 0.16s ease;
}
.cta-button__label {
  transition: transform 0.16s ease;
}
.cta-button:hover .cta-button__prompt,
.cta-button:focus-visible .cta-button__prompt {
  opacity: 1;
  transform: translateX(0);
  animation: cli-blink 1s steps(1) infinite;
}
.cta-button:hover .cta-button__label,
.cta-button:focus-visible .cta-button__label {
  transform: translateX(0.9rem);
}

@media (prefers-reduced-motion: reduce) {
  .cta-button__prompt,
  .cta-button__label { transition: none; }
  .cta-button:hover .cta-button__prompt,
  .cta-button:focus-visible .cta-button__prompt { animation: none; }
}
```

Under reduced-motion the `>` still appears and the label still shifts (no *animation*, just an instant state change) — acceptable per spec ("the `>` appears static"). If you'd rather fully suppress the shift under reduced-motion, also null the `transform` on `:hover .cta-button__label` inside the media query.

- [ ] **Step 5: Migrate `JoinCta.astro`**

`src/components/sections/JoinCta.astro:15-21`:

```astro
<a href="/signup" class="bg-gold text-near-black hover:bg-warm-white w-fit rounded-full px-6 py-2 font-body text-sm font-semibold transition-colors">
  Sign Up
</a>
```
becomes
```astro
<CtaButton href="/signup" label="Sign Up" />
```

Import `CtaButton` in the frontmatter.

- [ ] **Step 6: Verify**

Run: `npm run build && npm run test && npm run lint`
`npm run dev` → homepage bottom CTA: gold, "Sign Up". Hover → `>` slides in from the left, label nudges right, `>` blinks. Leave → reverts. Keyboard-focus → same. Reduced-motion → `>` appears without sliding/blinking. Confirm the button never retypes (it's not a `CliButton`).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/CtaButton.astro src/components/ui/CtaButton.test.ts \
  src/styles/global.css src/components/sections/JoinCta.astro
git commit -m "feat: prompt-slide hover on the primary CTA"
```

---

## Task 9: Full verification

- [ ] **Step 1: Sweep for un-migrated headings/buttons**

```bash
git grep -nE '<h[123][ >]' -- src/ ':!*.test.ts'
git grep -nE 'rounded-full .*(bg-gold|border-gold)|border-gold .*text-gold' -- src/ ':!*.test.ts'
```
Every hit should now be inside `CliHeading.astro` / `CliButton.astro` / `CtaButton.astro`, or a deliberately-excluded case (`NavBar` brand `<a>`, `FaqList` `<dt>`, `SignUpForm` success `<h2>`, `EventList` inline "Learn more" link). Note any stragglers and migrate or justify.

- [ ] **Step 2: Accessibility pass**

- Screen reader (or DevTools a11y tree) on `/` and `/faq`: every heading announces its **complete** text, once — never a partial string, never doubled.
- Secondary buttons announce the human label ("Read the FAQ"), not `read_faq()`.
- Keyboard: Tab reaches every button; focus retype fires; CTA prompt-slide fires on focus-visible; focus rings visible on dark.
- `prefers-reduced-motion: reduce` (DevTools → Rendering): no typing, no cursor, no retype, no CTA slide/blink; all text and the `>` prefixes present and correct.
- Disable JS entirely: every heading and button shows full, correct text (SSR fallback); `>` prefixes present (CSS).

- [ ] **Step 3: View Transitions regression**

Navigate `/` → `/activities` → `/` via nav links. After each soft nav, headings on the new page animate correctly and are not stuck empty; no double-enhance (check `data-cli-done` present once per element, no duplicate cursors).

- [ ] **Step 4: Final gate**

Run: `npm run build && npm run test && npm run lint`
Expected: `astro check` clean, all tests pass, no lint errors.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: cli-motif edge cases from verification pass"
```
(Skip if nothing changed.)

---

## Done when

- Every `h1`/`h2`/`h3` rendered through `CliHeading` carries a `>` prefix.
- `h1` types on load; section `h2` types on scroll-in (once); list/card headings don't animate.
- Secondary buttons show `fn()` labels and retype fast to a command on hover/focus, with a constant accessible name and no layout shift.
- Primary CTA shows a `>`-slide + blink on hover/focus, no retype.
- Full reduced-motion and no-JS fallbacks render complete, correct text.
- View Transitions re-enhance without duplication.
- `npm run build && npm run test && npm run lint` all green.

## Out of scope

- Animating `<dt>`, nav links, or the transient sign-up success heading.
- Changing heading copy or levels.
- Any token/palette change.
