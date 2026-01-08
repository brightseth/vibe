/**
 * Consent API - AIRC-compliant consent handshake
 *
 * Consent is per-identity-pair and directional (A→B consent != B→A consent)
 *
 * States:
 * - none: No relationship exists
 * - pending: Request sent, awaiting response
 * - accepted: Can send messages freely
 * - blocked: Cannot send messages (403)
 *
 * POST /api/consent - Request, accept, or block
 *   { action: 'request'|'accept'|'block', from, to }
 *
 * GET /api/consent?from=X&to=Y - Check consent status
 *
 * Migration: Postgres primary, KV fallback
 */

import crypto from 'crypto';
import { sql, isPostgresEnabled } from './lib/db.js';

// ============ INLINE AUTH ============
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

const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    return null;
  }
}

// In-memory fallback
const memory = {
  consent: {},   // consent:${from}:${to} → { status, ... }
  sessions: {}
};

// ============ CONSENT STORAGE ============

function consentKey(from, to) {
  return `consent:${from}:${to}`;
}

async function getConsent(from, to) {
  // Try Postgres first
  if (isPostgresEnabled() && sql) {
    try {
      const result = await sql`
        SELECT status, created_at as "requestedAt", updated_at as "respondedAt"
        FROM user_connections
        WHERE from_user = ${from} AND to_user = ${to}
      `;
      if (result && result.length > 0) {
        return {
          status: result[0].status,
          requestedAt: result[0].requestedAt?.toISOString() || null,
          respondedAt: result[0].respondedAt?.toISOString() || null,
          _source: 'postgres'
        };
      }
    } catch (pgErr) {
      console.error('[CONSENT] Postgres read error:', pgErr.message);
    }
  }

  // Fall back to KV
  const kv = await getKV();
  const key = consentKey(from, to);

  if (kv) {
    try {
      const data = await kv.get(key);
      return data ? { ...data, _source: 'kv' } : null;
    } catch (kvErr) {
      console.error('[CONSENT] KV read error:', kvErr.message);
      // Fall through to memory
    }
  }
  const memData = memory.consent[key];
  return memData ? { ...memData, _source: 'memory' } : null;
}

async function setConsent(from, to, data) {
  // Try Postgres first
  if (isPostgresEnabled() && sql) {
    try {
      await sql`
        INSERT INTO user_connections (from_user, to_user, status, created_at, updated_at)
        VALUES (${from}, ${to}, ${data.status}, NOW(), NOW())
        ON CONFLICT (from_user, to_user)
        DO UPDATE SET status = ${data.status}, updated_at = NOW()
      `;
    } catch (pgErr) {
      console.error('[CONSENT] Postgres write error:', pgErr.message);
    }
  }

  // Also write to KV (backup)
  const kv = await getKV();
  const key = consentKey(from, to);

  if (kv) {
    try {
      await kv.set(key, data);
    } catch (kvErr) {
      console.error('[CONSENT] KV write error:', kvErr.message);
      memory.consent[key] = data; // Memory fallback
    }
  } else {
    memory.consent[key] = data;
  }
}

// Get all pending requests for a user (incoming)
async function getPendingRequests(handle) {
  // Try Postgres first
  if (isPostgresEnabled() && sql) {
    try {
      const result = await sql`
        SELECT from_user, status, created_at as "requestedAt"
        FROM user_connections
        WHERE to_user = ${handle} AND status = 'pending'
        ORDER BY created_at DESC
      `;
      if (result && result.length > 0) {
        return result.map(r => ({
          from: r.from_user,
          status: r.status,
          requestedAt: r.requestedAt?.toISOString() || null,
          _source: 'postgres'
        }));
      }
    } catch (pgErr) {
      console.error('[CONSENT] Postgres pending query error:', pgErr.message);
    }
  }

  // Fall back to KV
  const kv = await getKV();

  if (kv) {
    try {
      // Scan for consent:*:${handle} where status is pending
      const keys = await kv.keys(`consent:*:${handle}`);
      const pending = [];

      for (const key of keys) {
        const data = await kv.get(key);
        if (data && data.status === 'pending') {
          pending.push({
            from: key.split(':')[1],
            ...data,
            _source: 'kv'
          });
        }
      }
      return pending;
    } catch (kvErr) {
      console.error('[CONSENT] KV pending query error:', kvErr.message);
      // Fall through to memory
    }
  }

  // In-memory scan
  return Object.entries(memory.consent)
    .filter(([key, data]) => key.endsWith(`:${handle}`) && data.status === 'pending')
    .map(([key, data]) => ({
      from: key.split(':')[1],
      ...data,
      _source: 'memory'
    }));
}

// Session lookup
async function getSession(sessionId) {
  const kv = await getKV();
  if (kv) {
    try {
      return await kv.get(`session:${sessionId}`);
    } catch (kvErr) {
      console.error('[CONSENT] KV session error:', kvErr.message);
    }
  }
  return memory.sessions[sessionId] || null;
}

