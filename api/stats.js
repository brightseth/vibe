/**
 * Stats API - Live network statistics for homepage
 *
 * GET /api/stats - Get current network stats
 */

import { getHandleStats } from './lib/handles.js';

// Check if KV is configured
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=30'); // Cache for 30 seconds

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const kv = await getKV();

    let totalRegistered = 0;  // Total handles claimed (the real number)
    let activeNow = 0;        // Online in last 5 min
    let messages = 0;

    if (kv) {
      // Count TOTAL registered handles (the namespace)
      try {
        totalRegistered = await kv.hlen('vibe:handles') || 0;
      } catch (e) {
        console.error('[stats] Failed to count handles:', e.message);
      }

      // Count active users (last 5 minutes)
      try {
        const fiveMinAgo = Date.now() - 5 * 60 * 1000;
        const activeHandles = await kv.zrangebyscore('presence:index', fiveMinAgo, '+inf');
        activeNow = activeHandles?.length || 0;
      } catch (e) {
        // Keep 0
      }

      // Count messages (inbox entries)
      try {
        const inboxKeys = await kv.keys('inbox:*');
        let totalMsgs = 0;
        for (const key of (inboxKeys || []).slice(0, 50)) {
          const len = await kv.llen(key);
          totalMsgs += len || 0;
        }
        messages = totalMsgs;
      } catch (e) {
        // Keep 0
      }
    }

    // Get genesis/handle stats
    let genesis = null;
    if (kv) {
      try {
        genesis = await getHandleStats(kv);
      } catch (e) {
        console.error('[stats] Failed to get genesis stats:', e.message);
      }
    }

    return res.status(200).json({
      success: true,
      total_registered: totalRegistered,  // THE REAL NUMBER
      active_now: activeNow,
      messages,
      genesis,
      users: totalRegistered,  // Legacy field
      storage: KV_CONFIGURED ? 'kv' : 'memory',
      cachedAt: new Date().toISOString()
    });
  } catch (e) {
    // Return fallback stats on error
    return res.status(200).json({
      success: true,
      users: 12,
      messages: 47,
      storage: 'fallback',
      error: e.message
    });
  }
}
