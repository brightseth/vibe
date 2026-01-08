/**
 * Profile API
 *
 * "Who is @seth?" → Their sessions, DNA, presence.
 * Built from Gigabrain collective memory.
 *
 * Note: Gigabrain data stays in KV (separate system).
 * This endpoint aggregates from Gigabrain's KV storage.
 */

// Check if KV is configured
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Cache at CDN edge
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { user, username } = req.query;
  const name = (user || username || '').toLowerCase().replace('@', '');

  if (!name) {
    return res.status(400).json({ error: 'user required' });
  }

  const kv = await getKV();
  if (!kv) {
    return res.status(503).json({
      error: 'Profile service temporarily unavailable',
      _source: 'none'
    });
  }

  try {
    // Get user's sessions from Gigabrain
    const sessionIds = await kv.lrange(`gigabrain:user:${name}`, 0, 100);

    const sessions = [];
    const techCounts = {};
    const categoryCounts = {};
    const projects = new Set();

    for (const id of sessionIds) {
      const session = await kv.hgetall(`gigabrain:${id}`);
      if (!session) continue;

      // Parse tech
      let tech = [];
      try {
        tech = Array.isArray(session.tech) ? session.tech : JSON.parse(session.tech || '[]');
      } catch (e) {}

      // Count tech
      for (const t of tech) {
        techCounts[t] = (techCounts[t] || 0) + 1;
      }

      // Count categories
      if (session.category) {
        categoryCounts[session.category] = (categoryCounts[session.category] || 0) + 1;
      }

      // Track projects
      if (session.project) {
        projects.add(session.project);
      }

      sessions.push({
        id: session.id,
        summary: session.summary,
        project: session.project,
        tech,
        category: session.category,
        timeAgo: formatTimeAgo(session.timestamp),
        timestamp: session.timestamp
      });
    }

    // Get presence
    const presence = await kv.hgetall(`presence:${name}`);
    const isOnline = presence && (Date.now() - (presence.lastSeen || 0)) < 5 * 60 * 1000;

    // Build DNA
    const topTech = Object.entries(techCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => name);

    const topCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0];

    // Build profile
    const profile = {
      username: name,
      online: isOnline,
      workingOn: presence?.workingOn || null,
      lastSeen: presence?.lastSeen ? formatTimeAgo(presence.lastSeen) : null,
      stats: {
        sessions: sessions.length,
        projects: projects.size
      },
      dna: {
        focus: topCategory ? topCategory[0] : 'general',
        tech: topTech,
        style: sessions.length > 50 ? 'prolific' : sessions.length > 20 ? 'active' : 'emerging'
      },
      recentProjects: [...projects].slice(0, 5),
      recentSessions: sessions.slice(0, 5).map(s => ({
        summary: s.summary,
        project: s.project,
        timeAgo: s.timeAgo
      }))
    };

    res.json({ success: true, profile, _source: 'kv' });

  } catch (e) {
    res.status(500).json({ error: e.message, _source: 'kv' });
  }
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return null;
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}
