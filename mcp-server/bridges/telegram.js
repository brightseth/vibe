/**
 * /vibe Telegram Bridge
 *
 * Two-way bridge between /vibe and Telegram:
 * - Receive messages/commands via Telegram bot
 * - Send messages to individuals/groups via bot
 * - Forward /vibe activity to Telegram channels
 */

const config = require('../config');

/**
 * Get Telegram bot credentials from config
 */
function getBotToken() {
  const cfg = config.load();
  return cfg.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN || null;
}

/**
 * Check if Telegram bridge is configured
 */
function isConfigured() {
  return !!getBotToken();
}

/**
 * Get bot info
 */
async function getBotInfo() {
  const token = getBotToken();
  if (!token) throw new Error('Telegram bot token not configured');

  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram API error: ${data.description}`);
  }
  
  return data.result;
}

/**
 * Send a message to a chat (user or group)
 */
async function sendMessage(chatId, text, options = {}) {
  const token = getBotToken();
  if (!token) throw new Error('Telegram bot token not configured');

  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: options.markdown ? 'Markdown' : undefined,
    reply_to_message_id: options.replyTo || undefined,
    disable_notification: options.silent || false
  };

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram send error: ${data.description}`);
  }
  
  return data.result;
}

/**
 * Get updates (messages) from Telegram
 * For long polling or webhook verification
 */
async function getUpdates(offset = null, limit = 100) {
  const token = getBotToken();
  if (!token) throw new Error('Telegram bot token not configured');

  const params = new URLSearchParams({ limit: limit.toString() });
  if (offset) params.set('offset', offset.toString());

  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?${params}`);
  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram getUpdates error: ${data.description}`);
  }
  
  return data.result;
}

/**
 * Set webhook URL for receiving updates
 */
async function setWebhook(url, secretToken = null) {
  const token = getBotToken();
  if (!token) throw new Error('Telegram bot token not configured');

  const body = { url };
  if (secretToken) body.secret_token = secretToken;

  const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  
  if (!data.ok) {
    throw new Error(`Telegram setWebhook error: ${data.description}`);
  }
  
  return data.result;
}

/**
 * Process incoming webhook update from Telegram
 */
function processUpdate(update) {
  const message = update.message || update.edited_message;
  if (!message) return null;

  const from = message.from;
  const chat = message.chat;
  
  return {
    id: `telegram:${message.message_id}`,
    channel: 'telegram',
    type: chat.type === 'private' ? 'dm' : 'group',
    from: {
      id: from.id.toString(),
      handle: from.username || from.first_name,
      name: [from.first_name, from.last_name].filter(Boolean).join(' ')
    },
    chat: {
      id: chat.id.toString(),
      title: chat.title || null,
      type: chat.type
    },
    content: message.text || '[media]',
    timestamp: new Date(message.date * 1000).toISOString(),
    raw: update
  };
}

/**
 * Send /vibe activity notification to Telegram
 */
async function notifyActivity(chatId, activity) {
  const { handle, action, context } = activity;
  
  let text = `🔔 *@${handle}* ${action}`;
  if (context) {
    text += `\n_${context}_`;
  }
  
  return sendMessage(chatId, text, { markdown: true, silent: true });
}

/**
 * Send /vibe status update to Telegram
 */
async function notifyStatus(chatId, handle, mood, note) {
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
  
  return sendMessage(chatId, text, { markdown: true });
}

/**
 * Send message from /vibe to Telegram
 */
async function forwardFromVibe(chatId, handle, message, context = null) {
  let text = `💭 *@${handle}*: ${message}`;
  
  if (context) {
    text += `\n_via ${context}_`;
  }
  
  return sendMessage(chatId, text, { markdown: true });
}

/**
 * Handle /vibe commands from Telegram
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
  
  // /dm @handle message
  const dmMatch = trimmed.match(/^\/dm\s+@?(\w+)\s+(.+)$/);
  if (dmMatch) {
    return {
      command: 'dm',
      params: {
        handle: dmMatch[1],
        message: dmMatch[2]
      }
    };
  }
  
  return null;
}

module.exports = {
  isConfigured,
  getBotToken,
  getBotInfo,
  sendMessage,
  getUpdates,
  setWebhook,
  processUpdate,
  parseVibeCommand,
  notifyActivity,
  notifyStatus,
  forwardFromVibe
};