/**
 * Messages API - Terminal-native messaging for Claude Code users
 *
 * Uses Vercel KV (Redis) for persistence across cold starts
 * Falls back to in-memory if KV not configured
 *
 * POST /api/messages - Send a message (requires auth token)
 * GET /api/messages?user=X - Get inbox for user X
 * GET /api/messages?user=X&with=Y - Get thread between X and Y
 *
 * Authentication:
 * - POST requires valid token in Authorization header
 * - Token format: sessionId.signature (from /api/presence register)
 *
 * AIRC v0.1: Optional Ed25519 signature verification
 */

import crypto from 'crypto';

// ============ AIRC SIGNATURE VERIFICATION ============

/**
 * Serialize object to canonical JSON per AIRC spec
 */
function canonicalJSON(obj) {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJSON).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys
    .filter(k => obj[k] !== undefined)
    .map(k => `${JSON.stringify(k)}:${canonicalJSON(obj[k])}`);
  return '{' + pairs.join(',') + '}';
}

/**
 * Verify Ed25519 signature on AIRC message
 */
function verifyAIRCSignature(message, publicKeyBase64) {
  if (!message.signature || !publicKeyBase64) return { valid: false, reason: 'missing_signature_or_key' };

  const toVerify = { ...message };
  const signature = toVerify.signature;
  delete toVerify.signature;
  // Also remove server-added fields for verification
  delete toVerify.text; // Our compat field, not part of AIRC

  const canonical = canonicalJSON(toVerify);

  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(publicKeyBase64, 'base64'),
      format: 'der',
      type: 'spki'
    });

    const valid = crypto.verify(
      null,
      Buffer.from(canonical, 'utf8'),
      publicKey,
      Buffer.from(signature, 'base64')
    );

    return { valid, reason: valid ? 'verified' : 'invalid_signature' };
  } catch (e) {
    return { valid: false, reason: 'verification_error', error: e.message };
  }
}

/**
 * Check if message timestamp is within acceptable window (5 minutes)
 */
function isTimestampValid(timestamp) {
  if (!timestamp) return false;
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - timestamp);
  return diff <= 300; // 5 minutes
}

// ============ INLINE AUTH (avoid import issues) ============
const AUTH_SECRET = process.env.VIBE_AUTH_SECRET || 'dev-secret-change-in-production';

function verifyToken(token, expectedHandle) {
  if (!token) return { valid: false, error: 'No token provided' };
  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false, error: 'Invalid token format' };
  const [sessionId, providedSignature] = parts;
  const handle = expectedHandle.toLowerCase().replace('@', '');
  const payload = `${sessionId}:${handle}`;
  const expectedSignature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(payload)
    .digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
      return { valid: false, error: 'Invalid signature' };
    }
  } catch (e) {
    return { valid: false, error: 'Invalid signature' };
  }
  return { valid: true, sessionId };
}

function extractToken(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  const vibeToken = req.headers?.['x-vibe-token'] || req.headers?.['X-Vibe-Token'];
  if (vibeToken) return vibeToken;
  if (req.query?.token) return req.query.token;
  return null;
}
// ============ END AUTH ============

// Check if KV is configured via environment variables
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Limits to prevent unbounded growth
const INBOX_LIMIT = 1000;
const OUTBOX_LIMIT = 1000;
const THREAD_LIMIT = 500;

// In-memory fallback (structured like KV for consistency)
const memory = {
  messages: {},      // msg:${id} → message
  inboxes: {},       // inbox:${user} → [id, ...]
  outboxes: {},      // outbox:${user} → [id, ...]
  threads: {},       // thread:${a}:${b} → [id, ...]
  sessions: {},      // session:${id} → session
  consent: {}        // consent:${from}:${to} → { status, ... }
};

// System accounts that bypass consent
const SYSTEM_ACCOUNTS = ['vibe', 'system', 'solienne'];

// KV wrapper
async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    return null;
  }
}

