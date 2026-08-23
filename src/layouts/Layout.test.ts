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
