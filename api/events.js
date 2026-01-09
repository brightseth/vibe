/**
 * Events API — Funnel tracking for /vibe
 *
 * POST /api/events - Log a funnel event
 * GET /api/events - Get funnel stats
 *
 * Uses Postgres as primary (KV is rate-limited)
 */

const { sql, isPostgresEnabled } = require('./lib/db.js');

// In-memory fallback when both KV and Postgres unavailable
const memoryEvents = {};

function getToday() {
  return new Date().toISOString().split('T')[0];
}

const VALID_EVENTS = new Set([
  'mcp_installed',
  'session_started',
  'handle_claimed',
  'first_message_sent',
  'first_game_played',
  'invite_generated',
  'invite_redeemed',
  'session_ended',
  'error'
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { event, handle, metadata } = req.body;

    if (!event || !VALID_EVENTS.has(event)) {
      return res.status(400).json({
        success: false,
        error: `Invalid event. Valid: ${Array.from(VALID_EVENTS).join(', ')}`
      });
    }

    const today = getToday();

    // Try Postgres first (no rate limits)
    if (isPostgresEnabled() && sql) {
      try {
        await sql`
          INSERT INTO funnel_events (date_key, event_type, handle, metadata, created_at)
          VALUES (${today}, ${event}, ${handle || null}, ${JSON.stringify(metadata || {})}, NOW())
        `;
        return res.status(200).json({ success: true, event, logged: true, storage: 'postgres' });
      } catch (e) {
        // Table might not exist yet, create it
        if (e.message.includes('does not exist')) {
          try {
            await sql`
              CREATE TABLE IF NOT EXISTS funnel_events (
                id SERIAL PRIMARY KEY,
                date_key VARCHAR(10) NOT NULL,
                event_type VARCHAR(50) NOT NULL,
                handle VARCHAR(50),
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW()
              )
            `;
            await sql`CREATE INDEX IF NOT EXISTS idx_funnel_date ON funnel_events(date_key)`;
            await sql`CREATE INDEX IF NOT EXISTS idx_funnel_event ON funnel_events(event_type)`;
            // Retry insert
            await sql`
              INSERT INTO funnel_events (date_key, event_type, handle, metadata, created_at)
              VALUES (${today}, ${event}, ${handle || null}, ${JSON.stringify(metadata || {})}, NOW())
            `;
            return res.status(200).json({ success: true, event, logged: true, storage: 'postgres', tableCreated: true });
          } catch (createErr) {
            console.error('[events] Table creation failed:', createErr.message);
          }
        } else {
          console.error('[events] Postgres write failed:', e.message);
        }
      }
    }

    // Fallback to memory
    if (!memoryEvents[today]) memoryEvents[today] = {};
    memoryEvents[today][event] = (memoryEvents[today][event] || 0) + 1;

    return res.status(200).json({ success: true, event, logged: true, storage: 'memory' });
  }

  if (req.method === 'GET') {
    const today = getToday();

    // Try Postgres first
    if (isPostgresEnabled() && sql) {
      try {
        const rows = await sql`
          SELECT event_type, COUNT(*) as count
          FROM funnel_events
          WHERE date_key = ${today}
          GROUP BY event_type
        `;
        const todayStats = {};
        rows.forEach(r => { todayStats[r.event_type] = parseInt(r.count); });

        return res.status(200).json({
          success: true,
          today: todayStats,
          storage: 'postgres'
        });
      } catch (e) {
        console.error('[events] Postgres read failed:', e.message);
        // Fall through to memory
      }
    }

    // Memory fallback
    return res.status(200).json({
      success: true,
      today: memoryEvents[today] || {},
      storage: 'memory'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
