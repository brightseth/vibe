/**
 * Admin Stats API - Detailed network metrics
 *
 * GET /api/admin/stats - Get comprehensive stats
 *
 * Returns:
 * - handles: total, genesis, invited, today, this_week
 * - waitlist: count, today
 * - activity: dau, wau, messages_today, messages_week
 * - invites: generated, redeemed, available
 * - health: uptime indicators
 */

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

// Time boundaries
const NOW = () => Date.now();
const ONE_DAY = 24 * 60 * 60 * 1000;
const ONE_WEEK = 7 * ONE_DAY;
const FIVE_MIN = 5 * 60 * 1000;

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

  // Auth check - prefer Authorization header, query param for convenience
  // TODO: Move to proper auth tokens before scaling
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return res.status(503).json({ error: 'Admin endpoint not configured' });
  }

  const authHeader = req.headers.authorization;
  const querySecret = req.query.secret;

  if (authHeader === `Bearer ${adminSecret}` || querySecret === adminSecret) {
    // Authorized
  } else {
    return res.status(401).json({
      error: 'Unauthorized',
      hint: 'Use Authorization: Bearer <secret> header'
    });
  }

  const kv = await getKV();
  if (!kv) {
    return res.status(503).json({
      success: false,
      error: 'Stats temporarily unavailable'
    });
  }

  try {
    const now = NOW();
    const dayAgo = now - ONE_DAY;
    const weekAgo = now - ONE_WEEK;

    // ===== HANDLES =====
    const allHandles = await kv.hgetall('vibe:handles') || {};
    const handleRecords = Object.values(allHandles).map(h => {
      try {
        return typeof h === 'string' ? JSON.parse(h) : h;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    const handles = {
      total: handleRecords.length,
      genesis: handleRecords.filter(h => h.genesis).length,
      invited: handleRecords.filter(h => h.invited_by).length,
      today: handleRecords.filter(h => h.registeredAtTs > dayAgo).length,
      this_week: handleRecords.filter(h => h.registeredAtTs > weekAgo).length
    };

    // ===== WAITLIST =====
    const allWaitlist = await kv.hgetall('vibe:waitlist') || {};
    const waitlistRecords = Object.values(allWaitlist).map(w => {
      try {
        return typeof w === 'string' ? JSON.parse(w) : w;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    const waitlist = {
      total: waitlistRecords.length,
      today: waitlistRecords.filter(w => new Date(w.joinedAt).getTime() > dayAgo).length,
      invited: waitlistRecords.filter(w => w.invited).length
    };

    // ===== ACTIVITY =====
    // DAU: users active in last 24h
    const activeToday = handleRecords.filter(h =>
      h.last_active_at && new Date(h.last_active_at).getTime() > dayAgo
    ).length;

    // WAU: users active in last 7 days
    const activeWeek = handleRecords.filter(h =>
      h.last_active_at && new Date(h.last_active_at).getTime() > weekAgo
    ).length;

    // Currently online (last 5 min)
    let online = 0;
    try {
      const activeHandles = await kv.zrangebyscore('presence:active', now - FIVE_MIN, '+inf');
      online = activeHandles?.length || 0;
    } catch (e) {}

    // Messages (rough estimate from threads)
    let messagesTotal = 0;
    try {
      const threadKeys = await kv.keys('thread:*');
      messagesTotal = (threadKeys?.length || 0) * 3; // Estimate 3 msgs per thread
    } catch (e) {}

    const activity = {
      online,
      dau: activeToday,
      wau: activeWeek,
      messages_estimate: messagesTotal
    };

    // ===== INVITES =====
    const allInvites = await kv.hgetall('vibe:invites') || {};
    const inviteRecords = Object.values(allInvites).map(i => {
      try {
        return typeof i === 'string' ? JSON.parse(i) : i;
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    const invites = {
      total: inviteRecords.length,
      available: inviteRecords.filter(i => i.status === 'available').length,
      used: inviteRecords.filter(i => i.status === 'used').length,
      expired: inviteRecords.filter(i => i.status === 'available' && i.expires_at_ts < now).length
    };

    // ===== HEALTH =====
    const GENESIS_CAP = 100;
    const health = {
      kv: 'ok',
      genesis_open: handles.total < GENESIS_CAP,
      genesis_remaining: Math.max(0, GENESIS_CAP - handles.total),
      genesis_definition: 'First 100 users. Genesis status is permanent, grants 3 invite codes, and exempts from future inactivity policies.'
    };

    // ===== TOP INVITERS =====
    const inviterCounts = {};
    inviteRecords.filter(i => i.status === 'used').forEach(i => {
      inviterCounts[i.created_by] = (inviterCounts[i.created_by] || 0) + 1;
    });
    const topInviters = Object.entries(inviterCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([handle, count]) => ({ handle, invited: count }));

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      handles,
      waitlist,
      activity,
      invites,
      health,
      topInviters
    });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
}
