import { next } from '@vercel/functions';
import { createHmac, timingSafeEqual } from 'node:crypto';

// Session gate for the private memories board and its APIs.
// A signed httpOnly cookie (mem_session) is issued by /api/memories/login
// after a per-person username+password check. Passwords themselves are
// stored scrypt-hashed in a private Blob store, never in this repo.

export const config = {
  matcher: ['/memories', '/memories/:path*', '/api/memories/:path*'],
};

const PUBLIC_PATHS = ['/memories/login.html', '/api/memories/login'];

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function readSession(request, secret) {
  const header = request.headers.get('cookie') || '';
  const m = header.match(/(?:^|;\s*)mem_session=([^;]+)/);
  if (!m) return null;
  const dot = m[1].lastIndexOf('.');
  if (dot < 0) return null;
  const payloadB64 = m[1].slice(0, dot);
  const sig = m[1].slice(dot + 1);
  const expected = sign(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export default function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (PUBLIC_PATHS.includes(path)) return next();

  const secret = process.env.MEMORIES_SESSION_SECRET;
  if (!secret) return new Response('Memories gate is not configured.', { status: 500 });

  const session = readSession(request, secret);
  if (session) {
    // The owner screen is owner-only even for signed-in viewers.
    if (path === '/memories/admin.html' && session.role !== 'owner') {
      return Response.redirect(new URL('/memories/', request.url), 302);
    }
    return next();
  }

  if (path.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'authentication required' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  const login = new URL('/memories/login.html', request.url);
  login.searchParams.set('next', path);
  return Response.redirect(login, 302);
}
