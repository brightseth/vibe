/**
 * GET /api/invites/my — List my invite codes
 */

import { getHandleRecord } from '../lib/handles.js';

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

const CODES_PER_TIER = {
  genesis: 3,
  waitlist: 2,
  invited: 1,
  default: 1
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const kv = await getKV();
  if (!kv) {
    return res.status(503).json({
      success: false,
      error: 'Invites temporarily unavailable'
    });
  }

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
