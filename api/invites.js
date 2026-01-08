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
 *
 * Migration: Postgres primary, KV fallback
 */

import { getHandleRecord, claimHandle } from './lib/handles.js';
import { sql, isPostgresEnabled } from './lib/db.js';

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

// ============ POSTGRES HELPERS ============

async function getInviteFromPostgres(code) {
  if (!isPostgresEnabled() || !sql) return null;
  try {
    const result = await sql`
      SELECT code, created_by, used_by, used_at, expires_at, created_at
      FROM invites WHERE code = ${code}
    `;
    if (result && result.length > 0) {
      const r = result[0];
      return {
        code: r.code,
        created_by: r.created_by,
        used_by: r.used_by,
        used_at: r.used_at?.toISOString() || null,
        expires_at: r.expires_at?.toISOString() || null,
        expires_at_ts: r.expires_at ? new Date(r.expires_at).getTime() : null,
        created_at: r.created_at?.toISOString() || null,
        status: r.used_by ? 'used' : 'available',
        _source: 'postgres'
      };
    }
  } catch (e) {
    console.error('[INVITES] Postgres get error:', e.message);
  }
  return null;
}

async function createInviteInPostgres(code, createdBy, expiresAt) {
  if (!isPostgresEnabled() || !sql) return false;
  try {
    await sql`
      INSERT INTO invites (code, created_by, expires_at, created_at)
      VALUES (${code}, ${createdBy}, ${new Date(expiresAt)}, NOW())
    `;
    return true;
  } catch (e) {
    console.error('[INVITES] Postgres create error:', e.message);
    return false;
  }
}

async function redeemInviteInPostgres(code, usedBy) {
  if (!isPostgresEnabled() || !sql) return false;
  try {
    await sql`
      UPDATE invites SET used_by = ${usedBy}, used_at = NOW()
      WHERE code = ${code} AND used_by IS NULL
    `;
    return true;
  } catch (e) {
    console.error('[INVITES] Postgres redeem error:', e.message);
    return false;
  }
}

