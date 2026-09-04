# Heading Typeface Swap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap the site's heading typeface from Space Grotesk to Space Mono, leaning further into the existing CLI/terminal motif, without touching the body font (Inter) or the CLI-motif mono (JetBrains Mono).

**Architecture:** Every heading (and a couple of buttons that intentionally share the token — `CtaButton`, the sign-up submit button) renders through Tailwind's `font-heading` utility, which resolves to the single `--font-heading` CSS custom property defined in `@theme` in `src/styles/global.css`. Space Mono is only published at weights 400 and 700 (no 600/"semibold" face), unlike Space Grotesk which had a 600. Every current `font-heading` + `font-semibold` pairing must become `font-heading` + `font-bold` — otherwise the browser fake-bolds a nonexistent 600 weight, which looks blurry/synthetic, especially on a monospace face.

**Tech Stack:** Astro, Tailwind CSS v4 (`@theme` tokens in CSS, no `tailwind.config.js`), Google Fonts.

---

### Task 1: Swap the heading font token

**Files:**
- Modify: `src/styles/global.css:1` (Google Fonts `@import`)
- Modify: `src/styles/global.css:11` (`--font-heading` token)

- [x] **Step 1: Update the Google Fonts import**

Current line ([global.css:1](src/styles/global.css#L1)):
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
```

Replace with (drops the Space Grotesk family entirely; adds Space Mono at weight 700 only — the sole bold weight it ships, which after Task 2 is the only weight any `font-heading` element uses; Inter and JetBrains Mono families are untouched):
```css
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
```

- [x] **Step 2: Update the `--font-heading` token**

Current ([global.css:11](src/styles/global.css#L11)):
```css
  --font-heading: "Space Grotesk", sans-serif;
```

Replace with:
```css
  --font-heading: "Space Mono", monospace;
```

- [x] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: swap heading typeface to Space Mono

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Normalize `font-heading` + `font-semibold` to `font-bold`

Space Mono has no 600 weight, so every element that combines `font-heading` with `font-semibold` needs to become `font-bold` (700) instead. There are 13 occurrences across 12 files, found via:
```bash
grep -rln "font-heading" src/components src/pages src/layouts | xargs grep -l "font-semibold"
```

**Files (exact line, exact string to change — `font-semibold` → `font-bold`, nothing else on the line changes):**

- [x] **Step 1:** `src/components/sections/WhyJoin.astro:30`
  ```
  class="font-heading text-gold text-xl font-semibold"
  ```
  → `class="font-heading text-gold text-xl font-bold"`

- [x] **Step 2:** `src/components/ui/OfficerCard.astro:41`
  ```
  class="font-heading text-lg font-semibold"
  ```
  → `class="font-heading text-lg font-bold"`

- [x] **Step 3:** `src/components/sections/WorkshopList.astro:18`
  ```
  class="font-heading text-xl font-semibold"
  ```
  → `class="font-heading text-xl font-bold"`

- [x] **Step 4:** `src/components/sections/ShowcaseHighlights.astro:39`
  ```
  class="font-heading text-lg font-semibold"
  ```
  → `class="font-heading text-lg font-bold"`

- [x] **Step 5:** `src/components/ui/CtaButton.astro:19`
  ```
  'font-heading text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-near-black',
  ```
  → `'font-heading text-sm font-bold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-near-black',`

- [x] **Step 6:** `src/components/sections/ShowcaseProjectGrid.astro:16`
  ```
  class="font-heading text-2xl font-semibold"
  ```
  → `class="font-heading text-2xl font-bold"`

- [x] **Step 7:** `src/components/sections/ShowcaseProjectGrid.astro:33`
  ```
  class="font-heading text-lg font-semibold"
  ```
  → `class="font-heading text-lg font-bold"`

- [x] **Step 8:** `src/components/sections/FaqList.astro:47`
  ```
  class="font-heading text-warm-white text-lg font-semibold"
  ```
  → `class="font-heading text-warm-white text-lg font-bold"`

- [x] **Step 9:** `src/components/sections/ShowcaseGallery.astro:16`
  ```
  class="font-heading text-2xl font-semibold"
  ```
  → `class="font-heading text-2xl font-bold"`

- [x] **Step 10:** `src/components/sections/EventList.astro:19`
  ```
  class="font-heading text-xl font-semibold"
  ```
  → `class="font-heading text-xl font-bold"`

- [x] **Step 11:** `src/components/sections/SignUpForm.vue:159`
  ```
  class="mt-2 rounded-md bg-deep-green px-4 py-2 font-heading font-semibold text-warm-white transition hover:bg-accent-green disabled:cursor-not-allowed disabled:opacity-60"
  ```
  → `class="mt-2 rounded-md bg-deep-green px-4 py-2 font-heading font-bold text-warm-white transition hover:bg-accent-green disabled:cursor-not-allowed disabled:opacity-60"`

- [x] **Step 12:** `src/components/sections/WhatWeDo.astro:35`
  ```
  class="font-heading text-xl font-semibold"
  ```
  → `class="font-heading text-xl font-bold"`

- [x] **Step 13:** `src/components/sections/ShowcaseTrailer.astro:15`
  ```
  class="font-heading text-2xl font-semibold"
  ```
  → `class="font-heading text-2xl font-bold"`

- [x] **Step 14: Verify no `font-heading` + `font-semibold` pairing remains**

Run: `grep -rln "font-heading" src/components src/pages src/layouts | xargs grep -l "font-semibold"`
Expected: no output (empty).

- [x] **Step 15: Commit**

```bash
git add -A
git commit -m "fix: use font-bold instead of font-semibold on Space Mono headings

Space Mono only ships weight 700 (no 600), so font-semibold on any
font-heading element would fake-bold a nonexistent weight.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Build and visual verification

**Files:** none (verification only)

- [ ] **Step 1: Build to catch syntax errors**

Run: `npm run build`
Expected: build completes with no errors (this also runs `astro check`, which would flag broken CSS or malformed class strings).

- [ ] **Step 2: Visual check in dev**

Run: `npm run dev`, open `http://localhost:4321/`.
Check:
- Hero h1 ("Explore Computer Science") renders in Space Mono, at its real 700 weight (not fake-bolded), and doesn't wrap awkwardly or overflow its container at common widths — resize the window narrow (~375px) and wide (~1440px).
- A section h2 (e.g. "Why Join") and an h3 (e.g. a workshop card title in "What We Do") render in Space Mono at a clean, non-blurry weight.
- The "Sign Up" CTA button (`CtaButton`) and the sign-up form submit button render in Space Mono too — expected, since they intentionally share the `font-heading` token.
- The `>` prompt prefix and CLI cursor/typewriter animation on headings still work (`.cli-heading::before` and `.cli-cursor` use `--font-mono`, independent of this change, but worth a quick regression glance).

If any heading wraps badly because Space Mono is wider per character than Space Grotesk was, note it for the user rather than silently changing `clamp()`/font-size values — that's a follow-up tuning decision, not part of this swap.

- [ ] **Step 3: Fix anything found, or confirm clean**

If Step 2 surfaces a real bug (not a tuning preference — e.g. broken layout, missing font), fix it and repeat Steps 1–2. If it's just a "this could look better" observation, report it to the user instead of changing it unprompted.

---

## Self-review notes

- **Spec coverage:** Spec §1 (Typeface change) fully covered — import line, token swap (Task 1), the weight-availability issue the spec's "watch for" note didn't fully anticipate is now resolved concretely (Task 2) rather than left as a runtime surprise, and the wrapping watch-for is a named check in Task 3 rather than assumed away.
- **Placeholder scan:** none found — every step has the literal before/after string.
- **Type consistency:** N/A (CSS/class-string change only, no functions/types across tasks).
