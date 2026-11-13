import crypto from 'node:crypto';
import { put, get, del, head } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';

const USERS_PATH = 'memories-store/users.json';
const MANIFEST_PATH = 'memories-store/manifest.json';

// ---- sessions ----

export function signValue(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

export function makeSession(payload, secret) {
  const full = { ...payload, exp: Date.now() + 30 * 24 * 3600 * 1000 };
  const b64 = Buffer.from(JSON.stringify(full)).toString('base64url');
  return `${b64}.${signValue(b64, secret)}`;
}

export function sessionFromReq(req, secret) {
  const header = req.headers.cookie || '';
  const m = header.match(/(?:^|;\s*)mem_session=([^;]+)/);
  if (!m) return null;
  const dot = m[1].lastIndexOf('.');
  if (dot < 0) return null;
  const b64 = m[1].slice(0, dot);
  const sig = m[1].slice(dot + 1);
  const expected = signValue(b64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function requireSession(req, res) {
  const secret = process.env.MEMORIES_SESSION_SECRET;
  const session = secret && sessionFromReq(req, secret);
  if (!session) {
    res.status(401).json({ error: 'authentication required' });
    return null;
  }
  return session;
}

export function requireOwner(req, res) {
  const session = requireSession(req, res);
  if (!session) return null;
  if (session.role !== 'owner') {
    res.status(403).json({ error: 'owner only' });
    return null;
  }
  return session;
}


// Re-checks that a viewer's account is still active on every content request,
// so revoking someone kills their already-issued session immediately.
export async function requireActiveSession(req, res) {
  const session = requireSession(req, res);
  if (!session) return null;
  if (session.role === 'owner') return session;
  const users = await loadUsers();
  const u = users.find((x) => x.username === session.u);
  if (!u || !u.active) {
    res.status(401).json({ error: 'access revoked' });
    return null;
  }
  return session;
}

// ---- password hashing ----

export function hashPassword(password, salt) {
  const useSalt = salt || crypto.randomBytes(16).toString('hex');
  return { salt: useSalt, hash: crypto.scryptSync(password, useSalt, 32).toString('hex') };
}

export function verifyPassword(password, salt, hash) {
  const computed = crypto.scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === computed.length && crypto.timingSafeEqual(computed, expected);
}

// ---- private blob store ----
// Store layout (all access:'private', served only through authed functions):
//   memories-store/users.json    [{username, salt, hash, created, active}]
//   memories-store/manifest.json [{id, path, caption, loc, order}]
//   memories-store/photos/<id>.<ext>
//
// NOTE (verify on first deploy): exact @vercel/blob get()/put() option
// shapes were coded against current docs and must be smoke-tested on the
// first real deployment before the page is shared.

async function readJson(path, fallback) {
  try {
    const result = await get(path, { access: 'private', useCache: false });
    if (!result || result.statusCode === 404) return fallback;
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

async function writeJson(path, data) {
  await put(path, JSON.stringify(data), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export const loadUsers = () => readJson(USERS_PATH, []);
export const saveUsers = (users) => writeJson(USERS_PATH, users);
export const loadManifest = (path = MANIFEST_PATH) => readJson(path, []);
export const saveManifest = (manifest, path = MANIFEST_PATH) => writeJson(path, manifest);
export const getBlob = (path) => get(path, { access: 'private' });
export const putBlob = (path, body, contentType) =>
  put(path, body, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType });
export const delBlob = (path) => del(path);

// ---- video support ----
// Videos (and photos over the ~4.5MB function body cap) upload
// client-direct to the private blob store; this function issues the token
// (owner only) and registers the finished blob in the board manifest.

const IMAGE_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/gif': 'gif' };
const VIDEO_EXT = { 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm', 'video/x-m4v': 'm4v', 'video/mpeg': 'mpg', 'video/3gpp': '3gp' };
const ALLOWED_TYPES = [...Object.keys(IMAGE_EXT), ...Object.keys(VIDEO_EXT)];
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // Hobby store is 1GB total

async function readRawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

export async function adminUploadHandler(req, res, storePrefix, manifestPath) {
  const owner = requireOwner(req, res);
  if (!owner) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const type = req.headers['content-type'] || '';

  if (type.includes('application/json')) {
    const body = (req.body && typeof req.body === 'object') ? req.body : JSON.parse((await readRawBody(req)) || '{}');

    // After a client-direct upload finishes, the admin page registers the
    // blob so it shows up on the board.
    if (body.action === 'register') {
      const { path, url, contentType, caption, loc } = body;
      if (!path || !url) return res.status(400).json({ error: 'path and url required' });
      // Only register blobs that actually live in our own store: the url is
      // fetched later with the store token attached, so a foreign host here
      // would leak it.
      try {
        const u = new URL(url);
        if (u.protocol !== 'https:' || !u.hostname.endsWith('.blob.vercel-storage.com')) throw new Error('host');
        if (decodeURIComponent(u.pathname).slice(1) !== path) throw new Error('path');
      } catch {
        return res.status(400).json({ error: 'url must be a blob store url matching path' });
      }
      const kind = String(contentType || '').startsWith('video/') ? 'video' : 'image';
      const id = crypto.randomBytes(8).toString('hex');
      await updateManifest(manifestPath, (manifest) => {
        const order = manifest.length ? Math.max(...manifest.map((p) => p.order)) + 1 : 0;
        manifest.push({ id, path, url, kind, caption: caption || '', loc: loc || '', order });
        return { save: true };
      });
      return res.status(200).json({ ok: true, id });
    }

    // @vercel/blob client-upload protocol: token request + completion callback
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ALLOWED_TYPES,
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(json);
  }

  // Raw-body upload for small files (the original path)
  const ext = IMAGE_EXT[type] || VIDEO_EXT[type] || 'bin';
  const kind = VIDEO_EXT[type] ? 'video' : 'image';
  const id = crypto.randomBytes(8).toString('hex');
  const path = `${storePrefix}/photos/${id}.${ext}`;
  await putBlob(path, req, type || 'application/octet-stream');
  const caption = decodeURIComponent(req.headers['x-caption'] || '');
  const loc = decodeURIComponent(req.headers['x-loc'] || '');
  await updateManifest(manifestPath, (manifest) => {
    const order = manifest.length ? Math.max(...manifest.map((p) => p.order)) + 1 : 0;
    manifest.push({ id, path, kind, caption, loc, order });
    return { save: true };
  });
  return res.status(200).json({ ok: true, id });
}

// Streams a manifest entry's blob to the response. Entries uploaded
// client-direct carry their blob url; those are fetched with the read-write
// token and Range headers are forwarded, so video seeking works. Older
// entries (pathname only) stream through the SDK as before.
export async function streamEntry(req, res, entry) {
  if (entry.url) {
    const headers = { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` };
    if (req.headers.range) headers.range = req.headers.range;
    const up = await fetch(entry.url, { headers });
    if (up.status !== 200 && up.status !== 206) {
      return res.status(up.status).json({ error: 'blob fetch failed' });
    }
    res.status(up.status);
    for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag']) {
      const v = up.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    res.setHeader('cache-control', 'private, no-store');
    const { Readable } = await import('node:stream');
    Readable.fromWeb(up.body).pipe(res);
    return;
  }
  const result = await getBlob(entry.path);
  if (!result || result.statusCode === 404) return res.status(404).json({ error: 'not found' });
  res.setHeader('content-type', result.blob?.contentType || 'image/jpeg');
  res.setHeader('cache-control', 'private, no-store');
  const { Readable } = await import('node:stream');
  Readable.fromWeb(result.stream).pipe(res);
}

// ---- safe manifest updates ----
// Read-modify-write with an ETag precondition: if another request changed
// the manifest in between, the write is rejected and retried on fresh data,
// so concurrent uploads/edits cannot overwrite each other. A failed read
// aborts instead of being treated as an empty manifest (that would wipe it).
export async function updateManifest(path, fn) {
  for (let attempt = 0; attempt < 14; attempt++) {
    const r = await get(path, { access: 'private', useCache: false });
    let data = [];
    let etag;
    if (r && r.statusCode === 200) {
      etag = r.blob.etag;
      data = JSON.parse(await new Response(r.stream).text());
      if (!Array.isArray(data)) throw new Error('manifest corrupt');
    }
    const { save, out } = await fn(data);
    if (!save) return out;
    try {
      await put(path, JSON.stringify(data), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
        ...(etag ? { ifMatch: etag } : {}),
      });
      return out;
    } catch (e) {
      const msg = `${e && e.name} ${e && e.message}`;
      if (/precondition/i.test(msg)) { await new Promise((ok) => setTimeout(ok, 80 + Math.random() * 220)); continue; }
      throw e;
    }
  }
  throw new Error('manifest busy, try again');
}

export async function adminPhotosHandler(req, res, manifestPath) {
  const owner = requireOwner(req, res);
  if (!owner) return;

  try {
    if (req.method === 'PATCH') {
      const { id, caption, loc, direction, featured, order } = req.body || {};
      const out = await updateManifest(manifestPath, (manifest) => {
        if (Array.isArray(order)) {
          order.forEach((oid, i) => {
            const m = manifest.find((p) => p.id === oid);
            if (m) m.order = i;
          });
          return { save: true, out: { status: 200, body: { ok: true } } };
        }
        const idx = manifest.findIndex((p) => p.id === id);
        if (idx < 0) return { save: false, out: { status: 404, body: { error: 'not found' } } };
        if (caption !== undefined) manifest[idx].caption = caption;
        if (loc !== undefined) manifest[idx].loc = loc;
        if (featured !== undefined) manifest[idx].featured = !!featured;
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
        return { save: true, out: { status: 200, body: { ok: true } } };
      });
      return res.status(out.status).json(out.body);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      const out = await updateManifest(manifestPath, (manifest) => {
        const idx = manifest.findIndex((p) => p.id === id);
        if (idx < 0) return { save: false, out: { status: 404, body: { error: 'not found' } } };
        const [gone] = manifest.splice(idx, 1);
        return { save: true, out: { status: 200, body: { ok: true }, blobPath: gone.path } };
      });
      if (out.blobPath) { try { await delBlob(out.blobPath); } catch { /* blob may already be gone */ } }
      return res.status(out.status).json(out.body);
    }
  } catch (e) {
    return res.status(503).json({ error: 'busy, try again' });
  }
  return res.status(405).json({ error: 'method not allowed' });
}

// ---- share-sheet upload (Apple Shortcut) ----
// Key-authed upload-only path for the owner's own devices, so a Shortcut in
// the Photos share sheet can post a video/photo without the owner password.
// The key (MEMORIES_SHARE_KEY) can only mint a constrained client token for a
// server-chosen share-* path and register that blob into the manifest: no
// listing, no reading, no deleting, no user management.

const EXT_TO_MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', gif: 'image/gif',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/x-m4v', mpg: 'video/mpeg', mpeg: 'video/mpeg', '3gp': 'video/3gpp',
};

function shareKeyOk(req) {
  const expected = process.env.MEMORIES_SHARE_KEY;
  if (!expected) return false;
  const provided = String(req.headers['x-share-key'] || '');
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function shareUploadHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (!process.env.MEMORIES_SHARE_KEY) return res.status(500).json({ error: 'share upload is not configured' });
  if (!shareKeyOk(req)) return res.status(401).json({ error: 'bad share key' });

  const body = (req.body && typeof req.body === 'object') ? req.body : JSON.parse((await readRawBody(req)) || '{}');

  if (body.action === 'token') {
    const name = String(body.name || '').slice(0, 200);
    const ext = (name.split('.').pop() || '').toLowerCase();
    const mime = EXT_TO_MIME[ext];
    if (!mime) return res.status(400).json({ error: 'unsupported file type' });
    const pathname = `memories-store/photos/share-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    const json = await handleUpload({
      body: { type: 'blob.generate-client-token', payload: { pathname, clientPayload: 'share-shortcut', multipart: false } },
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [mime],
        maximumSizeInBytes: MAX_UPLOAD_BYTES,
        addRandomSuffix: false,
        allowOverwrite: false,
      }),
    });
    const storeId = (process.env.BLOB_READ_WRITE_TOKEN || '').split('_')[3] || '';
    return res.status(200).json({
      ok: true,
      putUrl: `https://vercel.com/api/blob/?pathname=${encodeURIComponent(pathname)}`,
      token: json.clientToken,
      contentType: mime,
      path: pathname,
      storeId,
    });
  }

  if (body.action === 'complete') {
    const { path, url, contentType } = body;
    if (!path || !url) return res.status(400).json({ error: 'path and url required' });
    if (!String(path).startsWith('memories-store/photos/share-')) {
      return res.status(400).json({ error: 'only share-upload paths can be registered here' });
    }
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' || !u.hostname.endsWith('.blob.vercel-storage.com')) throw new Error('host');
      if (decodeURIComponent(u.pathname).slice(1) !== path) throw new Error('path');
    } catch {
      return res.status(400).json({ error: 'url must be a blob store url matching path' });
    }
    // The blob must actually exist at our own path in our own store, so a
    // registration can never point the manifest at an arbitrary object.
    try {
      await head(path, { access: 'private' });
    } catch {
      return res.status(400).json({ error: 'blob not found in store' });
    }
    const kind = String(contentType || '').startsWith('video/') ? 'video' : 'image';
    const id = crypto.randomBytes(8).toString('hex');
    await updateManifest(MANIFEST_PATH, (manifest) => {
      const order = manifest.length ? Math.max(...manifest.map((p) => p.order) ) + 1 : 0;
      manifest.push({ id, path, url, kind, caption: '', loc: '', order });
      return { save: true };
    });
    return res.status(200).json({ ok: true, id });
  }

  return res.status(400).json({ error: 'unknown action' });
}
