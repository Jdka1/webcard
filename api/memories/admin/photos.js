import { adminPhotosHandler } from '../_lib.js';

// Owner-only photo manager: edit captions/place, feature, reorder, delete.
export default function handler(req, res) {
  return adminPhotosHandler(req, res, 'memories-store/manifest.json');
}
