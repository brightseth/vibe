/**
 * /api/webhooks/whatsapp — WhatsApp Webhook Endpoint
 * 
 * Receives real-time events from WhatsApp Business API:
 * - Incoming messages
 * - Message status updates
 * - Account status changes
 * 
 * Verifies webhook signature and forwards events to /vibe core.
 */

import crypto from 'crypto';

// WhatsApp webhook config
const WHATSAPP_WEBHOOK_VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
const WHATSAPP_WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET;

// KV store for /vibe integration
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

/**
 * Verify WhatsApp webhook signature
 */
function verifyWhatsAppSignature(body, signature, secret) {
  if (!secret) {
    console.warn('[WhatsApp Webhook] Secret not configured - skipping verification');
    return true; // Allow in development
  }
  
  if (!signature || !signature.startsWith('sha256=')) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
    
  const receivedSignature = signature.replace('sha256=', '');
    
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

/**
 * Forward WhatsApp event to /vibe inbox
 */
async function forwardToVibe(kv, event) {
  try {
    const inboxKey = 'vibe:social_inbox';
    const eventId = `whatsapp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const inboxEvent = {
      id: eventId,
      platform: 'whatsapp',
      type: event.type,
      timestamp: new Date().toISOString(),
      from: event.from,
      content: event.content,
      metadata: event.metadata || {},
      signal_score: event.signal_score || 80, // WhatsApp messages are high signal
      processed: false
    };
    
    // Add to social inbox
    await kv.lpush(inboxKey, JSON.stringify(inboxEvent));
    
    // Keep only last 100 events
    await kv.ltrim(inboxKey, 0, 99);
    
    console.log(`[WhatsApp Webhook] Forwarded ${event.type} to /vibe:`, eventId);
    return eventId;
    
  } catch (e) {
    console.error('[WhatsApp Webhook] Failed to forward to /vibe:', e);
    return null;
  }
}

/**
 * Process WhatsApp message events
 */
async function processMessageEvents(messages, contacts, kv) {
  const results = [];
  
  for (const message of messages) {
    try {
      // Find the contact for this message
      const contact = contacts.find(c => c.wa_id === message.from);
      
      // Only process text messages for now
      if (message.type !== 'text') {
        console.log(`[WhatsApp Webhook] Skipping ${message.type} message from ${message.from}`);
        continue;
      }
      
      const content = message.text?.body || '';
      
      // Check if this is a /vibe command or mention
      const isCommand = content.startsWith('/');
      const isVibeReference = content.toLowerCase().includes('/vibe') || content.toLowerCase().includes('vibe');
      
      const event = {
        type: isCommand ? 'command' : 'message',
        from: {
          id: message.from,
          handle: contact?.profile?.name || message.from,
          name: contact?.profile?.name || 'WhatsApp User',
          phone: message.from,
          avatar: null // WhatsApp doesn't provide profile photos via webhook
        },
        content: content,
        metadata: {
          messageId: message.id,
          timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
          messageType: message.type,
          isCommand,
          isVibeReference,
          context: message.context || null, // For replies
          whatsappContact: contact
        },
        signal_score: isCommand ? 90 : isVibeReference ? 80 : 70
      };
      
      const eventId = await forwardToVibe(kv, event);
      if (eventId) {
        results.push({
          type: event.type,
          from: event.from.handle,
          eventId
        });
      }
      
    } catch (e) {
      console.error('[WhatsApp Webhook] Error processing message:', e);
    }
  }
  
  return results;
}

/**
 * Process WhatsApp status updates (message delivered, read, etc.)
 */
async function processStatusEvents(statuses, kv) {
  const results = [];
  
  for (const status of statuses) {
    try {
      // Only process significant status changes
      const significantStatuses = ['delivered', 'read', 'failed'];
      if (!significantStatuses.includes(status.status)) continue;
      
      const event = {
        type: 'status',
        from: {
          id: status.recipient_id,
          handle: status.recipient_id,
          name: 'WhatsApp User',
          phone: status.recipient_id
        },
        content: `Message ${status.status}: ${status.id}`,
        metadata: {
          messageId: status.id,
          status: status.status,
          timestamp: new Date(parseInt(status.timestamp) * 1000).toISOString(),
          conversation: status.conversation || null,
          pricing: status.pricing || null
        },
        signal_score: status.status === 'failed' ? 95 : 30 // Failures are high signal
      };
      
      const eventId = await forwardToVibe(kv, event);
      if (eventId) {
        results.push({
          type: 'status',
          status: status.status,
          eventId
        });
      }
      
    } catch (e) {
      console.error('[WhatsApp Webhook] Error processing status:', e);
    }
  }
  
  return results;
}

export default async function handler(req, res) {
  const { method, query, body, headers } = req;
  
  console.log(`[WhatsApp Webhook] ${method} request received`);
  
  try {
    // Handle webhook verification (GET request from WhatsApp)
    if (method === 'GET') {
      const mode = query['hub.mode'];
      const token = query['hub.verify_token'];
      const challenge = query['hub.challenge'];
      
      console.log('[WhatsApp Webhook] Verification request received');
      
      if (mode === 'subscribe' && token === WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
        console.log('[WhatsApp Webhook] Webhook verification successful');
        return res.status(200).send(challenge);
      } else {
        console.warn('[WhatsApp Webhook] Webhook verification failed');
        return res.status(403).send('Forbidden');
      }
    }
    
    // Handle webhook events (POST request from WhatsApp)
    if (method === 'POST') {
      const signature = headers['x-hub-signature-256'];
      const bodyStr = JSON.stringify(body);
      
      // Verify signature
      if (!verifyWhatsAppSignature(bodyStr, signature, WHATSAPP_WEBHOOK_SECRET)) {
        console.warn('[WhatsApp Webhook] Invalid signature');
        return res.status(401).json({
          error: 'Invalid webhook signature'
        });
      }
      
      console.log('[WhatsApp Webhook] Signature verified, processing events...');
      
      const kv = await getKV();
      if (!kv) {
        console.warn('[WhatsApp Webhook] KV not available');
        return res.status(503).json({
          error: 'Storage unavailable'
        });
      }
      
      const results = [];
      
      // Process WhatsApp webhook payload
      if (body.entry && Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          if (entry.changes && Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              if (change.field === 'messages' && change.value) {
                const { messages, contacts, statuses } = change.value;
                
                // Process incoming messages
                if (messages && messages.length > 0) {
                  console.log(`[WhatsApp Webhook] Processing ${messages.length} message(s)`);
                  const messageResults = await processMessageEvents(messages, contacts || [], kv);
                  results.push(...messageResults);
                }
                
                // Process status updates
                if (statuses && statuses.length > 0) {
                  console.log(`[WhatsApp Webhook] Processing ${statuses.length} status update(s)`);
                  const statusResults = await processStatusEvents(statuses, kv);
                  results.push(...statusResults);
                }
              }
            }
          }
        }
      }
      
      // Store webhook delivery stats
      const statsKey = 'vibe:whatsapp_webhook_stats';
      const stats = await kv.hgetall(statsKey) || {};
      const today = new Date().toISOString().split('T')[0];
      
      stats.total_deliveries = (parseInt(stats.total_deliveries) || 0) + 1;
      stats.last_delivery = new Date().toISOString();
      stats[`deliveries_${today}`] = (parseInt(stats[`deliveries_${today}`]) || 0) + 1;
      stats.events_processed = (parseInt(stats.events_processed) || 0) + results.length;
      
      await kv.hmset(statsKey, stats);
      
      console.log(`[WhatsApp Webhook] Processed ${results.length} events successfully`);
      
      return res.status(200).json({
        status: 'success',
        events_processed: results.length,
        events: results.map(r => ({
          type: r.type,
          from: r.from
        }))
      });
    }
    
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET', 'POST']
    });
    
  } catch (error) {
    console.error('[WhatsApp Webhook] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}