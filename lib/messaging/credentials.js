/**
 * Credential Manager
 *
 * Securely store and retrieve OAuth tokens and API keys
 * for messaging platform integrations (Gmail, X, Farcaster, etc.)
 *
 * Storage: Vercel KV (encrypted)
 */

const { kv } = require('@vercel/kv');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.CREDENTIALS_ENCRYPTION_KEY ||
  crypto.randomBytes(32).toString('hex'); // Generate if not set

/**
 * Encrypt credentials before storage
 */
function encrypt(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    iv: iv.toString('hex'),
    data: encrypted
  };
}

/**
 * Decrypt credentials after retrieval
 */
function decrypt(encrypted) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(encrypted.iv, 'hex')
  );

  let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return JSON.parse(decrypted);
}

/**
 * Store platform credentials for a user
 *
 * @param {string} handle - User handle
 * @param {string} platform - Platform name (gmail, x, farcaster, etc.)
 * @param {object} credentials - Platform-specific credentials
 * @returns {Promise<void>}
 */
async function store(handle, platform, credentials) {
  const cleanHandle = handle.replace('@', '');
  const key = `credentials:${cleanHandle}:${platform}`;

  const encrypted = encrypt(credentials);

  await kv.set(key, encrypted, {
    // Credentials expire after 1 year
    ex: 365 * 24 * 60 * 60
  });
}

/**
 * Retrieve platform credentials for a user
 *
 * @param {string} handle - User handle
 * @param {string} platform - Platform name
 * @returns {Promise<object|null>} - Credentials or null if not found
 */
async function retrieve(handle, platform) {
  const cleanHandle = handle.replace('@', '');
  const key = `credentials:${cleanHandle}:${platform}`;

  const encrypted = await kv.get(key);
  if (!encrypted) {
    return null;
  }

  try {
    return decrypt(encrypted);
  } catch (error) {
    console.error(`Failed to decrypt credentials for ${cleanHandle}:${platform}:`, error);
    return null;
  }
}

/**
 * Delete platform credentials for a user
 *
 * @param {string} handle - User handle
 * @param {string} platform - Platform name
 * @returns {Promise<void>}
 */
async function remove(handle, platform) {
  const cleanHandle = handle.replace('@', '');
  const key = `credentials:${cleanHandle}:${platform}`;

  await kv.del(key);
}

/**
 * List all connected platforms for a user
 *
 * @param {string} handle - User handle
 * @returns {Promise<string[]>} - Array of platform names
 */
async function listConnected(handle) {
  const cleanHandle = handle.replace('@', '');
  const pattern = `credentials:${cleanHandle}:*`;

  // Scan for all credential keys for this user
  const keys = [];
  let cursor = '0';

  do {
    const result = await kv.scan(cursor, {
      match: pattern,
      count: 100
    });
    cursor = result[0];
    keys.push(...result[1]);
  } while (cursor !== '0');

  // Extract platform names from keys
  const platforms = keys.map(key => {
    const parts = key.split(':');
    return parts[parts.length - 1];
  });

  return platforms;
}

/**
 * Check if user has credentials for a platform
 *
 * @param {string} handle - User handle
 * @param {string} platform - Platform name
 * @returns {Promise<boolean>}
 */
async function hasCredentials(handle, platform) {
  const creds = await retrieve(handle, platform);
  return creds !== null;
}

module.exports = {
  store,
  retrieve,
  remove,
  listConnected,
  hasCredentials
};
