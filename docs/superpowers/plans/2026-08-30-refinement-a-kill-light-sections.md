# Refinement A — Kill Light Sections — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every light (`bg-warm-white`) section so the site is dark end-to-end, and delete the now-dead "light-section button" branch.

**Architecture:** Pure presentational change. Flip the `body` default to dark, convert the three light surfaces (FAQ page, sign-up page, FAQ teaser) to dark treatments, and re-skin the sign-up form's inputs/buttons for a dark background. No new components, no token changes, no copy changes.

**Tech Stack:** Astro, Vue 3 (SignUpForm island), Tailwind v4 CSS-first (`@theme` in `src/styles/global.css`), Vitest + happy-dom + `@vue/test-utils`.

**Spec:** `docs/superpowers/specs/2026-08-30-design-refinement-pass-design.md` §1.

---

## Context for the implementer

- Tailwind v4 here has **no `tailwind.config.js`** — theme tokens live in `@theme { … }` in `src/styles/global.css`. Do not add a config file.
- The design tokens (`--color-deep-green`, `--color-accent-green`, `--color-gold`, `--color-near-black`, `--color-warm-white`) are **not changing**. Only their usage changes.
- Dark treatments already used elsewhere in the codebase, for reference:
  - near-black flat: `class="bg-near-black text-warm-white …"` (Hero, ShowcaseHighlights, JoinCta)
  - deep-green flat: `class="bg-deep-green text-warm-white …"` (WhatWeDo, WhyJoin, Footer)
  - deep-green panel on near-black page: a `bg-near-black` section with `border-accent-green/40 … rounded-lg border` children
- Secondary/outline button pattern already in use on dark:
  `class="border-gold text-gold hover:bg-gold hover:text-near-black w-fit rounded-full border px-5 py-2 font-body text-sm transition-colors"`
- `astro check` runs as part of `npm run build` and must stay clean.
- Run the full check after each task: `npm run test && npm run lint`.

---

## Files touched

| File | Change |
|---|---|
| `src/styles/global.css` | `body` → dark background + light text |
| `src/pages/faq.astro` | section wrapper → near-black; intro text colour |
| `src/components/sections/FaqList.astro` | each Q&A → bordered deep-green panel on near-black; border/text colours |
| `src/components/sections/FaqTeaser.astro` | section wrapper → deep-green; button → outline-gold; text colours |
| `src/pages/signup.astro` | section wrapper → near-black; intro text colour |
| `src/components/sections/SignUpForm.vue` | inputs, labels, submit button, success + error panels re-skinned for dark |
| `src/layouts/Layout.test.ts` | (only if a new assertion is added — see Task 1) |

No test file exists for the `.astro` sections; `SignUpForm.vue` has no test today. This plan adds one focused Vue test for the form re-skin and one Layout assertion for the body class. The `.astro`-only visual changes are verified by `astro check` + lint + a manual `npm run dev` pass (Task 7).

---

## Task 1: Flip the `body` default to dark

**Files:**
- Modify: `src/styles/global.css:16-18`
- Test: `src/layouts/Layout.test.ts`

- [ ] **Step 1: Add a failing assertion for the dark body class**

In `src/layouts/Layout.test.ts`, add a second test:

```ts
test('body uses the dark default surface', async () => {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: vueRenderer });
  const result = await container.renderToString(Layout, {
    props: { title: 'Home' },
    slots: { default: 'content' },
  });
  // body carries the layout flex classes; assert the dark surface is present
  // and the old light one is gone.
  expect(result).toMatch(/<body[^>]*class="[^"]*bg-near-black[^"]*"/);
  expect(result).not.toMatch(/<body[^>]*class="[^"]*bg-warm-white[^"]*"/);
});
```

Note: the `body` element's classes come from `Layout.astro:30` (`class="flex min-h-dvh flex-col"`), **not** from `global.css`. The global CSS `@apply` on `body` sets colours but won't appear as a class attribute in the rendered string. So this task changes **both**: move the surface to an explicit class on the `<body>` tag and update the global default to match.

