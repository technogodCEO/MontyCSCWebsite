import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import CliHeading from './CliHeading.astro';

describe('CliHeading SSR output', () => {
  test('renders the requested tag with the full text as accessible name', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliHeading, {
      props: { as: 'h1', text: 'Explore Computer Science' },
    });
    expect(html).toMatch(/<h1[^>]*aria-label="Explore Computer Science"/);
    // full text present in the DOM even before JS (SEO + no-JS)
    expect(html).toContain('Explore Computer Science');
  });

  test('h1 is marked for the load trigger', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliHeading, { props: { as: 'h1', text: 'Title' } });
    expect(html).toContain('data-cli-trigger="load"');
  });

  test('h2 is marked for the scroll trigger', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliHeading, { props: { as: 'h2', text: 'What We Do' } });
    expect(html).toContain('data-cli-trigger="scroll"');
  });

  test('animate=false omits the typewriter hook but keeps the class + text', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliHeading, {
      props: { as: 'h3', text: 'Intro to Python', animate: false },
    });
    expect(html).not.toContain('data-cli-heading');
    expect(html).toContain('cli-heading');
    expect(html).toContain('Intro to Python');
  });

  test('passes through extra classes', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(CliHeading, {
      props: { as: 'h2', text: 'X', class: 'font-heading text-3xl font-bold' },
    });
    expect(html).toMatch(/class="[^"]*font-heading[^"]*text-3xl[^"]*"/);
  });
});
