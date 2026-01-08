/**
 * Board API - Shared whiteboard for /vibe community
 *
 * POST /api/board - Add an entry
 * GET /api/board - Get recent entries
 * DELETE /api/board - Remove an entry (author only)
 *
 * Migration: Postgres primary, KV fallback
 */

import crypto from 'crypto';
import { sql, isPostgresEnabled } from './lib/db.js';

// Check if KV is configured
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Redis keys
const BOARD_LIST = 'board:entries';  // List of entry IDs (newest first)
const BOARD_MAX_ENTRIES = 100;       // Keep last 100 entries

// In-memory fallback
let memoryBoard = [];

// KV wrapper with better error handling
async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    console.error('[board] KV load error:', e.message);
    return null;
  }
}

// Generate entry ID
function generateEntryId() {
  return `entry_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// ============ BOARD STORAGE ============

async function addEntry(entry) {
  const id = generateEntryId();
  const fullEntry = {
    id,
    ...entry,
    timestamp: Date.now()
  };

  // Try Postgres first
  if (isPostgresEnabled() && sql) {
    try {
      await sql`
        INSERT INTO board_entries (id, author, content, category, tags, created_at)
        VALUES (${id}, ${entry.author}, ${entry.content}, ${entry.category || 'general'}, ${entry.tags || []}, NOW())
      `;
      return { ...fullEntry, _storage: 'postgres' };
    } catch (pgErr) {
      console.error('[board] Postgres write error:', pgErr.message);
    }
  }

  // Fall back to KV
  const kv = await getKV();
  if (kv) {
    try {
      await kv.set(`board:entry:${id}`, fullEntry);
      await kv.lpush(BOARD_LIST, id);
      await kv.ltrim(BOARD_LIST, 0, BOARD_MAX_ENTRIES - 1);
      return { ...fullEntry, _storage: 'kv' };
    } catch (e) {
      console.error('[board] KV write error:', e.message);
    }
  }

  // Memory fallback
  memoryBoard.unshift(fullEntry);
  if (memoryBoard.length > BOARD_MAX_ENTRIES) {
    memoryBoard = memoryBoard.slice(0, BOARD_MAX_ENTRIES);
  }
  return { ...fullEntry, _storage: 'memory' };
}

async function getEntries(limit = 20, category = null) {
  // Cap limit to prevent abuse
  const cappedLimit = Math.min(Math.max(1, limit), 50);
  let entries = [];
  let source = 'none';

  // Try Postgres first
  if (isPostgresEnabled() && sql) {
    try {
      let pgEntries;
      if (category && category !== 'all') {
        pgEntries = await sql`
          SELECT id, author, content, category, tags,
                 EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
          FROM board_entries
          WHERE category = ${category}
          ORDER BY created_at DESC
          LIMIT ${cappedLimit}
        `;
      } else {
        pgEntries = await sql`
          SELECT id, author, content, category, tags,
                 EXTRACT(EPOCH FROM created_at) * 1000 as timestamp
          FROM board_entries
          ORDER BY created_at DESC
          LIMIT ${cappedLimit}
        `;
      }

      if (pgEntries && pgEntries.length > 0) {
        entries = pgEntries.map(e => ({
          id: e.id,
          author: e.author,
          content: e.content,
          category: e.category,
          tags: e.tags || [],
          timestamp: parseInt(e.timestamp)
        }));
        source = 'postgres';
      }
    } catch (pgErr) {
      console.error('[board] Postgres read error:', pgErr.message);
    }
  }

  // Fall back to KV if Postgres returned nothing
  if (entries.length === 0) {
    const kv = await getKV();
    if (kv) {
      try {
        const ids = await kv.lrange(BOARD_LIST, 0, cappedLimit - 1);
        if (ids && ids.length > 0) {
          const kvEntries = await Promise.all(
            ids.map(id => kv.get(`board:entry:${id}`))
          );
          entries = kvEntries
            .filter(e => e !== null)
            .filter(e => !category || category === 'all' || e.category === category);
          source = 'kv';
        }
      } catch (e) {
        console.error('[board] KV read error:', e.message);
      }
    }
  }

  // Memory fallback
  if (entries.length === 0 && memoryBoard.length > 0) {
    entries = memoryBoard.slice(0, cappedLimit);
    if (category && category !== 'all') {
      entries = entries.filter(e => e.category === category);
    }
    source = 'memory';
  }

  return { entries, _source: source };
}

async function deleteEntry(id, author) {
  // Try Postgres first
  if (isPostgresEnabled() && sql) {
    try {
      // Check ownership first
      const entry = await sql`
        SELECT author FROM board_entries WHERE id = ${id}
      `;
      if (!entry || entry.length === 0) {
        return { success: false, error: 'Entry not found' };
      }
      if (entry[0].author !== author) {
        return { success: false, error: 'Not your entry' };
      }

      await sql`DELETE FROM board_entries WHERE id = ${id}`;
      return { success: true, _storage: 'postgres' };
    } catch (pgErr) {
      console.error('[board] Postgres delete error:', pgErr.message);
    }
  }

  // Fall back to KV
  const kv = await getKV();
  if (kv) {
    try {
      const entry = await kv.get(`board:entry:${id}`);
      if (!entry) return { success: false, error: 'Entry not found' };
      if (entry.author !== author) return { success: false, error: 'Not your entry' };

      await kv.del(`board:entry:${id}`);
      await kv.lrem(BOARD_LIST, 1, id);
      return { success: true, _storage: 'kv' };
    } catch (e) {
      console.error('[board] KV delete error:', e.message);
      return { success: false, error: 'KV error' };
    }
  }

  // Memory fallback
  const idx = memoryBoard.findIndex(e => e.id === id);
  if (idx === -1) return { success: false, error: 'Entry not found' };
  if (memoryBoard[idx].author !== author) return { success: false, error: 'Not your entry' };

  memoryBoard.splice(idx, 1);
  return { success: true, _storage: 'memory' };
}

// ============ REQUEST HANDLER ============

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Vibe-Token');

  // Cache GET requests at CDN edge (board changes less frequently)
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Read entries
    if (req.method === 'GET') {
      const limit = parseInt(req.query.limit) || 20;
      const category = req.query.category || null;

      const result = await getEntries(limit, category);

      return res.status(200).json({
        success: true,
        entries: result.entries,
        count: result.entries.length,
        _source: result._source
      });
    }

    // POST - Add entry
    if (req.method === 'POST') {
      const { author, content, category, tags } = req.body;

      if (!author || !content) {
        return res.status(400).json({
          success: false,
          error: 'author and content required'
        });
      }

      if (content.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'content must be 500 chars or less'
        });
      }

      const entry = await addEntry({
        author: author.toLowerCase().replace('@', ''),
        content,
        category: category || 'general',
        tags: tags || []
      });

      return res.status(201).json({
        success: true,
        entry
      });
    }

    // DELETE - Disabled until identity verification is implemented
    if (req.method === 'DELETE') {
      return res.status(403).json({
        success: false,
        error: 'Delete disabled until identity verification is implemented'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Board API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
