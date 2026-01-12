/**
 * Consent API - DM consent management
 *
 * Tracks whether users have consented to receive DMs from each other.
 * Supports: check status, accept, block
 *
 * GET /api/consent?from=alice&to=bob - Check consent status
 * GET /api/consent?user=alice - Get pending consent requests
 * POST /api/consent - Accept or block
 */

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      return handleGet(req, res);
    } else if (req.method === 'POST') {
      return handlePost(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[Consent] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleGet(req, res) {
  const { from, to, user } = req.query;

  // Check specific consent status between two users
  if (from && to) {
    const fromClean = from.replace('@', '').toLowerCase();
    const toClean = to.replace('@', '').toLowerCase();

    // Check if blocked
    const blocked = await kv.sismember(`consent:blocked:${toClean}`, fromClean);
    if (blocked) {
      return res.json({
        success: true,
        status: 'blocked',
        from: fromClean,
        to: toClean
      });
    }

    // Check if accepted
    const accepted = await kv.sismember(`consent:accepted:${toClean}`, fromClean);
    if (accepted) {
      return res.json({
        success: true,
        status: 'accepted',
        from: fromClean,
        to: toClean
      });
    }

    // Check if pending
    const pending = await kv.sismember(`consent:pending:${toClean}`, fromClean);
    if (pending) {
      return res.json({
        success: true,
        status: 'pending',
        from: fromClean,
        to: toClean
      });
    }

    // No consent record - first contact
    return res.json({
      success: true,
      status: 'none',
      from: fromClean,
      to: toClean
    });
  }

  // Get pending consent requests for a user
  if (user) {
    const userClean = user.replace('@', '').toLowerCase();
    const pending = await kv.smembers(`consent:pending:${userClean}`) || [];

    return res.json({
      success: true,
      user: userClean,
      pending: pending.map(p => `@${p}`),
      count: pending.length
    });
  }

  return res.status(400).json({ error: 'Missing parameters: from+to or user' });
}

async function handlePost(req, res) {
  const { action, from, to } = req.body;

  if (!action || !from || !to) {
    return res.status(400).json({
      error: 'Missing required fields: action, from, to'
    });
  }

  const fromClean = from.replace('@', '').toLowerCase();
  const toClean = to.replace('@', '').toLowerCase();

  if (action === 'request') {
    // Add to pending (from is requesting to message to)
    await kv.sadd(`consent:pending:${toClean}`, fromClean);

    return res.json({
      success: true,
      action: 'request',
      from: fromClean,
      to: toClean,
      message: `Consent request sent to @${toClean}`
    });
  }

  if (action === 'accept') {
    // Remove from pending, add to accepted
    await kv.srem(`consent:pending:${toClean}`, fromClean);
    await kv.sadd(`consent:accepted:${toClean}`, fromClean);

    // Also add reciprocal acceptance (if I accept you, I'm also accepting you can message me)
    await kv.sadd(`consent:accepted:${fromClean}`, toClean);

    return res.json({
      success: true,
      action: 'accept',
      from: fromClean,
      to: toClean,
      message: `Now accepting DMs from @${fromClean}`
    });
  }

  if (action === 'block') {
    // Remove from all lists, add to blocked
    await kv.srem(`consent:pending:${toClean}`, fromClean);
    await kv.srem(`consent:accepted:${toClean}`, fromClean);
    await kv.sadd(`consent:blocked:${toClean}`, fromClean);

    return res.json({
      success: true,
      action: 'block',
      from: fromClean,
      to: toClean,
      message: `Blocked @${fromClean}`
    });
  }

  if (action === 'unblock') {
    await kv.srem(`consent:blocked:${toClean}`, fromClean);

    return res.json({
      success: true,
      action: 'unblock',
      from: fromClean,
      to: toClean,
      message: `Unblocked @${fromClean}`
    });
  }

  return res.status(400).json({
    error: 'Invalid action. Use: request, accept, block, unblock'
  });
}
