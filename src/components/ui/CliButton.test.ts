import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import CliButton from './CliButton.astro';

describe('CliButton SSR output', () => {
  test('accessible name is the human label, not the fn() text', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliButton, {
      props: { label: 'Read the FAQ', base: 'read_faq()', alt: 'man montycsc', href: '/faq' },
    });
    expect(html).toMatch(/aria-label="Read the FAQ"/);
    expect(html).toContain('read_faq()'); // visible label
    expect(html).toContain('data-alt="man montycsc"');
    expect(html).toMatch(/href="\/faq"/);
  });

  test('visible label text is aria-hidden', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliButton, {
      props: { label: 'X', base: 'x()', alt: 'y', href: '/x' },
    });
    expect(html).toMatch(/aria-hidden="true"[^>]*data-cli-button-text|data-cli-button-text[^>]*/);
  });
});
