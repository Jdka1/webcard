export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  res.setHeader('set-cookie', 'mem_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0');
  return res.status(200).json({ ok: true });
}
