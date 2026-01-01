/**
 * vibe remember — Save observation to thread memory
 *
 * Memory is a promotion, not a capture.
 * Explicit consent. Thread-scoped. Append-only.
 *
 * Usage:
 *   vibe remember @handle "Solienne prefers center opening"
 *   vibe remember "We discussed OAuth implementation" (uses last DM thread)
 */

const config = require('../config');
const memory = require('../memory');
const store = require('../store');

const definition = {
  name: 'vibe_remember',
  description: 'Save an observation to thread memory. Explicit, local, inspectable.',
  inputSchema: {
    type: 'object',
    properties: {
      observation: {
        type: 'string',
        description: 'The observation to remember (required)'
      },
      handle: {
        type: 'string',
        description: 'Who this memory is about (e.g., @alex). If omitted, uses last active thread.'
      }
    },
    required: ['observation']
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  const { observation } = args;
  let { handle } = args;

  // Validate observation
  if (!observation || observation.trim().length === 0) {
    return {
      display: 'Usage: `vibe remember "observation"` or `vibe remember @handle "observation"`'
    };
  }

  // Clean handle
  if (handle) {
    handle = handle.replace(/^@/, '').toLowerCase();
  } else {
    // Try to find last active thread
    const myHandle = config.getHandle();
    const inbox = await store.getInbox(myHandle);

    if (inbox && inbox.length > 0) {
      // Use most recent thread
      handle = inbox[0].handle;
    } else {
      return {
        display: '**No thread context.** Use `vibe remember @handle "observation"` to specify who this memory is about.'
      };
    }
  }

  // Save the memory
  const saved = memory.remember(handle, observation.trim());
  const count = memory.count(handle);

  // Format confirmation
  let output = `## Memory Saved\n\n`;
  output += `**About:** @${handle}\n`;
  output += `**Observation:** "${saved.observation}"\n`;
  output += `**Time:** ${new Date(saved.timestamp).toLocaleString()}\n\n`;
  output += `---\n`;
  output += `_Thread now has ${count} ${count === 1 ? 'memory' : 'memories'}. View with \`vibe recall @${handle}\`_\n`;
  output += `_Inspect: \`${memory.getThreadFile(handle)}\`_`;

  return { display: output };
}

module.exports = { definition, handler };
