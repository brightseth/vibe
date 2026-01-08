/**
 * /api/webhooks/x — X (Twitter) Webhook Endpoint
 * 
 * Receives real-time events from X Platform:
 * - Tweet mentions
 * - Direct messages
 * - Likes, follows (optional)
 * 
 * Verifies webhook signature and forwards events to /vibe core.
 */

import crypto from 'crypto';

// X webhook config
const X_WEBHOOK_SECRET = process.env.X_WEBHOOK_SECRET;
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;

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
 * Verify X webhook signature
 */
function verifyXSignature(body, signature, secret) {
  if (!secret) {
    console.warn('[X Webhook] Secret not configured - skipping verification');
    return true; // Allow in development
  }
  
  if (!signature) return false;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');
    
  return signature === `sha256=${expectedSignature}`;
}

/**
 * Handle X webhook challenge (CRC check)
 */
function handleChallenge(crcToken, secret) {
  if (!secret) {
    throw new Error('X_WEBHOOK_SECRET required for CRC challenge');
  }
  
  const responseToken = crypto
    .createHmac('sha256', secret)
    .update(crcToken)
    .digest('base64');
    
  return { response_token: `sha256=${responseToken}` };
}

/**
 * Forward X event to /vibe inbox
 */
async function forwardToVibe(kv, event) {
  try {
    const inboxKey = 'vibe:social_inbox';
    const eventId = `x_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    const inboxEvent = {
      id: eventId,
      platform: 'x',
      type: event.type,
      timestamp: new Date().toISOString(),
      from: event.from,
      content: event.content,
      metadata: event.metadata || {},
      processed: false
    };
    
    // Add to social inbox
    await kv.lpush(inboxKey, JSON.stringify(inboxEvent));
    
    // Keep only last 100 events
    await kv.ltrim(inboxKey, 0, 99);
    
    console.log(`[X Webhook] Forwarded ${event.type} to /vibe:`, eventId);
    return eventId;
    
  } catch (e) {
    console.error('[X Webhook] Failed to forward to /vibe:', e);
    return null;
  }
}

/**
 * Process tweet creation events (mentions)
 */
async function processTweetEvents(tweets, kv) {
  const results = [];
  
  for (const tweet of tweets) {
    try {
      // Check if this is a mention (contains @handle or is reply)
      const tweetText = tweet.text || '';
      const mentions = tweet.entities?.user_mentions || [];
      const isReply = !!tweet.in_reply_to_user_id_str;
      const isMention = mentions.length > 0 || isReply;
      
      if (!isMention) continue; // Skip non-mentions
      
      const event = {
        type: 'mention',
        from: {
          id: tweet.user.id_str,
          handle: tweet.user.screen_name,
          name: tweet.user.name,
          avatar: tweet.user.profile_image_url_https
        },
        content: tweetText,
        metadata: {
          tweetId: tweet.id_str,
          url: `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
          isReply,
          replyToId: tweet.in_reply_to_status_id_str,
          mentions: mentions.map(m => ({ id: m.id_str, handle: m.screen_name }))
        }
      };
      
      const eventId = await forwardToVibe(kv, event);
      if (eventId) {
        results.push({
          type: 'mention',
          from: `@${tweet.user.screen_name}`,
          eventId
        });
      }
      
    } catch (e) {
      console.error('[X Webhook] Error processing tweet:', e);
    }
  }
  
  return results;
}

/**
 * Process direct message events
 */
async function processDMEvents(directMessages, kv) {
  const results = [];
  
  for (const dm of directMessages) {
    try {
      const messageData = dm.message_create;
      if (!messageData) continue;
      
      const event = {
        type: 'dm',
        from: {
          id: messageData.sender_id,
          handle: 'Unknown', // Would need user lookup
          name: 'Unknown User'
        },
        content: messageData.message_data.text,
        metadata: {
          dmId: dm.id,
          conversationId: messageData.target.recipient_id,
          createdAt: new Date(parseInt(dm.created_timestamp)).toISOString()
        }
      };
      
      const eventId = await forwardToVibe(kv, event);
      if (eventId) {
        results.push({
          type: 'dm',
          from: messageData.sender_id,
          eventId
        });
      }
      
    } catch (e) {
      console.error('[X Webhook] Error processing DM:', e);
    }
  }
  
  return results;
}

/**
 * Process favorite (like) events
 */
async function processFavoriteEvents(favorites, kv) {
  const results = [];
  
  for (const favorite of favorites) {
    try {
      const event = {
        type: 'like',
        from: {
          id: favorite.user.id_str,
          handle: favorite.user.screen_name,
          name: favorite.user.name,
          avatar: favorite.user.profile_image_url_https
        },
        content: `Liked your tweet: "${(favorite.favorited_status.text || '').slice(0, 50)}..."`,
        metadata: {
          tweetId: favorite.favorited_status.id_str,
          tweetText: favorite.favorited_status.text,
          likeId: favorite.id_str
        }
      };
      
      const eventId = await forwardToVibe(kv, event);
      if (eventId) {
        results.push({
          type: 'like',
          from: `@${favorite.user.screen_name}`,
          eventId
        });
      }
      
    } catch (e) {
      console.error('[X Webhook] Error processing like:', e);
    }
  }
  
  return results;
}