// ============ MESSAGE STORAGE (per-user lists) ============

// Get canonical thread key (alphabetical order)
function threadKey(userA, userB) {
  const [a, b] = [userA, userB].sort();
  return `thread:${a}:${b}`;
}

// Store a message and update all indexes
async function storeMessage(message) {
  const kv = await getKV();
  const { id, from, to } = message;

  if (kv) {
    // Use Redis pipeline for atomic-ish operations
    const pipeline = kv.pipeline();

    // Store message data
    pipeline.set(`msg:${id}`, message);

    // Add to recipient's inbox (newest first)
    pipeline.lpush(`inbox:${to}`, id);
    pipeline.ltrim(`inbox:${to}`, 0, INBOX_LIMIT - 1);

    // Add to sender's outbox (newest first)
    pipeline.lpush(`outbox:${from}`, id);
    pipeline.ltrim(`outbox:${from}`, 0, OUTBOX_LIMIT - 1);

    // Add to thread (newest first)
    const tKey = threadKey(from, to);
    pipeline.lpush(tKey, id);
    pipeline.ltrim(tKey, 0, THREAD_LIMIT - 1);

    await pipeline.exec();
  } else {
    // In-memory fallback
    memory.messages[id] = message;

    if (!memory.inboxes[to]) memory.inboxes[to] = [];
    memory.inboxes[to].unshift(id);
    memory.inboxes[to] = memory.inboxes[to].slice(0, INBOX_LIMIT);

    if (!memory.outboxes[from]) memory.outboxes[from] = [];
    memory.outboxes[from].unshift(id);
    memory.outboxes[from] = memory.outboxes[from].slice(0, OUTBOX_LIMIT);

    const tKey = threadKey(from, to);
    if (!memory.threads[tKey]) memory.threads[tKey] = [];
    memory.threads[tKey].unshift(id);
    memory.threads[tKey] = memory.threads[tKey].slice(0, THREAD_LIMIT);
  }
}

// Get messages by IDs
async function getMessagesByIds(ids) {
  if (!ids || ids.length === 0) return [];

  const kv = await getKV();
  if (kv) {
    const keys = ids.map(id => `msg:${id}`);
    const messages = await kv.mget(...keys);
    return messages.filter(m => m !== null);
  } else {
    return ids.map(id => memory.messages[id]).filter(m => m);
  }
}

// Get user's inbox
async function getInbox(username, limit = 100) {
  const kv = await getKV();
  if (kv) {
    const ids = await kv.lrange(`inbox:${username}`, 0, limit - 1);
    return getMessagesByIds(ids);
  } else {
    const ids = (memory.inboxes[username] || []).slice(0, limit);
    return getMessagesByIds(ids);
  }
}

// Get user's outbox
async function getOutbox(username, limit = 100) {
  const kv = await getKV();
  if (kv) {
    const ids = await kv.lrange(`outbox:${username}`, 0, limit - 1);
    return getMessagesByIds(ids);
  } else {
    const ids = (memory.outboxes[username] || []).slice(0, limit);
    return getMessagesByIds(ids);
  }
}

// Get thread between two users
async function getThread(userA, userB, limit = 100) {
  const kv = await getKV();
  const tKey = threadKey(userA, userB);

  if (kv) {
    const ids = await kv.lrange(tKey, 0, limit - 1);
    return getMessagesByIds(ids);
  } else {
    const ids = (memory.threads[tKey] || []).slice(0, limit);
    return getMessagesByIds(ids);
  }
}

// Update a message (for read receipts)
async function updateMessage(id, updates) {
  const kv = await getKV();
  if (kv) {
    const message = await kv.get(`msg:${id}`);
    if (message) {
      const updated = { ...message, ...updates };
      await kv.set(`msg:${id}`, updated);
      return updated;
    }
  } else {
    if (memory.messages[id]) {
      memory.messages[id] = { ...memory.messages[id], ...updates };
      return memory.messages[id];
    }
  }
  return null;
}

