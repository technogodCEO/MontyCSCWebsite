import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Layout from './Layout.astro';
import vueRenderer from '@astrojs/vue/server.js';

test('renders title in head', async () => {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: vueRenderer });
  const result = await container.renderToString(Layout, {
    props: { title: 'Home' },
    slots: { default: 'content' },
  });
  expect(result).toContain('Home · Montgomery CSC');
  expect(result).toContain('content');
});

test('body uses the dark default surface', async () => {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: vueRenderer });
  const result = await container.renderToString(Layout, {
    props: { title: 'Home' },
    slots: { default: 'content' },
  });
  // body carries the layout flex classes; assert the dark surface is present
  // and the old light one is gone.
  expect(result).toMatch(/<body[^>]*class="[^"]*bg-near-black[^"]*"/);
  expect(result).not.toMatch(/<body[^>]*class="[^"]*bg-warm-white[^"]*"/);
});

test('enables View Transitions via ClientRouter', async () => {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: vueRenderer });
  const result = await container.renderToString(Layout, {
    props: { title: 'Home' },
    slots: { default: 'content' },
  });
  // ClientRouter injects this meta into <head>; the hero graph's
  // transition:persist keys are inert without it.
  expect(result).toContain('astro-view-transitions-enabled');
});
