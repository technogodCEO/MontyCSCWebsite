import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import CtaButton from './CtaButton.astro';

describe('CtaButton SSR output', () => {
  test('renders label + an aria-hidden prompt glyph + href', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CtaButton, { props: { label: 'Sign Up', href: '/signup' } });
    expect(html).toContain('Sign Up');
    expect(html).toMatch(/href="\/signup"/);
    expect(html).toMatch(/aria-hidden="true"/);
    expect(html).toContain('cta-button');
  });
});
