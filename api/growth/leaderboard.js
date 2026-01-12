/**
 * Growth Leaderboard
 *
 * GET /api/growth/leaderboard - See who's driving adoption
 *
 * Tracks:
 * - Invites sent & redeemed
 * - Ships posted
 * - Messages sent (engagement)
 * - Streaks (retention)
 */

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=60');

  try {
    // Get all handle records
    const handles = await kv.hgetall('vibe:handles');

    if (!handles) {
      return res.status(200).json({
        success: true,
        leaderboard: [],
        stats: { total: 0, genesisRemaining: 100 }
      });
    }

    const leaderboard = [];

    for (const [handle, record] of Object.entries(handles)) {
      const data = typeof record === 'string' ? JSON.parse(record) : record;

      // Count successful invites
      const inviteCodes = await kv.smembers(`vibe:invites:by:${handle}`) || [];
      let successfulInvites = 0;

      for (const code of inviteCodes) {
        const codeData = await kv.hget('vibe:invites', code);
        if (codeData) {
          const parsed = typeof codeData === 'string' ? JSON.parse(codeData) : codeData;
          if (parsed.status === 'used') {
            successfulInvites++;
          }
        }
      }

      // Get activity metrics
      const presence = await kv.get(`presence:${handle}`);
      const isActive = presence &&
        (Date.now() - new Date(presence.lastSeen).getTime()) < 24 * 60 * 60 * 1000;

      leaderboard.push({
        handle,
        genesis: data.genesis || false,
        genesisNumber: data.genesis_number || null,
        successfulInvites,
        messagesSent: data.messages_sent || 0,
        isActive,
        registeredAt: data.registeredAt,
        lastActive: presence?.lastSeen || data.last_active_at,
        // Growth score: invites weighted heavily
        growthScore: (successfulInvites * 100) + (data.messages_sent || 0) + (isActive ? 50 : 0)
      });
    }

    // Sort by growth score
    leaderboard.sort((a, b) => b.growthScore - a.growthScore);

    // Get stats
    const totalHandles = Object.keys(handles).length;

    return res.status(200).json({
      success: true,
      leaderboard: leaderboard.slice(0, 50), // Top 50
      stats: {
        total: totalHandles,
        genesisRemaining: Math.max(0, 100 - totalHandles),
        activeToday: leaderboard.filter(u => u.isActive).length,
        totalInvitesSent: leaderboard.reduce((sum, u) => sum + u.successfulInvites, 0)
      }
    });

  } catch (e) {
    console.error('Leaderboard error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
