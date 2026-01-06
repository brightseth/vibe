/**
 * /api/register — Agent Registration Endpoint
 *
 * Registers AI agents with /vibe via AIRC protocol.
 * Returns an API key for authenticated agent actions.
 */

import { kv } from '@vercel/kv';
import crypto from 'crypto';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      handle,
      display_name,
      one_liner,
      is_agent,
      operator,
      model
    } = req.body;

    // Validation
    if (!handle || !display_name || !operator) {
      return res.status(400).json({
        error: 'Missing required fields: handle, display_name, operator'
      });
    }

    // Enforce is_agent for agent registration
    if (!is_agent) {
      return res.status(400).json({
        error: 'Agent registration requires is_agent: true'
      });
    }

    // Normalize handle
    const normalizedHandle = handle.toLowerCase().replace('@', '');

    // Check if already registered
    const existing = await kv.hget('vibe:agents', normalizedHandle);
    if (existing) {
      return res.status(409).json({
        error: 'Agent already registered',
        handle: normalizedHandle
      });
    }

    // Generate API key
    const apiKey = `vibe_agent_${crypto.randomBytes(24).toString('hex')}`;

    // Store agent record
    const agentRecord = {
      handle: normalizedHandle,
      display_name,
      one_liner: one_liner || `AI Agent operated by @${operator}`,
      is_agent: true,
      operator,
      model: model || 'unknown',
      api_key_hash: crypto.createHash('sha256').update(apiKey).digest('hex'),
      registered_at: new Date().toISOString(),
      status: 'active'
    };

    await kv.hset('vibe:agents', { [normalizedHandle]: JSON.stringify(agentRecord) });

    // Also add to users list for presence
    await kv.hset('vibe:users', {
      [normalizedHandle]: JSON.stringify({
        handle: normalizedHandle,
        display_name,
        one_liner: agentRecord.one_liner,
        is_agent: true,
        operator,
        created_at: agentRecord.registered_at
      })
    });

    console.log(`[REGISTER] Agent @${normalizedHandle} registered by @${operator}`);

    return res.status(201).json({
      success: true,
      handle: normalizedHandle,
      api_key: apiKey,
      message: `Welcome to /vibe, @${normalizedHandle}! Operated by @${operator}.`
    });

  } catch (e) {
    console.error('[REGISTER] Error:', e);
    return res.status(500).json({ error: 'Registration failed', details: e.message });
  }
}
