/**
 * Migration: Create presence table in Postgres
 *
 * Run once: curl -X POST https://www.slashvibe.dev/api/migrate-presence
 *
 * This creates the presence table for storing user presence data.
 */

const { sql, isPostgresEnabled } = require('./lib/db.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST required' });
  }

  if (!isPostgresEnabled()) {
    return res.status(503).json({ error: 'Postgres not configured' });
  }

  try {
    // Create presence table
    await sql`
      CREATE TABLE IF NOT EXISTS presence (
        username VARCHAR(64) PRIMARY KEY,
        working_on TEXT,
        project VARCHAR(255),
        location VARCHAR(255),
        context JSONB,
        mood VARCHAR(32),
        mood_inferred BOOLEAN DEFAULT false,
        mood_reason TEXT,
        first_seen TIMESTAMP WITH TIME ZONE,
        last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        dna JSONB,
        builder_mode VARCHAR(32),
        x_handle VARCHAR(64),
        status VARCHAR(32) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Create index for fast "who's online" queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_presence_last_seen
      ON presence (last_seen DESC)
    `;

    // Create index for status filtering
    await sql`
      CREATE INDEX IF NOT EXISTS idx_presence_status
      ON presence (status, last_seen DESC)
    `;

    // Create handles table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS handles (
        handle VARCHAR(64) PRIMARY KEY,
        registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        first_active_at TIMESTAMP WITH TIME ZONE,
        last_active_at TIMESTAMP WITH TIME ZONE,
        messages_sent INTEGER DEFAULT 0,
        genesis BOOLEAN DEFAULT false,
        genesis_number INTEGER,
        verified VARCHAR(32) DEFAULT 'none',
        x_handle VARCHAR(64),
        github_handle VARCHAR(64),
        is_agent BOOLEAN DEFAULT false,
        operator VARCHAR(64),
        agent_type VARCHAR(32),
        capabilities TEXT[],
        model VARCHAR(64),
        status VARCHAR(32) DEFAULT 'active',
        metadata JSONB
      )
    `;

    // Create index for genesis users
    await sql`
      CREATE INDEX IF NOT EXISTS idx_handles_genesis
      ON handles (genesis, genesis_number)
    `;

    return res.status(200).json({
      success: true,
      message: 'Presence and handles tables created',
      tables: ['presence', 'handles']
    });

  } catch (e) {
    console.error('[migrate-presence] Error:', e.message);
    return res.status(500).json({
      success: false,
      error: e.message
    });
  }
};
