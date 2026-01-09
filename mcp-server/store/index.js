/**
 * Store — Chooses local or API based on environment
 *
 * Default: uses remote API (production behavior)
 * Set VIBE_LOCAL=true to use local JSONL files
 */

const useLocal = process.env.VIBE_LOCAL === 'true';

if (useLocal) {
  module.exports = require('./local');
  module.exports.storage = 'local';
} else {
  module.exports = require('./api');
  module.exports.storage = 'api';
}
