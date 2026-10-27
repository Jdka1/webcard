import crypto from 'node:crypto';
import { put, get, del } from '@vercel/blob';

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
import { put, get, del } from '@vercel/blob';

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
    const result = await get(path, { access: 'private' });
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
export const loadManifest = () => readJson(MANIFEST_PATH, []);
export const saveManifest = (manifest) => writeJson(MANIFEST_PATH, manifest);
export const getBlob = (path) => get(path, { access: 'private' });
export const putBlob = (path, body, contentType) =>
  put(path, body, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType });
export const delBlob = (path) => del(path);
