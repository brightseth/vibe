/**
 * Store — Chooses local or API based on environment
 *
 * If VIBE_API_URL is set, uses remote API
 * Otherwise uses local JSONL files
 */

const useApi = !!process.env.VIBE_API_URL;

if (useApi) {
  module.exports = require('./api');
  module.exports.storage = 'api';
} else {
  module.exports = require('./local');
  module.exports.storage = 'local';
}
