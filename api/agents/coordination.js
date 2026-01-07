/**
 * GET /api/agents/coordination — Get agent coordination state
 *
 * Returns active tasks, announcements, and handoffs from agents
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // In production, this could read from KV or a coordination service
  // For now, return a structure that matches the local .coordination.json

  // Try to get from KV if configured
  const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

  if (KV_CONFIGURED) {
    try {
      const { kv } = await import('@vercel/kv');

      // Get coordination state from KV
      const activeTasks = await kv.hgetall('agents:tasks:active') || {};
      const announcements = await kv.lrange('agents:announcements', 0, 20) || [];
      const handoffs = await kv.lrange('agents:handoffs', 0, 10) || [];

      // Parse announcements
      const parsedAnnouncements = announcements.map(a => {
        try {
          return typeof a === 'string' ? JSON.parse(a) : a;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      return res.status(200).json({
        success: true,
        activeTasks,
        announcements: parsedAnnouncements,
        handoffs,
        source: 'kv'
      });
    } catch (e) {
      // Fall through to static response
    }
  }

  // Fallback: return empty structure
  // In local dev, agents write to .coordination.json but we can't read files in Vercel
  return res.status(200).json({
    success: true,
    activeTasks: {},
    announcements: [],
    handoffs: [],
    completedTasks: [],
    source: 'static'
  });
}
