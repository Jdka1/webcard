import { Readable } from 'node:stream';
import { requireActiveSession, loadManifest, getBlob } from './_lib.js';

export default async function handler(req, res) {
  const session = requireActiveSession(req, res);
  if (!session) return;
  const { id } = req.query || {};
  const manifest = await loadManifest();
  const entry = manifest.find((p) => p.id === id);
  if (!entry) return res.status(404).json({ error: 'not found' });

  const result = await getBlob(entry.path);
  if (!result || result.statusCode === 404) return res.status(404).json({ error: 'not found' });

  res.setHeader('content-type', result.blob?.contentType || 'image/jpeg');
  res.setHeader('cache-control', 'private, max-age=300');
  Readable.fromWeb(result.stream).pipe(res);
}
