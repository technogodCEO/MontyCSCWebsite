# Montgomery CSC Website

The website for the Montgomery Computer Science Club — a recruiting-first site
covering activities/workshops, events, project showcase, officers, FAQ, and
membership sign-up.

Built with [Astro](https://astro.build) (static-first, file-based routing) and
[Vue 3](https://vuejs.org) islands for interactivity, styled with Tailwind CSS v4.

## Quickstart

```bash
npm install
npm run dev       # local dev server at http://localhost:4321
```

Other scripts: `npm run test`, `npm run lint`, `npm run build`, `npm run format`.

## Docs

- **Editing content (officers, workshops, events) without touching code?** →
  [`CONTRIBUTING.md`](CONTRIBUTING.md)
- **Working on the code — architecture, stack, conventions?** →
  [`documentation/ARCHITECTURE.md`](documentation/ARCHITECTURE.md)
- **What's built, what's next?** → [`documentation/ROADMAP.md`](documentation/ROADMAP.md)
- **Accessibility / SEO / performance / privacy / security action items** →
  [`documentation/COMPLIANCE.md`](documentation/COMPLIANCE.md)
- **Why the site is designed the way it is** (full rationale, content model, tone) →
  [`docs/superpowers/specs/2026-08-22-montycsc-website-design.md`](docs/superpowers/specs/2026-08-22-montycsc-website-design.md)
- **Step-by-step build plan** →
  [`docs/superpowers/plans/2026-08-22-site-foundation-plan.md`](docs/superpowers/plans/2026-08-22-site-foundation-plan.md)

## Deployment

Deployed on Vercel, with per-PR preview deployments via GitHub Actions CI
(`.github/workflows/ci.yml`: lint → test → build on every PR).