/**
 * Process follow events
 */
async function processFollowEvents(follows, kv) {
  const results = [];
  
  for (const follow of follows) {
    try {
      const event = {
        type: 'follow',
        from: {
          id: follow.source.id_str,
          handle: follow.source.screen_name,
          name: follow.source.name,
          avatar: follow.source.profile_image_url_https
        },
        content: `@${follow.source.screen_name} followed you`,
        metadata: {
          followerId: follow.source.id_str,
          bio: follow.source.description
        }
      };
      
      const eventId = await forwardToVibe(kv, event);
      if (eventId) {
        results.push({
          type: 'follow',
          from: `@${follow.source.screen_name}`,
          eventId
        });
      }
      
    } catch (e) {
      console.error('[X Webhook] Error processing follow:', e);
    }
  }
  
  return results;
}

export default async function handler(req, res) {
  const { method, query, body, headers } = req;
  
  console.log(`[X Webhook] ${method} request received`);
  
  try {
    // Handle CRC challenge (GET request from X for webhook verification)
    if (method === 'GET' && query.crc_token) {
      console.log('[X Webhook] CRC challenge received');
      
      if (!X_WEBHOOK_SECRET) {
        return res.status(500).json({
          error: 'X_WEBHOOK_SECRET not configured'
        });
      }
      
      const challenge = handleChallenge(query.crc_token, X_WEBHOOK_SECRET);
      console.log('[X Webhook] CRC challenge passed');
      
      return res.status(200).json(challenge);
    }
    
    // Handle webhook events (POST request from X)
    if (method === 'POST') {
      const signature = headers['x-twitter-webhooks-signature'];
      const bodyStr = JSON.stringify(body);
      
      // Verify signature
      if (!verifyXSignature(bodyStr, signature, X_WEBHOOK_SECRET)) {
        console.warn('[X Webhook] Invalid signature');
        return res.status(401).json({
          error: 'Invalid webhook signature'
        });
      }
      
      console.log('[X Webhook] Signature verified, processing events...');
      
      const kv = await getKV();
      if (!kv) {
        console.warn('[X Webhook] KV not available');
        return res.status(503).json({
          error: 'Storage unavailable'
        });
      }
      
      const results = [];
      
      // Process different event types
      if (body.tweet_create_events) {
        console.log(`[X Webhook] Processing ${body.tweet_create_events.length} tweet events`);
        const tweetResults = await processTweetEvents(body.tweet_create_events, kv);
        results.push(...tweetResults);
      }
      
      if (body.direct_message_events) {
        console.log(`[X Webhook] Processing ${body.direct_message_events.length} DM events`);
        const dmResults = await processDMEvents(body.direct_message_events, kv);
        results.push(...dmResults);
      }
      
      if (body.favorite_events) {
        console.log(`[X Webhook] Processing ${body.favorite_events.length} favorite events`);
        const favoriteResults = await processFavoriteEvents(body.favorite_events, kv);
        results.push(...favoriteResults);
      }
      
      if (body.follow_events) {
        console.log(`[X Webhook] Processing ${body.follow_events.length} follow events`);
        const followResults = await processFollowEvents(body.follow_events, kv);
        results.push(...followResults);
      }
      
      // Store webhook delivery stats
      const statsKey = 'vibe:x_webhook_stats';
      const stats = await kv.hgetall(statsKey) || {};
      const today = new Date().toISOString().split('T')[0];
      
      stats.total_deliveries = (parseInt(stats.total_deliveries) || 0) + 1;
      stats.last_delivery = new Date().toISOString();
      stats[`deliveries_${today}`] = (parseInt(stats[`deliveries_${today}`]) || 0) + 1;
      stats.events_processed = (parseInt(stats.events_processed) || 0) + results.length;
      
      await kv.hmset(statsKey, stats);
      
      console.log(`[X Webhook] Processed ${results.length} events successfully`);
      
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
      const stats = kv ? await kv.hgetall('vibe:x_webhook_stats') : null;
      
      return res.status(200).json({
        status: 'healthy',
        webhook_url: '/api/webhooks/x',
        configured: !!X_WEBHOOK_SECRET,
        kv_available: !!kv,
        stats: stats || { total_deliveries: 0, events_processed: 0 }
      });
    }
    
    return res.status(405).json({
      error: 'Method not allowed',
      allowed: ['GET', 'POST']
    });
    
  } catch (error) {
    console.error('[X Webhook] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}