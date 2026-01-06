/**
 * Echo API - Centralized feedback collection for /vibe
 *
 * POST /api/echo - Submit feedback
 * GET /api/echo - Get recent feedback (optional: ?limit=20, ?category=idea|bug|pain)
 * GET /api/echo?stats=true - Get feedback stats
 * GET /api/echo?top=ideas - Get top ideas (most recent ideas)
 *
 * Virtuous Cycle:
 * - Ideas get surfaced and built fast
 * - Bugs get logged and fixed
 * - Pains get smoothed away
 */

// Check if KV is configured
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Limits
const MAX_FEEDBACK_LENGTH = 1000;
const FEEDBACK_LIMIT = 1000; // Increased to keep more history

// Auto-detect category from content
function detectCategory(content) {
  const lower = content.toLowerCase();
  if (lower.startsWith('idea:') || lower.startsWith('idea -') || lower.includes('what if') || lower.includes('we should')) {
    return 'idea';
  }
  if (lower.startsWith('bug:') || lower.startsWith('bug -') || lower.includes('broken') || lower.includes('error') || lower.includes('crash')) {
    return 'bug';
  }
  if (lower.startsWith('pain:') || lower.startsWith('pain -') || lower.includes('frustrat') || lower.includes('annoying') || lower.includes('wish')) {
    return 'pain';
  }
  return 'general';
}

// In-memory fallback
const memory = {
  feedback: []
};

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

function generateId() {
  return 'fb_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Store feedback
async function storeFeedback(entry) {
  const kv = await getKV();

  if (kv) {
    // Add to list (newest first)
    await kv.lpush('echo:feedback', entry);
    // Trim to limit
    await kv.ltrim('echo:feedback', 0, FEEDBACK_LIMIT - 1);
  } else {
    memory.feedback.unshift(entry);
    memory.feedback = memory.feedback.slice(0, FEEDBACK_LIMIT);
  }
}

// Get recent feedback
async function getRecentFeedback(limit = 20) {
  const kv = await getKV();

  if (kv) {
    return await kv.lrange('echo:feedback', 0, limit - 1);
  } else {
    return memory.feedback.slice(0, limit);
  }
}

// Get stats
async function getStats() {
  const kv = await getKV();
  let all = [];

  if (kv) {
    all = await kv.lrange('echo:feedback', 0, FEEDBACK_LIMIT - 1);
  } else {
    all = memory.feedback;
  }

  const anonymous = all.filter(f => !f.handle).length;
  const attributed = all.length - anonymous;

  const today = new Date().toDateString();
  const todayCount = all.filter(f =>
    new Date(f.timestamp).toDateString() === today
  ).length;

  // Get unique contributors
  const contributors = new Set(all.filter(f => f.handle).map(f => f.handle));

  // Category counts
  const ideas = all.filter(f => f.category === 'idea').length;
  const bugs = all.filter(f => f.category === 'bug').length;
  const pains = all.filter(f => f.category === 'pain').length;

  return {
    total: all.length,
    anonymous,
    attributed,
    today: todayCount,
    contributors: contributors.size,
    categories: { ideas, bugs, pains, general: all.length - ideas - bugs - pains }
  };
}

// Get feedback filtered by category
async function getFeedbackByCategory(category, limit = 20) {
  const kv = await getKV();
  let all = [];

  if (kv) {
    all = await kv.lrange('echo:feedback', 0, FEEDBACK_LIMIT - 1);
  } else {
    all = memory.feedback;
  }

  return all.filter(f => f.category === category).slice(0, limit);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - Submit feedback
  if (req.method === 'POST') {
    const { handle, content, anonymous } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Missing content'
      });
    }

    const trimmed = content.trim().substring(0, MAX_FEEDBACK_LENGTH);

    if (trimmed.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Feedback too short'
      });
    }

    const category = detectCategory(trimmed);

    const entry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      handle: anonymous ? null : (handle?.toLowerCase().replace('@', '') || null),
      content: trimmed,
      category
    };

    await storeFeedback(entry);

    // If it's an idea, also post to board so it gets visibility
    if (category === 'idea') {
      try {
        const boardContent = entry.handle
          ? `@${entry.handle} has an idea: ${trimmed.substring(0, 200)}`
          : `New idea: ${trimmed.substring(0, 200)}`;

        await fetch(`${process.env.VIBE_API_URL || 'https://slashvibe.dev'}/api/board`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            author: 'echo',
            content: boardContent,
            category: 'idea'
          })
        });
      } catch (e) {
        console.error('Failed to post idea to board:', e);
      }
    }

    return res.status(200).json({
      success: true,
      entry: {
        id: entry.id,
        timestamp: entry.timestamp,
        anonymous: !entry.handle
      },
      message: anonymous
        ? 'Anonymous feedback received'
        : `Feedback received from @${entry.handle}`
    });
  }

  // GET - Fetch feedback or stats
  if (req.method === 'GET') {
    const { stats, limit, category, top } = req.query;

    // Stats only
    if (stats === 'true') {
      const feedbackStats = await getStats();
      return res.status(200).json({
        success: true,
        stats: feedbackStats
      });
    }

    // Top ideas (shortcut for category=idea)
    if (top === 'ideas') {
      const ideas = await getFeedbackByCategory('idea', 20);
      const formatted = ideas.map(entry => ({
        ...entry,
        timeAgo: timeAgo(entry.timestamp)
      }));
      return res.status(200).json({
        success: true,
        ideas: formatted,
        count: formatted.length,
        message: 'These ideas are ready to be built!'
      });
    }

    // Filter by category
    if (category && ['idea', 'bug', 'pain', 'general'].includes(category)) {
      const filtered = await getFeedbackByCategory(category, Math.min(parseInt(limit) || 20, 100));
      const formatted = filtered.map(entry => ({
        ...entry,
        timeAgo: timeAgo(entry.timestamp)
      }));
      return res.status(200).json({
        success: true,
        feedback: formatted,
        count: formatted.length,
        category
      });
    }

    // Recent feedback (all categories)
    const feedbackLimit = Math.min(parseInt(limit) || 20, 100);
    const recent = await getRecentFeedback(feedbackLimit);

    const formatted = recent.map(entry => ({
      ...entry,
      timeAgo: timeAgo(entry.timestamp)
    }));

    const feedbackStats = await getStats();

    return res.status(200).json({
      success: true,
      feedback: formatted,
      count: formatted.length,
      stats: feedbackStats,
      storage: KV_CONFIGURED ? 'kv' : 'memory'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
