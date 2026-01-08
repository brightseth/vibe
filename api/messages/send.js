/**
 * POST /api/messages/send
 *
 * Send a message (DM or ping)
 * AIRC v0.2: Signature verification supported
 * Now with Postgres dual-write for migration
 */

const { kv } = require('@vercel/kv');
const { sql, isPostgresEnabled } = require('../lib/db.js');
const { verifySignature, isSignedMessage, validateTimestamp } = require('../lib/crypto.js');

// Safe Mode: Set ENFORCE_SIGNATURES=true to reject unsigned messages
const ENFORCE_SIGNATURES = process.env.ENFORCE_SIGNATURES === 'true';

// Helper to get user's public key
async function getPublicKey(handle) {
  // Try KV first
  try {
    const user = await kv.hgetall(`user:${handle}`);
    if (user?.publicKey) return user.publicKey;
  } catch (e) {
    // KV may be rate limited
  }

  // Try Postgres
  if (isPostgresEnabled() && sql) {
    try {
      const result = await sql`
        SELECT public_key FROM users WHERE username = ${handle} LIMIT 1
      `;
      if (result?.[0]?.public_key) return result[0].public_key;
    } catch (e) {
      // Postgres may not have users table or public_key column yet
    }
  }

  return null;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Support both legacy format and AIRC signed format
    const { from, to, body, text, type = 'dm', payload } = req.body;
    const messageBody = body || text; // AIRC uses 'body', legacy uses 'text'

    if (!from || !to || !messageBody) {
      return res.status(400).json({ error: 'from, to, and body/text required' });
    }

    const fromHandle = from.toLowerCase().replace('@', '');
    const toHandle = to.toLowerCase().replace('@', '');
    const now = Date.now();

    // AIRC signature verification
    let signatureStatus = 'unsigned';
    let signatureError = null;

    if (isSignedMessage(req.body)) {
      // Message has AIRC signature - verify it
      const publicKey = await getPublicKey(fromHandle);

      if (!publicKey) {
        signatureStatus = 'no_key';
        signatureError = `No public key registered for @${fromHandle}`;
        console.warn(`[SEND] ${signatureError}`);

        if (ENFORCE_SIGNATURES) {
          return res.status(401).json({
            error: 'auth_failed',
            message: signatureError,
            hint: 'Register with public key via POST /api/users'
          });
        }
      } else {
        // Validate timestamp first (5 minute window)
        const tsResult = validateTimestamp(req.body.timestamp);
        if (!tsResult.valid) {
          signatureStatus = 'invalid_timestamp';
          signatureError = tsResult.error;
          console.warn(`[SEND] Timestamp rejected for @${fromHandle}: ${tsResult.error}`);

          if (ENFORCE_SIGNATURES) {
            return res.status(401).json({
              error: 'replay_detected',
              message: tsResult.error
            });
          }
        } else {
          // Verify signature
          const result = verifySignature(req.body, publicKey);

          if (result.valid) {
            signatureStatus = 'verified';
            console.log(`[SEND] ✓ Signature verified for @${fromHandle}`);
          } else {
            signatureStatus = 'invalid';
            signatureError = result.error;
            console.warn(`[SEND] ✗ Signature invalid for @${fromHandle}: ${result.error}`);

            if (ENFORCE_SIGNATURES) {
              return res.status(401).json({
                error: 'auth_failed',
                message: 'Invalid signature',
                details: result.error
              });
            }
          }
        }
      }
    } else {
      // Unsigned message
      console.log(`[SEND] Unsigned message from @${fromHandle} (Safe Mode)`);

      if (ENFORCE_SIGNATURES) {
        return res.status(401).json({
          error: 'auth_failed',
          message: 'Signature required',
          hint: 'Include v, signature, timestamp, and nonce fields per AIRC spec'
        });
      }
    }

    // Use AIRC message ID if provided, otherwise generate
    const messageId = req.body.id || `${now}-${Math.random().toString(36).slice(2, 8)}`;

    const message = {
      id: messageId,
      from: fromHandle,
      to: toHandle,
      body: messageBody.trim(),
      type, // 'dm' or 'ping'
      timestamp: now,
      read_at: null,
      _signature: signatureStatus, // Track verification status
      ...(payload && { payload }) // Include AIRC payload if provided
    };

    // Try Postgres first (primary storage)
    let stored = false;
    let storage = 'none';
    // Use request payload if provided, otherwise just type
    const storedPayload = JSON.stringify(payload || { type });

    if (isPostgresEnabled() && sql) {
      try {
        await sql`
          INSERT INTO messages (id, from_user, to_user, text, read, payload, created_at)
          VALUES (${message.id}, ${fromHandle}, ${toHandle}, ${message.body}, false, ${storedPayload}, NOW())
        `;
        stored = true;
        storage = 'postgres';
      } catch (pgErr) {
        console.error('[SEND] Postgres failed:', pgErr.message);
      }
    }

    // Try KV as backup (may fail if rate limited)
    if (!stored) {
      try {
        await kv.lpush(`messages:${toHandle}`, JSON.stringify(message));
        const threadKey = [fromHandle, toHandle].sort().join(':');
        await kv.lpush(`thread:${threadKey}`, JSON.stringify(message));
        await kv.hincrby(`unread:${toHandle}`, fromHandle, 1);
        stored = true;
        storage = 'kv';
      } catch (kvErr) {
        console.error('[SEND] KV failed:', kvErr.message);
      }
    }

    if (!stored) {
      return res.status(503).json({ error: 'Storage unavailable' });
    }

    return res.status(200).json({
      success: true,
      message,
      _storage: storage,
      _signature: signatureStatus,
      ...(signatureError && { _signatureError: signatureError })
    });

  } catch (error) {
    console.error('Send error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
