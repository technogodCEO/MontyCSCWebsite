# Contributing to the Montgomery CSC Website

This guide is for club officers and members who want to update content on the site —
a new officer bio, a workshop schedule change, a new event — without needing a local
dev setup. If you're comfortable with Git/Node, you can of course also clone the repo
and work locally; everything below still applies, just via your own editor instead of
GitHub's web UI.

## Editing content through GitHub's web UI

Most day-to-day changes (officers, workshops, events, showcase projects) live as small
text files under `src/content/`, one file per entry:

- `src/content/officers/` — one file per officer (name, role, optional photo/bio/links)
- `src/content/workshops/` — one file per weekly workshop (title, day, time, level)
- `src/content/events/` — one file per event (MontyHacks, ACSL, guest talks)
- `src/content/showcase/` — one file per showcase project

To edit an existing entry:

1. On GitHub, navigate to the file (e.g. `src/content/officers/jane-doe.md`).
2. Click the pencil ("Edit this file") icon.
3. Change the text between the `---` lines at the top (these are the fields the site
   reads — don't remove the `---` markers) and/or the body text below them.
4. Scroll down, add a short commit message describing the change, and choose
   **"Create a new branch for this commit and start a pull request."**
5. Click **Propose changes**, then **Create pull request**.

To add a new entry (e.g. a new officer), use **Add file → Create new file** inside the
right folder, name it something like `first-last.md`, and fill in the same fields as
one of the existing files in that folder — copy an existing one as a template. Fields
are validated automatically (see "What happens on a PR" below), so a typo'd or missing
required field will show up as a failed check rather than silently breaking the site.

## What happens on a PR

Every pull request automatically gets:

- **CI checks** — the site is linted, tested, and built. If a content file is missing
  a required field or has the wrong type, the build step will fail with a clear error
  pointing at the file.
- **A Vercel preview deployment** — a live, shareable URL showing exactly what the
  site will look like with your change, posted automatically as a comment on the PR.
  Check this before asking for review — it's the fastest way to catch anything that
  doesn't look right.
- **Review required** — an existing maintainer/officer reviews and merges. Once merged
  to `main`, Vercel deploys it to the live site automatically.

## Where to go for more context

The full design rationale — why the site is built the way it is, the content model,
the hero component's behavior, tone/visual guidelines, and what's intentionally out of
scope for this version — lives in
[`docs/superpowers/specs/2026-08-22-montycsc-website-design.md`](docs/superpowers/specs/2026-08-22-montycsc-website-design.md).
Read that before making a change that goes beyond simple content edits (e.g. adding a
new page, changing the design system, or touching the hero/graph component).

## Local development (optional)

If you'd rather work locally:

```bash
npm install
npm run dev       # local dev server at http://localhost:4321
npm run test      # run the test suite
npm run lint      # lint check
npm run build     # full production build (same as CI)
```
