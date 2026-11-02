import { requireActiveSession, loadManifest } from './_lib.js';

export default async function handler(req, res) {
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
