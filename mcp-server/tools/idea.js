/**
 * vibe idea — Post raw ideas for others to riff on
 *
 * The creative substrate of /vibe. Ideas are rough, unfinished,
 * meant to be forked, remixed, and built upon.
 *
 * Post: vibe idea "what if we had X"
 * Riff: vibe idea riff @alice "building on that..."
 * Browse: vibe ideas
 */

const config = require('../config');
const patterns = require('../intelligence/patterns');
const { requireInit, header, emptyState, formatTimeAgo, divider } = require('./_shared');

const definition = {
  name: 'vibe_idea',
  description: 'Post a raw idea for others to riff on. Ideas are meant to be forked, remixed, and built upon.',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Your idea (leave empty to browse ideas)'
      },
      riff_on: {
        type: 'string',
        description: 'Handle of person whose idea you\'re riffing on (e.g., @alice)'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for discovery (e.g., ["ai", "social", "mcp"])'
      },
      filter_tag: {
        type: 'string',
        description: 'Filter ideas by tag'
      },
      limit: {
        type: 'number',
        description: 'Number of ideas to show (default: 10)'
      }
    }
  }
};

const IDEA_STARTERS = [
  'What if...',
  'Imagine a world where...',
  'What would happen if we combined...',
  'The intersection of X and Y could...',
  'A tool that lets you...',
  'What\'s missing is...'
];

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const apiUrl = config.getApiUrl();
  const myHandle = config.getHandle();

  // Post an idea
  if (args.content) {
    const content = args.content.trim();

    if (content.length > 500) {
      return { display: '⚠️ Ideas should be concise (max 500 chars). Distill it!' };
    }

    // Build the entry
    const entry = {
      author: myHandle,
      category: args.riff_on ? 'riff' : 'idea',
      content: content,
      tags: args.tags || []
    };

    // Add riff metadata
    if (args.riff_on) {
      const riffTarget = args.riff_on.replace('@', '').toLowerCase();
      entry.content = `↳ riffing on @${riffTarget}: ${content}`;
      entry.tags = [...(entry.tags || []), `riff:${riffTarget}`];
    }

    try {
      const response = await fetch(`${apiUrl}/api/board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });

      const data = await response.json();

      if (!data.success) {
        return { display: `⚠️ Failed to post idea: ${data.error}` };
      }

      // Log creative pattern
      if (args.riff_on) {
        patterns.logRiff(args.riff_on, content);
      } else {
        patterns.logIdea(content, args.tags || []);
      }

      let display = args.riff_on
        ? `↳ riff posted\n\n`
        : `💡 posted\n\n`;

      display += `"${content}"`;

      if (args.tags && args.tags.length > 0) {
        display += `\n_${args.tags.map(t => `#${t}`).join(' ')}_`;
      }

      return { display };

    } catch (error) {
      return { display: `⚠️ Failed to post: ${error.message}` };
    }
  }

  // Browse ideas
  try {
    const limit = Math.min(args.limit || 10, 30);
    let url = `${apiUrl}/api/board?limit=${limit}&category=idea`;

    // Also fetch riffs
    const riffUrl = `${apiUrl}/api/board?limit=${limit}&category=riff`;

    const [ideasRes, riffsRes] = await Promise.all([
      fetch(url),
      fetch(riffUrl)
    ]);

    const ideas = (await ideasRes.json()).entries || [];
    const riffs = (await riffsRes.json()).entries || [];

    // Combine and sort by timestamp
    const allEntries = [...ideas, ...riffs].sort((a, b) => b.timestamp - a.timestamp);

    // Filter by tag if specified
    let filtered = allEntries;
    if (args.filter_tag) {
      const tag = args.filter_tag.toLowerCase();
      filtered = allEntries.filter(e =>
        e.tags && e.tags.some(t => t.toLowerCase().includes(tag))
      );
    }

    if (filtered.length === 0) {
      const starter = IDEA_STARTERS[Math.floor(Math.random() * IDEA_STARTERS.length)];
      return {
        display: `${header('Ideas')}\n\n${emptyState('No ideas yet...', `Be the first! Try: "${starter}"`)}\n\n${divider()}Post with: "post idea: [your idea]"`
      };
    }

    let display = header('Ideas');
    if (args.filter_tag) display += ` #${args.filter_tag}`;
    display += '\n\n';

    // Group riffs under their parent ideas (simple approach: by author mention)
    const ideaMap = new Map();
    const topLevel = [];

    filtered.forEach(entry => {
      if (entry.category === 'riff') {
        // Try to find parent
        const riffMatch = entry.content.match(/riffing on @(\w+)/);
        if (riffMatch) {
          const parent = riffMatch[1];
          if (!ideaMap.has(parent)) ideaMap.set(parent, []);
          ideaMap.get(parent).push(entry);
        } else {
          topLevel.push(entry);
        }
      } else {
        topLevel.push(entry);
      }
    });

    // Display top-level ideas with their riffs
    topLevel.slice(0, 10).forEach(entry => {
      const emoji = entry.category === 'riff' ? '↳' : '💡';
      const timeAgo = formatTimeAgo(entry.timestamp);
      const tags = entry.tags && entry.tags.length > 0
        ? ` ${entry.tags.filter(t => !t.startsWith('riff:')).map(t => `#${t}`).join(' ')}`
        : '';

      display += `${emoji} **@${entry.author}**${tags}\n`;
      display += `   "${entry.content}"\n`;
      display += `   _${timeAgo}_\n`;

      // Show riffs on this idea
      const riffList = ideaMap.get(entry.author) || [];
      riffList.slice(0, 2).forEach(riff => {
        display += `   ↳ @${riff.author}: "${riff.content.replace(/↳ riffing on @\w+: /, '')}"\n`;
      });

      display += '\n';
    });

    return { display };

  } catch (error) {
    return { display: `⚠️ Failed to load ideas: ${error.message}` };
  }
}

module.exports = { definition, handler };
