/**
 * Streak Tracking
 *
 * POST /api/growth/streak - Record activity for streak
 * GET /api/growth/streak?user=X - Get user's streak
 *
 * Streaks drive retention through daily habit formation.
 * 7-day streak = Verified Builder badge
 */

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - Record activity
  if (req.method === 'POST') {
    const { user, activity = 'ship' } = req.body;

    if (!user) {
      return res.status(400).json({ error: 'User required' });
    }

    const handle = user.toLowerCase().replace('@', '');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      // Get current streak data
      const streakKey = `streak:${handle}`;
      let streak = await kv.get(streakKey) || {
        current: 0,
        longest: 0,
        lastActive: null,
        activeDays: [],
        badges: []
      };

      // Check if already active today
      if (streak.lastActive === today) {
        return res.status(200).json({
          success: true,
          message: 'Already recorded today',
          streak
        });
      }

      // Calculate new streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (streak.lastActive === yesterdayStr) {
        // Continuing streak
        streak.current += 1;
      } else if (streak.lastActive !== today) {
        // Streak broken, start over
        streak.current = 1;
      }

      // Update longest
      if (streak.current > streak.longest) {
        streak.longest = streak.current;
      }

      // Track active days (last 30)
      streak.activeDays = streak.activeDays || [];
      streak.activeDays.push(today);
      if (streak.activeDays.length > 30) {
        streak.activeDays = streak.activeDays.slice(-30);
      }

      streak.lastActive = today;

      // Award badges
      streak.badges = streak.badges || [];
      if (streak.current >= 7 && !streak.badges.includes('verified_builder')) {
        streak.badges.push('verified_builder');
      }
      if (streak.current >= 30 && !streak.badges.includes('dedicated_builder')) {
        streak.badges.push('dedicated_builder');
      }

      // Save
      await kv.set(streakKey, streak);

      return res.status(200).json({
        success: true,
        streak,
        newBadge: streak.current === 7 ? 'verified_builder' :
                  streak.current === 30 ? 'dedicated_builder' : null,
        message: streak.current >= 7
          ? `🔥 ${streak.current}-day streak! Verified Builder status!`
          : `🔥 ${streak.current}-day streak!`
      });

    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // GET - Get streak
  if (req.method === 'GET') {
    const { user } = req.query;

    if (!user) {
      return res.status(400).json({ error: 'User required' });
    }

    const handle = user.toLowerCase().replace('@', '');

    try {
      const streak = await kv.get(`streak:${handle}`) || {
        current: 0,
        longest: 0,
        lastActive: null,
        activeDays: [],
        badges: []
      };

      // Check if streak is still valid
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const isActive = streak.lastActive === today || streak.lastActive === yesterdayStr;

      return res.status(200).json({
        success: true,
        streak: {
          ...streak,
          current: isActive ? streak.current : 0,
          isActive
        },
        daysUntilBadge: Math.max(0, 7 - (isActive ? streak.current : 0))
      });

    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
