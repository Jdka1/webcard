import { requireOwner, loadManifest } from '../memories/_lib.js';

const MANIFEST = 'vision-store/manifest.json';

// Owner-only vision board list. Same shape as the memories board.
export default async function handler(req, res) {
  const session = requireOwner(req, res);
  if (!session) return;
  const manifest = await loadManifest(MANIFEST);
  const photos = manifest
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(({ id, caption, loc, featured, kind }) => ({ id, caption, loc, featured: !!featured, kind: kind || 'image', src: `/api/vision/photo?id=${encodeURIComponent(id)}` }));
  res.setHeader('cache-control', 'private, no-store');
  return res.status(200).json({ photos });
}
