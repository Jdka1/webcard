import { requireActiveSession, loadManifest, streamEntry } from './_lib.js';

export default async function handler(req, res) {
  const session = await requireActiveSession(req, res);
  if (!session) return;
  const { id } = req.query || {};
  const manifest = await loadManifest();
  const entry = manifest.find((p) => p.id === id);
  if (!entry) return res.status(404).json({ error: 'not found' });
  return streamEntry(req, res, entry);
}
