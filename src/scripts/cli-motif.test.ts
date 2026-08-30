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
