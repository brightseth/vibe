/**
 * vibe dm — Send a direct message
 */

const config = require('../config');
const store = require('../store');

const definition = {
  name: 'vibe_dm',
  description: 'Send a direct message to someone.',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Who to message (e.g., @alex)'
      },
      message: {
        type: 'string',
        description: 'Your message'
      }
    },
    required: ['handle', 'message']
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  const { handle, message } = args;
  const myHandle = config.getHandle();
  const them = handle.toLowerCase().replace('@', '');

  if (them === myHandle) {
    return { display: 'You can\'t DM yourself.' };
  }

  if (!message || message.trim().length === 0) {
    return { display: 'Message cannot be empty.' };
  }

  store.sendMessage(myHandle, them, message.trim(), 'dm');

  return {
    display: `Sent to **@${them}**: "${message.trim()}"`
  };
}

module.exports = { definition, handler };
