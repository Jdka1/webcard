import { adminUploadHandler } from '../_lib.js';

// Owner-only upload: small files stream through this function; videos and
// oversized photos upload client-direct (token issued here), bypassing the
// ~4.5MB host body cap. Shared logic lives in _lib.js.
export const config = { api: { bodyParser: false } };

export default function handler(req, res) {
  return adminUploadHandler(req, res, 'memories-store', 'memories-store/manifest.json');
}
