-- Migration: Add wallet columns for ambient crypto UX
-- Date: 2026-01-10
-- Description: Support lazy wallet creation (create on first transaction, not on init)

-- Add wallet columns to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS wallet_address TEXT,
ADD COLUMN IF NOT EXISTS wallet_created_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS github_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);

-- Make github_id unique (users authenticate via GitHub OAuth)
ALTER TABLE users
ADD CONSTRAINT users_github_id_unique UNIQUE (github_id);

-- Create wallet_events table for tracking wallet lifecycle
CREATE TABLE IF NOT EXISTS wallet_events (
  id SERIAL PRIMARY KEY,
  handle TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'created', 'deposit', 'withdrawal', 'payment_sent', 'payment_received'
  wallet_address TEXT,
  amount NUMERIC(20, 6), -- USDC amount (6 decimals)
  transaction_hash TEXT, -- Blockchain tx hash
  metadata JSONB, -- Additional context (reason, source, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for wallet events
CREATE INDEX IF NOT EXISTS idx_wallet_events_handle ON wallet_events(handle);
CREATE INDEX IF NOT EXISTS idx_wallet_events_type ON wallet_events(event_type);
CREATE INDEX IF NOT EXISTS idx_wallet_events_created_at ON wallet_events(created_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN users.wallet_address IS 'Smart wallet address on Base (null until first transaction)';
COMMENT ON COLUMN users.wallet_created_at IS 'When wallet was lazily created';
COMMENT ON COLUMN users.github_id IS 'GitHub user ID for OAuth authentication';
COMMENT ON TABLE wallet_events IS 'Wallet lifecycle events and transaction history';

-- Success message
SELECT 'Wallet columns added successfully! Run backfill script to populate github_id from existing users.' AS result;
