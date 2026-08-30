// @vitest-environment happy-dom
import { beforeEach, describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import HeroGraph from './HeroGraph.vue';

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => mockReducedMotion(false));

describe('HeroGraph', () => {
  test('clicking a node opens its terminal panel with matching content', async () => {
    const wrapper = mount(HeroGraph);
    await wrapper.get('[data-node-id="workshops"]').trigger('click');
    expect(wrapper.find('[data-testid="terminal-panel"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Weekly sessions on Python');
  });

  test('every node renders as a real anchor tag for accessibility', () => {
    const wrapper = mount(HeroGraph);
    const anchors = wrapper.findAll('a[data-node-id]');
    expect(anchors.length).toBe(4);
  });

  test('respects prefers-reduced-motion by skipping entrance animation class', () => {
    mockReducedMotion(true);
    const wrapper = mount(HeroGraph);
    expect(wrapper.classes()).not.toContain('animate-entrance');
  });

  test('reduced-motion: nodes sit exactly at their resting coordinates', () => {
    mockReducedMotion(true);
    const wrapper = mount(HeroGraph);
    const a = wrapper.get('[data-node-id="workshops"]');
    // base.x/base.y for workshops is 24 / 44
    expect(a.attributes('style')).toContain('left: 24%');
    expect(a.attributes('style')).toContain('top: 44%');
  });

  test('full hero renders the near-mesh: 6 edge lines', () => {
    const wrapper = mount(HeroGraph);
    expect(wrapper.find('[data-testid="graph-edges"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="graph-edges"] line')).toHaveLength(6);
  });

  test('ambient cluster renders ring edges only: 4 lines, no diagonals', () => {
    const wrapper = mount(HeroGraph, { props: { ambient: true } });
    expect(wrapper.findAll('[data-testid="graph-edges"] line')).toHaveLength(4);
  });

  test('full hero (motion allowed) can mount a packet element', async () => {
    mockReducedMotion(false);
    const wrapper = mount(HeroGraph);
    // packet is absent until its first scheduled run; assert the layer exists
    expect(wrapper.find('[data-testid="graph-packet-layer"]').exists()).toBe(true);
  });

  test('reduced-motion: no packet layer at all', () => {
    mockReducedMotion(true);
    const wrapper = mount(HeroGraph);
    expect(wrapper.find('[data-testid="graph-packet-layer"]').exists()).toBe(false);
  });

  test('ambient cluster: no packet layer', () => {
    const wrapper = mount(HeroGraph, { props: { ambient: true } });
    expect(wrapper.find('[data-testid="graph-packet-layer"]').exists()).toBe(false);
  });
});
