// @vitest-environment happy-dom
import { describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import HeroGraph from './HeroGraph.vue';

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
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    const wrapper = mount(HeroGraph);
    expect(wrapper.classes()).not.toContain('animate-entrance');
  });
});
