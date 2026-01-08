/**
 * Streaks API - Track daily activity streaks
 *
 * GET /api/streaks - Get leaderboard
 * POST /api/streaks/checkin - Record daily checkin (called by presence heartbeat)
 *
 * Migration: Postgres primary, KV fallback
 */

import { sql, isPostgresEnabled } from './lib/db.js';

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

  // Cache GET (leaderboard) at CDN edge
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kv = await getKV();

  // GET - Return leaderboard
  if (req.method === 'GET') {
    try {
      const { handle, limit = '20' } = req.query;
      const limitNum = parseInt(limit);
      let source = 'none';

      // If specific handle requested
      if (handle) {
        // Try Postgres first
        if (isPostgresEnabled() && sql) {
          try {
            const result = await sql`
              SELECT username, current_streak, longest_streak, total_days, last_active
              FROM streaks WHERE username = ${handle}
            `;
            if (result && result.length > 0) {
              const s = result[0];
              const isActive = s.last_active && getDaysBetween(s.last_active, getDateKey()) <= 1;
              return res.status(200).json({
                handle,
                currentStreak: isActive ? s.current_streak : 0,
                longestStreak: s.longest_streak,
                lastActive: s.last_active,
                totalDays: s.total_days,
                _source: 'postgres'
              });
            }
          } catch (pgErr) {
            console.error('[streaks] Postgres error:', pgErr.message);
          }
        }

        // Fall back to KV
        if (kv) {
          const streakData = await kv.hgetall(`streak:${handle}`) || {};
          return res.status(200).json({
            handle,
            currentStreak: parseInt(streakData.current || '0'),
            longestStreak: parseInt(streakData.longest || '0'),
            lastActive: streakData.lastActive || null,
            totalDays: parseInt(streakData.totalDays || '0'),
            _source: 'kv'
          });
        }

        return res.status(200).json({
          handle,
          currentStreak: 0,
          longestStreak: 0,
          lastActive: null,
          totalDays: 0,
          _source: 'none'
        });
      }

      // Get leaderboard - try Postgres first
      let streaks = [];

      if (isPostgresEnabled() && sql) {
        try {
          const pgStreaks = await sql`
            SELECT username, current_streak, longest_streak, total_days, last_active
            FROM streaks
            WHERE username NOT LIKE '%-agent'
            ORDER BY current_streak DESC, longest_streak DESC
            LIMIT ${limitNum}
          `;

          if (pgStreaks && pgStreaks.length > 0) {
            streaks = pgStreaks.map(s => {
              const isActive = s.last_active && getDaysBetween(s.last_active, getDateKey()) <= 1;
              return {
                handle: s.username,
                currentStreak: isActive ? s.current_streak : 0,
                longestStreak: s.longest_streak,
                lastActive: s.last_active,
                badge: getStreakBadge(isActive ? s.current_streak : 0)
              };
            });
            source = 'postgres';
          }
        } catch (pgErr) {
          console.error('[streaks] Postgres leaderboard error:', pgErr.message);
        }
      }

      // Fall back to KV if Postgres returned nothing
      if (streaks.length === 0 && kv) {
        const keys = await kv.keys('streak:*');

        for (const key of keys.slice(0, 100)) {
          const h = key.replace('streak:', '');
          if (h.includes('-agent')) continue;

          const data = await kv.hgetall(key) || {};
          const current = parseInt(data.current || '0');
          const longest = parseInt(data.longest || '0');
          const lastActive = data.lastActive;
          const isActive = lastActive && getDaysBetween(lastActive, getDateKey()) <= 1;

          streaks.push({
            handle: h,
            currentStreak: isActive ? current : 0,
            longestStreak: longest,
            lastActive,
            badge: getStreakBadge(isActive ? current : 0)
          });
        }

        streaks.sort((a, b) => {
          if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
          return b.longestStreak - a.longestStreak;
        });

        streaks = streaks.slice(0, limitNum);
        source = 'kv';
      }

      // Sample data fallback
      if (streaks.length === 0) {
        return res.status(200).json({
          leaderboard: [
            { rank: 1, handle: 'seth', currentStreak: 7, longestStreak: 14, badge: 'Strong' },
            { rank: 2, handle: 'stan', currentStreak: 5, longestStreak: 10, badge: 'Growing' },
            { rank: 3, handle: 'solienne', currentStreak: 3, longestStreak: 30, badge: 'Growing' }
          ],
          total: 3,
          _source: 'sample'
        });
      }

      const leaderboard = streaks.map((s, i) => ({ rank: i + 1, ...s }));

      return res.status(200).json({
        leaderboard,
        total: streaks.length,
        _source: source,
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

      const today = getDateKey();
      let current = 0;
      let longest = 0;
      let totalDays = 0;
      let source = 'none';

      // Try Postgres first
      if (isPostgresEnabled() && sql) {
        try {
          // Get existing streak data
          const existing = await sql`
            SELECT current_streak, longest_streak, total_days, last_active
            FROM streaks WHERE username = ${handle}
          `;

          if (existing && existing.length > 0) {
            const s = existing[0];
            const lastActive = s.last_active;

            // Already checked in today?
            if (lastActive === today) {
              return res.status(200).json({
                success: true,
                message: 'Already checked in today',
                currentStreak: s.current_streak,
                longestStreak: s.longest_streak,
                _source: 'postgres'
              });
            }

            // Calculate new streak
            if (lastActive) {
              const daysSince = getDaysBetween(lastActive, today);
              current = daysSince === 1 ? s.current_streak + 1 : 1;
            } else {
              current = 1;
            }

            longest = Math.max(current, s.longest_streak);
            totalDays = s.total_days + 1;

            // Update
            await sql`
              UPDATE streaks
              SET current_streak = ${current},
                  longest_streak = ${longest},
                  total_days = ${totalDays},
                  last_active = ${today}
              WHERE username = ${handle}
            `;
          } else {
            // First checkin - insert
            current = 1;
            longest = 1;
            totalDays = 1;

            await sql`
              INSERT INTO streaks (username, current_streak, longest_streak, total_days, last_active)
              VALUES (${handle}, ${current}, ${longest}, ${totalDays}, ${today})
            `;
          }

          source = 'postgres';
        } catch (pgErr) {
          console.error('[streaks] Postgres checkin error:', pgErr.message);
        }
      }

      // Fall back to KV if Postgres failed
      if (source === 'none' && kv) {
        const key = `streak:${handle}`;
        const existing = await kv.hgetall(key) || {};
        const lastActive = existing.lastActive;

        // Already checked in today?
        if (lastActive === today) {
          return res.status(200).json({
            success: true,
            message: 'Already checked in today',
            currentStreak: parseInt(existing.current || '0'),
            longestStreak: parseInt(existing.longest || '0'),
            _source: 'kv'
          });
        }

        current = parseInt(existing.current || '0');
        longest = parseInt(existing.longest || '0');
        totalDays = parseInt(existing.totalDays || '0');

        if (lastActive) {
          const daysSince = getDaysBetween(lastActive, today);
          current = daysSince === 1 ? current + 1 : 1;
        } else {
          current = 1;
        }

        longest = Math.max(current, longest);
        totalDays += 1;

        await kv.hset(key, {
          current: current.toString(),
          longest: longest.toString(),
          lastActive: today,
          totalDays: totalDays.toString()
        });

        source = 'kv';
      }

      if (source === 'none') {
        return res.status(200).json({
          success: true,
          message: 'Storage not configured, streak not recorded',
          _source: 'none'
        });
      }

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
        badge: getStreakBadge(current),
        _source: source
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
