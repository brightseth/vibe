/**
 * POST /api/invites/redeem — Redeem an invite code
 */

import { claimHandle } from '../lib/handles.js';

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

// Code expiration (30 days)
const CODE_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

// Generate a readable invite code
function generateCode(handle) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return 'VIBE-' + random + '-' + handle.toUpperCase().slice(0, 4);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const kv = await getKV();
  if (!kv) {
    return res.status(503).json({
      success: false,
      error: 'Invites temporarily unavailable'
    });
  }

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
  await kv.hset('vibe:invites', { [normalizedCode]: JSON.stringify(invite) });

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

  await kv.hset('vibe:invites', { [bonusCode]: JSON.stringify(bonusInvite) });
  await kv.sadd(inviterCodesKey, bonusCode);

  return res.status(200).json({
    success: true,
    handle: normalizedHandle,
    inviter: invite.created_by,
    genesis_number: claimResult.genesis_number,
    message: 'Welcome to /vibe! You were invited by @' + invite.created_by
  });
}
