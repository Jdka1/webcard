import crypto from 'node:crypto';
import { requireOwner, loadManifest, saveManifest, putBlob } from '../../memories/_lib.js';

const MANIFEST = 'vision-store/manifest.json';

// Raw-body upload for the vision board (owner only). Same host body cap as
// the memories upload; the admin page converts/resizes before sending.
export const config = { api: { bodyParser: false } };

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/gif': 'gif' };

export default async function handler(req, res) {
  const owner = requireOwner(req, res);
  if (!owner) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const type = req.headers['content-type'] || 'image/jpeg';
  const ext = EXT[type] || 'jpg';
  const id = crypto.randomBytes(8).toString('hex');
  const path = `vision-store/photos/${id}.${ext}`;

  await putBlob(path, req, type);

  const manifest = await loadManifest(MANIFEST);
  const order = manifest.length ? Math.max(...manifest.map((p) => p.order)) + 1 : 0;
  const caption = decodeURIComponent(req.headers['x-caption'] || '');
  const loc = decodeURIComponent(req.headers['x-loc'] || '');
  manifest.push({ id, path, caption, loc, order });
  await saveManifest(manifest, MANIFEST);

  return res.status(200).json({ ok: true, id });
}
