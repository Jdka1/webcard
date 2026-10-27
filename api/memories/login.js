import { loadUsers, verifyPassword, makeSession } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const secret = process.env.MEMORIES_SESSION_SECRET;
  if (!secret) return res.status(500).json({ error: 'memories gate is not configured' });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'username and password required' });

  let role = null;
  if (username === process.env.MEMORIES_OWNER_USER && password === process.env.MEMORIES_OWNER_PASSWORD) {
    role = 'owner';
  } else {
    const users = await loadUsers();
    const user = users.find((u) => u.username === username && u.active);
    if (user && verifyPassword(password, user.salt, user.hash)) role = 'viewer';
  }

  if (!role) return res.status(401).json({ error: 'wrong username or password' });

  const cookie = makeSession({ u: username, role }, secret);
  res.setHeader('set-cookie', `mem_session=${cookie}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${30 * 24 * 3600}`);
  return res.status(200).json({ ok: true, role });
}
