/**
 * vibe forget — Delete thread memories
 *
 * Complete control over what's stored.
 * Explicit deletion with confirmation.
 *
 * Usage:
 *   vibe forget @handle      — Delete all memories about @handle
 *   vibe forget --all        — Delete all memories (requires confirmation)
 */

const config = require('../config');
const memory = require('../memory');
const fs = require('fs');

const definition = {
  name: 'vibe_forget',
  description: 'Delete thread memories. Removes all saved observations about a person.',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Who to forget memories about (e.g., @alex)'
      },
      all: {
        type: 'boolean',
        description: 'Delete ALL memories across all threads'
      },
      confirm: {
        type: 'boolean',
        description: 'Confirm deletion (required for --all)'
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

  const { all, confirm } = args;
  let { handle } = args;

  // Handle --all case
  if (all) {
    const threads = memory.listThreads();

    if (threads.length === 0) {
      return {
        display: '## Memory — Empty\n\n_No memories to forget._'
      };
    }

    if (!confirm) {
      // Show what would be deleted and ask for confirmation
      let output = `## Forget All Memories?\n\n`;
      output += `This will delete:\n\n`;

      let totalMemories = 0;
      for (const thread of threads) {
        output += `• @${thread.handle} — ${thread.count} ${thread.count === 1 ? 'memory' : 'memories'}\n`;
        totalMemories += thread.count;
      }

      output += `\n**Total:** ${totalMemories} memories across ${threads.length} threads\n\n`;
      output += `---\n`;
      output += `_To confirm: \`vibe forget --all --confirm\`_\n`;
      output += `_This cannot be undone._`;

      return { display: output };
    }

    // Actually delete all
    let totalDeleted = 0;
    for (const thread of threads) {
      totalDeleted += memory.forget(thread.handle);
    }

    return {
      display: `## Memory Cleared\n\n**Deleted:** ${totalDeleted} memories across ${threads.length} threads\n\n_Memory is now empty._`
    };
  }

  // Handle specific thread
  if (!handle) {
    return {
      display: 'Usage: `vibe forget @handle` or `vibe forget --all`\n\nView memories first: `vibe recall`'
    };
  }

  // Clean handle
  handle = handle.replace(/^@/, '').toLowerCase();

  // Check if thread exists
  const countBefore = memory.count(handle);

  if (countBefore === 0) {
    return {
      display: `## Memory — @${handle}\n\n_No memories to forget._`
    };
  }

  // Delete the thread
  const deleted = memory.forget(handle);

  let output = `## Memory Forgotten\n\n`;
  output += `**Thread:** @${handle}\n`;
  output += `**Deleted:** ${deleted} ${deleted === 1 ? 'memory' : 'memories'}\n\n`;
  output += `---\n`;
  output += `_Thread memories are gone. Start fresh with \`vibe remember @${handle} "..."\`_`;

  return { display: output };
}

module.exports = { definition, handler };
