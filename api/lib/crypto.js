/**
 * AIRC Crypto - Server-side signature verification
 *
 * Implements AIRC v0.2 signing verification:
 * - Ed25519 signature verification
 * - Canonical JSON serialization (RFC 8785 style)
 * - Base64 signature decoding
 */

const crypto = require('crypto');

/**
 * Serialize object to canonical JSON per AIRC spec
 * - Keys sorted alphabetically (recursive)
 * - No whitespace
 * - UTF-8 encoding
 *
 * @param {object} obj Object to serialize
 * @returns {string} Canonical JSON string
 */
function canonicalJSON(obj) {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJSON).join(',') + ']';
  }

  // Sort keys alphabetically and recurse
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys
    .filter(k => obj[k] !== undefined) // Exclude undefined values
    .map(k => `${JSON.stringify(k)}:${canonicalJSON(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Verify Ed25519 signature on an AIRC message
 *
 * @param {object} message Message object with signature field
 * @param {string} publicKeyBase64 Base64-encoded public key (SPKI DER format)
 * @returns {{ valid: boolean, error?: string }}
 */
function verifySignature(message, publicKeyBase64) {
  if (!message) {
    return { valid: false, error: 'No message provided' };
  }

  if (!message.signature) {
    return { valid: false, error: 'No signature in message' };
  }

  if (!publicKeyBase64) {
    return { valid: false, error: 'No public key available for sender' };
  }

  try {
    // Clone and remove signature for verification
    const toVerify = { ...message };
    const signature = toVerify.signature;
    delete toVerify.signature;

    // Get canonical JSON
    const canonical = canonicalJSON(toVerify);

    // Handle different public key formats
    let publicKey;

    // Check for ed25519: prefix (AIRC v0.2 format)
    const keyData = publicKeyBase64.startsWith('ed25519:')
      ? publicKeyBase64.slice(8)
      : publicKeyBase64;

    try {
      // Try SPKI DER format first (what MCP client sends)
      publicKey = crypto.createPublicKey({
        key: Buffer.from(keyData, 'base64'),
        format: 'der',
        type: 'spki'
      });
    } catch (e) {
      // Try raw 32-byte key
      const rawKey = Buffer.from(keyData, 'base64');
      if (rawKey.length === 32) {
        // Wrap raw key in SPKI structure
        const spkiPrefix = Buffer.from([
          0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00
        ]);
        const spkiKey = Buffer.concat([spkiPrefix, rawKey]);
        publicKey = crypto.createPublicKey({
          key: spkiKey,
          format: 'der',
          type: 'spki'
        });
      } else {
        throw new Error('Invalid public key format');
      }
    }

    // Handle signature format (may have ed25519: prefix)
    const sigData = signature.startsWith('ed25519:')
      ? signature.slice(8)
      : signature;

    // Verify
    const isValid = crypto.verify(
      null,
      Buffer.from(canonical, 'utf8'),
      publicKey,
      Buffer.from(sigData, 'base64')
    );

    return { valid: isValid };
  } catch (e) {
    return { valid: false, error: `Verification failed: ${e.message}` };
  }
}

/**
 * Check if a message has AIRC signing fields
 * @param {object} message
 * @returns {boolean}
 */
function isSignedMessage(message) {
  return !!(message && message.signature && message.v);
}

/**
 * Validate message timestamp is within acceptable window
 * @param {number} timestamp Unix timestamp in seconds
 * @param {number} windowSeconds Acceptable window (default 5 minutes)
 * @returns {{ valid: boolean, error?: string }}
 */
function validateTimestamp(timestamp, windowSeconds = 300) {
  if (!timestamp) {
    return { valid: false, error: 'No timestamp in message' };
  }

  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - timestamp);

  if (diff > windowSeconds) {
    return {
      valid: false,
      error: `Timestamp ${diff}s from server time (max ${windowSeconds}s)`
    };
  }

  return { valid: true };
}

module.exports = {
  canonicalJSON,
  verifySignature,
  isSignedMessage,
  validateTimestamp
};
