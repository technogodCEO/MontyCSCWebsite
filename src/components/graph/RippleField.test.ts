// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import RippleField from './RippleField.vue';
import { RIPPLE_EVENT } from './rippleField';

// happy-dom has no layout or real canvas, so these tests fake both: a section
// with a fixed size and a 2D context that just records calls.

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

const fakeCtx = {
  setTransform: vi.fn(),
  clearRect: vi.fn(),
  fillText: vi.fn(),
  font: '',
  textBaseline: '',
  fillStyle: '',
};

/** Mount inside a <section> with a subhead, both given fake sizes. */
function mountInSection() {
  const section = document.createElement('section');
  section.getBoundingClientRect = () =>
    ({ top: 0, left: 0, width: 400, height: 300, bottom: 300, right: 400 }) as DOMRect;
  const subhead = document.createElement('p');
  subhead.setAttribute('data-hero-subhead', '');
  subhead.getBoundingClientRect = () => ({ bottom: 100 }) as DOMRect;
  section.appendChild(subhead);
  const host = document.createElement('div');
  section.appendChild(host);
  document.body.appendChild(section);
  return mount(RippleField, { attachTo: host });
}

// Each mount listens on window, so leftovers from earlier tests would also react.
enableAutoUnmount(afterEach);

let rafSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockReducedMotion(false);
  vi.clearAllMocks();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => fakeCtx) as never;
  rafSpy = vi.fn(() => 1);
  window.requestAnimationFrame = rafSpy as never;
});

afterEach(() => {
  document.body.innerHTML = '';
});

function ripple() {
  window.dispatchEvent(
    new CustomEvent(RIPPLE_EVENT, { detail: { clientX: 200, clientY: 200, strength: 1 } }),
  );
}

describe('RippleField', () => {
  test('renders a decorative, hidden canvas below the subhead', async () => {
    const wrapper = mountInSection();
    await wrapper.vm.$nextTick();
    const canvas = wrapper.get('[data-testid="ripple-field"]');
    expect(canvas.attributes('aria-hidden')).toBe('true');
    // subhead bottom (100) + 8px gap; height fills the rest of the 300px section
    expect(canvas.attributes('style')).toContain('top: 108px');
    expect(canvas.attributes('style')).toContain('height: 192px');
  });

  test('draws the resting field on mount, without starting an animation loop', () => {
    mountInSection();
    // 400×192 px → 50 cols × 12 rows of glyphs
    expect(fakeCtx.fillText).toHaveBeenCalledTimes(50 * 12);
    expect(rafSpy).not.toHaveBeenCalled();
  });

  test('a ripple event starts the loop', () => {
    mountInSection();
    ripple();
    expect(rafSpy).toHaveBeenCalledTimes(1);
  });

  test('reduced motion: resting field only, ripple events are ignored', () => {
    mockReducedMotion(true);
    mountInSection();
    expect(fakeCtx.fillText).toHaveBeenCalled();
    ripple();
    expect(rafSpy).not.toHaveBeenCalled();
  });

  test('stops listening once unmounted', () => {
    const wrapper = mountInSection();
    wrapper.unmount();
    ripple();
    expect(rafSpy).not.toHaveBeenCalled();
  });
});
