/**
 * vibe social-inbox — Unified social inbox across all channels
 *
 * Reads from the local cache (sync-then-read pattern) for instant access.
 * Use --refresh to trigger a sync.
 */

const { requireInit, header, divider, formatTimeAgo } = require('./_shared');

const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';

const definition = {
  name: 'vibe_social_inbox',
  description: 'See messages across all connected social channels (X, Farcaster, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        enum: ['all', 'x', 'farcaster', 'discord', 'telegram', 'whatsapp', 'email'],
        description: 'Filter by channel (default: all)'
      },
      high_signal: {
        type: 'boolean',
        description: 'Show only high-signal messages like mentions/DMs (default: true)'
      },
      limit: {
        type: 'number',
        description: 'Number of messages to show (default: 20, max: 100)'
      },
      refresh: {
        type: 'boolean',
        description: 'Force sync from external APIs (default: false)'
      },
      status: {
        type: 'boolean',
        description: 'Show channel connection status (default: false)'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const {
    channel = 'all',
    high_signal = true,
    limit = 20,
    refresh = false,
    status = false
  } = args;

  try {
    // Build query params
    const params = new URLSearchParams();
    if (channel !== 'all') params.set('channel', channel);
    if (!high_signal) params.set('high_signal', 'false');
    if (limit) params.set('limit', limit.toString());
    if (refresh) params.set('refresh', 'true');
    if (status) params.set('status', 'true');

    const url = `${API_URL}/api/social?${params}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.success) {
      return { display: `${header('Social Inbox')}\n\n_Error:_ ${data.error}` };
    }

    // Status view
    if (status) {
      let display = header('Channel Status');
      display += '\n\n';

      for (const [ch, info] of Object.entries(data.channels || {})) {
        const icon = info.status?.status === 'connected' ? '✅' : '❌';
        const configured = info.configured ? 'configured' : 'not configured';
        display += `${icon} **${ch}** — ${configured}\n`;

        if (info.status?.error) {
          display += `   _${info.status.error}_\n`;
        }

        if (info.capabilities) {
          const caps = [];
          if (info.capabilities.read) caps.push('read');
          if (info.capabilities.write) caps.push('write');
          if (info.capabilities.dm) caps.push('dm');
          display += `   Capabilities: ${caps.join(', ')}\n`;
        }
        display += '\n';
      }

      return { display };
    }

    // Inbox view
    const messages = data.messages || [];

    if (messages.length === 0) {
      let display = header('Social Inbox');
      display += '\n\n';

      if (data.summary?.total === 0) {
        display += '_No messages synced yet._\n\n';
        display += 'Run `vibe social-inbox --status` to check channel connections.\n';
        display += 'Run `vibe social-inbox --refresh` to trigger a sync.';
      } else {
        display += `_No ${channel === 'all' ? '' : channel + ' '}messages found._`;
      }

      return { display };
    }

    // Format messages
    let display = header(`Social Inbox (${messages.length})`);
    display += '\n\n';

    // Group by channel for summary
    const byChannel = {};
    for (const msg of messages) {
      byChannel[msg.channel] = (byChannel[msg.channel] || 0) + 1;
    }

    const channelSummary = Object.entries(byChannel)
      .map(([ch, count]) => `${ch}: ${count}`)
      .join(' | ');
    display += `📬 ${channelSummary}\n`;
    display += divider();
    display += '\n';

    // Show messages
    for (const msg of messages) {
      const channelIcon = getChannelIcon(msg.channel);
      const typeIcon = getTypeIcon(msg.type);

      display += `${channelIcon} **@${msg.from}** ${typeIcon} — _${msg.timeAgo}_\n`;
      display += `${msg.content}\n`;
      display += `_[${msg.channel}:${msg.id.split(':')[1]?.slice(0, 8)}]_\n\n`;
    }

    display += divider();
    display += 'Reply: `vibe post "message" --x --farcaster`';

    return { display };

  } catch (e) {
    return {
      display: `${header('Social Inbox')}\n\n_Error:_ ${e.message}`
    };
  }
}

function getChannelIcon(channel) {
  const icons = {
    x: '𝕏',
    farcaster: '🟣',
    discord: '💬',
    telegram: '✈️',
    whatsapp: '💚',
    email: '📧'
  };
  return icons[channel] || '📱';
}

function getTypeIcon(type) {
  const icons = {
    mention: '@',
    reply: '↩️',
    dm: '✉️',
    like: '❤️',
    repost: '🔁'
  };
  return icons[type] || '';
}

module.exports = { definition, handler };
