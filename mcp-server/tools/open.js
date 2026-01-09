/**
 * vibe open — View thread with someone
 */

const config = require('../config');
const store = require('../store');
const memory = require('../memory');
const patterns = require('../intelligence/patterns');
const { formatPayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

const definition = {
  name: 'vibe_open',
  description: 'Open the conversation thread with someone.',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Who to open thread with (e.g., @alex)'
      }
    },
    required: ['handle']
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { handle } = args;
  const myHandle = config.getHandle();
  const them = normalizeHandle(handle);

  if (them === myHandle) {
    return { display: 'You can\'t open a thread with yourself.' };
  }

  // Get thread and mark as read
  const thread = await store.getThread(myHandle, them);
  await store.markThreadRead(myHandle, them);

  // Log received messages (from them) for social patterns
  const theirMessages = thread.filter(m => m.from === them);
  if (theirMessages.length > 0) {
    patterns.logMessageReceived(them);
  }

  // Check if they're typing
  let typingNotice = '';
  try {
    const typingUsers = await store.getTypingUsers(myHandle);
    if (typingUsers.includes(them)) {
      typingNotice = `\n_@${them} is typing..._\n`;
    }
  } catch (e) {}

  if (thread.length === 0) {
    return {
      display: `## @${them}

_No messages yet._${typingNotice}

Say "message ${them} hello" to start`
    };
  }

  let display = `## Thread with @${them}\n\n`;

  thread.forEach(m => {
    const isMe = m.from === myHandle;
    const sender = isMe ? 'you' : `@${m.from}`;
    const time = store.formatTimeAgo(m.timestamp);

    display += `**${sender}** — _${time}_\n`;

    // Show text if present
    if (m.body) {
      display += `${m.body}\n`;
    }

    // Render payload if present (using protocol formatter)
    if (m.payload) {
      display += `${formatPayload(m.payload)}\n`;
    }

    display += '\n';
  });

  if (typingNotice) {
    display += typingNotice + '\n';
  }

  display += `---\nJust type your reply to send it`;

  // Build response with hints for structured flows
  const response = { display };

  // Surface memories about this person for context
  const memories = memory.recall(them, 3);
  if (memories.length > 0) {
    response.hint = 'memory_surfaced';
    response.for_handle = them;
    response.memories = memories.map(m => m.observation);
  } else if (thread.length > 3) {
    // Long thread but no memories - suggest saving one
    response.hint = 'offer_memory_save';
    response.for_handle = them;
    response.reason = 'long_thread';
  }

  return response;
}

module.exports = { definition, handler };
