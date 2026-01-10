-- Migration: Add shared_pages table for /api/share-page
-- Created: 2026-01-09

CREATE TABLE IF NOT EXISTS shared_pages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  from_user VARCHAR(50) NOT NULL,
  to_user VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(20) DEFAULT 'html',
  unlisted BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_shared_pages_slug ON shared_pages(slug);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_shared_pages_from_user ON shared_pages(from_user);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_shared_pages_expires_at ON shared_pages(expires_at);

-- Comments
COMMENT ON TABLE shared_pages IS 'User-shared web pages accessible via /shared/:slug';
COMMENT ON COLUMN shared_pages.slug IS 'URL-safe unique identifier for the page';
COMMENT ON COLUMN shared_pages.from_user IS 'Username of the creator';
COMMENT ON COLUMN shared_pages.to_user IS 'Optional recipient username';
COMMENT ON COLUMN shared_pages.content_type IS 'html or markdown';
COMMENT ON COLUMN shared_pages.unlisted IS 'If true, page will not appear in public listings';
COMMENT ON COLUMN shared_pages.views IS 'View count (incremented on each access)';
