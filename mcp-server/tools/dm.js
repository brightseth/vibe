/**
 * vibe dm — Send a direct message
 */

const config = require('../config');
const store = require('../store');
const memory = require('../memory');
const userProfiles = require('../store/profiles');
const { trackMessage, checkBurst } = require('./summarize');
const { requireInit, normalizeHandle, truncate, warning } = require('./_shared');
const { actions, formatActions } = require('./_actions');

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
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { handle, message, payload } = args;
  const myHandle = config.getHandle();
  const them = normalizeHandle(handle);

  // Route @echo messages to the echo agent
  if (them === 'echo') {
    const echo = require('./echo');
    return echo.handler({ message, anonymous: false });
  }

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

  // Record connection in profiles (if first time messaging)
  try {
    const hasConnected = await userProfiles.hasBeenConnected(myHandle, them);
    if (!hasConnected) {
      await userProfiles.recordConnection(myHandle, them, 'first_message');
    }
  } catch (error) {
    // Don't fail the message if profile update fails
    console.warn('Failed to update profile connection:', error);
  }

  // Track for session summary
  const activity = trackMessage(myHandle, them, 'sent');

  // Check for burst (5+ messages in thread)
  const burst = checkBurst();

  let display = `Sent to **@${them}**`;
  if (wasTruncated) {
    display += ` ${warning(`truncated to ${MAX_LENGTH} chars`)}`;
  }

  // Show message preview or payload type
  if (finalMessage) {
    display += `\n\n"${truncate(finalMessage, 100)}"`;
  }
  if (payload) {
    const payloadType = payload.type || 'data';
    display += `\n\n📦 _Includes ${payloadType} payload_`;
  }

  // Burst notification (5+ messages in one thread)
  if (burst.triggered && burst.thread === them) {
    display += `\n\n💬 _${burst.count} messages with @${them} — say "summarize" when done_`;
  }

  // Build response with optional hints for structured flows
  const response = { display };

  // Check if we have any memories for this person
  const memoryCount = memory.count(them);

  // Suggest saving a memory if we don't have any
  if (memoryCount === 0) {
    response.hint = 'offer_memory_save';
    response.for_handle = them;
    response.suggestion = `Remember something about @${them} for next time?`;
  }
  // Suggest a follow-up after burst of messages
  else if (burst.triggered && burst.thread === them) {
    response.hint = 'suggest_followup';
    response.for_handle = them;
    response.message_count = burst.count;
  }

  // Add guided mode actions
  response.actions = formatActions(actions.afterDm(them));

  return response;
}

module.exports = { definition, handler };