async function getUserInvitesFromPostgres(handle) {
  if (!isPostgresEnabled() || !sql) return null;
  try {
    const result = await sql`
      SELECT code, created_by, used_by, used_at, expires_at, created_at
      FROM invites WHERE created_by = ${handle}
      ORDER BY created_at DESC
    `;
    if (result) {
      return result.map(r => ({
        code: r.code,
        created_by: r.created_by,
        used_by: r.used_by,
        used_at: r.used_at?.toISOString() || null,
        expires_at: r.expires_at?.toISOString() || null,
        expires_at_ts: r.expires_at ? new Date(r.expires_at).getTime() : null,
        created_at: r.created_at?.toISOString() || null,
        status: r.used_by ? 'used' : 'available',
        _source: 'postgres'
      }));
    }
  } catch (e) {
    console.error('[INVITES] Postgres list error:', e.message);
  }
  return null;
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

    // Count existing unused codes - try Postgres first
    let unusedCount = 0;
    let source = 'none';
    const pgInvites = await getUserInvitesFromPostgres(handle);

    if (pgInvites) {
      unusedCount = pgInvites.filter(i => i.status === 'available' && (!i.expires_at_ts || i.expires_at_ts > Date.now())).length;
      source = 'postgres';
    } else if (kv) {
      // Fall back to KV
      try {
        const userCodesKey = 'vibe:invites:by:' + handle;
        const existingCodes = await kv.smembers(userCodesKey) || [];

        for (const code of existingCodes) {
          const codeData = await kv.hget('vibe:invites', code);
          if (codeData) {
            const parsed = typeof codeData === 'string' ? JSON.parse(codeData) : codeData;
            if (parsed.status === 'available') {
              unusedCount++;
            }
          }
        }
        source = 'kv';
      } catch (kvErr) {
        console.error('[INVITES] KV count error:', kvErr.message);
        // Continue with source = 'none'
      }
    }

    // Check if they can generate more
    if (unusedCount >= maxCodes) {
      return res.status(400).json({
        success: false,
        error: 'No invite codes remaining',
        max_codes: maxCodes,
        unused: unusedCount,
        message: 'Use or share your existing codes first',
        _source: source
      });
    }

    // Generate new code
    const code = generateCode(handle);
    const expiresAt = Date.now() + CODE_EXPIRY_MS;

    // Try Postgres first
    const pgCreated = await createInviteInPostgres(code, handle, expiresAt);

    // Also write to KV (backup)
    if (kv) {
      try {
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
        await kv.hset('vibe:invites', { [code]: JSON.stringify(invite) });
        const userCodesKey = 'vibe:invites:by:' + handle;
        await kv.sadd(userCodesKey, code);
      } catch (kvErr) {
        console.error('[INVITES] KV write error:', kvErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      code,
      expires_at: new Date(expiresAt).toISOString(),
      remaining: maxCodes - unusedCount - 1,
      share_url: 'https://slashvibe.dev/invite/' + code,
      _source: pgCreated ? 'postgres' : 'kv'
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

    // Check if code exists and is valid - try Postgres first
    let invite = await getInviteFromPostgres(normalizedCode);
    let source = invite ? 'postgres' : 'none';

    if (!invite && kv) {
      try {
        const codeData = await kv.hget('vibe:invites', normalizedCode);
        if (codeData) {
          invite = typeof codeData === 'string' ? JSON.parse(codeData) : codeData;
          source = 'kv';
        }
      } catch (kvErr) {
        console.error('[INVITES] KV redeem lookup error:', kvErr.message);
      }
    }

    if (!invite) {
      return res.status(404).json({
        success: false,
        error: 'Invalid invite code'
      });
    }

    if (invite.status !== 'available') {
      return res.status(400).json({
        success: false,
        error: 'This code has already been used'
      });
    }

    if (invite.expires_at_ts && invite.expires_at_ts < Date.now()) {
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

    // Mark invite as used - try Postgres first
    await redeemInviteInPostgres(normalizedCode, normalizedHandle);

    // Also update KV (backup)
    if (kv) {
      try {
        invite.used_by = normalizedHandle;
        invite.used_at = new Date().toISOString();
        invite.status = 'used';
        await kv.hset('vibe:invites', { [normalizedCode]: JSON.stringify(invite) });
      } catch (kvErr) {
        console.error('[INVITES] KV redeem update error:', kvErr.message);
      }
    }

    // Grant the inviter a bonus code for successful invite
    const bonusCode = generateCode(invite.created_by);
    const bonusExpires = Date.now() + CODE_EXPIRY_MS;

    // Create bonus in Postgres
    await createInviteInPostgres(bonusCode, invite.created_by, bonusExpires);

    // Also create in KV (backup)
    if (kv) {
      try {
        const inviterCodesKey = 'vibe:invites:by:' + invite.created_by;
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

        await kv.hset('vibe:invites', { [bonusCode]: JSON.stringify(bonusInvite) });
        await kv.sadd(inviterCodesKey, bonusCode);
      } catch (kvErr) {
        console.error('[INVITES] KV bonus write error:', kvErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      handle: normalizedHandle,
      inviter: invite.created_by,
      genesis_number: claimResult.genesis_number,
      message: 'Welcome to /vibe! You were invited by @' + invite.created_by,
      _source: source
    });
  }

  // GET /api/invites?code=X — Check if code is valid
  if (req.method === 'GET' && req.query.code) {
    const code = req.query.code.toUpperCase().trim();

    // Try Postgres first
    let invite = await getInviteFromPostgres(code);
    let source = invite ? 'postgres' : 'none';

    if (!invite && kv) {
      try {
        const codeData = await kv.hget('vibe:invites', code);
        if (codeData) {
          invite = typeof codeData === 'string' ? JSON.parse(codeData) : codeData;
          source = 'kv';
        }
      } catch (kvErr) {
        console.error('[INVITES] KV check error:', kvErr.message);
      }
    }

    if (!invite) {
      return res.status(404).json({
        valid: false,
        error: 'Invalid invite code'
      });
    }

    if (invite.status !== 'available') {
      return res.status(200).json({
        valid: false,
        error: 'This code has already been used'
      });
    }

    if (invite.expires_at_ts && invite.expires_at_ts < Date.now()) {
      return res.status(200).json({
        valid: false,
        error: 'This code has expired'
      });
    }

    return res.status(200).json({
      valid: true,
      inviter: invite.created_by,
      expires_at: invite.expires_at,
      _source: source
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

    // Try Postgres first
    let codes = [];
    let unusedCount = 0;
    let source = 'none';

    const pgInvites = await getUserInvitesFromPostgres(handle);
    if (pgInvites && pgInvites.length > 0) {
      codes = pgInvites.map(inv => ({
        code: inv.code,
        status: inv.status,
        created_at: inv.created_at,
        expires_at: inv.expires_at,
        used_by: inv.used_by,
        used_at: inv.used_at,
        share_url: inv.status === 'available' ? 'https://slashvibe.dev/invite/' + inv.code : null
      }));
      unusedCount = pgInvites.filter(i => i.status === 'available' && (!i.expires_at_ts || i.expires_at_ts > Date.now())).length;
      source = 'postgres';
    } else if (kv) {
      // Fall back to KV
      try {
        const userCodesKey = 'vibe:invites:by:' + handle;
        const codelist = await kv.smembers(userCodesKey) || [];

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
        source = 'kv';
      } catch (kvErr) {
        console.error('[INVITES] KV my codes error:', kvErr.message);
        // Continue with empty codes
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
      can_generate: unusedCount < maxCodes,
      _source: source
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
