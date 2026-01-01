/**
 * vibe recall — Query thread memories
 *
 * Shows observations saved about a specific thread.
 * Local, inspectable, searchable.
 *
 * Usage:
 *   vibe recall @handle      — Show memories about @handle
 *   vibe recall              — Show all threads with memories
 */

const config = require('../config');
const memory = require('../memory');

const definition = {
  name: 'vibe_recall',
  description: 'Query thread memories. Shows saved observations about a person or lists all threads.',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Who to recall memories about (e.g., @alex). If omitted, lists all threads.'
      },
      limit: {
        type: 'number',
        description: 'Maximum memories to show (default: 10)'
      },
      search: {
        type: 'string',
        description: 'Optional search term to filter memories'
      }
    }
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  let { handle, limit = 10, search } = args;

  // If no handle, list all threads
  if (!handle) {
    const threads = memory.listThreads();

    if (threads.length === 0) {
      let output = `## Memory — Empty\n\n`;
      output += `_No memories saved yet._\n\n`;
      output += `Save one with: \`vibe remember @handle "observation"\`\n`;
      output += `Memories are stored locally: \`${memory.getMemoryPath()}/\``;
      return { display: output };
    }

    let output = `## Memory — ${threads.length} ${threads.length === 1 ? 'Thread' : 'Threads'}\n\n`;

    for (const thread of threads) {
      const age = formatAge(thread.newestMemory);
      output += `**@${thread.handle}** — ${thread.count} ${thread.count === 1 ? 'memory' : 'memories'} (${age})\n`;
    }

    output += `\n---\n`;
    output += `_View a thread: \`vibe recall @handle\`_\n`;
    output += `_Storage: \`${memory.getMemoryPath()}/\`_`;

    return { display: output };
  }

  // Clean handle
  handle = handle.replace(/^@/, '').toLowerCase();

  // Get memories for this thread
  let memories = memory.recall(handle, limit);

  if (memories.length === 0) {
    let output = `## Memory — @${handle}\n\n`;
    output += `_No memories saved about @${handle}._\n\n`;
    output += `Save one with: \`vibe remember @${handle} "observation"\``;
    return { display: output };
  }

  // Apply search filter if provided
  if (search) {
    const searchLower = search.toLowerCase();
    memories = memories.filter(m =>
      m.observation.toLowerCase().includes(searchLower)
    );

    if (memories.length === 0) {
      return {
        display: `## Memory — @${handle}\n\n_No memories matching "${search}"._`
      };
    }
  }

  // Format output
  let output = `## Memory — @${handle}\n\n`;

  for (const m of memories) {
    const age = formatAge(m.timestamp);
    output += `• "${m.observation}" — _${age}_\n`;
  }

  const total = memory.count(handle);
  if (total > memories.length) {
    output += `\n_Showing ${memories.length} of ${total}. Use \`limit\` for more._\n`;
  }

  output += `\n---\n`;
  output += `_Add: \`vibe remember @${handle} "..."\`_\n`;
  output += `_Delete: \`vibe forget @${handle}\`_\n`;
  output += `_File: \`${memory.getThreadFile(handle)}\`_`;

  return { display: output };
}

/**
 * Format a timestamp as relative age
 */
function formatAge(timestamp) {
  if (!timestamp) return 'unknown';

  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;

  return new Date(timestamp).toLocaleDateString();
}

module.exports = { definition, handler };
