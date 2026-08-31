# Compliance & Standards — Action Items

Audit of the site against **accessibility (WCAG 2.2 AA)**, **SEO / metadata**,
**performance / Core Web Vitals**, **privacy / legal**, and **security**. Done
2026-08-31 against `main` (commit `1832234`).

**On security specifically:** the attack surface is small — a static-first Astro
build with one unauthenticated on-demand route (`/api/signup`), no database, no
user accounts, no secrets in client code, and no `set:html` / `v-html` /
`innerHTML` on dynamic data. Nothing below is urgent. It's standard hardening,
listed so it's tracked rather than rediscovered.

Items are grouped by severity (Critical → Low). Each item lists the area, where it
lives, and the fix. Check items off in the PR that resolves them and note the PR
number.

> Some of these overlap with the "Known gaps / deliberate placeholders" section of
> [ROADMAP.md](./ROADMAP.md) (the production domain, the Sheets backend). They're
> repeated here with the compliance angle spelled out.

## Priority summary

| # | Item | Area | Severity |
|---|---|---|---|
| 1 | No privacy policy anywhere on the site | Privacy | 🔴 Critical |
| 2 | No consent / disclosure text on the sign-up form | Privacy | 🔴 Critical |
| 3 | Student-data-privacy sign-off from the school/district before collecting emails | Privacy | 🔴 Critical |
| 4 | `site` is a placeholder domain | SEO | 🔴 Critical |
| 5 | No skip-to-content link | A11y (WCAG 2.4.1) | 🟠 High |
| 6 | No visible focus indicator on text links | A11y (WCAG 2.4.7) | 🟠 High |
| 7 | No `og:image`; `summary_large_image` card declared without one | SEO | 🟠 High |
| 8 | No `robots.txt` | SEO | 🟠 High |
| 9 | Missing canonical / `og:url` / `og:type` / `og:site_name` | SEO | 🟠 High |
| 10 | Raw `<img>` with no dimensions → layout shift (CLS) | Perf | 🟠 High |
| 11 | Fonts loaded via CSS `@import` from Google's CDN | Perf + Privacy | 🟠 High |
| 12 | No minimum-age / grade floor on the form | Privacy | 🟠 High |
| 13 | Sign-up PII written to Vercel function logs; Sheet sharing scope | Privacy | 🟠 High |
| 14 | Footer copyright text fails contrast | A11y (WCAG 1.4.3) | 🟡 Medium |
| 15 | Grade-field instruction only in low-contrast placeholder | A11y (WCAG 1.4.3 / 3.3.2) | 🟡 Medium |
| 16 | `TerminalPanel` dialog semantics not fully verified | A11y (WCAG 2.1.2 / 2.4.3) | 🟡 Medium |
| 17 | `HeroGraph` hydrates twice on the homepage | Perf | 🟡 Medium |
| 18 | Three font families / eight weight files | Perf | 🟡 Medium |
| 19 | No structured data (JSON-LD) | SEO | 🟡 Medium |
| 20 | No `aria-current` on the active nav link | A11y | 🟡 Medium |
| 21 | Gallery images share one generic `alt` string | A11y (WCAG 1.1.1) | 🟢 Low |
| 22 | No `theme-color`, `apple-touch-icon`, or web manifest | SEO / PWA polish | 🟢 Low |
| 23 | No `loading="lazy"` on below-the-fold images | Perf | 🟢 Low |
| 24 | No security response headers / CSP | Security | 🟡 Medium |
| 25 | `npm audit`: 3 high-severity (`path-to-regexp` via `@astrojs/vercel`) | Security | 🟡 Medium |
| 26 | `/api/signup` input validation is thin (no length caps, no `Content-Type` check, extra keys passed through) | Security | 🟡 Medium |
| 27 | Rate limit is per-instance in-memory only | Security | 🟢 Low |
| 28 | No `Origin` / `Referer` check on `/api/signup` | Security | 🟢 Low |
| 29 | CI actions pinned to major-version tags, not commit SHAs | Security | 🟢 Low |
| 30 | Content-schema URL fields are `z.string()`, not `z.string().url()` | Security | 🟢 Low |
| 31 | `.vue` external links not guaranteed `rel="noopener"` | Security | 🟢 Low |
| 32 | Google service-account key must be a sensitive env var, never logged | Security | 🟢 Low |

