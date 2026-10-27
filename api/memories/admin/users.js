import { requireOwner, loadUsers, saveUsers, hashPassword } from '../_lib.js';

// Owner-only people manager. Lists who has access (never password material),
// adds a person with a password the owner chooses, revokes (active=false),
// or removes entirely.
export default async function handler(req, res) {
  const owner = requireOwner(req, res);
  if (!owner) return;

  const users = await loadUsers();

  if (req.method === 'GET') {
    return res.status(200).json({
      people: users.map(({ username, created, active }) => ({ username, created, active })),
    });
  }

  if (req.method === 'POST') {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'username and password required' });
    if (!/^[a-z0-9_.-]{2,32}$/i.test(username)) return res.status(400).json({ error: 'username: 2-32 letters, numbers, _ . -' });
    if (String(password).length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(409).json({ error: 'that name is taken' });
    }
    const { salt, hash } = hashPassword(password);
    users.push({ username, salt, hash, created: new Date().toISOString(), active: true });
    await saveUsers(users);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'PATCH') {
    const { username, active } = req.body || {};
    const user = users.find((u) => u.username === username);
    if (!user) return res.status(404).json({ error: 'not found' });
    user.active = !!active;
    await saveUsers(users);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { username } = req.body || {};
    const remaining = users.filter((u) => u.username !== username);
    if (remaining.length === users.length) return res.status(404).json({ error: 'not found' });
    await saveUsers(remaining);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
