/**
 * Pre-flight Setup - Prepare /vibe for smooth operation
 *
 * POST /api/admin/preflight
 *
 * 1. Creates all Postgres tables
 * 2. Seeds sample data
 * 3. Verifies connectivity
 *
 * Requires CRON_SECRET for auth
 */

const { sql, isPostgresEnabled, healthCheck } = require('../lib/db.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = {
    timestamp: new Date().toISOString(),
    postgres: { ok: false },
    tables: {},
    seeds: {},
    errors: []
  };

  // Check Postgres connectivity
  if (!isPostgresEnabled() || !sql) {
    results.errors.push('Postgres not configured');
    return res.status(200).json(results);
  }

  try {
    const health = await healthCheck();
    results.postgres = health;
  } catch (e) {
    results.postgres = { ok: false, error: e.message };
    results.errors.push(`Postgres health check failed: ${e.message}`);
  }

  if (!results.postgres.ok) {
    return res.status(200).json(results);
  }

  // Create tables
  const tableQueries = [
    {
      name: 'users',
      sql: `CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(50) PRIMARY KEY,
        building TEXT,
        invited_by VARCHAR(50),
        invite_code VARCHAR(20),
        public_key TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`
    },
    {
      name: 'messages',
      sql: `CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(50) PRIMARY KEY,
        from_user VARCHAR(50) NOT NULL,
        to_user VARCHAR(50) NOT NULL,
        text TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        system_msg BOOLEAN DEFAULT FALSE,
        payload JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    },
    {
      name: 'board_entries',
      sql: `CREATE TABLE IF NOT EXISTS board_entries (
        id VARCHAR(50) PRIMARY KEY,
        author VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        category VARCHAR(20) DEFAULT 'general',
        tags TEXT[],
        created_at TIMESTAMP DEFAULT NOW()
      )`
    },
    {
      name: 'streaks',
      sql: `CREATE TABLE IF NOT EXISTS streaks (
        username VARCHAR(50) PRIMARY KEY,
        current_streak INT DEFAULT 0,
        longest_streak INT DEFAULT 0,
        total_days INT DEFAULT 0,
        last_active DATE
      )`
    },
    {
      name: 'invites',
      sql: `CREATE TABLE IF NOT EXISTS invites (
        code VARCHAR(20) PRIMARY KEY,
        created_by VARCHAR(50) NOT NULL,
        used_by VARCHAR(50),
        used_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    },
    {
      name: 'user_connections',
      sql: `CREATE TABLE IF NOT EXISTS user_connections (
        from_user VARCHAR(50) NOT NULL,
        to_user VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (from_user, to_user)
      )`
    },
    {
      name: 'agents',
      sql: `CREATE TABLE IF NOT EXISTS agents (
        handle VARCHAR(50) PRIMARY KEY,
        display_name VARCHAR(100) NOT NULL,
        one_liner TEXT,
        operator VARCHAR(50) NOT NULL,
        model VARCHAR(50),
        api_key_hash VARCHAR(64),
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`
    },
    {
      name: 'memories',
      sql: `CREATE TABLE IF NOT EXISTS memories (
        id VARCHAR(50) PRIMARY KEY,
        owner VARCHAR(50) NOT NULL,
        about VARCHAR(50) NOT NULL,
        observation TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    },
    {
      name: 'game_results',
      sql: `CREATE TABLE IF NOT EXISTS game_results (
        id VARCHAR(50) PRIMARY KEY,
        game_type VARCHAR(30) NOT NULL,
        players TEXT[] NOT NULL,
        winner VARCHAR(50),
        state JSONB,
        duration_seconds INT,
        created_at TIMESTAMP DEFAULT NOW()
      )`
    }
  ];

  // Create indexes
  const indexQueries = [
    { name: 'idx_messages_inbox', sql: 'CREATE INDEX IF NOT EXISTS idx_messages_inbox ON messages(to_user, created_at DESC)' },
    { name: 'idx_messages_thread', sql: 'CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(LEAST(from_user, to_user), GREATEST(from_user, to_user), created_at DESC)' },
    { name: 'idx_messages_unread', sql: 'CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(to_user, read, created_at DESC) WHERE read = false' },
    { name: 'idx_board_recent', sql: 'CREATE INDEX IF NOT EXISTS idx_board_recent ON board_entries(created_at DESC)' },
    { name: 'idx_board_category', sql: 'CREATE INDEX IF NOT EXISTS idx_board_category ON board_entries(category, created_at DESC)' },
    { name: 'idx_invites_creator', sql: 'CREATE INDEX IF NOT EXISTS idx_invites_creator ON invites(created_by)' },
    { name: 'idx_connections_to', sql: 'CREATE INDEX IF NOT EXISTS idx_connections_to ON user_connections(to_user, status)' },
    { name: 'idx_agents_operator', sql: 'CREATE INDEX IF NOT EXISTS idx_agents_operator ON agents(operator)' },
    { name: 'idx_memories_owner', sql: 'CREATE INDEX IF NOT EXISTS idx_memories_owner ON memories(owner, about, created_at DESC)' }
  ];

  // Execute table creation
  for (const table of tableQueries) {
    try {
      await sql.unsafe(table.sql);
      results.tables[table.name] = 'created';
    } catch (e) {
      results.tables[table.name] = `error: ${e.message}`;
      results.errors.push(`Table ${table.name}: ${e.message}`);
    }
  }

  // Execute index creation
  for (const index of indexQueries) {
    try {
      await sql.unsafe(index.sql);
      results.tables[index.name] = 'created';
    } catch (e) {
      results.tables[index.name] = `error: ${e.message}`;
    }
  }

  // Seed sample data
  const now = new Date();
  const seeds = [
    {
      name: 'streaks_seth',
      sql: `INSERT INTO streaks (username, current_streak, longest_streak, total_days, last_active)
            VALUES ('seth', 7, 14, 30, $1)
            ON CONFLICT (username) DO UPDATE SET last_active = $1`,
      params: [now.toISOString().split('T')[0]]
    },
    {
      name: 'streaks_stan',
      sql: `INSERT INTO streaks (username, current_streak, longest_streak, total_days, last_active)
            VALUES ('stan', 5, 10, 20, $1)
            ON CONFLICT (username) DO NOTHING`,
      params: [now.toISOString().split('T')[0]]
    },
    {
      name: 'board_welcome',
      sql: `INSERT INTO board_entries (id, author, content, category, created_at)
            VALUES ('welcome-001', 'seth', 'Welcome to /vibe! Share what you are building.', 'general', NOW())
            ON CONFLICT (id) DO NOTHING`,
      params: []
    },
    {
      name: 'board_shipped',
      sql: `INSERT INTO board_entries (id, author, content, category, created_at)
            VALUES ('shipped-001', 'seth', 'Shipped: Postgres migration for /vibe - now faster and more reliable!', 'shipped', NOW())
            ON CONFLICT (id) DO NOTHING`,
      params: []
    }
  ];

  for (const seed of seeds) {
    try {
      if (seed.params.length > 0) {
        await sql.unsafe(seed.sql, seed.params);
      } else {
        await sql.unsafe(seed.sql);
      }
      results.seeds[seed.name] = 'ok';
    } catch (e) {
      results.seeds[seed.name] = `error: ${e.message}`;
      results.errors.push(`Seed ${seed.name}: ${e.message}`);
    }
  }

  // Final status
  results.success = results.errors.length === 0;
  results.summary = {
    tables_created: Object.values(results.tables).filter(v => v === 'created').length,
    seeds_applied: Object.values(results.seeds).filter(v => v === 'ok').length,
    errors: results.errors.length
  };

  return res.status(200).json(results);
};
