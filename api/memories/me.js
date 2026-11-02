import { requireActiveSession } from './_lib.js';

// Who am I? Lets the board show owner-only navigation (e.g. the manage
// link) without exposing anything about other users.
export default async function handler(req, res) {
  const session = await requireActiveSession(req, res);
  if (!session) return;
  res.status(200).json({ username: session.u, role: session.role });
}
