/**
 * Streaks API - Track daily activity streaks
 *
 * GET /api/streaks - Get leaderboard
 * POST /api/streaks/checkin - Record daily checkin (called by presence heartbeat)
 */

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

function getDateKey(date = new Date()) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function getDaysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kv = await getKV();

  // GET - Return leaderboard
  if (req.method === 'GET') {
    try {
      const { handle, limit = '20' } = req.query;

      // If specific handle requested
      if (handle) {
        if (!kv) {
          return res.status(200).json({
            handle,
            currentStreak: 0,
            longestStreak: 0,
            lastActive: null,
            totalDays: 0
          });
        }

        const streakData = await kv.hgetall(`streak:${handle}`) || {};
        return res.status(200).json({
          handle,
          currentStreak: parseInt(streakData.current || '0'),
          longestStreak: parseInt(streakData.longest || '0'),
          lastActive: streakData.lastActive || null,
          totalDays: parseInt(streakData.totalDays || '0')
        });
      }

      // Get leaderboard
      if (!kv) {
        // Return sample data for development
        return res.status(200).json({
          leaderboard: [
            { rank: 1, handle: 'seth', currentStreak: 7, longestStreak: 14, badge: 'Strong' },
            { rank: 2, handle: 'stan', currentStreak: 5, longestStreak: 10, badge: 'Growing' },
            { rank: 3, handle: 'solienne', currentStreak: 3, longestStreak: 30, badge: 'Growing' }
          ],
          total: 3,
          storage: 'sample'
        });
      }

      // Get all streak data
      const keys = await kv.keys('streak:*');
      const streaks = [];

      for (const key of keys.slice(0, 100)) {
        const handle = key.replace('streak:', '');
        if (handle.includes('-agent')) continue; // Skip agents

        const data = await kv.hgetall(key) || {};
        const current = parseInt(data.current || '0');
        const longest = parseInt(data.longest || '0');
        const lastActive = data.lastActive;

        // Check if streak is still active (within 48 hours to be generous)
        const isActive = lastActive && getDaysBetween(lastActive, getDateKey()) <= 1;

        streaks.push({
          handle,
          currentStreak: isActive ? current : 0,
          longestStreak: longest,
          lastActive,
          badge: getStreakBadge(isActive ? current : 0)
        });
      }

      // Sort by current streak, then longest
      streaks.sort((a, b) => {
        if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
        return b.longestStreak - a.longestStreak;
      });

      const limitNum = parseInt(limit);
      const leaderboard = streaks.slice(0, limitNum).map((s, i) => ({
        rank: i + 1,
        ...s
      }));

      return res.status(200).json({
        leaderboard,
        total: streaks.length,
        storage: 'kv',
        generatedAt: new Date().toISOString()
      });

    } catch (e) {
      console.error('[streaks] Error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  // POST - Record checkin
  if (req.method === 'POST') {
    try {
      const { handle } = req.body;
      if (!handle) {
        return res.status(400).json({ error: 'Handle required' });
      }

      if (!kv) {
        return res.status(200).json({
          success: true,
          message: 'KV not configured, streak not recorded',
          storage: 'none'
        });
      }

      const today = getDateKey();
      const key = `streak:${handle}`;

      // Get current streak data
      const existing = await kv.hgetall(key) || {};
      const lastActive = existing.lastActive;
      let current = parseInt(existing.current || '0');
      let longest = parseInt(existing.longest || '0');
      let totalDays = parseInt(existing.totalDays || '0');

      // Calculate new streak
      if (lastActive === today) {
        // Already checked in today
        return res.status(200).json({
          success: true,
          message: 'Already checked in today',
          currentStreak: current,
          longestStreak: longest
        });
      }

      if (lastActive) {
        const daysSince = getDaysBetween(lastActive, today);
        if (daysSince === 1) {
          // Continue streak
          current += 1;
        } else {
          // Streak broken
          current = 1;
        }
      } else {
        // First checkin
        current = 1;
      }

      // Update longest
      if (current > longest) {
        longest = current;
      }

      totalDays += 1;

      // Save
      await kv.hset(key, {
        current: current.toString(),
        longest: longest.toString(),
        lastActive: today,
        totalDays: totalDays.toString()
      });

      // Milestone notifications
      let milestone = null;
      if ([3, 7, 14, 30, 50, 100].includes(current)) {
        milestone = current;
      }

      return res.status(200).json({
        success: true,
        currentStreak: current,
        longestStreak: longest,
        totalDays,
        milestone,
        badge: getStreakBadge(current)
      });

    } catch (e) {
      console.error('[streaks] Checkin error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function getStreakBadge(days) {
  if (days >= 100) return 'Legend';
  if (days >= 50) return 'Master';
  if (days >= 30) return 'Champion';
  if (days >= 14) return 'Committed';
  if (days >= 7) return 'Strong';
  if (days >= 3) return 'Growing';
  if (days >= 1) return 'Started';
  return 'Inactive';
}
