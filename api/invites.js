/**
 * Invites API — Vouch-based growth system
 *
 * POST /api/invites - Generate invite code (auth required)
 *   Returns: { success, code, remaining }
 *
 * GET /api/invites?code=X - Check if code is valid
 *   Returns: { valid, inviter, expires_at }
 *
 * POST /api/invites/redeem - Redeem an invite code
 *   Body: { code, handle, one_liner }
 *   Returns: { success, handle, inviter }
 *
 * GET /api/invites/my - List my codes (auth required)
 *   Returns: { codes: [...], remaining }
 */

import { getHandleRecord, claimHandle } from './lib/handles.js';

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

// Generate a readable invite code
function generateCode(handle) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O/0/1/I
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return 'VIBE-' + random + '-' + handle.toUpperCase().slice(0, 4);
}

// How many codes each user tier gets
const CODES_PER_TIER = {
  genesis: 3,      // First 100 users
  waitlist: 2,     // Invited from waitlist
  invited: 1,      // Invited by another user
  default: 1
};

// Code expiration (30 days)
const CODE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kv = await getKV();
  if (!kv) {
    return res.status(503).json({
      success: false,
      error: 'Invites temporarily unavailable'
    });
  }

  const path = req.url.split('?')[0];

  // POST /api/invites — Generate new invite code
  if (req.method === 'POST' && path === '/api/invites') {
    // Get handle from auth token or body
    const authHeader = req.headers.authorization;
    let handle = req.body?.handle;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // TODO: Validate token and extract handle
      // For now, require handle in body
    }

    if (!handle) {
      return res.status(400).json({
        success: false,
        error: 'Handle required'
      });
    }

    handle = handle.toLowerCase().trim();

    // Check user exists and get their record
    const userRecord = await getHandleRecord(kv, handle);
    if (!userRecord) {
      return res.status(404).json({
        success: false,
        error: 'Handle not found'
      });
    }

    // Determine how many codes they can have
    let maxCodes = CODES_PER_TIER.default;
    if (userRecord.genesis) {
      maxCodes = CODES_PER_TIER.genesis;
    } else if (userRecord.invited_from_waitlist) {
      maxCodes = CODES_PER_TIER.waitlist;
    } else if (userRecord.invited_by) {
      maxCodes = CODES_PER_TIER.invited;
    }

    // Count their existing unused codes
    const userCodesKey = 'vibe:invites:by:' + handle;
    const existingCodes = await kv.smembers(userCodesKey) || [];

    let unusedCount = 0;
    for (const code of existingCodes) {
      const codeData = await kv.hget('vibe:invites', code);
      if (codeData) {
        const parsed = typeof codeData === 'string' ? JSON.parse(codeData) : codeData;
        if (parsed.status === 'available') {
          unusedCount++;
        }
      }
    }

    // Check if they can generate more
    if (unusedCount >= maxCodes) {
      return res.status(400).json({
        success: false,
        error: 'No invite codes remaining',
        max_codes: maxCodes,
        unused: unusedCount,
        message: 'Use or share your existing codes first'
      });
    }

    // Generate new code
    const code = generateCode(handle);
    const expiresAt = Date.now() + CODE_EXPIRY_MS;

    const invite = {
      code,
      created_by: handle,
      created_at: new Date().toISOString(),
      created_at_ts: Date.now(),
      expires_at: new Date(expiresAt).toISOString(),
      expires_at_ts: expiresAt,
      used_by: null,
      used_at: null,
      status: 'available'
    };

    // Store invite
    await kv.hset('vibe:invites', code, JSON.stringify(invite));

    // Track user's codes
    await kv.sadd(userCodesKey, code);

    return res.status(200).json({
      success: true,
      code,
      expires_at: invite.expires_at,
      remaining: maxCodes - unusedCount - 1,
      share_url: 'https://slashvibe.dev/invite/' + code
    });
  }

  // POST /api/invites/redeem — Redeem an invite code
  if (req.method === 'POST' && path === '/api/invites/redeem') {
    const { code, handle, one_liner } = req.body || {};

    if (!code || !handle) {
      return res.status(400).json({
        success: false,
        error: 'Code and handle required'
      });
    }

    const normalizedCode = code.toUpperCase().trim();
    const normalizedHandle = handle.toLowerCase().trim();

    // Check if code exists and is valid
    const codeData = await kv.hget('vibe:invites', normalizedCode);
    if (!codeData) {
      return res.status(404).json({
        success: false,
        error: 'Invalid invite code'
      });
    }

    const invite = typeof codeData === 'string' ? JSON.parse(codeData) : codeData;

    if (invite.status !== 'available') {
      return res.status(400).json({
        success: false,
        error: 'This code has already been used'
      });
    }

    if (invite.expires_at_ts < Date.now()) {
      return res.status(400).json({
        success: false,
        error: 'This code has expired'
      });
    }

    // Try to claim the handle
    const claimResult = await claimHandle(kv, normalizedHandle, {
      one_liner: one_liner || 'Invited to /vibe',
      invited_by: invite.created_by,
      invite_code: normalizedCode
    });

    if (!claimResult.success) {
      return res.status(400).json({
        success: false,
        error: claimResult.error,
        message: claimResult.message,
        suggestions: claimResult.suggestions
      });
    }

    // Mark invite as used
    invite.used_by = normalizedHandle;
    invite.used_at = new Date().toISOString();
    invite.status = 'used';
    await kv.hset('vibe:invites', normalizedCode, JSON.stringify(invite));

    // Grant the inviter a bonus code for successful invite
    const inviterCodesKey = 'vibe:invites:by:' + invite.created_by;
    const bonusCode = generateCode(invite.created_by);
    const bonusExpires = Date.now() + CODE_EXPIRY_MS;

    const bonusInvite = {
      code: bonusCode,
      created_by: invite.created_by,
      created_at: new Date().toISOString(),
      created_at_ts: Date.now(),
      expires_at: new Date(bonusExpires).toISOString(),
      expires_at_ts: bonusExpires,
      used_by: null,
      used_at: null,
      status: 'available',
      bonus_for_inviting: normalizedHandle
    };

    await kv.hset('vibe:invites', bonusCode, JSON.stringify(bonusInvite));
    await kv.sadd(inviterCodesKey, bonusCode);

    return res.status(200).json({
      success: true,
      handle: normalizedHandle,
      inviter: invite.created_by,
      genesis_number: claimResult.genesis_number,
      message: 'Welcome to /vibe! You were invited by @' + invite.created_by
    });
  }

  // GET /api/invites?code=X — Check if code is valid
  if (req.method === 'GET' && req.query.code) {
    const code = req.query.code.toUpperCase().trim();

    const codeData = await kv.hget('vibe:invites', code);
    if (!codeData) {
      return res.status(404).json({
        valid: false,
        error: 'Invalid invite code'
      });
    }

    const invite = typeof codeData === 'string' ? JSON.parse(codeData) : codeData;

    if (invite.status !== 'available') {
      return res.status(200).json({
        valid: false,
        error: 'This code has already been used'
      });
    }

    if (invite.expires_at_ts < Date.now()) {
      return res.status(200).json({
        valid: false,
        error: 'This code has expired'
      });
    }

    return res.status(200).json({
      valid: true,
      inviter: invite.created_by,
      expires_at: invite.expires_at
    });
  }

  // GET /api/invites/my — List my codes
  if (req.method === 'GET' && path === '/api/invites/my') {
    const handle = req.query.handle?.toLowerCase().trim();

    if (!handle) {
      return res.status(400).json({
        success: false,
        error: 'Handle required'
      });
    }

    // Get user record to determine max codes
    const userRecord = await getHandleRecord(kv, handle);
    if (!userRecord) {
      return res.status(404).json({
        success: false,
        error: 'Handle not found'
      });
    }

    let maxCodes = CODES_PER_TIER.default;
    if (userRecord.genesis) {
      maxCodes = CODES_PER_TIER.genesis;
    } else if (userRecord.invited_from_waitlist) {
      maxCodes = CODES_PER_TIER.waitlist;
    } else if (userRecord.invited_by) {
      maxCodes = CODES_PER_TIER.invited;
    }

    // Get all user's codes
    const userCodesKey = 'vibe:invites:by:' + handle;
    const codelist = await kv.smembers(userCodesKey) || [];

    const codes = [];
    let unusedCount = 0;

    for (const code of codelist) {
      const codeData = await kv.hget('vibe:invites', code);
      if (codeData) {
        const parsed = typeof codeData === 'string' ? JSON.parse(codeData) : codeData;
        codes.push({
          code: parsed.code,
          status: parsed.status,
          created_at: parsed.created_at,
          expires_at: parsed.expires_at,
          used_by: parsed.used_by,
          used_at: parsed.used_at,
          share_url: parsed.status === 'available' ? 'https://slashvibe.dev/invite/' + parsed.code : null
        });
        if (parsed.status === 'available') {
          unusedCount++;
        }
      }
    }

    // Sort: available first, then by created date
    codes.sort((a, b) => {
      if (a.status === 'available' && b.status !== 'available') return -1;
      if (a.status !== 'available' && b.status === 'available') return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return res.status(200).json({
      success: true,
      codes,
      unused: unusedCount,
      max_codes: maxCodes,
      can_generate: unusedCount < maxCodes
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
