import { requireOwner, loadManifest, saveManifest, delBlob } from '../_lib.js';

// Owner-only photo manager: edit captions/place, reorder, delete.
export default async function handler(req, res) {
  const owner = requireOwner(req, res);
  if (!owner) return;

  const manifest = await loadManifest();

  if (req.method === 'PATCH') {
    const { id, caption, loc, direction } = req.body || {};
    const idx = manifest.findIndex((p) => p.id === id);
    if (idx < 0) return res.status(404).json({ error: 'not found' });
    if (caption !== undefined) manifest[idx].caption = caption;
    if (loc !== undefined) manifest[idx].loc = loc;
    if (direction) {
      const sorted = manifest.slice().sort((a, b) => a.order - b.order);
      const pos = sorted.findIndex((p) => p.id === id);
      const swapWith = direction === 'up' ? pos - 1 : pos + 1;
      if (swapWith >= 0 && swapWith < sorted.length) {
        const tmp = sorted[pos].order;
        sorted[pos].order = sorted[swapWith].order;
        sorted[swapWith].order = tmp;
      }
    }
    await saveManifest(manifest);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    const idx = manifest.findIndex((p) => p.id === id);
    if (idx < 0) return res.status(404).json({ error: 'not found' });
    try { await delBlob(manifest[idx].path); } catch { /* blob may already be gone */ }
    manifest.splice(idx, 1);
    await saveManifest(manifest);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
