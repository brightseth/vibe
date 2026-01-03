/**
 * AIRC Crypto — Ed25519 keypair generation and message signing
 *
 * Implements AIRC v0.1 signing specification:
 * - Ed25519 keypairs (Node.js crypto)
 * - Canonical JSON serialization
 * - Base64 signature encoding
 */

const crypto = require('crypto');

/**
 * Generate a new Ed25519 keypair
 * @returns {{ publicKey: string, privateKey: string }} Base64-encoded keys
 */
function generateKeypair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  return {
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
    privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64')
  };
}

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
 * Sign an object with Ed25519 private key
 *
 * Per AIRC spec:
 * 1. Clone object
 * 2. Remove 'signature' field if present
 * 3. Serialize to canonical JSON
 * 4. Sign UTF-8 bytes
 *
 * @param {object} obj Object to sign
 * @param {string} privateKeyBase64 Base64-encoded private key (PKCS8 DER)
 * @returns {string} Base64-encoded signature
 */
function sign(obj, privateKeyBase64) {
  // Clone and remove signature field
  const toSign = { ...obj };
  delete toSign.signature;

  // Get canonical JSON
  const canonical = canonicalJSON(toSign);

  // Import private key
  const privateKey = crypto.createPrivateKey({
    key: Buffer.from(privateKeyBase64, 'base64'),
    format: 'der',
    type: 'pkcs8'
  });

  // Sign
  const signature = crypto.sign(null, Buffer.from(canonical, 'utf8'), privateKey);
  return signature.toString('base64');
}

/**
 * Verify signature on an object
 *
 * @param {object} obj Object with signature field
 * @param {string} publicKeyBase64 Base64-encoded public key (SPKI DER)
 * @returns {boolean} True if signature is valid
 */
function verify(obj, publicKeyBase64) {
  if (!obj.signature) return false;

  // Clone and remove signature
  const toVerify = { ...obj };
  const signature = toVerify.signature;
  delete toVerify.signature;

  // Get canonical JSON
  const canonical = canonicalJSON(toVerify);

  try {
    // Import public key
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki'
    });

    // Verify
    return crypto.verify(
      null,
      Buffer.from(canonical, 'utf8'),
      publicKey,
      Buffer.from(signature, 'base64')
    );
  } catch (e) {
    console.error('[crypto] Verification failed:', e.message);
    return false;
  }
}

/**
 * Generate a random nonce (16+ chars)
 * @returns {string} Hex-encoded nonce
 */
function generateNonce() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate AIRC-compliant message ID
 * @returns {string} Message ID (msg_ prefix + random)
 */
function generateMessageId() {
  return 'msg_' + crypto.randomBytes(12).toString('hex');
}

/**
 * Create a signed AIRC message
 *
 * @param {object} params Message parameters
 * @param {string} params.from Sender handle
 * @param {string} params.to Recipient handle
 * @param {string} [params.body] Message body
 * @param {object} [params.payload] Message payload
 * @param {string} privateKeyBase64 Sender's private key
 * @returns {object} Complete signed message
 */
function createSignedMessage({ from, to, body, payload }, privateKeyBase64) {
  const message = {
    v: '0.1',
    id: generateMessageId(),
    from,
    to,
    timestamp: Math.floor(Date.now() / 1000),
    nonce: generateNonce()
  };

  if (body) message.body = body;
  if (payload) message.payload = payload;

  // Sign
  message.signature = sign(message, privateKeyBase64);

  return message;
}

/**
 * Create a signed heartbeat
 *
 * @param {string} handle User handle
 * @param {string} status Status (online/idle/busy/offline)
 * @param {string} [context] Activity context
 * @param {string} privateKeyBase64 User's private key
 * @returns {object} Signed heartbeat
 */
function createSignedHeartbeat(handle, status, context, privateKeyBase64) {
  const heartbeat = {
    handle,
    status,
    timestamp: Math.floor(Date.now() / 1000),
    nonce: generateNonce()
  };

  if (context) heartbeat.context = context;

  heartbeat.signature = sign(heartbeat, privateKeyBase64);

  return heartbeat;
}

module.exports = {
  generateKeypair,
  canonicalJSON,
  sign,
  verify,
  generateNonce,
  generateMessageId,
  createSignedMessage,
  createSignedHeartbeat
};
