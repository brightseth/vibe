/**
 * Profile API
 *
 * "Who is @seth?" → Their sessions, DNA, presence.
 * Built from Gigabrain collective memory.
 */

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { user, username } = req.query;
  const name = (user || username || '').toLowerCase().replace('@', '');

  if (!name) {
    return res.status(400).json({ error: 'user required' });
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

    // Get presence - use kv.get (not hgetall) and correct key pattern
    const presence = await kv.get(`presence:data:${name}`);

    // Convert ISO timestamp properly before comparing
    let isOnline = false;
    if (presence?.lastSeen) {
      const lastSeenTs = typeof presence.lastSeen === 'string'
        ? new Date(presence.lastSeen).getTime()
        : presence.lastSeen;
      isOnline = (Date.now() - lastSeenTs) < 5 * 60 * 1000;
    }

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
      lastSeen: presence?.lastSeen ? formatTimeAgo(
        typeof presence.lastSeen === 'string'
          ? new Date(presence.lastSeen).getTime()
          : presence.lastSeen
      ) : null,
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

    res.json({ success: true, profile });

  } catch (e) {
    res.status(500).json({ error: e.message });
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