// Session lookup for token verification (reads from same KV as presence)
async function getSession(sessionId) {
  const kv = await getKV();
  if (kv) {
    return await kv.get(`session:${sessionId}`);
  }
  return memory.sessions[sessionId] || null;
}

// AIRC: Get user's public key for signature verification
async function getUserPublicKey(username) {
  const kv = await getKV();
  if (kv) {
    const user = await kv.hgetall(`user:${username}`);
    return user?.publicKey || null;
  }
  return null; // No in-memory user store in messages.js
}

// ============ CONSENT HELPERS ============

function consentKey(from, to) {
  return `consent:${from}:${to}`;
}

async function getConsent(from, to) {
  const kv = await getKV();
  const key = consentKey(from, to);
  if (kv) {
    return await kv.get(key);
  }
  return memory.consent[key] || null;
}

async function setConsent(from, to, data) {
  const kv = await getKV();
  const key = consentKey(from, to);
  if (kv) {
    await kv.set(key, data);
  } else {
    memory.consent[key] = data;
  }
}

// Check if two users have an existing relationship (have messaged before)
async function hasExistingThread(userA, userB) {
  const kv = await getKV();
  const tKey = threadKey(userA, userB);
  if (kv) {
    const count = await kv.llen(tKey);
    return count > 0;
  }
  return (memory.threads[tKey]?.length || 0) > 0;
}

// ============ MIGRATION ============