- [ ] **Step 2: Run it, watch it fail**

Run: `npm run test -- src/layouts/Layout.test.ts`
Expected: FAIL — `bg-near-black` not found on `<body>`.

- [ ] **Step 3: Update `global.css`**

`src/styles/global.css`, replace:

```css
body {
  @apply font-body text-near-black bg-warm-white;
}
```

with:

```css
body {
  @apply font-body text-warm-white bg-near-black;
}
```

- [ ] **Step 4: Update the `<body>` tag in `Layout.astro`**

`src/layouts/Layout.astro:30`, replace:

```astro
  <body class="flex min-h-dvh flex-col">
```

with:

```astro
  <body class="bg-near-black text-warm-white flex min-h-dvh flex-col">
```

(Explicit classes so the surface is greppable and testable, matching how every section declares its own `bg-*`.)

- [ ] **Step 5: Run tests**

Run: `npm run test -- src/layouts/Layout.test.ts`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css src/layouts/Layout.astro src/layouts/Layout.test.ts
git commit -m "refactor: dark body default, drop bg-warm-white base"
```

---

## Task 2: FAQ page wrapper → near-black

**Files:**
- Modify: `src/pages/faq.astro:7-14`

- [ ] **Step 1: Change the section surface**

`src/pages/faq.astro:7`, replace:

```astro
  <section class="bg-warm-white text-near-black px-6 py-16">
```

with:

```astro
  <section class="bg-near-black text-warm-white px-6 py-16">
```

- [ ] **Step 2: Fix the intro paragraph colour**

`src/pages/faq.astro:11`, replace `text-near-black/70` with `text-warm-white/70`:

```astro
        <p class="font-body text-warm-white/70">
```

- [ ] **Step 3: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: `astro check` clean, no lint errors. (No unit test for this file — visual check happens in Task 7.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/faq.astro
git commit -m "style: FAQ page on near-black surface"
```

---

## Task 3: FAQ list → bordered deep-green panels

**Files:**
- Modify: `src/components/sections/FaqList.astro:43-52`

Per the spec, FAQ questions become individual bordered panels so the page has structure rather than a flat list.

- [ ] **Step 1: Re-skin the list markup**

`src/components/sections/FaqList.astro`, replace the `<dl>` block (lines 43-52):

```astro
<dl class="flex flex-col gap-6">
  {
    faqs.map((faq) => (
      <div class="border-deep-green/20 border-b pb-6">
        <dt class="font-heading text-lg font-semibold">{faq.question}</dt>
        <dd class="font-body text-near-black/80 mt-2 text-sm">{faq.answer}</dd>
      </div>
    ))
  }
</dl>
```

with:

```astro
<dl class="flex flex-col gap-4">
  {
    faqs.map((faq) => (
      <div class="border-accent-green/25 bg-deep-green/40 rounded-lg border p-5">
        <dt class="font-heading text-warm-white text-lg font-semibold">{faq.question}</dt>
        <dd class="font-body text-warm-white/75 mt-2 text-sm">{faq.answer}</dd>
      </div>
    ))
  }
</dl>
```

Rationale for `bg-deep-green/40`: a lifted panel that reads against `bg-near-black` without being as heavy as full `deep-green`. Adjust the alpha during the Task 7 visual pass if it's too subtle/strong.

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/FaqList.astro
git commit -m "style: FAQ questions as deep-green panels on dark"
```

---

## Task 4: FAQ teaser (home) → deep-green + outline button

**Files:**
- Modify: `src/components/sections/FaqTeaser.astro:6-19`

- [ ] **Step 1: Re-skin the section**

`src/components/sections/FaqTeaser.astro`, replace lines 6-19:

```astro
<section class="bg-warm-white text-near-black px-6 py-16">
  <div class="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
    <h2 class="font-heading text-3xl font-bold">Got Questions?</h2>
    <p class="font-body text-near-black/70 max-w-xl">
      New to the club, or new to coding entirely? Our FAQ covers the basics — experience level,
      time commitment, and how to get started.
    </p>
    <a
      href="/faq"
      class="bg-deep-green text-warm-white hover:bg-accent-green w-fit rounded-full px-6 py-2 font-body text-sm transition-colors"
    >
      Read the FAQ
    </a>
  </div>
