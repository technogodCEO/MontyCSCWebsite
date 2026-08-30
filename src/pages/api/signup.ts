import type { APIRoute } from 'astro';

export const prerender = false;

// Simple in-memory rate limit: N submissions per IP per window. Resets on cold start/redeploy,
// which is an acceptable tradeoff at this site's traffic scale — a persistent store (e.g. Vercel KV)
// would be the upgrade if abuse ever becomes a real problem, but is unwarranted complexity for launch.
const submissionLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (submissionLog.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  timestamps.push(now);
  submissionLog.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

// Deliberately basic — server-side backstop for direct/bot POSTs that skip the client's
// type="email" check, not exhaustive RFC 5322 validation.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUCCESS_RESPONSE = () => new Response(JSON.stringify({ ok: true }), { status: 200 });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (isRateLimited(clientAddress)) {
    return new Response(JSON.stringify({ error: 'Too many submissions, try again shortly' }), { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
  }

  if (!body.name || !body.email || !body.grade) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }
  if (typeof body.email !== 'string' || !EMAIL_PATTERN.test(body.email)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400 });
  }
  if (body._honeypot) {
    // Bots that fill the honeypot get the same success response a legit submission gets — an
    // honest 400 would teach a scripted bot which field to leave blank next time. The submission
    // is silently dropped (not logged/written) rather than actually recorded.
    return SUCCESS_RESPONSE();
  }

  // TODO: real Google Sheets write via service account.
  // Requires GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY, and TARGET_SHEET_ID
  // as Vercel environment variables (not committed). Until those exist, this logs and
  // returns success so the form UI is fully testable end-to-end minus the actual write.
  console.log('Sign-up submission (Sheets write not yet configured):', body);

  return SUCCESS_RESPONSE();
};
