# Typography and Copy Pass

Date: 2026-09-03

## Summary

Two independent, small changes, shipped as separate branches/PRs:

1. **Heading typeface**: swap `--font-heading` from Space Grotesk to Space Mono, leaning
   further into the site's existing CLI/terminal motif. Body (Inter) and the existing
   monospace used for CLI-motif bits (JetBrains Mono, prompt/buttons/labels) are unchanged.
2. **Copy pass**: rewrite the handful of lines across the site that read as AI-generated —
   repeated "not just X, but Y" parallelism, hedge-y superlatives, and corporate clichés
   ("meet you where you are," "flagship," "approachable tour"). Also avoid clustering
   em dashes as a default sentence joint in the new copy, since that's its own AI tell.

## 1. Typeface change

- `src/styles/global.css`: `@theme { --font-heading: ... }` → `"Space Mono", monospace`.
- Google Fonts `@import` line: add Space Mono (weight 700, the only weight the heading
  system uses — `font-bold`/`font-semibold` classes), drop nothing (Space Grotesk import
  removed since no other element references `font-heading` with a different weight).
- No component changes needed — every heading already goes through `font-heading` via
  Tailwind's `@theme` token, so this is a single-line swap.
- Watch for: Space Mono is a monospace face, so long headings (e.g. "Explore Computer
  Science" at the hero's `clamp()` size) run wider per character than Space Grotesk did.
  Spot-check the hero and section headings after the swap in case any wrap awkwardly at
  narrow widths; adjust the heading `clamp()`/font-size if so, but don't preemptively
  resize before seeing it render.

## 2. Copy pass

Exact before/after text, approved in brainstorming:

| File | Before | After |
|---|---|---|
| `src/components/sections/Hero.astro` | "Discover one of the most exciting STEM fields with trained instructors and your peers. Weekly workshops, hackathons, and a beginner-friendly community — no experience required." | "We run weekly coding workshops, host hackathons, and hang out with people into the same stuff. No experience required. Just show up." |
| `src/components/sections/WhatWeDo.astro` | "From beginner-friendly Python sessions to advanced competitive programming, our weekly workshops meet you where you are." | "Our weekly workshops range from beginner Python to competitive programming, so there's something at your level." |
| `src/components/sections/WhyJoin.astro` (reason 1 body) | "Every workshop starts from the basics and builds up — whether it is your first line of code or your fifth language." | "Every workshop starts from the basics and builds up, so it doesn't matter if you've never coded or you already know five languages." |
| `src/components/sections/WhyJoin.astro` (reason 2 body) | "Sessions are led by peers and mentors who know how to teach, not just how to code." | "Sessions are led by peers and mentors who can actually teach. Coding well and teaching well aren't the same thing." |
| `src/components/sections/WhyJoin.astro` (reason 3 body) | "Hackathons, guest talks, and competitions give you people to build with, not just a syllabus." | "Hackathons, guest talks, and competitions mean you're building with people, not just working through a syllabus alone." |
| `src/content/events/montyhacks.md` | "MontyHacks is Montgomery CSC's flagship hackathon." | "MontyHacks is Montgomery CSC's annual hackathon." |
| `src/content/workshops/intro-to-machine-learning.md` | "Basic Python familiarity is helpful but not required — we'll recap the essentials before diving into datasets, model training, and evaluation using beginner-friendly tools." | "Basic Python familiarity helps but isn't required. We'll recap what you need before working through datasets, model training, and evaluation with beginner-friendly tools." |
| `src/content/showcase/eco-track.md` | "EcoTrack was built with a focus on accessibility and quick daily check-ins, encouraging small sustainable habits over time." | "EcoTrack focuses on accessibility and quick daily check-ins, so tracking small sustainable habits doesn't feel like a chore." |
| `src/components/sections/FaqList.astro` | "Bring curiosity, not a resume." | "You don't need a resume, just curiosity." |

Everything else reviewed (workshop/event/showcase descriptions, other FAQ answers, page
intros) reads as normal human copy already and is left untouched — no attempt to rewrite
lines that don't have the tell.

**Note on Hero fact alignment**: the old Hero line said "trained instructors," which
implied formal certification; Why Join describes sessions as peer/mentor-led. The new
Hero copy drops the "trained instructors" claim to stay consistent with Why Join. If
there genuinely are trained/certified instructors, that's a fact correction outside the
scope of this copy pass and should be raised separately.

## Testing

No test coverage exercises exact copy strings or `--font-heading`'s value (checked:
`CliHeading.test.ts` and `cli-motif.test.ts` assert behavior, not text/font content), so
no test changes are needed. Verify with `npm run build` (catches Tailwind/CSS syntax
issues) and a visual pass in `npm run dev`.

## Out of scope

- Body font (Inter) and CLI-motif mono (JetBrains Mono) — explicitly kept as-is.
- Broader tone rewrite beyond the tell-bearing lines above.
- Officer bios (`president.md`, etc.) — currently placeholder names/roles only, no prose
  to edit yet.
