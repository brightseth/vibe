/**
 * /api/webhooks/farcaster — Farcaster Webhook Endpoint
 * 
 * Receives real-time events from Farcaster network:
 * - Cast mentions (when someone mentions you)
 * - Cast replies to your casts
 * - Follows
 * - Likes/reactions
 * 
 * Uses Farcaster Hub API and processes Farcaster protocol events.
 */

import crypto from 'crypto';

// Farcaster config
const FARCASTER_PRIVATE_KEY = process.env.FARCASTER_PRIVATE_KEY;
const FARCASTER_FID = process.env.FARCASTER_FID; // Your Farcaster ID
const FARCASTER_HUB_URL = process.env.FARCASTER_HUB_URL || 'https://nemes.farcaster.xyz:2283';
const FARCASTER_WEBHOOK_SECRET = process.env.FARCASTER_WEBHOOK_SECRET;

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
 * Verify Farcaster webhook signature
 */
function verifyFarcasterSignature(body, signature, secret) {
  if (!secret) {
    console.warn('[Farcaster Webhook] Secret not configured - skipping verification');
    return true; // Allow in development
  }
  
  if (!signature) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
    
  return signature === expectedSignature;
}

/**
 * Forward Farcaster event to /vibe inbox
 */
async function forwardToVibe(kv, event) {
  try {
    const inboxKey = 'vibe:social_inbox';
    const eventId = `farcaster_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const inboxEvent = {
      id: eventId,
      platform: 'farcaster',
      type: event.type,
      timestamp: new Date().toISOString(),
      from: event.from,
      content: event.content,
      metadata: event.metadata || {},
      signal_score: event.signal_score || 60,
      processed: false
    };
    
    // Add to social inbox
    await kv.lpush(inboxKey, JSON.stringify(inboxEvent));
    
    // Keep only last 100 events
    await kv.ltrim(inboxKey, 0, 99);
    
    console.log(`[Farcaster Webhook] Forwarded ${event.type} to /vibe:`, eventId);
    return eventId;
    
  } catch (e) {
    console.error('[Farcaster Webhook] Failed to forward to /vibe:', e);
    return null;
  }
}

/**
 * Process Farcaster cast (post) events
 */
async function processCastEvents(casts, kv) {
  const results = [];
  
  for (const cast of casts) {
    try {
      // Check if this cast mentions our FID or contains /vibe
      const text = cast.text || '';
      const mentionsFid = cast.mentions?.includes(parseInt(FARCASTER_FID));
      const parentHash = cast.parentHash;
      const isReply = !!parentHash;
      const containsVibe = text.toLowerCase().includes('/vibe');
      
      // Only process mentions, replies to our casts, or /vibe references
      if (!mentionsFid && !isReply && !containsVibe) continue;
      
      const eventType = mentionsFid ? 'mention' : isReply ? 'reply' : 'reference';
      
      const event = {
        type: eventType,
        from: {
          id: cast.fid.toString(),
          handle: cast.author?.username || `fid:${cast.fid}`,
          name: cast.author?.displayName || cast.author?.username || `User ${cast.fid}`,
          avatar: cast.author?.pfp?.url || null,
          bio: cast.author?.profile?.bio?.text || null
        },
        content: text,
        metadata: {
          castHash: cast.hash,
          castUrl: `https://warpcast.com/${cast.author?.username || cast.fid}/${cast.hash.slice(0, 10)}`,
          parentHash: parentHash,
          mentions: cast.mentions || [],
          embeds: cast.embeds || [],
          timestamp: cast.timestamp,
          reactions: cast.reactions || {}
        },
        signal_score: mentionsFid ? 80 : isReply ? 70 : 50
      };
      
      const eventId = await forwardToVibe(kv, event);
      if (eventId) {
        results.push({
          type: eventType,
          from: event.from.handle,
          eventId
        });
      }
      
    } catch (e) {
      console.error('[Farcaster Webhook] Error processing cast:', e);
    }
  }
  
  return results;
}

/**
 * Process Farcaster reaction events
 */
async function processReactionEvents(reactions, kv) {
  const results = [];
  
  for (const reaction of reactions) {
    try {
      // Only process reactions to our casts
      if (!reaction.targetCast || reaction.targetCast.fid !== parseInt(FARCASTER_FID)) continue;
      
      const reactionType = reaction.reactionType; // 1 = like, 2 = recast
      const reactionText = reactionType === 1 ? 'liked' : reactionType === 2 ? 'recasted' : 'reacted to';
      
      const event = {
        type: 'reaction',
        from: {
          id: reaction.fid.toString(),
          handle: reaction.author?.username || `fid:${reaction.fid}`,
          name: reaction.author?.displayName || reaction.author?.username || `User ${reaction.fid}`,
          avatar: reaction.author?.pfp?.url || null
        },
        content: `${reactionText} your cast: "${(reaction.targetCast.text || '').slice(0, 50)}..."`,
        metadata: {
          reactionType,
          targetCastHash: reaction.targetCast.hash,
          targetCastText: reaction.targetCast.text,
          timestamp: reaction.timestamp
        },
        signal_score: reactionType === 2 ? 75 : 60 // Recasts > likes
      };
      
      const eventId = await forwardToVibe(kv, event);
      if (eventId) {
        results.push({
          type: 'reaction',
          from: event.from.handle,
          eventId
        });
      }
      
    } catch (e) {
      console.error('[Farcaster Webhook] Error processing reaction:', e);
    }
  }
  
  return results;
}

