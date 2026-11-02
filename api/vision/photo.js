import { requireOwner, loadManifest, streamEntry } from '../memories/_lib.js';

const MANIFEST = 'vision-store/manifest.json';

export default async function handler(req, res) {
  const session = requireOwner(req, res);
  if (!session) return;
  const { id } = req.query || {};
  const manifest = await loadManifest(MANIFEST);
  const entry = manifest.find((p) => p.id === id);
  if (!entry) return res.status(404).json({ error: 'not found' });
  return streamEntry(req, res, entry);
}