</section>
```

with:

```astro
<section class="bg-deep-green text-warm-white px-6 py-16">
  <div class="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
    <h2 class="font-heading text-3xl font-bold">Got Questions?</h2>
    <p class="font-body text-warm-white/80 max-w-xl">
      New to the club, or new to coding entirely? Our FAQ covers the basics — experience level,
      time commitment, and how to get started.
    </p>
    <a
      href="/faq"
      class="border-gold text-gold hover:bg-gold hover:text-near-black w-fit rounded-full border px-5 py-2 font-body text-sm transition-colors"
    >
      Read the FAQ
    </a>
  </div>
</section>
```

This uses the same outline-gold button pattern as `WhatWeDo.astro` / `ShowcaseHighlights.astro` — the "light-section plain button" is now gone, every secondary button is the dark outline button. (Plan B later swaps these for the `fn()` CLI button; leaving them consistent here keeps Plan B a clean single sweep.)

The home page section order is Hero (near-black) → WhatWeDo (deep-green) → ShowcaseHighlights (near-black) → WhyJoin (deep-green) → FaqTeaser → JoinCta (near-black). FaqTeaser on `deep-green` sits between WhyJoin (`deep-green`) and JoinCta (`near-black`) — that's two `deep-green` sections adjacent. Fix: set FaqTeaser to **`bg-near-black`** instead, matching the outline-button-on-near-black pattern:

Use `bg-near-black text-warm-white` for the section (not `bg-deep-green`). Final:

```astro
<section class="bg-near-black text-warm-white px-6 py-16">
```

Keep the `text-warm-white/80` paragraph and the outline-gold button from above.

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/FaqTeaser.astro
git commit -m "style: FAQ teaser on near-black with outline button"
```

---

## Task 5: Sign-up page wrapper → near-black

**Files:**
- Modify: `src/pages/signup.astro:7-14`

- [ ] **Step 1: Change the surface + intro colour**

`src/pages/signup.astro:7`:

```astro
  <section class="bg-near-black text-warm-white px-6 py-16">
```

`src/pages/signup.astro:11`:

```astro
        <p class="font-body text-warm-white/70">
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run build && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/pages/signup.astro
git commit -m "style: sign-up page on near-black surface"
```

---

## Task 6: Re-skin the sign-up form for dark

**Files:**
- Modify: `src/components/sections/SignUpForm.vue:57-165`
- Create: `src/components/sections/SignUpForm.test.ts`

The form currently assumes a light background: `bg-warm-white` inputs, `text-near-black` labels, `bg-red-100 text-red-800` error banner, `bg-deep-green/10` success panel. All need dark equivalents.

- [ ] **Step 1: Write a failing test for the dark re-skin**

Create `src/components/sections/SignUpForm.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import SignUpForm from './SignUpForm.vue';

describe('SignUpForm dark styling', () => {
  test('inputs do not use the light warm-white background', () => {
    const wrapper = mount(SignUpForm);
    for (const input of wrapper.findAll('input:not([tabindex="-1"])')) {
      expect(input.classes()).not.toContain('bg-warm-white');
    }
  });

  test('labels are light-on-dark, not near-black', () => {
    const wrapper = mount(SignUpForm);
    for (const label of wrapper.findAll('label')) {
      expect(label.classes()).not.toContain('text-near-black');
    }
  });

  test('submit button retains its accessible label', () => {
    const wrapper = mount(SignUpForm);
    expect(wrapper.get('button[type="submit"]').text()).toBe('Sign Up');
  });
});
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npm run test -- src/components/sections/SignUpForm.test.ts`
Expected: FAIL — inputs still carry `bg-warm-white`, labels still `text-near-black`.

- [ ] **Step 3: Apply the dark skin**

In `src/components/sections/SignUpForm.vue`:

