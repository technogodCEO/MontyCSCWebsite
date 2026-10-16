// @vitest-environment happy-dom
import { beforeEach, describe, expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import HeroGraph from './HeroGraph.vue';

function mockReducedMotion(reduce: boolean, wide = true) {
  window.matchMedia = ((query: string) => ({
    // `wide` answers the drag breakpoint query, `reduce` the reduced-motion one.
    matches: query.includes('min-width') ? wide : reduce && query.includes('reduce'),
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

  describe('v2 drag', () => {
    /** Press a node, move it `dx` px, release, then fire the click the browser would send. */
    async function pressMoveRelease(wrapper: ReturnType<typeof mount>, id: string, dx: number) {
      const node = wrapper.get(`[data-node-id="${id}"]`);
      const base = { pointerId: 1, isPrimary: true, button: 0, clientY: 100 };
      await node.trigger('pointerdown', { ...base, clientX: 100 });
      await node.trigger('pointermove', { ...base, clientX: 100 + dx });
      await node.trigger('pointerup', { ...base, clientX: 100 + dx });
      await node.trigger('click');
    }

    test('wide screen: nodes are grabbable (touch-none so a drag does not scroll)', async () => {
      const wrapper = mount(HeroGraph);
      await wrapper.vm.$nextTick();
      expect(wrapper.get('[data-node-id="workshops"]').classes()).toContain('touch-none');
    });

    test('a drag past the threshold does not open the terminal panel', async () => {
      const wrapper = mount(HeroGraph);
      await wrapper.vm.$nextTick();
      await pressMoveRelease(wrapper, 'workshops', 40);
      expect(wrapper.find('[data-testid="terminal-panel"]').exists()).toBe(false);
    });

    test('a press that moves less than the threshold still opens the panel', async () => {
      const wrapper = mount(HeroGraph);
      await wrapper.vm.$nextTick();
      await pressMoveRelease(wrapper, 'workshops', 3);
      expect(wrapper.find('[data-testid="terminal-panel"]').exists()).toBe(true);
    });

    test('after a drag, the next plain click opens the panel again', async () => {
      const wrapper = mount(HeroGraph);
      await wrapper.vm.$nextTick();
      await pressMoveRelease(wrapper, 'workshops', 40);
      await pressMoveRelease(wrapper, 'workshops', 0);
      expect(wrapper.find('[data-testid="terminal-panel"]').exists()).toBe(true);
    });

    test("while dragging, the held node's edges brighten", async () => {
      const wrapper = mount(HeroGraph);
      await wrapper.vm.$nextTick();
      const node = wrapper.get('[data-node-id="showcase"]');
      const base = { pointerId: 1, isPrimary: true, button: 0, clientY: 100 };
      await node.trigger('pointerdown', { ...base, clientX: 100 });
      await node.trigger('pointermove', { ...base, clientX: 140 });
      // showcase touches 3 edges: hackathons, talks (ring) and workshops (diagonal)
      expect(wrapper.findAll('[data-testid="graph-edges"] line.opacity-80')).toHaveLength(3);
      await node.trigger('pointerup', { ...base, clientX: 140 });
      expect(wrapper.findAll('[data-testid="graph-edges"] line.opacity-80')).toHaveLength(0);
    });

    test('narrow screen (phone): no drag, swipes over nodes still scroll', async () => {
      mockReducedMotion(false, false);
      const wrapper = mount(HeroGraph);
      await wrapper.vm.$nextTick();
      expect(wrapper.get('[data-node-id="workshops"]').classes()).not.toContain('touch-none');
      await pressMoveRelease(wrapper, 'workshops', 40);
      // no drag happened, so the click opens the panel as in v1
      expect(wrapper.find('[data-testid="terminal-panel"]').exists()).toBe(true);
    });

    test('reduced motion: no drag', async () => {
      mockReducedMotion(true);
      const wrapper = mount(HeroGraph);
      await wrapper.vm.$nextTick();
      expect(wrapper.get('[data-node-id="workshops"]').classes()).not.toContain('touch-none');
    });

    test('ambient cluster: no drag', async () => {
      const wrapper = mount(HeroGraph, { props: { ambient: true } });
      await wrapper.vm.$nextTick();
      expect(wrapper.get('[data-node-id="workshops"]').classes()).not.toContain('touch-none');
    });
  });
});
