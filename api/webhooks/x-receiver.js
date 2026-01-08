/**
 * /api/webhooks/x-receiver — Simplified X Webhook Endpoint
 * 
 * FOCUSED IMPLEMENTATION: Build X webhook receiver that accepts POST requests,
 * parses JSON payload, logs data, and returns success response.
 * 
 * This addresses the high-priority backlog tasks for X webhook receiver.
 */

import crypto from 'crypto';

// Environment configuration
const X_WEBHOOK_SECRET = process.env.X_WEBHOOK_SECRET;
const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function getKV() {
  if (!KV_CONFIGURED) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (e) {
    console.error('[X Webhook] KV import failed:', e);
    return null;
  }
}

/**
 * Verify X webhook signature
 */
function verifySignature(body, signature, secret) {
  if (!secret) {
    console.log('[X Webhook] No secret configured - development mode');
    return true;
  }
  
  if (!signature) {
    console.warn('[X Webhook] No signature provided');
    return false;
  }
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');
    
    const receivedSignature = signature.replace('sha256=', '');
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'base64'),
      Buffer.from(receivedSignature, 'base64')
    );
    
    console.log('[X Webhook] Signature verification:', isValid ? 'PASS' : 'FAIL');
    return isValid;
    
  } catch (e) {
    console.error('[X Webhook] Signature verification error:', e);
    return false;
  }
}

/**
 * Handle CRC challenge from X
 */
function handleCRCChallenge(crcToken, secret) {
  if (!secret) {
    console.error('[X Webhook] Cannot handle CRC - no secret configured');
    throw new Error('X_WEBHOOK_SECRET required for CRC challenge');
  }
  
  console.log('[X Webhook] Processing CRC challenge');
  
  const responseToken = crypto
    .createHmac('sha256', secret)
    .update(crcToken, 'utf8')
    .digest('base64');
    
  return {
    response_token: `sha256=${responseToken}`
  };
}

/**
 * Log and store webhook event
 */
async function storeEvent(kv, eventData) {
  if (!kv) {
    console.log('[X Webhook] No KV storage - event logged but not persisted');
    return null;
  }
  
  try {
    const eventId = `x_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const event = {
      id: eventId,
      platform: 'x',
      timestamp: new Date().toISOString(),
      raw_payload: eventData,
      processed: false
    };
    
    // Store in social inbox
    await kv.lpush('vibe:social_inbox', JSON.stringify(event));
    
    // Keep only last 100 events
    await kv.ltrim('vibe:social_inbox', 0, 99);
    
    // Update webhook stats
    const statsKey = 'vibe:x_webhook_stats';
    const stats = await kv.hgetall(statsKey) || {};
    
    stats.total_deliveries = (parseInt(stats.total_deliveries) || 0) + 1;
    stats.last_delivery = new Date().toISOString();
    stats.events_processed = (parseInt(stats.events_processed) || 0) + 1;
    
    await kv.hmset(statsKey, stats);
    
    console.log('[X Webhook] Event stored:', eventId);
    return eventId;
    
  } catch (e) {
    console.error('[X Webhook] Storage error:', e);
    return null;
  }
}

export default async function handler(req, res) {
  const { method, query, body, headers } = req;
  
  console.log(`[X Webhook] ${method} request received at ${new Date().toISOString()}`);
  console.log('[X Webhook] Headers:', Object.keys(headers));
  
  try {
    // Handle CRC challenge (GET request)
    if (method === 'GET' && query.crc_token) {
      console.log('[X Webhook] CRC challenge received');
      
      if (!X_WEBHOOK_SECRET) {
        console.error('[X Webhook] CRC challenge failed - no secret');
        return res.status(500).json({
          error: 'X_WEBHOOK_SECRET not configured for CRC challenge'
        });
      }
      
      const challenge = handleCRCChallenge(query.crc_token, X_WEBHOOK_SECRET);
      console.log('[X Webhook] CRC challenge response sent');
      
      return res.status(200).json(challenge);
    }
    
    // Handle health check (GET without CRC)
    if (method === 'GET') {
      console.log('[X Webhook] Health check request');
      
      const kv = await getKV();
      const stats = kv ? await kv.hgetall('vibe:x_webhook_stats') : {};
      
      return res.status(200).json({
        status: 'healthy',
        endpoint: '/api/webhooks/x-receiver',
        configured: {
          webhook_secret: !!X_WEBHOOK_SECRET,
          kv_storage: !!kv
        },
        stats: {
          total_deliveries: stats.total_deliveries || 0,
          events_processed: stats.events_processed || 0,
          last_delivery: stats.last_delivery || null
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // Handle webhook events (POST requests)
    if (method === 'POST') {
      console.log('[X Webhook] Processing webhook event');
      
      // Get signature and body
      const signature = headers['x-twitter-webhooks-signature'] || headers['x-hub-signature-256'];
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      
      console.log('[X Webhook] Payload size:', bodyStr.length, 'bytes');
      console.log('[X Webhook] Has signature:', !!signature);
      
      // Verify signature if secret is configured
      if (X_WEBHOOK_SECRET && !verifySignature(bodyStr, signature, X_WEBHOOK_SECRET)) {
        console.warn('[X Webhook] Signature verification failed');
        return res.status(401).json({
          error: 'Invalid webhook signature'
        });
      }
      
      // Parse payload
      let parsedPayload;
      try {
        parsedPayload = typeof body === 'object' ? body : JSON.parse(bodyStr);
        console.log('[X Webhook] Payload parsed successfully');
        console.log('[X Webhook] Event types detected:', Object.keys(parsedPayload));
      } catch (e) {
        console.error('[X Webhook] JSON parsing failed:', e);
        return res.status(400).json({
          error: 'Invalid JSON payload'
        });
      }
      
      // Log payload (truncated for security)
      const logPayload = JSON.stringify(parsedPayload).slice(0, 200);
      console.log('[X Webhook] Payload preview:', logPayload + (logPayload.length >= 200 ? '...' : ''));
      
      // Store event
      const kv = await getKV();
      const eventId = await storeEvent(kv, parsedPayload);
      
      // Count events in payload
      let eventCount = 0;
      const eventTypes = [];
      
      if (parsedPayload.tweet_create_events) {
        eventCount += parsedPayload.tweet_create_events.length;
        eventTypes.push('tweets');
      }
      if (parsedPayload.direct_message_events) {
        eventCount += parsedPayload.direct_message_events.length;
        eventTypes.push('dms');
      }
      if (parsedPayload.favorite_events) {
        eventCount += parsedPayload.favorite_events.length;
        eventTypes.push('likes');
      }
      if (parsedPayload.follow_events) {
        eventCount += parsedPayload.follow_events.length;
        eventTypes.push('follows');
      }
      
      console.log(`[X Webhook] Processed ${eventCount} events of types: ${eventTypes.join(', ')}`);
      
      // Return success response
      return res.status(200).json({
        status: 'success',
        message: 'Webhook received and processed',
        event_id: eventId,
        events_processed: eventCount,
        event_types: eventTypes,
        timestamp: new Date().toISOString(),
        storage: !!kv ? 'persisted' : 'logged_only'
      });
    }
    
    // Method not allowed
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET', 'POST'],
      received: method
    });
    
  } catch (error) {
    console.error('[X Webhook] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}