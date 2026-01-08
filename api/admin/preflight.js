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

  // Execute table creation using tagged template literals
  try {
    await sql`CREATE TABLE IF NOT EXISTS users (
      username VARCHAR(50) PRIMARY KEY,
      building TEXT,
      invited_by VARCHAR(50),
      invite_code VARCHAR(20),
      public_key TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;
    results.tables.users = 'created';
  } catch (e) {
    results.tables.users = `error: ${e.message}`;
    results.errors.push(`Table users: ${e.message}`);
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(50) PRIMARY KEY,
      from_user VARCHAR(50) NOT NULL,
      to_user VARCHAR(50) NOT NULL,
      text TEXT NOT NULL,
      read BOOLEAN DEFAULT FALSE,
      system_msg BOOLEAN DEFAULT FALSE,
      payload JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )`;
    results.tables.messages = 'created';
  } catch (e) {
    results.tables.messages = `error: ${e.message}`;
    results.errors.push(`Table messages: ${e.message}`);
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS board_entries (
      id VARCHAR(50) PRIMARY KEY,
      author VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(20) DEFAULT 'general',
      tags TEXT[],
      created_at TIMESTAMP DEFAULT NOW()
    )`;
    results.tables.board_entries = 'created';
  } catch (e) {
    results.tables.board_entries = `error: ${e.message}`;
    results.errors.push(`Table board_entries: ${e.message}`);
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS streaks (
      username VARCHAR(50) PRIMARY KEY,
      current_streak INT DEFAULT 0,
      longest_streak INT DEFAULT 0,
      total_days INT DEFAULT 0,
      last_active DATE
    )`;
    results.tables.streaks = 'created';
  } catch (e) {
    results.tables.streaks = `error: ${e.message}`;
    results.errors.push(`Table streaks: ${e.message}`);
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS invites (
      code VARCHAR(20) PRIMARY KEY,
      created_by VARCHAR(50) NOT NULL,
      used_by VARCHAR(50),
      used_at TIMESTAMP,
      expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )`;
    results.tables.invites = 'created';
  } catch (e) {
    results.tables.invites = `error: ${e.message}`;
    results.errors.push(`Table invites: ${e.message}`);
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS user_connections (
      from_user VARCHAR(50) NOT NULL,
      to_user VARCHAR(50) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (from_user, to_user)
    )`;
    results.tables.user_connections = 'created';
  } catch (e) {
    results.tables.user_connections = `error: ${e.message}`;
    results.errors.push(`Table user_connections: ${e.message}`);
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS agents (
      handle VARCHAR(50) PRIMARY KEY,
      display_name VARCHAR(100) NOT NULL,
      one_liner TEXT,
      operator VARCHAR(50) NOT NULL,
      model VARCHAR(50),
      api_key_hash VARCHAR(64),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`;
    results.tables.agents = 'created';
  } catch (e) {
    results.tables.agents = `error: ${e.message}`;
    results.errors.push(`Table agents: ${e.message}`);
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS memories (
      id VARCHAR(50) PRIMARY KEY,
      owner VARCHAR(50) NOT NULL,
      about VARCHAR(50) NOT NULL,
      observation TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )`;
    results.tables.memories = 'created';
  } catch (e) {
    results.tables.memories = `error: ${e.message}`;
    results.errors.push(`Table memories: ${e.message}`);
  }

  try {
    await sql`CREATE TABLE IF NOT EXISTS game_results (
      id VARCHAR(50) PRIMARY KEY,
      game_type VARCHAR(30) NOT NULL,
      players TEXT[] NOT NULL,
      winner VARCHAR(50),
      state JSONB,
      duration_seconds INT,
      created_at TIMESTAMP DEFAULT NOW()
    )`;
    results.tables.game_results = 'created';
  } catch (e) {
    results.tables.game_results = `error: ${e.message}`;
    results.errors.push(`Table game_results: ${e.message}`);
  }

  // Create indexes (these can fail silently if they exist)
  const indexes = [
    'idx_messages_inbox',
    'idx_messages_thread',
    'idx_board_recent',
    'idx_board_category',
    'idx_invites_creator',
    'idx_connections_to',
    'idx_agents_operator',
    'idx_memories_owner'
  ];

  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_inbox ON messages(to_user, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_board_recent ON board_entries(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_board_category ON board_entries(category, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_invites_creator ON invites(created_by)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_connections_to ON user_connections(to_user, status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_agents_operator ON agents(operator)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_owner ON memories(owner, about, created_at DESC)`;
    results.tables.indexes = 'created';
  } catch (e) {
    results.tables.indexes = `error: ${e.message}`;
  }

  // Seed sample data
  const today = new Date().toISOString().split('T')[0];

  try {
    await sql`INSERT INTO streaks (username, current_streak, longest_streak, total_days, last_active)
              VALUES ('seth', 7, 14, 30, ${today})
              ON CONFLICT (username) DO UPDATE SET last_active = ${today}`;
    results.seeds.streaks_seth = 'ok';
  } catch (e) {
    results.seeds.streaks_seth = `error: ${e.message}`;
    results.errors.push(`Seed streaks_seth: ${e.message}`);
  }

  try {
    await sql`INSERT INTO streaks (username, current_streak, longest_streak, total_days, last_active)
              VALUES ('stan', 5, 10, 20, ${today})
              ON CONFLICT (username) DO NOTHING`;
    results.seeds.streaks_stan = 'ok';
  } catch (e) {
    results.seeds.streaks_stan = `error: ${e.message}`;
    results.errors.push(`Seed streaks_stan: ${e.message}`);
  }

  try {
    await sql`INSERT INTO board_entries (id, author, content, category, created_at)
              VALUES ('welcome-001', 'seth', 'Welcome to /vibe! Share what you are building.', 'general', NOW())
              ON CONFLICT (id) DO NOTHING`;
    results.seeds.board_welcome = 'ok';
  } catch (e) {
    results.seeds.board_welcome = `error: ${e.message}`;
    results.errors.push(`Seed board_welcome: ${e.message}`);
  }

  try {
    await sql`INSERT INTO board_entries (id, author, content, category, created_at)
              VALUES ('shipped-001', 'seth', 'Shipped: Postgres migration for /vibe - faster and more reliable!', 'shipped', NOW())
              ON CONFLICT (id) DO NOTHING`;
    results.seeds.board_shipped = 'ok';
  } catch (e) {
    results.seeds.board_shipped = `error: ${e.message}`;
    results.errors.push(`Seed board_shipped: ${e.message}`);
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
