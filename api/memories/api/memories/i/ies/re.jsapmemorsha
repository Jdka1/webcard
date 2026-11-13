import { shareUploadHandler } from './_lib.js';

// Upload-only path for the owner's Apple Shortcut ("Send to staryan"):
// key-authed, no session cookie. Client-direct to the private blob store,
// then registered into the gallery manifest. Logic lives in _lib.js.
export const config = { api: { bodyParser: false } };

export default function handler(req, res) {
  return shareUploadHandler(req, res);
}
