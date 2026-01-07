/**
 * Webhooks API — Integration Events
 *
 * POST /api/webhooks — Register a webhook
 * GET /api/webhooks — List your webhooks
 * DELETE /api/webhooks — Remove a webhook
 *
 * Events:
 * - message.received — When you receive a DM
 * - user.online — When someone comes online
 * - user.offline — When someone goes offline
 * - mention.received — When you're mentioned on board
 */

import crypto from 'crypto';

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

const VALID_EVENTS = [
  'message.received',
  'user.online',
  'user.offline',
  'mention.received',
  'reaction.received'
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const kv = await getKV();
  if (!kv) {
    return res.status(503).json({
      success: false,
      error: 'Webhooks temporarily unavailable'
    });
  }

  // Get handle from auth token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization required',
      hint: 'Use Authorization: Bearer <your-token>'
    });
  }

  const token = authHeader.replace('Bearer ', '');

  // Look up handle from token
  const tokenData = await kv.hget('vibe:tokens', token);
  if (!tokenData) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }

  const { handle } = typeof tokenData === 'string' ? JSON.parse(tokenData) : tokenData;

  // POST — Register webhook
  if (req.method === 'POST') {
    const { url, events, secret } = req.body || {};

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL required'
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL'
      });
    }

    // Require HTTPS for security
    if (!url.startsWith('https://')) {
      return res.status(400).json({
        success: false,
        error: 'HTTPS required for webhook URLs'
      });
    }

    // Validate events
    const subscribedEvents = events || ['message.received'];
    for (const event of subscribedEvents) {
      if (!VALID_EVENTS.includes(event)) {
        return res.status(400).json({
          success: false,
          error: `Invalid event: ${event}`,
          valid_events: VALID_EVENTS
        });
      }
    }

    // Limit webhooks per user
    const existingWebhooks = await kv.hget('vibe:webhooks', handle);
    const webhooks = existingWebhooks
      ? (typeof existingWebhooks === 'string' ? JSON.parse(existingWebhooks) : existingWebhooks)
      : [];

    if (webhooks.length >= 5) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 5 webhooks per user'
      });
    }

    // Generate webhook ID and secret
    const webhookId = `wh_${crypto.randomBytes(8).toString('hex')}`;
    const webhookSecret = secret || `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const webhook = {
      id: webhookId,
      url,
      events: subscribedEvents,
      secret_hash: crypto.createHash('sha256').update(webhookSecret).digest('hex'),
      created_at: new Date().toISOString(),
      last_delivery: null,
      delivery_count: 0,
      failure_count: 0,
      status: 'active'
    };

    webhooks.push(webhook);
    await kv.hset('vibe:webhooks', { [handle]: JSON.stringify(webhooks) });

    return res.status(201).json({
      success: true,
      webhook: {
        id: webhookId,
        url,
        events: subscribedEvents,
        secret: webhookSecret // Only returned on creation
      },
      message: 'Webhook registered. Store the secret securely — it won\'t be shown again.'
    });
  }

  // GET — List webhooks
  if (req.method === 'GET') {
    const existingWebhooks = await kv.hget('vibe:webhooks', handle);
    const webhooks = existingWebhooks
      ? (typeof existingWebhooks === 'string' ? JSON.parse(existingWebhooks) : existingWebhooks)
      : [];

    // Don't return secret hash
    const safeWebhooks = webhooks.map(wh => ({
      id: wh.id,
      url: wh.url,
      events: wh.events,
      created_at: wh.created_at,
      last_delivery: wh.last_delivery,
      delivery_count: wh.delivery_count,
      failure_count: wh.failure_count,
      status: wh.status
    }));

    return res.status(200).json({
      success: true,
      webhooks: safeWebhooks,
      available_events: VALID_EVENTS
    });
  }

  // DELETE — Remove webhook
  if (req.method === 'DELETE') {
    const { webhook_id } = req.body || req.query;

    if (!webhook_id) {
      return res.status(400).json({
        success: false,
        error: 'webhook_id required'
      });
    }

    const existingWebhooks = await kv.hget('vibe:webhooks', handle);
    let webhooks = existingWebhooks
      ? (typeof existingWebhooks === 'string' ? JSON.parse(existingWebhooks) : existingWebhooks)
      : [];

    const initialCount = webhooks.length;
    webhooks = webhooks.filter(wh => wh.id !== webhook_id);

    if (webhooks.length === initialCount) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found'
      });
    }

    await kv.hset('vibe:webhooks', { [handle]: JSON.stringify(webhooks) });

    return res.status(200).json({
      success: true,
      message: 'Webhook removed'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Dispatch webhook event (called from other endpoints)
 * @param {object} kv - KV instance
 * @param {string} handle - Target handle
 * @param {string} event - Event type
 * @param {object} payload - Event data
 */
export async function dispatchWebhook(kv, handle, event, payload) {
  const webhooksData = await kv.hget('vibe:webhooks', handle);
  if (!webhooksData) return;

  const webhooks = typeof webhooksData === 'string' ? JSON.parse(webhooksData) : webhooksData;
  const activeWebhooks = webhooks.filter(wh =>
    wh.status === 'active' && wh.events.includes(event)
  );

  for (const webhook of activeWebhooks) {
    try {
      // Sign the payload
      const timestamp = Date.now();
      const body = JSON.stringify({
        event,
        payload,
        timestamp
      });

      const signature = crypto
        .createHmac('sha256', webhook.secret_hash)
        .update(`${timestamp}.${body}`)
        .digest('hex');

      // Fire and forget (don't block on webhook delivery)
      fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Vibe-Signature': `t=${timestamp},v1=${signature}`,
          'X-Vibe-Event': event
        },
        body
      }).then(async (res) => {
        // Update delivery stats
        webhook.last_delivery = new Date().toISOString();
        webhook.delivery_count++;
        if (!res.ok) {
          webhook.failure_count++;
          if (webhook.failure_count >= 10) {
            webhook.status = 'disabled'; // Auto-disable after too many failures
          }
        }
        await kv.hset('vibe:webhooks', { [handle]: JSON.stringify(webhooks) });
      }).catch(() => {
        // Increment failure count
        webhook.failure_count++;
      });
    } catch (e) {
      // Silent fail — don't break main flow
    }
  }
}
