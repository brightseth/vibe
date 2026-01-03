/**
 * Board API - Shared whiteboard for /vibe community
 *
 * POST /api/board - Add an entry
 * GET /api/board - Get recent entries
 * DELETE /api/board - Remove an entry (author only)
 *
 * Uses Vercel KV (Redis) for persistence
 */

import crypto from 'crypto';

// Check if KV is configured
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Redis keys
const BOARD_LIST = 'board:entries';  // List of entry IDs (newest first)
const BOARD_MAX_ENTRIES = 100;       // Keep last 100 entries

// In-memory fallback
let memoryBoard = [];

// KV wrapper
async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    return null;
  }
}

// Generate entry ID
function generateEntryId() {
  return `entry_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// ============ BOARD STORAGE ============

async function addEntry(entry) {
  const kv = await getKV();
  const id = generateEntryId();
  const fullEntry = {
    id,
    ...entry,
    timestamp: Date.now()
  };

  if (kv) {
    // Store entry data
    await kv.set(`board:entry:${id}`, fullEntry);
    // Add to list (prepend)
    await kv.lpush(BOARD_LIST, id);
    // Trim to max entries
    await kv.ltrim(BOARD_LIST, 0, BOARD_MAX_ENTRIES - 1);
  } else {
    memoryBoard.unshift(fullEntry);
    if (memoryBoard.length > BOARD_MAX_ENTRIES) {
      memoryBoard = memoryBoard.slice(0, BOARD_MAX_ENTRIES);
    }
  }

  return fullEntry;
}

async function getEntries(limit = 20, category = null) {
  // Cap limit to prevent abuse
  const cappedLimit = Math.min(Math.max(1, limit), 50);
  const kv = await getKV();

  if (kv) {
    // Get entry IDs
    const ids = await kv.lrange(BOARD_LIST, 0, cappedLimit - 1);
    if (!ids || ids.length === 0) return [];

    // Fetch all entries
    const entries = await Promise.all(
      ids.map(id => kv.get(`board:entry:${id}`))
    );

    // Filter nulls and optionally by category
    return entries
      .filter(e => e !== null)
      .filter(e => !category || e.category === category);
  }

  // Memory fallback
  let results = memoryBoard.slice(0, cappedLimit);
  if (category) {
    results = results.filter(e => e.category === category);
  }
  return results;
}

async function deleteEntry(id, author) {
  const kv = await getKV();

  if (kv) {
    const entry = await kv.get(`board:entry:${id}`);
    if (!entry) return { success: false, error: 'Entry not found' };
    if (entry.author !== author) return { success: false, error: 'Not your entry' };

    await kv.del(`board:entry:${id}`);
    await kv.lrem(BOARD_LIST, 1, id);
    return { success: true };
  }

  // Memory fallback
  const idx = memoryBoard.findIndex(e => e.id === id);
  if (idx === -1) return { success: false, error: 'Entry not found' };
  if (memoryBoard[idx].author !== author) return { success: false, error: 'Not your entry' };

  memoryBoard.splice(idx, 1);
  return { success: true };
}

// ============ REQUEST HANDLER ============

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Vibe-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Read entries
    if (req.method === 'GET') {
      const limit = parseInt(req.query.limit) || 20;
      const category = req.query.category || null;

      const entries = await getEntries(limit, category);

      return res.status(200).json({
        success: true,
        entries,
        count: entries.length
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
