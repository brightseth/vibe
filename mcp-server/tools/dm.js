/**
 * vibe dm — Send a direct message
 */

const config = require('../config');
const store = require('../store');
const { trackMessage, checkBurst } = require('./summarize');

const definition = {
  name: 'vibe_dm',
  description: 'Send a direct message to someone. Can include structured payload for games, handoffs, etc.',
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
      },
      payload: {
        type: 'object',
        description: 'Optional structured data (game state, code review, handoff, etc.)'
      }
    },
    required: ['handle']
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  const { handle, message, payload } = args;
  const myHandle = config.getHandle();
  const them = handle.toLowerCase().replace('@', '');

  if (them === myHandle) {
    return { display: 'You can\'t DM yourself.' };
  }

  // Need either message or payload
  if ((!message || message.trim().length === 0) && !payload) {
    return { display: 'Need either a message or payload.' };
  }

  const trimmed = message ? message.trim() : '';
  const MAX_LENGTH = 2000;
  const wasTruncated = trimmed.length > MAX_LENGTH;
  const finalMessage = wasTruncated ? trimmed.substring(0, MAX_LENGTH) : trimmed;

  await store.sendMessage(myHandle, them, finalMessage || null, 'dm', payload);

  // Track for session summary
  const activity = trackMessage(myHandle, them, 'sent');

  // Check for burst (5+ messages in thread)
  const burst = checkBurst();

  let display = `Sent to **@${them}**`;
  if (wasTruncated) {
    display += ` ⚠️ (truncated to ${MAX_LENGTH} chars)`;
  }

  // Show message preview or payload type
  if (finalMessage) {
    display += `\n\n"${finalMessage.substring(0, 100)}${finalMessage.length > 100 ? '...' : ''}"`;
  }
  if (payload) {
    const payloadType = payload.type || 'data';
    display += `\n\n📦 _Includes ${payloadType} payload_`;
  }

  // Burst notification (5+ messages in one thread)
  if (burst.triggered && burst.thread === them) {
    display += `\n\n💬 _${burst.count} messages with @${them} this session. Run \`vibe summarize\` anytime._`;
  }

  return { display };
}

module.exports = { definition, handler };
