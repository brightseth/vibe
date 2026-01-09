/**
 * vibe feed — Discovery feed of creative activity
 *
 * See what the community is thinking, building, and shipping.
 * The pulse of /vibe.
 *
 * Usage:
 * - feed (show all recent activity)
 * - feed ideas (just ideas)
 * - feed ships (just ships)
 * - feed requests (just requests)
 * - feed @handle (activity from one person)
 */

const config = require('../config');
const { requireInit, header, emptyState, formatTimeAgo, divider } = require('./_shared');

const definition = {
  name: 'vibe_feed',
  description: 'See the creative feed — ideas, ships, and requests from the community.',
  inputSchema: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        enum: ['all', 'ideas', 'ships', 'requests', 'riffs'],
        description: 'Filter by type (default: all)'
      },
      from: {
        type: 'string',
        description: 'Filter by author handle (e.g., @alice)'
      },
      tag: {
        type: 'string',
        description: 'Filter by tag'
      },
      limit: {
        type: 'number',
        description: 'Number of entries (default: 15, max: 50)'
      }
    }
  }
};

const TYPE_CONFIG = {
  'idea': { emoji: '💡', label: 'idea', verb: 'had an idea' },
  'riff': { emoji: '↳', label: 'riff', verb: 'riffed' },
  'shipped': { emoji: '🚀', label: 'ship', verb: 'shipped' },
  'request': { emoji: '🔓', label: 'request', verb: 'requested' },
  'claim': { emoji: '🔨', label: 'claim', verb: 'claimed' },
  'general': { emoji: '📝', label: 'post', verb: 'posted' }
};

const CATEGORY_MAP = {
  'ideas': ['idea', 'riff'],
  'ships': ['shipped'],
  'requests': ['request', 'claim'],
  'riffs': ['riff']
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const apiUrl = config.getApiUrl();
  const myHandle = config.getHandle();
  const limit = Math.min(args.limit || 15, 50);

  try {
    // Determine which categories to fetch
    let categories = ['idea', 'riff', 'shipped', 'request'];
    if (args.filter && args.filter !== 'all') {
      categories = CATEGORY_MAP[args.filter] || [args.filter];
    }

    // Fetch all relevant categories in parallel
    const fetches = categories.map(cat =>
      fetch(`${apiUrl}/api/board?limit=${limit}&category=${cat}`)
        .then(r => r.json())
        .then(d => d.entries || [])
        .catch(() => [])
    );

    const results = await Promise.all(fetches);
    let entries = results.flat();

    // Filter by author if specified
    if (args.from) {
      const targetHandle = args.from.replace('@', '').toLowerCase();
      entries = entries.filter(e => e.author.toLowerCase() === targetHandle);
    }

    // Filter by tag if specified
    if (args.tag) {
      const tag = args.tag.toLowerCase();
      entries = entries.filter(e =>
        e.tags && e.tags.some(t => t.toLowerCase().includes(tag))
      );
    }

    // Sort by timestamp (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    // Limit
    entries = entries.slice(0, limit);

    if (entries.length === 0) {
      let emptyMsg = 'The feed is quiet...';
      let suggestion = 'Start something! "idea: [your idea]"';

      if (args.from) {
        emptyMsg = `No activity from @${args.from.replace('@', '')} yet`;
        suggestion = `Try "feed" to see all activity`;
      }

      return {
        display: `${header('Feed')}\n\n${emptyState(emptyMsg, suggestion)}`
      };
    }

    // Build display
    let display = header('Feed');
    if (args.filter && args.filter !== 'all') {
      display += ` (${args.filter})`;
    }
    if (args.from) {
      display += ` @${args.from.replace('@', '')}`;
    }
    if (args.tag) {
      display += ` #${args.tag}`;
    }
    display += '\n\n';

    entries.forEach(entry => {
      const typeInfo = TYPE_CONFIG[entry.category] || TYPE_CONFIG['general'];
      const timeAgo = formatTimeAgo(entry.timestamp);
      const isMe = entry.author.toLowerCase() === myHandle.toLowerCase();
      const meTag = isMe ? ' _(you)_' : '';

      // Parse any embedded metadata
      const lines = entry.content.split('\n');
      const mainContent = lines[0];
      const meta = lines.slice(1).join(' ');

      // Activity line
      display += `${typeInfo.emoji} **@${entry.author}**${meTag} ${typeInfo.verb}\n`;

      // Content (truncated if long)
      const truncatedContent = mainContent.length > 100
        ? mainContent.slice(0, 97) + '...'
        : mainContent;
      display += `   "${truncatedContent}"\n`;

      // Metadata (URL, inspired by, etc.)
      if (meta) {
        const urlMatch = meta.match(/🔗 (\S+)/);
        const inspiredMatch = meta.match(/✨ inspired by @(\w+)/);

        if (urlMatch) display += `   🔗 ${urlMatch[1]}\n`;
        if (inspiredMatch) display += `   ✨ _via @${inspiredMatch[1]}_\n`;
      }

      // Tags (non-system ones)
      if (entry.tags && entry.tags.length > 0) {
        const visibleTags = entry.tags
          .filter(t => !t.startsWith('inspired:') && !t.startsWith('fulfills:') && !t.startsWith('riff:') && !t.startsWith('claim:'))
          .slice(0, 3);
        if (visibleTags.length > 0) {
          display += `   ${visibleTags.map(t => `#${t}`).join(' ')}\n`;
        }
      }

      display += `   _${timeAgo}_\n\n`;
    });

    return { display };

  } catch (error) {
    return { display: `⚠️ Failed to load feed: ${error.message}` };
  }
}

module.exports = { definition, handler };