// Migrate from old global array to new per-user lists
async function migrateMessages(res) {
  const kv = await getKV();
  if (!kv) {
    return res.status(400).json({
      success: false,
      error: 'Migration requires KV storage'
    });
  }

  try {
    // Read old global array
    const oldMessages = await kv.get('vibe:messages') || [];

    if (oldMessages.length === 0) {
      return res.status(200).json({
        success: true,
        migrated: 0,
        message: 'No messages to migrate'
      });
    }

    let migrated = 0;
    let errors = [];

    // Migrate each message
    for (const message of oldMessages) {
      try {
        // Skip if already migrated (check if msg:${id} exists)
        const existing = await kv.get(`msg:${message.id}`);
        if (existing) {
          continue; // Already migrated
        }

        // Store using new schema
        await storeMessage(message);
        migrated++;
      } catch (e) {
        errors.push({ id: message.id, error: e.message });
      }
    }

    // Optionally delete old array after successful migration
    // (keeping it for now as backup)
    // await kv.del('vibe:messages');

    return res.status(200).json({
      success: true,
      migrated,
      total: oldMessages.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Migrated ${migrated}/${oldMessages.length} messages to new schema`
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
}

function generateId() {
  return 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Vibe-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - Send a message (requires authentication)
  if (req.method === 'POST') {
    const { from, to, text, payload } = req.body;

    // Need either text or payload (or both)
    if (!from || !to || (!text && !payload)) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: from, to, and either text or payload"
      });
    }

    const sender = from.toLowerCase().replace('@', '');

    // Token-based authentication
    const token = extractToken(req);
    let authenticatedHandle = null;

    if (token) {
      const parts = token.split('.');
      if (parts.length === 2) {
        const [tokenSessionId] = parts;
        const session = await getSession(tokenSessionId);
        if (session) {
          const result = verifyToken(token, session.handle);
          if (result.valid) {
            authenticatedHandle = session.handle;
          }
        }
      }
    }

    // Require authentication for sending messages
    // System accounts (solienne, vibe) can bypass token auth if they provide a valid sender
    if (!authenticatedHandle) {
      if (SYSTEM_ACCOUNTS.includes(sender)) {
        // Allow system accounts to send without full token verification
        // This enables the Solienne bridge to respond to messages
        authenticatedHandle = sender;
        console.log(`[messages] System account bypass: @${sender}`);
      } else {
        return res.status(401).json({
          success: false,
          error: "Authentication required. Register via POST /api/presence with action='register', then include token in Authorization header."
        });
      }
    }

    // Verify sender matches authenticated handle
    if (authenticatedHandle !== sender) {
      return res.status(403).json({
        success: false,
        error: `Cannot send as @${sender}. Authenticated as @${authenticatedHandle}.`
      });
    }

    const recipient = to.toLowerCase().replace('@', '');

    // ============ AIRC SIGNATURE VERIFICATION (Optional for v0.1) ============
    let signatureStatus = null;
    const { signature, v: version, id: msgId, timestamp, nonce } = req.body;

    if (signature) {
      // Message includes AIRC signature - verify it
      const senderPublicKey = await getUserPublicKey(sender);

      if (senderPublicKey) {
        // Verify timestamp is within window
        if (!isTimestampValid(timestamp)) {
          return res.status(401).json({
            success: false,
            error: 'replay_detected',
            message: 'Message timestamp is outside acceptable window (5 minutes)'
          });
        }

        // Verify signature
        const verification = verifyAIRCSignature(req.body, senderPublicKey);
        signatureStatus = verification;

        if (!verification.valid) {
          // For v0.1, log but don't reject (soft enforcement)
          console.warn(`[AIRC] Signature verification failed for @${sender}: ${verification.reason}`);
          // Future: return 401 auth_failed
        } else {
          console.log(`[AIRC] Message from @${sender} verified with Ed25519 signature`);
        }
      } else {
        // Sender signed but we don't have their public key
        signatureStatus = { valid: false, reason: 'no_public_key' };
        console.log(`[AIRC] Signed message from @${sender} but no public key on file`);
      }
    }

    // ============ CONSENT CHECK ============
    // Bypass consent for:
    // 1. System accounts (vibe, solienne, etc.)
    // 2. Existing threads (have messaged before)
    // 3. Handshake payloads (consent requests themselves)

    const isSystemAccount = SYSTEM_ACCOUNTS.includes(sender) || SYSTEM_ACCOUNTS.includes(recipient);
    const isHandshakePayload = payload?.type === 'handshake';
    let consentStatus = 'accepted';  // Default for system/handshake
    let consentAutoRequested = false;

    if (!isSystemAccount && !isHandshakePayload) {
      // Check consent status
      const consent = await getConsent(sender, recipient);
      consentStatus = consent?.status || 'none';

      if (consentStatus === 'blocked') {
        return res.status(403).json({
          success: false,
          error: 'consent_blocked',
          message: 'You have been blocked by this user'
        });
      }

      // If no consent, check for existing thread (grandfathered relationship)
      if (consentStatus === 'none' || consentStatus === 'pending') {
        const hasThread = await hasExistingThread(sender, recipient);
        if (hasThread) {
          // Grandfather existing relationships - auto-accept
          await setConsent(sender, recipient, {
            status: 'accepted',
            requestedAt: new Date().toISOString(),
            respondedAt: new Date().toISOString(),
            grandfathered: true
          });
          await setConsent(recipient, sender, {
            status: 'accepted',
            requestedAt: new Date().toISOString(),
            respondedAt: new Date().toISOString(),
            grandfathered: true
          });
          consentStatus = 'accepted';
        } else if (consentStatus === 'none') {
          // First message to stranger - auto-request consent
          await setConsent(sender, recipient, {
            status: 'pending',
            requestedAt: new Date().toISOString(),
            message: text?.substring(0, 200) || null  // Include preview
          });
          consentStatus = 'pending';
          consentAutoRequested = true;
        }
      }
    }

    // Use AIRC message ID if provided, otherwise generate
    const messageId = msgId || generateId();

    const message = {
      id: messageId,
      from: sender,
      to: recipient,
      text: text ? text.substring(0, 2000) : null,
      // AIRC fields (if provided)
      body: req.body.body || null,  // AIRC body field
      payload: payload || null,  // Structured data (game state, handoffs, etc.)
      v: version || null,  // AIRC protocol version
      signature: signature || null,  // AIRC signature (for audit)
      signatureVerified: signatureStatus?.valid || false,  // Verification result
      createdAt: new Date().toISOString(),
      read: false,
      consent: consentStatus  // Track consent state at send time
    };

    // Store in per-user lists (atomic, no race conditions)
    await storeMessage(message);

    // Build response
    const response = {
      success: true,
      message,
      consent: consentStatus,
      storage: KV_CONFIGURED ? 'kv' : 'memory'
    };

    // Include AIRC signature status if message was signed
    if (signatureStatus) {
      response.airc = {
        version: version || null,
        signatureVerified: signatureStatus.valid,
        signatureReason: signatureStatus.reason
      };
    }

    if (consentStatus === 'accepted') {
      response.display = `Message sent to @${recipient}`;
    } else if (consentStatus === 'pending') {
      response.display = consentAutoRequested
        ? `Connection request sent to @${recipient}. Message will be visible once they accept.`
        : `Message sent (pending acceptance by @${recipient})`;
    }

    return res.status(200).json(response);
  }

  // DELETE - Disabled for Phase 1 alpha (security)
  if (req.method === 'DELETE') {
    // Special case: migration action
    const { action } = req.query;
    if (action === 'migrate') {
      return await migrateMessages(res);
    }

    return res.status(403).json({
      success: false,
      error: 'DELETE disabled for alpha'
    });
  }

  // GET - Fetch messages
  if (req.method === 'GET') {
    const { user, with: withUser, markRead, sent } = req.query;

    if (!user) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: user"
      });
    }

    const username = user.toLowerCase().replace('@', '');

    // Get thread with specific user
    if (withUser) {
      const otherUser = withUser.toLowerCase().replace('@', '');
      const now = new Date().toISOString();

      // Get thread messages (already newest-first from storage)
      let threadMessages = await getThread(username, otherUser);

      // Auto-mark received messages as read when viewing thread
      for (const m of threadMessages) {
        if (m.from === otherUser && m.to === username && !m.read) {
          await updateMessage(m.id, { read: true, readAt: now });
          m.read = true;
          m.readAt = now;
        }
      }

      // Sort oldest-first for display (chat order)
      const thread = threadMessages
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .map(m => ({
          ...m,
          timeAgo: timeAgo(m.createdAt),
          direction: m.from === username ? 'sent' : 'received'
        }));

      return res.status(200).json({
        success: true,
        thread,
        with: otherUser,
        count: thread.length,
        storage: KV_CONFIGURED ? 'kv' : 'memory'
      });
    }

    // Get sent messages (outbox with read receipts)
    if (sent === 'true') {
      const outboxMessages = await getOutbox(username);

      const outbox = outboxMessages.map(m => ({
        ...m,
        timeAgo: timeAgo(m.createdAt),
        readStatus: m.read ? `Read ${timeAgo(m.readAt)}` : 'Delivered'
      }));

      return res.status(200).json({
        success: true,
        sent: outbox,
        total: outbox.length,
        storage: KV_CONFIGURED ? 'kv' : 'memory'
      });
    }

    // Get inbox (default)
    const inboxMessages = await getInbox(username);
    const now = new Date().toISOString();

    // Mark as read if requested
    if (markRead === 'true') {
      for (const m of inboxMessages) {
        if (!m.read) {
          await updateMessage(m.id, { read: true, readAt: now });
          m.read = true;
          m.readAt = now;
        }
      }
    }

    const inbox = inboxMessages.map(m => ({
      ...m,
      timeAgo: timeAgo(m.createdAt)
    }));

    const unread = inbox.filter(m => !m.read).length;

    // Group by sender
    const bySender = {};
    inbox.forEach(m => {
      if (!bySender[m.from]) {
        bySender[m.from] = [];
      }
      bySender[m.from].push(m);
    });

    return res.status(200).json({
      success: true,
      inbox,
      unread,
      bySender,
      total: inbox.length,
      storage: KV_CONFIGURED ? 'kv' : 'memory'
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
