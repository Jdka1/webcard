import { requireActiveSession, loadManifest, shareUploadHandler } from './_lib.js';

// POST traffic arrives only via the vercel.json rewrite of the public
// /api/memories/share path (middleware allows that exact path; the share
// handler is key-authed, no session). GET stays session-gated.
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method === 'POST') {
    return shareUploadHandler(req, res);
  }
  const session = await requireActiveSession(req, res);
  if (!session) return;
  const manifest = await loadManifest();
  const photos = manifest
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(({ id, caption, loc, featured, kind }) => ({ id, caption, loc, featured: !!featured, kind: kind || 'image', src: `/api/memories/photo?id=${encodeURIComponent(id)}` }));
  res.setHeader('cache-control', 'private, no-store');
  return res.status(200).json({ photos });
}

// Redeploy marker: share-key env rotation (no functional change).
