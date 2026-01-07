/**
 * /vibe WhatsApp Bridge
 *
 * Two-way bridge between /vibe and WhatsApp using WhatsApp Business API.
 * - Receive messages from WhatsApp contacts
 * - Send updates to WhatsApp groups/contacts
 * - Support for /vibe commands via WhatsApp
 */

const config = require('../config');

/**
 * Get WhatsApp credentials from config
 */
function getCredentials() {
  const cfg = config.load();
  return {
    accessToken: cfg.whatsapp_access_token || process.env.WHATSAPP_ACCESS_TOKEN || null,
    phoneNumberId: cfg.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    businessAccountId: cfg.whatsapp_business_account_id || process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || null,
    webhookVerifyToken: cfg.whatsapp_webhook_verify_token || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || null,
    vibeGroupId: cfg.whatsapp_vibe_group_id || process.env.WHATSAPP_VIBE_GROUP_ID || null
  };
}

/**
 * Check if WhatsApp bridge is configured
 */
function isConfigured() {
  const creds = getCredentials();
  return !!(creds.accessToken && creds.phoneNumberId);
}

/**
 * Make authenticated request to WhatsApp Business API
 */
async function whatsappRequest(method, endpoint, body = null) {
  const { accessToken } = getCredentials();
  if (!accessToken) throw new Error('WhatsApp access token not configured');

  const baseUrl = 'https://graph.facebook.com/v18.0';
  const url = `${baseUrl}${endpoint}`;

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error ${response.status}: ${error}`);
  }

  return response.json();
}

/**
 * Send text message to WhatsApp contact or group
 */
async function sendMessage(to, text, options = {}) {
  const { phoneNumberId } = getCredentials();
  if (!phoneNumberId) throw new Error('WhatsApp phone number ID not configured');

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text }
  };

  // Reply to a specific message
  if (options.replyToMessageId) {
    body.context = {
      message_id: options.replyToMessageId
    };
  }

  return whatsappRequest('POST', `/${phoneNumberId}/messages`, body);
}

/**
 * Send template message (for notifications)
 */
async function sendTemplate(to, templateName, languageCode = 'en', parameters = []) {
  const { phoneNumberId } = getCredentials();
  if (!phoneNumberId) throw new Error('WhatsApp phone number ID not configured');

  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: parameters.length > 0 ? [
        {
          type: 'body',
          parameters: parameters.map(param => ({ type: 'text', text: param }))
        }
      ] : undefined
    }
  };

  return whatsappRequest('POST', `/${phoneNumberId}/messages`, body);
}

/**
 * Mark message as read
 */
async function markAsRead(messageId) {
  const { phoneNumberId } = getCredentials();
  if (!phoneNumberId) throw new Error('WhatsApp phone number ID not configured');

  const body = {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId
  };

  return whatsappRequest('POST', `/${phoneNumberId}/messages`, body);
}

/**
 * Get WhatsApp business profile
 */
async function getBusinessProfile() {
  const { phoneNumberId } = getCredentials();
  if (!phoneNumberId) throw new Error('WhatsApp phone number ID not configured');

  return whatsappRequest('GET', `/${phoneNumberId}`, {
    fields: 'display_phone_number,verified_name,quality_rating'
  });
}

/**
 * Process incoming WhatsApp webhook update
 */
function processWebhookUpdate(body) {
  // Extract message from webhook payload
  if (!body.entry || !body.entry[0] || !body.entry[0].changes) {
    return null;
  }

  const change = body.entry[0].changes[0];
  if (change.field !== 'messages') {
    return null;
  }

  const value = change.value;
  if (!value.messages || value.messages.length === 0) {
    return null;
  }

  const message = value.messages[0];
  const contact = value.contacts?.[0];

  if (!message || !contact) {
    return null;
  }

  // Only process text messages for now
  if (message.type !== 'text') {
    return {
      type: 'non_text',
      messageId: message.id,
      from: contact.wa_id,
      messageType: message.type
    };
  }

  return {
    id: `whatsapp:${message.id}`,
    channel: 'whatsapp',
    type: 'message',
    from: {
      id: contact.wa_id,
      handle: contact.profile?.name || contact.wa_id,
      name: contact.profile?.name || 'WhatsApp User',
      phone: contact.wa_id
    },
    content: message.text?.body || '',
    timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
    messageId: message.id,
    raw: body
  };
}

/**
 * Verify webhook signature for security
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!secret) return true;
  
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}

/**
 * Handle webhook verification challenge
 */
function verifyWebhook(mode, token, challenge) {
  const { webhookVerifyToken } = getCredentials();
  
  if (mode === 'subscribe' && token === webhookVerifyToken) {
    return challenge;
  }
  
  return null;
}

/**
 * Parse /vibe commands from WhatsApp messages
 */
function parseVibeCommand(text) {
  const trimmed = text.trim();
  
  // /status mood [note]
  const statusMatch = trimmed.match(/^\/status\s+(\w+)(?:\s+(.+))?$/);
  if (statusMatch) {
    return {
      command: 'status',
      params: {
        mood: statusMatch[1],
        note: statusMatch[2] || null
      }
    };
  }
  
  // /who
  if (trimmed === '/who') {
    return { command: 'who' };
  }
  
  // /ship [message]
  const shipMatch = trimmed.match(/^\/ship(?:\s+(.+))?$/);
  if (shipMatch) {
    return {
      command: 'ship',
      params: {
        message: shipMatch[1] || null
      }
    };
  }
  
  // /vibe message
  const vibeMatch = trimmed.match(/^\/vibe\s+(.+)$/);
  if (vibeMatch) {
    return {
      command: 'vibe',
      params: {
        message: vibeMatch[1]
      }
    };
  }
  
  // /help
  if (trimmed === '/help') {
    return { command: 'help' };
  }
  
  return null;
}

/**
 * Send /vibe activity notification to WhatsApp
 */
async function notifyActivity(to, activity) {
  const { handle, action, context } = activity;
  
  let text = `🔔 *@${handle}* ${action}`;
  if (context) {
    text += `\n_${context}_`;
  }
  text += '\n\n_From /vibe - slashvibe.dev_';
  
  return sendMessage(to, text);
}

/**
 * Send /vibe status update to WhatsApp
 */
async function notifyStatus(to, handle, mood, note) {
  const moodEmoji = {
    'shipping': '🔥',
    'debugging': '🐛', 
    'deep': '🧠',
    'afk': '☕',
    'celebrating': '🎉',
    'pairing': '👯'
  };
  
  const emoji = moodEmoji[mood] || '●';
  let text = `${emoji} *@${handle}* is ${mood}`;
  
  if (note) {
    text += `\n"${note}"`;
  }
  
  text += '\n\n_From /vibe - slashvibe.dev_';
  
  return sendMessage(to, text);
}

/**
 * Forward message from /vibe to WhatsApp
 */
async function forwardFromVibe(to, handle, message, context = null) {
  let text = `💭 *@${handle}*: ${message}`;
  
  if (context) {
    text += `\n_via ${context}_`;
  }
  
  text += '\n\n_From /vibe - slashvibe.dev_';
  
  return sendMessage(to, text);
}

/**
 * Send help message with available commands
 */
async function sendHelpMessage(to) {
  const helpText = `🤖 */vibe WhatsApp Bridge*

*Available commands:*
/status [mood] [note] - Update your /vibe status
/who - See who's online in /vibe  
/ship [message] - Announce completion
/vibe [message] - Send message to /vibe
/help - Show this help

*Moods:* shipping, debugging, deep, afk, celebrating, pairing

*Example:*
/status shipping building the future
/ship new feature complete!
/vibe hello everyone

_Connect at slashvibe.dev_`;

  return sendMessage(to, helpText);
}

/**
 * Send online users list to WhatsApp
 */
async function sendOnlineList(to, users) {
  if (users.length === 0) {
    return sendMessage(to, '🤫 *Room is quiet...*\n\nNo one is currently active in /vibe.\n\n_slashvibe.dev_');
  }

  let text = `👥 *${users.length} online in /vibe*\n\n`;
  
  users.forEach(user => {
    const mood = user.mood ? ` (${user.mood})` : '';
    text += `• *@${user.handle}*${mood}\n  ${user.one_liner || 'building'}\n\n`;
  });
  
  text += '_slashvibe.dev_';
  
  return sendMessage(to, text);
}

/**
 * Get WhatsApp message analytics (if available)
 */
async function getAnalytics(startTime, endTime) {
  const { businessAccountId } = getCredentials();
  if (!businessAccountId) throw new Error('WhatsApp business account ID not configured');

  try {
    return whatsappRequest('GET', `/${businessAccountId}/conversation_analytics`, {
      start: Math.floor(startTime.getTime() / 1000),
      end: Math.floor(endTime.getTime() / 1000),
      granularity: 'DAY'
    });
  } catch (e) {
    // Analytics might not be available for all accounts
    return { error: 'Analytics not available' };
  }
}

/**
 * Get setup instructions for WhatsApp bridge
 */
function getSetupInstructions() {
  return {
    title: 'WhatsApp Business API Setup',
    steps: [
      '1. Create Facebook Developer Account at developers.facebook.com',
      '2. Create a new app and add WhatsApp product',
      '3. Get Phone Number ID from WhatsApp > API Setup',
      '4. Generate access token (permanent) for production',
      '5. Add credentials to ~/.vibecodings/config.json:',
      '   - whatsapp_access_token',
      '   - whatsapp_phone_number_id', 
      '   - whatsapp_webhook_verify_token (for webhook)',
      '   - whatsapp_vibe_group_id (optional)',
      '6. Set webhook URL in WhatsApp settings',
      '7. Verify phone number for production use'
    ],
    webhook: 'https://your-domain.com/webhook/whatsapp',
    note: 'WhatsApp Business API is free for the first 1000 messages per month',
    limits: {
      free_messages: 1000,
      rate_limit: '80 messages per second',
      message_types: 'text, media, templates, interactive'
    }
  };
}

module.exports = {
  isConfigured,
  getCredentials,
  sendMessage,
  sendTemplate,
  markAsRead,
  getBusinessProfile,
  processWebhookUpdate,
  verifyWebhookSignature,
  verifyWebhook,
  parseVibeCommand,
  notifyActivity,
  notifyStatus,
  forwardFromVibe,
  sendHelpMessage,
  sendOnlineList,
  getAnalytics,
  getSetupInstructions
};