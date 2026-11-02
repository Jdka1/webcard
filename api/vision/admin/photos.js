import { adminPhotosHandler } from '../../memories/_lib.js';

// Owner-only vision board manager: same actions as the memories board.
export default function handler(req, res) {
  return adminPhotosHandler(req, res, 'vision-store/manifest.json');
}
