/**
 * Board API - Community creative board
 *
 * GET /api/board - Get board entries (paginated, filterable by category)
 *
 * Supported categories: idea, shipped, request, riff, claim, observation
 *
 * Uses Vercel KV (Redis) for persistence with in-memory fallback
 */

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
    console.error('[board] KV load error:', e.message);
    return null;
  }
}

// Valid board entry categories
const VALID_CATEGORIES = ['idea', 'shipped', 'request', 'riff', 'claim', 'observation', 'general'];

/**
 * Get board entries (paginated, filterable)
 */
async function getEntries({ limit = 20, offset = 0, category = null }) {
  const cappedLimit = Math.min(Math.max(1, limit), 50);
  const kv = await getKV();

  if (kv) {
    try {
      // Get entry IDs from list
      const endIndex = offset + cappedLimit - 1;
      const ids = await kv.lrange(BOARD_LIST, offset, endIndex);
      if (!ids || ids.length === 0) return { entries: [], total: 0 };

      // Fetch all entries
      const entries = await Promise.all(
        ids.map(id => kv.get(`board:entry:${id}`))
      );

      // Filter nulls and apply category filter
      let results = entries.filter(e => e !== null);

      if (category && category !== 'all') {
        results = results.filter(e => e.category === category);
      }

      // Get total count
      const totalCount = await kv.llen(BOARD_LIST);

      return {
        entries: results,
        total: totalCount,
        offset,
        limit: cappedLimit
      };
    } catch (e) {
      console.error('[board] KV read error:', e.message);
      // Fall back to memory
      let results = [...memoryBoard];

      if (category && category !== 'all') {
        results = results.filter(e => e.category === category);
      }

      return {
        entries: results.slice(offset, offset + cappedLimit),
        total: results.length,
        offset,
        limit: cappedLimit
      };
    }
  } else {
    let results = [...memoryBoard];

    if (category && category !== 'all') {
      results = results.filter(e => e.category === category);
    }

    return {
      entries: results.slice(offset, offset + cappedLimit),
      total: results.length,
      offset,
      limit: cappedLimit
    };
  }
}

/**
 * Create new board entry (POST)
 */
async function createEntry({ author, category, content, tags = [] }) {
  const kv = await getKV();

  // Validate required fields
  if (!author || !category || !content) {
    throw new Error('Missing required fields: author, category, content');
  }

  // Validate category
  if (!VALID_CATEGORIES.includes(category)) {
    throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  // Generate unique ID
  const id = `${category}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const timestamp = Date.now();

  // Create entry object
  const entry = {
    id,
    author,
    category,
    content,
    tags,
    timestamp,
    reactions: {},
    comments: []
  };

  if (kv) {
    try {
      // Store entry
      await kv.set(`board:entry:${id}`, entry);

      // Add to main feed (newest first)
      await kv.lpush(BOARD_LIST, id);

      // Trim list to max entries
      await kv.ltrim(BOARD_LIST, 0, BOARD_MAX_ENTRIES - 1);

      // Add to category index
      await kv.lpush(`board:category:${category}`, id);

      // Add to user's posts
      await kv.lpush(`board:user:${author}`, id);

      // Record streak for retention tracking
      try {
        const today = new Date().toISOString().split('T')[0];
        const streakKey = `streak:${author}`;
        let streak = await kv.get(streakKey) || { current: 0, longest: 0, lastActive: null, activeDays: [], badges: [] };

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (streak.lastActive !== today) {
          streak.current = streak.lastActive === yesterdayStr ? streak.current + 1 : 1;
          if (streak.current > streak.longest) streak.longest = streak.current;
          streak.activeDays = [...(streak.activeDays || []), today].slice(-30);
          streak.lastActive = today;
          if (streak.current >= 7 && !(streak.badges || []).includes('verified_builder')) {
            streak.badges = [...(streak.badges || []), 'verified_builder'];
          }
          await kv.set(streakKey, streak);
        }
      } catch (e) {
        // Streak tracking is non-critical
        console.error('[board] Streak error:', e.message);
      }

      // Generate share URL for viral distribution
      const shareUrl = `https://slashvibe.dev/api/share/${id}`;

      return { success: true, id, entry, shareUrl, streak: `Share your ship: ${shareUrl}` };
    } catch (e) {
      console.error('[board] KV write error:', e.message);
      // Fall back to memory
      memoryBoard.unshift(entry);
      if (memoryBoard.length > BOARD_MAX_ENTRIES) {
        memoryBoard = memoryBoard.slice(0, BOARD_MAX_ENTRIES);
      }
      return { success: true, id, entry };
    }
  } else {
    // Memory-only mode
    memoryBoard.unshift(entry);
    if (memoryBoard.length > BOARD_MAX_ENTRIES) {
      memoryBoard = memoryBoard.slice(0, BOARD_MAX_ENTRIES);
    }
    return { success: true, id, entry };
  }
}

/**
 * Main handler - supports GET and POST
 */
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { author, category, content, tags } = req.body;
      const result = await createEntry({ author, category, content, tags });
      return res.status(200).json(result);
    } catch (error) {
      console.error('[board] POST error:', error.message);
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  if (req.method === 'GET') {
    const { limit, offset, category } = req.query;

    // Validate category if provided
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: 'Invalid category',
        valid_categories: VALID_CATEGORIES
      });
    }

    const result = await getEntries({
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
      category: category || null
    });

    return res.status(200).json(result);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
