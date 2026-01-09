/**
 * vibe webhook-test — Test webhook endpoints
 *
 * Send test events to webhook endpoints to verify they're working.
 * Useful for debugging X, Telegram, Discord webhook integrations.
 */

const { requireInit, header, divider, success, warning, error } = require('./_shared');

const definition = {
  name: 'vibe_webhook_test',
  description: 'Test webhook endpoints and view webhook activity',
  inputSchema: {
    type: 'object',
    properties: {
      endpoint: {
        type: 'string',
        enum: ['x', 'telegram', 'discord', 'all'],
        description: 'Which webhook to test (default: all)'
      },
      action: {
        type: 'string',
        enum: ['test', 'status', 'stats', 'events'],
        description: 'Test webhook, check status, view stats, or list recent events'
      },
      mock_event: {
        type: 'string',
        enum: ['mention', 'dm', 'like', 'follow'],
        description: 'Type of mock event to send (for testing)'
      },
      limit: {
        type: 'number',
        description: 'Number of recent events to show (default: 10)'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const {
    endpoint = 'all',
    action = 'status',
    mock_event = 'mention',
    limit = 10
  } = args;

  try {
    switch (action) {
      case 'test':
        return await testWebhook(endpoint, mock_event);
      case 'status':
        return await checkWebhookStatus(endpoint);
      case 'stats':
        return await getWebhookStats(endpoint);
      case 'events':
        return await getRecentEvents(endpoint, limit);
      default:
        return { display: error('Invalid action') };
    }
  } catch (e) {
    return {
      display: `${header('Webhook Test')}\n\n${error('Test failed: ' + e.message)}`
    };
  }
}

async function testWebhook(endpoint, mockEvent) {
  let display = header('Webhook Test');
  display += '\n\n';

  if (endpoint === 'x' || endpoint === 'all') {
    display += await testXWebhook(mockEvent);
    display += '\n';
  }

  if (endpoint === 'telegram' || endpoint === 'all') {
    display += '**Telegram Webhook:** Not yet implemented\n\n';
  }

  if (endpoint === 'discord' || endpoint === 'all') {
    display += '**Discord Webhook:** Not yet implemented\n\n';
  }

  display += divider();
  display += '**Next steps:**\n';
  display += '• Check webhook events: `vibe webhook-test --action events`\n';
  display += '• View social inbox: `vibe social-inbox --include_webhooks`\n';
  display += '• Monitor bridge health: `vibe bridge-health`';

  return { display };
}

async function testXWebhook(mockEvent) {
  let result = '**X (Twitter) Webhook Test**\n';

  // Check if endpoint exists
  const webhookUrl = '/api/webhooks/x';
  result += `Endpoint: ${webhookUrl}\n`;

  // Check configuration
  const secret = process.env.X_WEBHOOK_SECRET;
  const configured = !!secret;
  result += `Secret configured: ${configured ? '✅' : '❌'}\n`;

  if (!configured) {
    result += warning('Set X_WEBHOOK_SECRET environment variable\n');
    return result;
  }

  // Create mock event
  const mockEvents = {
    mention: {
      tweet_create_events: [{
        id_str: 'test_' + Date.now(),
        text: '@yourusername This is a test mention from webhook-test',
        created_at: new Date().toISOString(),
        user: {
          id_str: 'test_user_123',
          screen_name: 'testuser',
          name: 'Test User',
          profile_image_url_https: 'https://example.com/avatar.jpg'
        },
        entities: {
          user_mentions: [{
            id_str: 'your_user_id',
            screen_name: 'yourusername'
          }]
        }
      }]
    },
    dm: {
      direct_message_events: [{
        id: 'test_dm_' + Date.now(),
        created_timestamp: Date.now().toString(),
        message_create: {
          sender_id: 'test_user_123',
          target: { recipient_id: 'your_user_id' },
          message_data: { text: 'Test DM from webhook-test tool' }
        }
      }]
    },
    like: {
      favorite_events: [{
        id_str: 'test_like_' + Date.now(),
        created_at: new Date().toISOString(),
        user: {
          id_str: 'test_user_123',
          screen_name: 'testuser',
          name: 'Test User',
          profile_image_url_https: 'https://example.com/avatar.jpg'
        },
        favorited_status: {
          id_str: 'your_tweet_123',
          text: 'Your tweet that got liked',
          user: { id_str: 'your_user_id' }
        }
      }]
    },
    follow: {
      follow_events: [{
        source: {
          id_str: 'test_user_123',
          screen_name: 'testuser',
          name: 'Test User',
          profile_image_url_https: 'https://example.com/avatar.jpg',
          description: 'A test user following you'
        },
        target: { id_str: 'your_user_id' },
        created_at: new Date().toISOString()
      }]
    }
  };

  const testPayload = mockEvents[mockEvent] || mockEvents.mention;
  result += `Mock event: ${mockEvent}\n`;

  // Generate test signature
  const crypto = require('crypto');
  const body = JSON.stringify(testPayload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');

  result += `Event size: ${body.length} bytes\n`;
  result += success('Mock event ready for webhook\n');

  // Note: We don't actually send the request to avoid spamming
  // In a real implementation, this could make an HTTP request to localhost
  result += warning('Note: This creates a mock event structure.\n');
  result += 'To test fully, send POST to /api/webhooks/x with:\n';
  result += `• Header: x-twitter-webhooks-signature: sha256=${signature}\n`;
  result += `• Body: ${body.slice(0, 100)}...\n`;

  return result;
}

async function checkWebhookStatus(endpoint) {
  let display = header('Webhook Status');
  display += '\n\n';

  // X webhook status
  if (endpoint === 'x' || endpoint === 'all') {
    const xSecret = process.env.X_WEBHOOK_SECRET;
    const xBearer = process.env.X_BEARER_TOKEN;
    
    display += '**X (Twitter) Webhook**\n';
    display += `Endpoint: /api/webhooks/x\n`;
    display += `Secret: ${xSecret ? '✅ Configured' : '❌ Missing'}\n`;
    display += `Bearer Token: ${xBearer ? '✅ Configured' : '❌ Missing'}\n`;
    
    if (xSecret && xBearer) {
      display += success('Ready for CRC challenge and events\n');
    } else {
      display += warning('Set X_WEBHOOK_SECRET and X_BEARER_TOKEN\n');
    }
    display += '\n';
  }

  // General webhook system
  const kvConfigured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  display += '**Storage System**\n';
  display += `KV Store: ${kvConfigured ? '✅ Available' : '❌ Not configured'}\n`;
  display += `Social Inbox: ${kvConfigured ? '✅ Active' : '❌ Disabled'}\n`;
  
  if (!kvConfigured) {
    display += warning('Set KV_REST_API_URL and KV_REST_API_TOKEN for event storage\n');
  }
  display += '\n';

  display += divider();
  display += '**Webhook URLs (for X Developer Portal):**\n';
  display += '• Development: `https://yourapp.vercel.app/api/webhooks/x`\n';
  display += '• Production: `https://vibe.fyi/api/webhooks/x`\n\n';
  display += '**Required X Webhook Events:**\n';
  display += '• Tweet create events (mentions)\n';
  display += '• Direct message events\n';
  display += '• Favorite events (optional)\n';
  display += '• Follow events (optional)';

  return { display };
}

async function getWebhookStats(endpoint) {
  let display = header('Webhook Statistics');
  display += '\n\n';

  try {
    const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    if (!KV_CONFIGURED) {
      display += warning('KV storage not configured - no stats available\n');
      return { display };
    }

    const { kv } = await import('@vercel/kv');

    // X webhook stats
    if (endpoint === 'x' || endpoint === 'all') {
      const xStats = await kv.hgetall('vibe:x_webhook_stats') || {};
      
      display += '**X Webhook Stats**\n';
      display += `Total deliveries: ${xStats.total_deliveries || 0}\n`;
      display += `Events processed: ${xStats.events_processed || 0}\n`;
      display += `Last delivery: ${xStats.last_delivery ? new Date(xStats.last_delivery).toLocaleString() : 'Never'}\n`;
      
      // Daily stats (last 7 days)
      const today = new Date();
      const dailyStats = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const count = parseInt(xStats[`deliveries_${dateKey}`]) || 0;
        if (count > 0) {
          dailyStats.push(`${dateKey}: ${count}`);
        }
      }
      
      if (dailyStats.length > 0) {
        display += `Daily activity (last 7d): ${dailyStats.join(', ')}\n`;
      }
      
      display += '\n';
    }

    display += divider();
    display += '**Health Check:**\n';
    display += '• Test webhook: `vibe webhook-test --action test --endpoint x`\n';
    display += '• View recent events: `vibe webhook-test --action events --limit 5`\n';
    display += '• Check social inbox: `vibe social-inbox --channel webhooks`';

  } catch (e) {
    display += error(`Stats unavailable: ${e.message}\n`);
  }

  return { display };
}

async function getRecentEvents(endpoint, limit) {
  let display = header(`Recent Webhook Events (${limit})`);
  display += '\n\n';

  try {
    const KV_CONFIGURED = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    if (!KV_CONFIGURED) {
      display += warning('KV storage not configured - no events available\n');
      return { display };
    }

    const { kv } = await import('@vercel/kv');
    const inboxKey = 'vibe:social_inbox';
    
    const rawEvents = await kv.lrange(inboxKey, 0, limit - 1);
    
    if (rawEvents.length === 0) {
      display += '_No recent webhook events._\n\n';
      display += 'Events will appear here when webhooks are triggered.\n';
      display += 'Test with: `vibe webhook-test --action test --endpoint x`';
      return { display };
    }

    display += `Found ${rawEvents.length} recent events:\n`;
    display += divider();
    display += '\n';

    for (const eventStr of rawEvents) {
      try {
        const event = JSON.parse(eventStr);
        const timeAgo = formatTimeAgo(new Date(event.timestamp));
        
        display += `**${event.platform.toUpperCase()}** ${getTypeIcon(event.type)} — _${timeAgo}_\n`;
        display += `From: @${event.from.handle} (${event.from.name})\n`;
        display += `${event.content.slice(0, 100)}${event.content.length > 100 ? '...' : ''}\n`;
        
        if (event.metadata?.url) {
          display += `Link: ${event.metadata.url}\n`;
        }
        
        display += `Status: ${event.processed ? '✅ Processed' : '⏳ Pending'}\n`;
        display += `_[${event.id}]_\n\n`;
        
      } catch (e) {
        display += `_Invalid event data_\n\n`;
      }
    }

    display += divider();
    display += '**Actions:**\n';
    display += '• View in social inbox: `vibe social-inbox --include_webhooks`\n';
    display += '• Reply to event: `vibe social-post --content "reply"`\n';
    display += '• Clear events: `vibe webhook-test --action clear` (not implemented)';

  } catch (e) {
    display += error(`Failed to fetch events: ${e.message}\n`);
  }

  return { display };
}

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function getTypeIcon(type) {
  const icons = {
    mention: '@',
    reply: '↩️',
    dm: '✉️',
    like: '❤️',
    repost: '🔁',
    follow: '👤'
  };
  return icons[type] || '📡';
}

module.exports = { definition, handler };