// src/scripts/cli-motif.ts
// Progressive enhancement for the CLI/terminal motif. Idempotent: safe to call
// on every astro:page-load. Does nothing meaningful under prefers-reduced-motion
// (the server already rendered the full, correct text).

const TYPE_MS_PER_CHAR = 21; // headings (load-triggered, i.e. h1)
const TYPE_MS_PER_CHAR_SCROLL = 26; // scroll-triggered headings (h2 and below)
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
            typeInto(span, full, TYPE_MS_PER_CHAR_SCROLL);
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
