// Access gate for the private memories board.
//
// Runs before the filesystem for the matched routes and requires HTTP Basic
// auth. Credentials come from Vercel project environment variables so no
// secret lives in the repo:
//   MEMORIES_USER     (default "aryan")
//   MEMORIES_PASSWORD (required; set in the Vercel dashboard, never commit)
//
// Both the page and its media are matched so the photos themselves are
// protected, not just the HTML route.
//
// NOTE: this only takes effect on Vercel. The local `python3 -m http.server`
// preview does not run middleware, which is fine for local layout checks.

export const config = {
  matcher: ['/memories', '/memories/:path*', '/public/memories/:path*'],
};

export default function middleware(request) {
  const expectedUser = process.env.MEMORIES_USER || 'aryan';
  const expectedPass = process.env.MEMORIES_PASSWORD;

  if (!expectedPass) {
    return new Response('Memories gate is not configured.', { status: 500 });
  }

  const header = request.headers.get('authorization');
  if (header) {
    const [scheme, encoded] = header.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const sep = decoded.indexOf(':');
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);
      if (user === expectedUser && pass === expectedPass) {
        return; // allowed through to the static files
      }
    }
  }

  return new Response('Authentication required.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="memories", charset="UTF-8"' },
  });
}
