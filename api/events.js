/**
 * Events API — Funnel tracking for /vibe
 *
 * POST /api/events - Log a funnel event
 * GET /api/events - Get funnel stats
 */

import { cachedKV } from './lib/kv-cache.js';

const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    return await cachedKV();
  } catch (e) {
    console.error('[events] KV init failed:', e.message);
    return null;
  }
}

const VALID_EVENTS = new Set([
  'mcp_installed',
  'session_started',
  'handle_claimed',
  'first_message_sent',
  'first_game_played',
  'invite_generated',
  'invite_redeemed',
  'session_ended',
  'error'
]);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kv = await getKV();

  if (req.method === 'POST') {
    const { event, handle, metadata } = req.body;

    if (!event || !VALID_EVENTS.has(event)) {
      return res.status(400).json({
        success: false,
        error: `Invalid event. Valid: ${Array.from(VALID_EVENTS).join(', ')}`
      });
    }

    const now = new Date();
    const dateKey = now.toISOString().split('T')[0];

    if (kv) {
      try {
        await kv.hincrby(`events:daily:${dateKey}`, event, 1);
        if (handle) {
          await kv.sadd(`events:users:${event}`, handle);
        }
      } catch (e) {
        console.error('[events] Failed to log:', e.message);
      }
    }

    return res.status(200).json({ success: true, event, logged: true });
  }

  if (req.method === 'GET') {
    if (!kv) {
      return res.status(200).json({ success: true, funnel: {}, message: 'KV not configured' });
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const todayStats = await kv.hgetall(`events:daily:${today}`) || {};

      return res.status(200).json({
        success: true,
        today: todayStats,
        storage: 'kv'
      });
    } catch (e) {
      console.error('[events] GET error:', e.message);
      return res.status(200).json({
        success: true,
        today: {},
        error: e.message,
        storage: 'kv-error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