// ============ HANDLER ============

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Vibe-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - Check consent status
  if (req.method === 'GET') {
    const { from, to } = req.query;

    if (!from || !to) {
      // Return pending requests for authenticated user
      const token = extractToken(req);
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Missing from/to params or authentication for pending list'
        });
      }

      // Authenticate
      const parts = token.split('.');
      if (parts.length !== 2) {
        return res.status(401).json({ success: false, error: 'Invalid token' });
      }

      const [tokenSessionId] = parts;
      const session = await getSession(tokenSessionId);
      if (!session) {
        return res.status(401).json({ success: false, error: 'Session not found' });
      }

      const result = verifyToken(token, session.handle);
      if (!result.valid) {
        return res.status(401).json({ success: false, error: result.error });
      }

      const pending = await getPendingRequests(session.handle);
      return res.status(200).json({
        success: true,
        pending,
        count: pending.length
      });
    }

    const fromHandle = from.toLowerCase().replace('@', '');
    const toHandle = to.toLowerCase().replace('@', '');

    const consent = await getConsent(fromHandle, toHandle);

    return res.status(200).json({
      success: true,
      from: fromHandle,
      to: toHandle,
      status: consent?.status || 'none',
      requestedAt: consent?.requestedAt || null,
      respondedAt: consent?.respondedAt || null
    });
  }

  // POST - Request, accept, or block
  if (req.method === 'POST') {
    const { action, from, to, message } = req.body;

    if (!action || !['request', 'accept', 'block'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'action must be one of: request, accept, block'
      });
    }

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: from, to'
      });
    }

    const fromHandle = from.toLowerCase().replace('@', '');
    const toHandle = to.toLowerCase().replace('@', '');

    // Authenticate
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    const [tokenSessionId] = parts;
    const session = await getSession(tokenSessionId);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Session not found' });
    }

    const authResult = verifyToken(token, session.handle);
    if (!authResult.valid) {
      return res.status(401).json({ success: false, error: authResult.error });
    }

    const authenticatedHandle = session.handle;

    // Handle each action
    if (action === 'request') {
      // Sender requests consent from recipient
      if (authenticatedHandle !== fromHandle) {
        return res.status(403).json({
          success: false,
          error: `Cannot request consent as @${fromHandle}. Authenticated as @${authenticatedHandle}.`
        });
      }

      // Check existing consent
      const existing = await getConsent(fromHandle, toHandle);
      if (existing?.status === 'accepted') {
        return res.status(200).json({
          success: true,
          status: 'accepted',
          message: 'Already connected'
        });
      }
      if (existing?.status === 'blocked') {
        return res.status(403).json({
          success: false,
          error: 'consent_blocked',
          message: 'You have been blocked by this user'
        });
      }
      if (existing?.status === 'pending') {
        return res.status(200).json({
          success: true,
          status: 'pending',
          message: 'Request already pending'
        });
      }

      // Create pending request
      await setConsent(fromHandle, toHandle, {
        status: 'pending',
        requestedAt: new Date().toISOString(),
        message: message || null
      });

      return res.status(200).json({
        success: true,
        status: 'pending',
        message: `Connection request sent to @${toHandle}`
      });
    }

    if (action === 'accept') {
      // Recipient accepts sender's request
      // The "to" is the person accepting (the recipient of the original request)
      if (authenticatedHandle !== toHandle) {
        return res.status(403).json({
          success: false,
          error: `Cannot accept as @${toHandle}. Authenticated as @${authenticatedHandle}.`
        });
      }

      // Check there's a pending request
      const existing = await getConsent(fromHandle, toHandle);
      if (!existing || existing.status === 'none') {
        return res.status(400).json({
          success: false,
          error: 'No pending request to accept'
        });
      }
      if (existing.status === 'accepted') {
        return res.status(200).json({
          success: true,
          status: 'accepted',
          message: 'Already connected'
        });
      }

      // Accept: update consent status
      await setConsent(fromHandle, toHandle, {
        ...existing,
        status: 'accepted',
        respondedAt: new Date().toISOString()
      });

      // Also auto-accept in reverse direction (mutual consent)
      const reverse = await getConsent(toHandle, fromHandle);
      if (!reverse || reverse.status !== 'accepted') {
        await setConsent(toHandle, fromHandle, {
          status: 'accepted',
          requestedAt: new Date().toISOString(),
          respondedAt: new Date().toISOString(),
          autoAccepted: true
        });
      }

      return res.status(200).json({
        success: true,
        status: 'accepted',
        message: `Accepted connection from @${fromHandle}`
      });
    }

    if (action === 'block') {
      // Recipient blocks sender
      if (authenticatedHandle !== toHandle) {
        return res.status(403).json({
          success: false,
          error: `Cannot block as @${toHandle}. Authenticated as @${authenticatedHandle}.`
        });
      }

      const existing = await getConsent(fromHandle, toHandle);

      await setConsent(fromHandle, toHandle, {
        status: 'blocked',
        requestedAt: existing?.requestedAt || null,
        respondedAt: new Date().toISOString(),
        blockedAt: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        status: 'blocked',
        message: `Blocked @${fromHandle}`
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
