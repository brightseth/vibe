/**
 * /vibe Discord Webhook Integration
 *
 * Posts /vibe activity to a Discord channel via webhook.
 * One-way: /vibe → Discord (outbound only)
 */

const config = require('./config');

/**
 * Get Discord webhook URL from config
 */
function getWebhookUrl() {
  const cfg = config.load();
  return cfg.discord_webhook_url || null;
}

/**
 * Check if Discord integration is configured
 */
function isConfigured() {
  return !!getWebhookUrl();
}

/**
 * Post a message to Discord via webhook
 */
async function post(content, options = {}) {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return false;

  try {
    const body = {
      content,
      username: options.username || '/vibe',
      avatar_url: options.avatar || 'https://slashvibe.dev/vibe-icon.png'
    };

    // Support embeds for richer messages
    if (options.embed) {
      body.embeds = [options.embed];
      delete body.content;
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    return response.ok;
  } catch (e) {
    // Silent fail - Discord is best-effort
    return false;
  }
}

/**
 * Post when someone joins /vibe
 */
async function postJoin(handle, oneLiner) {
  const embed = {
    color: 0x6B8FFF, // Spirit blue
    title: `@${handle} joined /vibe`,
    description: oneLiner || 'Building something',
    footer: { text: 'slashvibe.dev' },
    timestamp: new Date().toISOString()
  };
  return post(null, { embed });
}

/**
 * Post when someone sends a message (anonymized)
 */
async function postActivity(handle, action) {
  const embed = {
    color: 0x2ECC71, // Green
    description: `**@${handle}** ${action}`,
    timestamp: new Date().toISOString()
  };
  return post(null, { embed });
}

/**
 * Post when someone changes status
 */
async function postStatus(handle, mood, note) {
  const moodEmoji = {
    'shipping': '🔥',
    'debugging': '🐛',
    'deep': '🧠',
    'afk': '☕',
    'celebrating': '🎉',
    'pairing': '👯'
  };

  const emoji = moodEmoji[mood] || '●';
  const embed = {
    color: 0x9B59B6, // Purple
    description: `${emoji} **@${handle}** is ${mood}${note ? `: "${note}"` : ''}`,
    timestamp: new Date().toISOString()
  };
  return post(null, { embed });
}

/**
 * Post a system announcement
 */
async function postAnnouncement(message) {
  const embed = {
    color: 0x6B8FFF,
    title: '/vibe',
    description: message,
    timestamp: new Date().toISOString()
  };
  return post(null, { embed });
}

/**
 * Post a conversation highlight
 */
async function postHighlight(handle, title, summary, threads = []) {
  const threadList = threads.length > 0
    ? '\n\n**Open threads:**\n' + threads.map(t => `• ${t}`).join('\n')
    : '';

  const embed = {
    color: 0xF39C12, // Gold/amber for highlights
    title: `💬 ${title}`,
    description: summary + threadList,
    footer: { text: `shared by @${handle} · slashvibe.dev` },
    timestamp: new Date().toISOString()
  };
  return post(null, { embed });
}

/**
 * Post who's currently online
 */
async function postOnlineList(users) {
  if (users.length === 0) {
    return post('_Room is quiet..._');
  }

  const list = users.map(u => {
    const mood = u.mood ? ` ${u.mood}` : '';
    return `• **@${u.handle}**${mood} — ${u.one_liner || 'building'}`;
  }).join('\n');

  const embed = {
    color: 0x6B8FFF,
    title: `${users.length} online in /vibe`,
    description: list,
    footer: { text: 'slashvibe.dev' },
    timestamp: new Date().toISOString()
  };
  return post(null, { embed });
}

module.exports = {
  isConfigured,
  getWebhookUrl,
  post,
  postJoin,
  postActivity,
  postStatus,
  postAnnouncement,
  postHighlight,
  postOnlineList
};
