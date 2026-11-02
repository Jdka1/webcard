import { adminUploadHandler } from '../../memories/_lib.js';

// Owner-only vision upload; same flow as the memories board.
export const config = { api: { bodyParser: false } };

export default function handler(req, res) {
  return adminUploadHandler(req, res, 'vision-store', 'vision-store/manifest.json');
}
