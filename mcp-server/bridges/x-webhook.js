/**
 * /vibe X (Twitter) Webhook Bridge
 * 
 * Receives real-time updates from X via webhooks:
 * - Mentions of your account
 * - DMs received  
 * - Likes, retweets, follows (optional)
 * 
 * Requires X API v2 with webhook subscription.
 */

const crypto = require('crypto');
const twitter = require('../twitter');
const config = require('../config');

/**
 * Get X webhook configuration
 */
function getConfig() {
  const cfg = config.load();
  return {
    webhookSecret: cfg.x_webhook_secret || process.env.X_WEBHOOK_SECRET || null,
    bearerToken: cfg.x_bearer_token || process.env.X_BEARER_TOKEN || null,
    clientId: cfg.x_client_id || process.env.X_CLIENT_ID || null,
    subscriptionId: cfg.x_subscription_id || process.env.X_SUBSCRIPTION_ID || null,
    challengeVerified: cfg.x_challenge_verified || false
  };
}

/**
 * Verify X webhook signature
 */
function verifyXSignature(body, signature, secret) {
  if (!secret) {
    console.warn('X webhook secret not configured - skipping signature verification');
    return true;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');
    
  return signature === `sha256=${expectedSignature}`;
}

/**
 * Handle X webhook challenge (CRC)
 * Required for webhook URL verification
 */
function handleChallenge(crcToken, secret) {
  if (!secret) {
    throw new Error('X webhook secret required for CRC challenge');
  }
  
  const responseToken = crypto
    .createHmac('sha256', secret)
    .update(crcToken)
    .digest('base64');
    
  return { response_token: `sha256=${responseToken}` };
}

/**
 * Process incoming X webhook event
 */
async function processWebhookEvent(event) {
  const results = [];
  
  // Handle tweet create events (mentions)
  if (event.tweet_create_events) {
    for (const tweet of event.tweet_create_events) {
      const result = await processTweetEvent(tweet);
      if (result) results.push(result);
    }
  }
  
  // Handle direct message events
  if (event.direct_message_events) {
    for (const dm of event.direct_message_events) {
      const result = await processDMEvent(dm);
      if (result) results.push(result);
    }
  }
  
  // Handle favorite events (likes)
  if (event.favorite_events) {
    for (const favorite of event.favorite_events) {
      const result = await processFavoriteEvent(favorite);
      if (result) results.push(result);
    }
  }
  
  // Handle follow events
  if (event.follow_events) {
    for (const follow of event.follow_events) {
      const result = await processFollowEvent(follow);
      if (result) results.push(result);
    }
  }
  
  return {
    processed: results.length > 0,
    events: results,
    summary: `Processed ${results.length} events`
  };
}

/**
 * Process tweet creation (potential mention)
 */
async function processTweetEvent(tweet) {
  try {
    // Check if this is a mention of our user
    const credentials = twitter.getCredentials();
    if (!credentials) return null;
    
    // Get our user info to check for mentions
    const me = await twitter.getMe();
    const myUsername = me.data.username.toLowerCase();
    const myUserId = me.data.id;
    
    // Skip our own tweets
    if (tweet.user.id_str === myUserId) return null;
    
    const tweetText = tweet.text.toLowerCase();
    const isMention = tweetText.includes(`@${myUsername}`) || 
                     (tweet.in_reply_to_user_id_str === myUserId);
    
    if (!isMention) return null;
    
    // Format mention for /vibe
    const mention = {
      id: `x:${tweet.id_str}`,
      type: 'mention',
      platform: 'x',
      from: {
        id: tweet.user.id_str,
        handle: tweet.user.screen_name,
        name: tweet.user.name,
        avatar: tweet.user.profile_image_url_https
      },
      content: tweet.text,
      timestamp: new Date(tweet.created_at).toISOString(),
      url: `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`,
      isReply: !!tweet.in_reply_to_status_id_str,
      replyToId: tweet.in_reply_to_status_id_str,
      raw: tweet
    };
    
    // Forward to /vibe
    await forwardMentionToVibe(mention);
    
    return {
      type: 'mention',
      message: `Mention from @${tweet.user.screen_name}`,
      content: tweet.text.slice(0, 100) + (tweet.text.length > 100 ? '...' : '')
    };
    
  } catch (e) {
    console.error('Error processing tweet event:', e);
    return null;
  }
}

/**
 * Process direct message event
 */
async function processDMEvent(dm) {
  try {
    // Skip if this is a message we sent
    const credentials = twitter.getCredentials();
    if (!credentials) return null;
    
    const me = await twitter.getMe();
    const myUserId = me.data.id;
    
    if (dm.message_create.sender_id === myUserId) return null;
    
    // Format DM for /vibe
    const message = {
      id: `x:dm:${dm.id}`,
      type: 'dm',
      platform: 'x',
      from: {
        id: dm.message_create.sender_id,
        handle: 'unknown', // Would need to lookup user
        name: 'Unknown User'
      },
      content: dm.message_create.message_data.text,
      timestamp: new Date(parseInt(dm.created_timestamp)).toISOString(),
      conversationId: dm.message_create.target.recipient_id,
      raw: dm
    };
    
    // Forward to /vibe
    await forwardDMToVibe(message);
    
    return {
      type: 'dm',
      message: `DM received`,
      content: dm.message_create.message_data.text.slice(0, 100)
    };
    
  } catch (e) {
    console.error('Error processing DM event:', e);
    return null;
  }
}

/**
 * Process favorite (like) event
 */
async function processFavoriteEvent(favorite) {
  try {
    const credentials = twitter.getCredentials();
    if (!credentials) return null;
    
    const me = await twitter.getMe();
    const myUserId = me.data.id;
    
    // Only care about likes on our tweets
    if (favorite.favorited_status.user.id_str !== myUserId) return null;
    
    const like = {
      id: `x:like:${favorite.id_str}`,
      type: 'like',
      platform: 'x',
      from: {
        id: favorite.user.id_str,
        handle: favorite.user.screen_name,
        name: favorite.user.name
      },
      tweetId: favorite.favorited_status.id_str,
      tweetText: favorite.favorited_status.text.slice(0, 100),
      timestamp: new Date(favorite.created_at).toISOString()
    };
    
    // Forward to /vibe (optional, might be noisy)
    // await forwardLikeToVibe(like);
    
    return {
      type: 'like',
      message: `@${favorite.user.screen_name} liked your tweet`,
      content: favorite.favorited_status.text.slice(0, 50)
    };
    
  } catch (e) {
    console.error('Error processing favorite event:', e);
    return null;
  }
}

/**
 * Process follow event
 */
async function processFollowEvent(follow) {
  try {
    const credentials = twitter.getCredentials();
    if (!credentials) return null;
    
    const me = await twitter.getMe();
    const myUserId = me.data.id;
    
    // Only care about follows of our account
    if (follow.target.id_str !== myUserId) return null;
    
    const follower = {
      id: `x:follow:${follow.source.id_str}`,
      type: 'follow',
      platform: 'x',
      from: {
        id: follow.source.id_str,
        handle: follow.source.screen_name,
        name: follow.source.name,
        avatar: follow.source.profile_image_url_https
      },
      timestamp: new Date(follow.created_at).toISOString()
    };
    
    // Forward to /vibe
    await forwardFollowToVibe(follower);
    
    return {
      type: 'follow',
      message: `@${follow.source.screen_name} followed you`,
      content: follow.source.description || 'No bio'
    };
    
  } catch (e) {
    console.error('Error processing follow event:', e);
    return null;
  }
}

/**
 * Forward mention to /vibe core
 */
async function forwardMentionToVibe(mention) {
  console.log(`[X Webhook] Mention from @${mention.from.handle}: ${mention.content}`);
  
  // In a full implementation, this would:
  // 1. Add to /vibe inbox
  // 2. Notify online users
  // 3. Check for /vibe commands in the mention
  // 4. Auto-reply if appropriate
}

/**
 * Forward DM to /vibe core
 */
async function forwardDMToVibe(dm) {
  console.log(`[X Webhook] DM: ${dm.content}`);
  
  // In a full implementation, this would:
  // 1. Add to /vibe DM inbox
  // 2. Check for /vibe commands
  // 3. Route to appropriate user if multi-user
}

/**
 * Forward follow to /vibe core
 */
async function forwardFollowToVibe(follow) {
  console.log(`[X Webhook] New follower: @${follow.from.handle}`);
  
  // In a full implementation, this would:
  // 1. Add to /vibe activity feed
  // 2. Optionally auto-follow back
  // 3. Check if follower is in /vibe community
}

/**
 * Setup X webhook subscription
 * This requires X API v2 Premium/Enterprise access
 */
async function setupWebhook(webhookUrl) {
  const config = getConfig();
  
  if (!config.bearerToken) {
    throw new Error('X Bearer Token required for webhook setup');
  }
  
  // This would use X API v2 to create webhook subscription
  // Implementation depends on X's webhook API
  console.log(`Setting up X webhook for: ${webhookUrl}`);
  
  return {
    success: true,
    webhookUrl,
    subscriptionId: 'mock-subscription-id',
    events: ['tweet.create', 'direct_message_events', 'favorite_events', 'follow_events']
  };
}

/**
 * Get X webhook subscription status
 */
async function getWebhookStatus() {
  const config = getConfig();
  
  return {
    configured: !!config.webhookSecret,
    subscriptionActive: !!config.subscriptionId,
    challengeVerified: config.challengeVerified,
    events: [
      'tweet.create (mentions)',
      'direct_message_events', 
      'favorite_events (likes)',
      'follow_events'
    ]
  };
}

/**
 * Express middleware for X webhook endpoint
 */
function createXWebhookHandler() {
  return async (req, res) => {
    const { method, query, body, headers } = req;
    
    try {
      // Handle CRC challenge
      if (method === 'GET' && query.crc_token) {
        const config = getConfig();
        const response = handleChallenge(query.crc_token, config.webhookSecret);
        return res.json(response);
      }
      
      // Handle webhook events
      if (method === 'POST') {
        const config = getConfig();
        const signature = headers['x-twitter-webhooks-signature'];
        
        if (!verifyXSignature(JSON.stringify(body), signature, config.webhookSecret)) {
          return res.status(401).json({ error: 'Invalid signature' });
        }
        
        const result = await processWebhookEvent(body);
        return res.json({ 
          status: 'ok', 
          ...result 
        });
      }
      
      res.status(405).json({ error: 'Method not allowed' });
      
    } catch (e) {
      console.error('X webhook error:', e);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = {
  getConfig,
  verifyXSignature,
  handleChallenge,
  processWebhookEvent,
  setupWebhook,
  getWebhookStatus,
  createXWebhookHandler
};