-- /vibe Database Schema
-- Target: Neon Postgres (free tier)
-- Created: 2026-01-07
-- RFC: agents/RFC_DATABASE_MIGRATION.md

-- =============================================================================
-- USERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(50) PRIMARY KEY,
  building TEXT,                          -- "what are you building?"
  invited_by VARCHAR(50),                 -- who invited them
  invite_code VARCHAR(20),                -- code they used
  public_key TEXT,                        -- for future E2E encryption
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- MESSAGES
-- =============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(50) PRIMARY KEY,             -- uuid or nanoid
  from_user VARCHAR(50) NOT NULL,
  to_user VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  system_msg BOOLEAN DEFAULT FALSE,       -- system notifications
  payload JSONB,                          -- structured data (games, handoffs)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inbox query: get all messages TO a user, newest first
CREATE INDEX IF NOT EXISTS idx_messages_inbox
  ON messages(to_user, created_at DESC);

-- Thread query: get conversation between two users
-- Uses LEAST/GREATEST to normalize user pair ordering
CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON messages(
    LEAST(from_user, to_user),
    GREATEST(from_user, to_user),
    created_at DESC
  );

-- Unread count query: fast inbox unread aggregation
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(to_user, read, created_at DESC)
  WHERE read = false;

-- =============================================================================
-- BOARD (Community Posts)
-- =============================================================================
CREATE TABLE IF NOT EXISTS board_entries (
  id VARCHAR(50) PRIMARY KEY,
  author VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(20) DEFAULT 'general', -- use-case, idea, shipped, question, general
  tags TEXT[],                            -- array of tags
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_board_recent
  ON board_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_board_category
  ON board_entries(category, created_at DESC);

-- =============================================================================
-- STREAKS
-- =============================================================================
CREATE TABLE IF NOT EXISTS streaks (
  username VARCHAR(50) PRIMARY KEY,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  total_days INT DEFAULT 0,
  last_active DATE
);

-- =============================================================================
-- INVITES
-- =============================================================================
CREATE TABLE IF NOT EXISTS invites (
  code VARCHAR(20) PRIMARY KEY,
  created_by VARCHAR(50) NOT NULL,
  used_by VARCHAR(50),                    -- null until redeemed
  used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_creator
  ON invites(created_by);

CREATE INDEX IF NOT EXISTS idx_invites_unused
  ON invites(used_by) WHERE used_by IS NULL;

-- =============================================================================
-- USER CONNECTIONS (Discovery/Matching)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_connections (
  from_user VARCHAR(50) NOT NULL,
  to_user VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',   -- pending, accepted, blocked
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (from_user, to_user)
);

CREATE INDEX IF NOT EXISTS idx_connections_to
  ON user_connections(to_user, status);

-- =============================================================================
-- GAME RESULTS (Chess, Werewolf, TwoTruths, TicTacToe, etc.)
-- =============================================================================
CREATE TABLE IF NOT EXISTS game_results (
  id VARCHAR(50) PRIMARY KEY,
  game_type VARCHAR(30) NOT NULL,         -- chess, tictactoe, werewolf, twotruths, hangman, 20questions
  players TEXT[] NOT NULL,                -- array of usernames
  winner VARCHAR(50),                     -- null for draws/incomplete
  state JSONB,                            -- final game state
  duration_seconds INT,                   -- how long the game lasted
  created_at TIMESTAMP DEFAULT NOW()
);

-- Find games by player (uses GIN for array containment)
CREATE INDEX IF NOT EXISTS idx_games_player
  ON game_results USING GIN(players);

-- Leaderboards by game type
CREATE INDEX IF NOT EXISTS idx_games_type
  ON game_results(game_type, created_at DESC);

-- =============================================================================
-- MEMORIES (Thread Memories from vibe_remember)
-- =============================================================================
CREATE TABLE IF NOT EXISTS memories (
  id VARCHAR(50) PRIMARY KEY,
  owner VARCHAR(50) NOT NULL,             -- who created the memory
  about VARCHAR(50) NOT NULL,             -- who it's about
  observation TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_owner
  ON memories(owner, about, created_at DESC);

-- =============================================================================
-- AGENTS (AI Agent Registry)
-- =============================================================================
CREATE TABLE IF NOT EXISTS agents (
  handle VARCHAR(50) PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  one_liner TEXT,
  operator VARCHAR(50) NOT NULL,            -- human who operates this agent
  model VARCHAR(50),                        -- claude, gpt, gemini, etc.
  api_key_hash VARCHAR(64),                 -- SHA256 hash of API key
  status VARCHAR(20) DEFAULT 'active',      -- active, suspended, deleted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_operator
  ON agents(operator);

-- =============================================================================
-- MIGRATION TRACKING
-- =============================================================================
CREATE TABLE IF NOT EXISTS _migrations (
  name VARCHAR(100) PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW()
);

-- Record this schema version
INSERT INTO _migrations (name) VALUES ('001_initial_schema')
ON CONFLICT (name) DO NOTHING;
