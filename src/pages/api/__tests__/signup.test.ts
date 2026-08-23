/* eslint-disable @typescript-eslint/no-explicit-any -- APIContext stubs in tests only need the fields exercised below */
// Lives under a `__tests__` subfolder (not directly in src/pages/api/) so Astro's file-based
// router never treats it as a route: Astro excludes any path segment prefixed with `_` from
// routing (see https://docs.astro.build/en/core-concepts/astro-pages/#other-files-in-pages).
// A file directly at src/pages/api/signup.test.ts would otherwise be picked up as a live,
// publicly routable endpoint that crashes with a 500 when hit (vitest globals used outside the
// test runner) and drags the entire vitest/vite/chai devDependency tree into the production
// serverless bundle.
import { describe, expect, test } from 'vitest';
import { POST } from '../signup';

describe('POST /api/signup', () => {
  test('rejects a request missing required fields', async () => {
    const request = new Request('http://localhost/api/signup', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST({ request } as any);
    expect(response.status).toBe(400);
  });

  test('rejects a request missing grade even when name/email are present', async () => {
    const request = new Request('http://localhost/api/signup', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'a@b.com' }),
    });
    const response = await POST({ request, clientAddress: '5.5.5.1' } as any);
    expect(response.status).toBe(400);
  });

  test('rejects a request with a malformed email address', async () => {
    const request = new Request('http://localhost/api/signup', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'not-an-email', grade: '10th' }),
    });
    const response = await POST({ request, clientAddress: '5.5.5.2' } as any);
    expect(response.status).toBe(400);
  });

  test('returns 400 on malformed JSON instead of throwing', async () => {
    const request = new Request('http://localhost/api/signup', {
      method: 'POST',
      body: '{not valid json',
    });
    const response = await POST({ request, clientAddress: '5.5.5.3' } as any);
    expect(response.status).toBe(400);
  });

  test('accepts the honeypot field filled in (bot) with the same success response, without a distinct error', async () => {
    const request = new Request('http://localhost/api/signup', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', email: 'a@b.com', grade: '10th', _honeypot: 'filled' }),
    });
    const response = await POST({ request, clientAddress: '5.5.5.4' } as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ ok: true });
  });

  test('rate-limits repeated submissions from the same IP', async () => {
    const makeRequest = () =>
      POST({
        request: new Request('http://localhost/api/signup', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test', email: 'a@b.com', grade: '10th' }),
        }),
        clientAddress: '1.2.3.4',
      } as any);
    for (let i = 0; i < 3; i++) await makeRequest();
    const fourth = await makeRequest();
    expect(fourth.status).toBe(429);
  });
});
