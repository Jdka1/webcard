import { Readable } from 'node:stream';
import { requireOwner, loadManifest, getBlob } from '../memories/_lib.js';

const MANIFEST = 'vision-store/manifest.json';

export default async function handler(req, res) {
  const session = requireOwner(req, res);
  if (!session) return;
  const { id } = req.query || {};
  const manifest = await loadManifest(MANIFEST);
  const entry = manifest.find((p) => p.id === id);
  if (!entry) return res.status(404).json({ error: 'not found' });

  const result = await getBlob(entry.path);
  if (!result || result.statusCode === 404) return res.status(404).json({ error: 'not found' });

  res.setHeader('content-type', result.blob?.contentType || 'image/jpeg');
  res.setHeader('cache-control', 'private, no-store');
  Readable.fromWeb(result.stream).pipe(res);
}
