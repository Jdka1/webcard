import { requireActiveSession, loadManifest } from './_lib.js';

export default async function handler(req, res) {
  const session = requireActiveSession(req, res);
  if (!session) return;
  const manifest = await loadManifest();
  const photos = manifest
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(({ id, caption, loc }) => ({ id, caption, loc, src: `/api/memories/photo?id=${encodeURIComponent(id)}` }));
  return res.status(200).json({ photos });
}
