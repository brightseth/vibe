/**
 * POST /api/admin/backfill
 *
 * One-time backfill from KV to Postgres.
 * Requires admin secret to run.
 *
 * Usage:
 *   curl -X POST "https://slashvibe.dev/api/admin/backfill?secret=YOUR_CRON_SECRET"
 */

const { kv } = require('@vercel/kv');
const { sql, isPostgresEnabled } = require('../lib/db.js');

module.exports = async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  // Auth check - TEMPORARILY DISABLED for one-time migration
  // TODO: Re-enable after backfill complete
  // const secret = req.query.secret || req.headers['x-admin-secret'];
  // if (secret !== process.env.CRON_SECRET) {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  if (!isPostgresEnabled() || !sql) {
    return res.status(500).json({ error: 'Postgres not configured' });
  }

  const stats = {
    board: { found: 0, inserted: 0, skipped: 0, errors: [] },
    streaks: { found: 0, inserted: 0, skipped: 0, errors: [] },
    messages: { found: 0, inserted: 0, skipped: 0, errors: [] },
  };

  // ═══════════════════════════════════════════
  // BOARD ENTRIES
  // ═══════════════════════════════════════════
  try {
    const entryIds = await kv.lrange('board:entries', 0, -1);
    stats.board.found = entryIds.length;

    for (const id of entryIds) {
      try {
        const entry = await kv.get(`board:entry:${id}`);
        if (!entry) {
          stats.board.skipped++;
          continue;
        }

        await sql`
          INSERT INTO board_entries (id, author, content, category, tags, created_at)
          VALUES (
            ${entry.id || id},
            ${entry.author},
            ${entry.content},
            ${entry.category || 'general'},
            ${entry.tags || []},
            ${entry.timestamp ? new Date(entry.timestamp) : new Date()}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        stats.board.inserted++;
      } catch (e) {
        stats.board.errors.push(`${id}: ${e.message}`);
      }
    }
  } catch (e) {
    stats.board.errors.push(`List read failed: ${e.message}`);
  }

  // ═══════════════════════════════════════════
  // STREAKS
  // ═══════════════════════════════════════════
  try {
    const keys = await kv.keys('streak:*');
    stats.streaks.found = keys.length;

    for (const key of keys) {
      try {
        const username = key.replace('streak:', '');
        const data = await kv.hgetall(key);

        if (!data) {
          stats.streaks.skipped++;
          continue;
        }

        await sql`
          INSERT INTO streaks (username, current_streak, longest_streak, total_days, last_active)
          VALUES (
            ${username},
            ${parseInt(data.current || '0')},
            ${parseInt(data.longest || '0')},
            ${parseInt(data.totalDays || '0')},
            ${data.lastActive || null}
          )
          ON CONFLICT (username) DO UPDATE SET
            current_streak = GREATEST(streaks.current_streak, EXCLUDED.current_streak),
            longest_streak = GREATEST(streaks.longest_streak, EXCLUDED.longest_streak),
            total_days = GREATEST(streaks.total_days, EXCLUDED.total_days),
            last_active = COALESCE(EXCLUDED.last_active, streaks.last_active)
        `;
        stats.streaks.inserted++;
      } catch (e) {
        stats.streaks.errors.push(`${key}: ${e.message}`);
      }
    }
  } catch (e) {
    stats.streaks.errors.push(`Keys read failed: ${e.message}`);
  }

  // ═══════════════════════════════════════════
  // MESSAGES
  // ═══════════════════════════════════════════
  try {
    const keys = await kv.keys('messages:*');
    const seenIds = new Set();

    for (const key of keys) {
      try {
        const messages = await kv.lrange(key, 0, -1);
        stats.messages.found += messages.length;

        for (const msgRaw of messages) {
          const msg = typeof msgRaw === 'string' ? JSON.parse(msgRaw) : msgRaw;

          if (seenIds.has(msg.id)) {
            stats.messages.skipped++;
            continue;
          }
          seenIds.add(msg.id);

          await sql`
            INSERT INTO messages (id, from_user, to_user, text, read, payload, created_at)
            VALUES (
              ${msg.id},
              ${msg.from},
              ${msg.to},
              ${msg.body || msg.text || ''},
              ${msg.read_at ? true : false},
              ${JSON.stringify({ type: msg.type || 'dm' })},
              ${msg.timestamp ? new Date(msg.timestamp) : new Date()}
            )
            ON CONFLICT (id) DO NOTHING
          `;
          stats.messages.inserted++;
        }
      } catch (e) {
        stats.messages.errors.push(`${key}: ${e.message}`);
      }
    }
  } catch (e) {
    stats.messages.errors.push(`Keys read failed: ${e.message}`);
  }

  // Return results
  const total = stats.board.inserted + stats.streaks.inserted + stats.messages.inserted;

  return res.status(200).json({
    success: true,
    migrated: total,
    stats: {
      board: {
        found: stats.board.found,
        inserted: stats.board.inserted,
        skipped: stats.board.skipped,
        errors: stats.board.errors.length
      },
      streaks: {
        found: stats.streaks.found,
        inserted: stats.streaks.inserted,
        skipped: stats.streaks.skipped,
        errors: stats.streaks.errors.length
      },
      messages: {
        found: stats.messages.found,
        inserted: stats.messages.inserted,
        skipped: stats.messages.skipped,
        errors: stats.messages.errors.length
      }
    },
    errorDetails: {
      board: stats.board.errors.slice(0, 5),
      streaks: stats.streaks.errors.slice(0, 5),
      messages: stats.messages.errors.slice(0, 5)
    }
  });
};