/**
 * Process Farcaster follow events
 */
async function processFollowEvents(follows, kv) {
  const results = [];
  
  for (const follow of follows) {
    try {
      // Only process follows of our account
      if (follow.targetFid !== parseInt(FARCASTER_FID)) continue;
      
      const event = {
        type: 'follow',
        from: {
          id: follow.fid.toString(),
          handle: follow.author?.username || `fid:${follow.fid}`,
          name: follow.author?.displayName || follow.author?.username || `User ${follow.fid}`,
          avatar: follow.author?.pfp?.url || null,
          bio: follow.author?.profile?.bio?.text || null
        },
        content: `${follow.author?.username || `fid:${follow.fid}`} followed you on Farcaster`,
        metadata: {
          followerId: follow.fid,
          timestamp: follow.timestamp,
          followerCount: follow.author?.followerCount || null
        },
        signal_score: 70
      };
      
      const eventId = await forwardToVibe(kv, event);
      if (eventId) {
        results.push({
          type: 'follow',
          from: event.from.handle,
          eventId
        });
      }
      
    } catch (e) {
      console.error('[Farcaster Webhook] Error processing follow:', e);
    }
  }
  
  return results;
}

export default async function handler(req, res) {
  const { method, body, headers } = req;
  
  console.log(`[Farcaster Webhook] ${method} request received`);
  
  try {
    // Handle webhook events (POST request from Farcaster Hub)
    if (method === 'POST') {
      const signature = headers['x-farcaster-signature'];
      const bodyStr = JSON.stringify(body);
      
      // Verify signature if configured
      if (!verifyFarcasterSignature(bodyStr, signature, FARCASTER_WEBHOOK_SECRET)) {
        console.warn('[Farcaster Webhook] Invalid signature');
        return res.status(401).json({
          error: 'Invalid webhook signature'
        });
      }
      
      console.log('[Farcaster Webhook] Signature verified, processing events...');
      
      const kv = await getKV();
      if (!kv) {
        console.warn('[Farcaster Webhook] KV not available');
        return res.status(503).json({
          error: 'Storage unavailable'
        });
      }
      
      const results = [];
      
      // Process different Farcaster event types
      if (body.casts && body.casts.length > 0) {
        console.log(`[Farcaster Webhook] Processing ${body.casts.length} cast events`);
        const castResults = await processCastEvents(body.casts, kv);
        results.push(...castResults);
      }
      
      if (body.reactions && body.reactions.length > 0) {
        console.log(`[Farcaster Webhook] Processing ${body.reactions.length} reaction events`);
        const reactionResults = await processReactionEvents(body.reactions, kv);
        results.push(...reactionResults);
      }
      
      if (body.follows && body.follows.length > 0) {
        console.log(`[Farcaster Webhook] Processing ${body.follows.length} follow events`);
        const followResults = await processFollowEvents(body.follows, kv);
        results.push(...followResults);
      }
      
      // Store webhook delivery stats
      const statsKey = 'vibe:farcaster_webhook_stats';
      const stats = await kv.hgetall(statsKey) || {};
      const today = new Date().toISOString().split('T')[0];
      
      stats.total_deliveries = (parseInt(stats.total_deliveries) || 0) + 1;
      stats.last_delivery = new Date().toISOString();
      stats[`deliveries_${today}`] = (parseInt(stats[`deliveries_${today}`]) || 0) + 1;
      stats.events_processed = (parseInt(stats.events_processed) || 0) + results.length;
      
      await kv.hmset(statsKey, stats);
      
      console.log(`[Farcaster Webhook] Processed ${results.length} events successfully`);
      
      return res.status(200).json({
        status: 'success',
        events_processed: results.length,
        events: results.map(r => ({
          type: r.type,
          from: r.from
        }))
      });
    }
    
    // Handle health check
    if (method === 'GET') {
      const kv = await getKV();
      const stats = kv ? await kv.hgetall('vibe:farcaster_webhook_stats') : null;
      
      return res.status(200).json({
        status: 'healthy',
        webhook_url: '/api/webhooks/farcaster',
        configured: {
          private_key: !!FARCASTER_PRIVATE_KEY,
          fid: !!FARCASTER_FID,
          hub_url: !!FARCASTER_HUB_URL,
          webhook_secret: !!FARCASTER_WEBHOOK_SECRET
        },
        kv_available: !!kv,
        stats: stats || { total_deliveries: 0, events_processed: 0 },
        supported_events: ['casts', 'reactions', 'follows'],
        setup: {
          required_env: [
            'FARCASTER_PRIVATE_KEY - Your Farcaster account private key',
            'FARCASTER_FID - Your Farcaster ID number',
            'FARCASTER_WEBHOOK_SECRET - Secret for signature verification'
          ],
          webhook_url: `https://${req.headers.host}/api/webhooks/farcaster`,
          hub_api: FARCASTER_HUB_URL
        }
      });
    }
    
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET', 'POST']
    });
    
  } catch (error) {
    console.error('[Farcaster Webhook] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}