1. **Success panel** (lines 59-70): `bg-deep-green/10` → `bg-deep-green/40 border border-accent-green/25`; `text-deep-green` heading → `text-warm-white`; `text-near-black/70` → `text-warm-white/75`.

2. **Error banner** (lines 77-85): `bg-red-100 … text-red-800` → `bg-red-950/60 border border-red-500/40 text-red-200`. Keep `role="alert"`, `tabindex="-1"`, `focus:outline-none`.

3. **Each label** (lines 88-91, 104-107, 120-123): `text-near-black` → `text-warm-white`.

4. **Each visible input** (lines 92-100, 108-116, 124-132): replace
   `border border-near-black/20 bg-warm-white px-3 py-2 font-body text-near-black focus:border-accent-green focus:outline-none`
   with
   `border border-accent-green/30 bg-near-black px-3 py-2 font-body text-warm-white placeholder:text-warm-white/40 focus:border-accent-green focus:outline-none`.

5. **Honeypot input** (lines 146-153): leave as-is — it's visually hidden, styling is irrelevant, and the test filters it via `[tabindex="-1"]`.

6. **Submit button** (lines 156-162): currently `bg-deep-green … text-warm-white hover:bg-accent-green`. Keep it — deep-green filled on near-black reads fine and is not the primary gold CTA. Optionally align with the outline pattern; **keep filled** for form-submit affordance. No change required, but confirm the classes still make sense on `bg-near-black` (they do).

- [ ] **Step 4: Run tests**

Run: `npm run test -- src/components/sections/SignUpForm.test.ts`
Expected: PASS.

- [ ] **Step 5: Full test + lint**

Run: `npm run test && npm run lint`
Expected: all pass, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/sections/SignUpForm.vue src/components/sections/SignUpForm.test.ts
git commit -m "style: dark skin for the sign-up form"
```

---

## Task 7: Visual pass + sweep for stray light utilities

**Files:**
- Read-only scan across `src/`

- [ ] **Step 1: Grep for leftover light usage**

Run:
```bash
git grep -n "bg-warm-white\|text-near-black\|bg-white\|bg-red-100\|bg-deep-green/10" -- src/
```
Expected: **no matches** except intentional ones. `text-near-black` is still legitimate where it's *foreground on a light/gold element* — e.g. `JoinCta.astro:17` (`bg-gold text-near-black`), `WhatWeDo.astro:44` hover state (`hover:text-near-black`), `OfficerCard.astro` avatar. Confirm each remaining hit is text-on-light-element, not a section background.

- [ ] **Step 2: Run the dev server and eyeball every route**

Run: `npm run dev`, then visit `/`, `/faq`, `/signup`, `/activities`, `/events`, `/showcase`, `/officers`.
Check:
- No white flashes / light bands anywhere.
- FAQ panels: border + fill alpha reads well (tune `border-accent-green/25` / `bg-deep-green/40` in `FaqList.astro` if needed).
- Sign-up form: inputs legible, focus ring visible, error state (submit empty-ish to trigger client/network error) readable, success panel readable.
- FAQ teaser button matches the other outline buttons.
- Contrast: body text on every surface is comfortably readable (`warm-white/70`–`/80` on near-black/deep-green is fine; go lighter if any feels dim).

- [ ] **Step 3: Commit any tuning**

```bash
git add -A
git commit -m "style: tune FAQ panel + form contrast after visual pass"
```
(Skip if nothing changed.)

- [ ] **Step 4: Final full verification**

Run: `npm run build && npm run test && npm run lint`
Expected: `astro check` clean, all tests pass, no lint errors.

---

## Done when

- `git grep bg-warm-white -- src/` returns nothing.
- No light section backgrounds on any route (manual pass).
- `npm run build && npm run test && npm run lint` all green.
- Spec §1 "amends original spec" items are satisfied (light sections gone, light button branch gone, warm-white is text-only).

## Follow-up (not this plan)

Plan B swaps the outline-gold secondary buttons (`WhatWeDo`, `ShowcaseHighlights`, `FaqTeaser`) for the `fn()` CLI button with hover-retype. Leave them as consistent outline buttons here.
