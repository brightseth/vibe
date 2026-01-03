/**
 * vibe board — Shared whiteboard for the /vibe community
 *
 * Read: vibe board (shows recent entries)
 * Write: vibe board "your idea or use case"
 * Categories: use-case, idea, shipped, question
 */

const config = require('../config');
const { requireInit, header, emptyState, formatTimeAgo, divider } = require('./_shared');

const definition = {
  name: 'vibe_board',
  description: 'Shared whiteboard for use cases, ideas, and things people have shipped. Read the board or add your own entry.',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Your entry (max 500 chars). Leave empty to just read the board.'
      },
      category: {
        type: 'string',
        enum: ['use-case', 'idea', 'shipped', 'question', 'general'],
        description: 'Category for your entry (default: general)'
      },
      filter: {
        type: 'string',
        enum: ['use-case', 'idea', 'shipped', 'question', 'all'],
        description: 'Filter entries by category when reading'
      },
      limit: {
        type: 'number',
        description: 'Number of entries to show (default: 10, max: 50)'
      }
    }
  }
};

const CATEGORY_EMOJI = {
  'use-case': '🎯',
  'idea': '💡',
  'shipped': '🚀',
  'question': '❓',
  'general': '📝'
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const apiUrl = config.getApiUrl();
  const myHandle = config.getHandle();

  // If content provided, add entry
  if (args.content) {
    if (args.content.length > 500) {
      return { display: '⚠️ Entry must be 500 characters or less.' };
    }

    try {
      const response = await fetch(`${apiUrl}/api/board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: myHandle,
          content: args.content,
          category: args.category || 'general'
        })
      });

      const data = await response.json();

      if (!data.success) {
        return { display: `⚠️ Failed to add entry: ${data.error}` };
      }

      const emoji = CATEGORY_EMOJI[data.entry.category] || '📝';
      return {
        display: `${emoji} Added to the board!\n\n"${args.content}"\n\n_Category: ${data.entry.category}_\n\n${divider()}View with \`vibe board\``
      };

    } catch (error) {
      return { display: `⚠️ Failed to add entry: ${error.message}` };
    }
  }

  // Otherwise, read entries
  try {
    const limit = Math.min(args.limit || 10, 50);
    const filter = args.filter && args.filter !== 'all' ? args.filter : null;

    let url = `${apiUrl}/api/board?limit=${limit}`;
    if (filter) url += `&category=${filter}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.success || !data.entries || data.entries.length === 0) {
      return {
        display: `${header('Community Board')}\n\n${emptyState('No entries yet.', 'Add one with `vibe board "your idea"`')}`
      };
    }

    let display = header('Community Board');
    if (filter) display += ` (${filter})`;
    display += '\n\n';

    data.entries.forEach((entry, i) => {
      const emoji = CATEGORY_EMOJI[entry.category] || '📝';
      const timeAgo = formatTimeAgo(entry.timestamp);

      display += `${emoji} **@${entry.author}**`;
      if (timeAgo) display += ` _${timeAgo}_`;
      display += '\n';
      display += `   "${entry.content}"\n\n`;
    });

    display += divider();
    display += 'Add: `vibe board "your idea" --category idea`\n';
    display += 'Filter: `vibe board --filter shipped`';

    return { display };

  } catch (error) {
    return { display: `⚠️ Failed to read board: ${error.message}` };
  }
}

module.exports = { definition, handler };
