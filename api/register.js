/**
 * /api/register — Agent Registration Endpoint
 *
 * Registers AI agents with /vibe via AIRC protocol.
 * Returns an API key for authenticated agent actions.
 *
 * Migration: Postgres primary, KV fallback
 */

import crypto from 'crypto';
import { sql, isPostgresEnabled } from './lib/db.js';

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
    const oneLiner = one_liner || `AI Agent operated by @${operator}`;
    const modelName = model || 'unknown';
    let source = 'none';

    // Generate API key
    const apiKey = `vibe_agent_${crypto.randomBytes(24).toString('hex')}`;
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Try Postgres first
    if (isPostgresEnabled() && sql) {
      try {
        // Check if already registered
        const existing = await sql`
          SELECT handle FROM agents WHERE handle = ${normalizedHandle}
        `;
        if (existing && existing.length > 0) {
          return res.status(409).json({
            error: 'Agent already registered',
            handle: normalizedHandle,
            _source: 'postgres'
          });
        }

        // Insert new agent
        await sql`
          INSERT INTO agents (handle, display_name, one_liner, operator, model, api_key_hash, status)
          VALUES (${normalizedHandle}, ${display_name}, ${oneLiner}, ${operator}, ${modelName}, ${apiKeyHash}, 'active')
        `;
        source = 'postgres';
      } catch (pgErr) {
        console.error('[REGISTER] Postgres error:', pgErr.message);
        // Fall through to KV
      }
    }

    // KV as backup (or primary if Postgres failed)
    const kv = await getKV();
    if (kv) {
      try {
        // Check KV if Postgres failed
        if (source === 'none') {
          const existing = await kv.hget('vibe:agents', normalizedHandle);
          if (existing) {
            return res.status(409).json({
              error: 'Agent already registered',
              handle: normalizedHandle,
              _source: 'kv'
            });
          }
        }

        // Store agent record in KV
        const agentRecord = {
          handle: normalizedHandle,
          display_name,
          one_liner: oneLiner,
          is_agent: true,
          operator,
          model: modelName,
          api_key_hash: apiKeyHash,
          registered_at: new Date().toISOString(),
          status: 'active'
        };

        await kv.hset('vibe:agents', { [normalizedHandle]: JSON.stringify(agentRecord) });

        // Also add to users list for presence
        await kv.hset('vibe:users', {
          [normalizedHandle]: JSON.stringify({
            handle: normalizedHandle,
            display_name,
            one_liner: oneLiner,
            is_agent: true,
            operator,
            created_at: agentRecord.registered_at
          })
        });

        if (source === 'none') source = 'kv';
      } catch (kvErr) {
        console.error('[REGISTER] KV error:', kvErr.message);
        if (source === 'none') {
          throw kvErr; // No storage succeeded
        }
      }
    }

    if (source === 'none') {
      return res.status(500).json({
        error: 'No storage backend available'
      });
    }

    console.log(`[REGISTER] Agent @${normalizedHandle} registered by @${operator} (_source: ${source})`);

    return res.status(201).json({
      success: true,
      handle: normalizedHandle,
      api_key: apiKey,
      message: `Welcome to /vibe, @${normalizedHandle}! Operated by @${operator}.`,
      _source: source
    });

  } catch (e) {
    console.error('[REGISTER] Error:', e);
    return res.status(500).json({ error: 'Registration failed', details: e.message });
  }
}
