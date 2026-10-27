import crypto from 'node:crypto';
import { requireOwner, loadManifest, saveManifest, putBlob } from '../_lib.js';

// Raw-body upload: the admin page sends the file bytes directly with
// x-filename / x-caption / x-loc headers. NOTE: Hobby functions cap request
// bodies at ~4.5MB, so oversized phone photos need resizing before upload
// until/unless client-direct Blob upload is added.
export const config = { api: { bodyParser: false } };

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/gif': 'gif' };

export default async function handler(req, res) {
  const owner = requireOwner(req, res);
  if (!owner) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const type = req.headers['content-type'] || 'image/jpeg';
  const ext = EXT[type] || 'jpg';
  const id = crypto.randomBytes(8).toString('hex');
  const path = `memories-store/photos/${id}.${ext}`;

  await putBlob(path, req, type);

  const manifest = await loadManifest();
  const order = manifest.length ? Math.max(...manifest.map((p) => p.order)) + 1 : 0;
  const caption = decodeURIComponent(req.headers['x-caption'] || '');
  const loc = decodeURIComponent(req.headers['x-loc'] || '');
  manifest.push({ id, path, caption, loc, order });
  await saveManifest(manifest);

  return res.status(200).json({ ok: true, id });
}