---

## 🔴 Critical

Legal exposure or broken in production. Block public launch.

- [ ] **1. Publish a privacy policy.** The site collects name, email, and grade
  level from high-schoolers via the sign-up form and has no privacy notice at all.
  Add a `/privacy` page: what's collected, why, where it goes (a Google Sheet),
  who can see it, how long it's kept, and a contact for removal requests. Link it
  from the footer.
- [ ] **2. Add consent / disclosure text to the form.** On
  [`SignUpForm.vue`](../src/components/sections/SignUpForm.vue), add a short
  statement next to the submit button ("We use this to contact you about club
  activities. See our privacy policy.") linking to `/privacy`. A checkbox is
  optional; a visible statement is the minimum.
- [ ] **3. Get school/district sign-off before collecting student emails.**
  "Montgomery" is a real school — most districts have a student-data-privacy
  policy (and some states have student-privacy laws) covering exactly this. Have
  a staff sponsor confirm the club may collect student contact info and where it
  may be stored. Until then, prefer the external Google Form path already noted in
  [ROADMAP.md](./ROADMAP.md).
- [ ] **4. Set the real production domain.** `site` in
  [`astro.config.mjs`](../astro.config.mjs) is `https://montycsc.example.com`.
  Until it's real, the sitemap, canonical URLs, and every absolute OG URL are
  wrong. (Also tracked in ROADMAP.md.)

## 🟠 High

WCAG AA failures, broken social/SEO, or clear Core Web Vitals regressions.

- [ ] **5. Add a skip link.** No "skip to main content" link — every page has the
  logo plus seven nav links before `<main>` ([`Layout.astro`](../src/layouts/Layout.astro),
  [`NavBar.astro`](../src/components/ui/NavBar.astro)). WCAG 2.4.1. Add a
  visually-hidden-until-focused anchor to `#main`.
- [ ] **6. Add a visible focus indicator to text links.**
  [`NavBar.astro`](../src/components/ui/NavBar.astro) `:focus-visible` only slides
  in the `>` prompt; [`Footer.astro`](../src/components/ui/Footer.astro) links
  show nothing on focus. WCAG 2.4.7. Reuse the focus-ring treatment the graph
  nodes already have and apply it to all links globally.
- [ ] **7. Add an `og:image`.** [`Layout.astro`](../src/layouts/Layout.astro)
  declares `twitter:card = summary_large_image` but no image exists → blank social
  previews. Add a 1200×630 share image and reference it (absolute URL — depends on
  #4).
- [ ] **8. Add `robots.txt`.** Nothing in [`public/`](../public/). Add one that
  allows crawling and points at `/sitemap-index.xml`.
- [ ] **9. Add canonical + remaining OG tags.** No `<link rel="canonical">`,
  `og:url`, `og:type`, or `og:site_name` in
  [`Layout.astro`](../src/layouts/Layout.astro).
- [ ] **10. Serve images through `astro:assets`.** Officer photos
  ([`OfficerCard.astro`](../src/components/ui/OfficerCard.astro)) and gallery
  images ([`ShowcaseGallery.astro`](../src/components/sections/ShowcaseGallery.astro))
  are raw `<img src>` with no `width`/`height` → layout shift as they load (CLS),
  and no AVIF/WebP or `srcset`. Move to `<Image>` / `<Picture>`.
- [ ] **11. Stop loading fonts via CSS `@import` from Google.**
  [`global.css`](../src/styles/global.css) line 1 is a render-blocking chained
  request, and it ships every visitor's IP to Google with no disclosure (a
  documented GDPR problem). Self-host with `@fontsource-variable/*`. Fixes an LCP
  hit and the privacy issue at once.
- [ ] **12. Add a minimum-age / grade floor to the form.** Collecting PII from
  minors with no age gate. Add a grade `<select>` (9–12) or a "must be 13+"
  statement. If anyone under 13 could realistically submit, COPPA requires
  verifiable parental consent.
- [ ] **13. Lock down where sign-up data lands.**
  [`signup.ts`](../src/pages/api/signup.ts) currently `console.log`s full
  submissions into Vercel function logs (PII retained there). Drop the log (or log
  only non-PII), and when the Sheets write is wired up, share the target Sheet
  with specific accounts only — never "anyone with the link".

## 🟡 Medium

Real issues, not launch-blocking.

- [ ] **14. Fix footer copyright contrast.**
  [`Footer.astro`](../src/components/ui/Footer.astro) line 24: `text-accent-green`
  on `bg-deep-green` at `text-xs` ≈ 4.1:1, under the 4.5:1 AA threshold for small
  text. Use `warm-white/70` or bump the size/weight.
- [ ] **15. Move the grade-field example out of the placeholder.**
  [`SignUpForm.vue`](../src/components/sections/SignUpForm.vue): "e.g. 10th grade"
  lives only in `placeholder` text at `warm-white/40` (~3.5:1). Put it in visible
  helper text below the label.
- [ ] **16. Add a focus trap to `TerminalPanel`.**
  [`TerminalPanel.vue`](../src/components/graph/TerminalPanel.vue) already sets
  `aria-modal="true"`, moves focus to the close button on open, closes on `Esc`
  and outside-click, and restores focus to the trigger on close — good. The one
  gap: `Tab` from the close button escapes the dialog into the page behind it.
  Contain `Tab`/`Shift+Tab` within the panel while open. WCAG 2.4.3.
- [ ] **17. Lazy-hydrate the homepage hero graph.**
  [`Hero.astro`](../src/components/sections/Hero.astro) mounts `HeroGraph`
  `client:load` below the fold while the ambient copy in the nav also hydrates on
  load. Switch the full one to `client:visible`.
- [ ] **18. Trim font weights.** [`global.css`](../src/styles/global.css) pulls
  Space Grotesk 600/700/800 + Inter 400/500/600 + JetBrains Mono 400/500 — eight
  files. Keep only weights actually used (folds into #11).
- [ ] **19. Add JSON-LD.** An `EducationalOrganization` / `Organization` block in
  [`Layout.astro`](../src/layouts/Layout.astro) (name, url, logo, sameAs socials).
- [ ] **20. Mark the active nav link.** Add `aria-current="page"` in
  [`NavBar.astro`](../src/components/ui/NavBar.astro) based on the current path.
- [ ] **24. Add security response headers.** No `vercel.json` and no headers set
  anywhere. Add: `Content-Security-Policy` (start report-only), `X-Content-Type-Options:
  nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` (deny camera/mic/geolocation), and `frame-ancestors 'none'`
  (or `X-Frame-Options: DENY`). A `vercel.json` `headers` block is the simplest
  home. Self-hosting fonts (#11) makes a strict CSP much easier — no
  `fonts.googleapis.com` / `fonts.gstatic.com` allowances needed.
- [ ] **25. Clear the `npm audit` high-severity advisories.** Three highs, all
  one chain: `@astrojs/vercel` → `@vercel/routing-utils` → `path-to-regexp`
  (backtracking-regex ReDoS, GHSA-9wv6-86v2-598j). It's route-matching code, low
  practical impact here, but the fix is a real upgrade (`@astrojs/vercel` 8+,
  which pulls Astro 5) — plan it as its own PR, don't `audit fix --force` blindly.
- [ ] **26. Tighten `/api/signup` input validation.**
  [`signup.ts`](../src/pages/api/signup.ts) checks field presence and an email
  regex only. Add: a `Content-Type: application/json` check; length caps on
  `name` / `email` / `grade` (e.g. ≤100 chars each) and a cap on total body size;
  a `grade` allowlist (ties into #12); and pick only known fields before the
  Sheets write instead of forwarding the whole parsed `body`.

## 🟢 Low

Polish.

- [ ] **21. Give gallery images distinct alt text.**
  [`ShowcaseGallery.astro`](../src/components/sections/ShowcaseGallery.astro) line
  20 hard-codes `alt="MontyHacks gallery photo"` for every image. Pass a caption
  per image, or mark them decorative (`alt=""`) if they carry no information.
- [ ] **22. Add `theme-color`, `apple-touch-icon`, and a web manifest.** Minor
  browser/OS integration polish in [`Layout.astro`](../src/layouts/Layout.astro).
- [ ] **23. Add `loading="lazy"` to below-the-fold images.** Mostly handled by
  #10 if `astro:assets` is adopted; note here in case that slips.
- [ ] **27. Replace the in-memory rate limit if spam becomes real.**
  [`signup.ts`](../src/pages/api/signup.ts) keeps a per-process `Map`; on Vercel
  each serverless instance has its own, so the effective limit is `3 ×
  concurrent instances` and it resets on every cold start. The code comment
  already acknowledges this. Fine for launch — swap to Vercel KV / Upstash or add
  a CAPTCHA only if abuse actually shows up.
- [ ] **28. Check `Origin` / `Referer` on `/api/signup`.** No CSRF token, and
  once the Sheets write is live any site can script a cross-origin `fetch` POST
  (CORS blocks reading the response, not sending the request) → spam vector.
  Reject POSTs whose `Origin` isn't the site's own. Cheap; layers with the
  honeypot and #26.
- [ ] **29. Pin CI actions to commit SHAs.**
  [`ci.yml`](../.github/workflows/ci.yml) uses `actions/checkout@v4` /
  `setup-node@v4` (mutable major tags). Pin to full SHAs to remove the "tag
  repointed to malicious code" supply-chain risk. Low priority — no secrets are
  exposed to the workflow and it only runs on `pull_request`.
- [ ] **30. Constrain URL fields in the content schemas.**
  [`content.config.ts`](../src/content.config.ts): `photo`, `links.linkedin`,
  `links.github`, `devpostUrl`, `event`/`link`, `image` are `z.string()`. A
  maintainer-authored `javascript:` URI would render straight into an `href`.
  Use `z.string().url()` and, for the link fields, reject non-`http(s)` schemes.
  Low risk (maintainers author content under review) but a one-line hardening.
- [ ] **31. Ensure `rel="noopener"` on external `target="_blank"` links.** Astro
  adds it automatically in `.astro` files; Vue `.vue` templates do not. No
  offending links today ([`Footer.astro`](../src/components/ui/Footer.astro)
  opens in the same tab) — a preventative note for whenever a `_blank` link gets
  added in a component.
- [ ] **32. Store the Google service-account key as a sensitive env var.** When
  the Sheets write lands, set `GOOGLE_SERVICE_ACCOUNT_KEY` as a Vercel
  "Sensitive" env var, never echo it into logs, and remove the current
  `console.log` of the submission body (also #13).

## What's already fine

Not action items — recorded so they don't get re-flagged:

- No cookies and no analytics → no cookie banner needed.
- `prefers-reduced-motion` is honored across the CLI motif, `HeroGraph`, and
  `NavBar`.
- Sign-up form: labels correctly tied via `for`/`id`, `autocomplete` set, error
  banner with `role="alert"` and focus management, honeypot correctly hidden from
  assistive tech; endpoint has a honeypot check and per-IP rate limiting.
- Per-page `<title>` and `<meta description>`; `@astrojs/sitemap` wired up.
- `accent-green` on `near-black` body text ≈ 6.4:1 — passes AA.
- Static-first Astro with Vue islands; `HeroGraph` pauses its rAF loop via
  `IntersectionObserver` + `visibilitychange`.
- **Security:** no `set:html` / `v-html` / `innerHTML` on dynamic data (`cli-motif.ts`
  uses `textContent` throughout; `TerminalPanel` renders lines as `{{ }}` text);
  no secrets in the client bundle; no `.env` files tracked; content is
  build-time Markdown authored by maintainers and Zod-validated; `/api/signup`
  has a honeypot and rate limiting; CI runs `npm ci` (lockfile-pinned) and only
  on `pull_request` (no `pull_request_target`, no secrets to fork PRs);
  `package.json` gates install lifecycle scripts via `allowScripts`.

## Contributing to this file

When you resolve an item, check its box, strike its summary-table row or mark it
done, and add the PR number. Keep this file reflecting reality.
