/**
 * vibe open — View thread with someone
 */

const config = require('../config');
const store = require('../store');

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
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  const { handle } = args;
  const myHandle = config.getHandle();
  const them = handle.toLowerCase().replace('@', '');

  if (them === myHandle) {
    return { display: 'You can\'t open a thread with yourself.' };
  }

  // Get thread and mark as read
  const thread = store.getThread(myHandle, them);
  store.markThreadRead(myHandle, them);

  if (thread.length === 0) {
    return {
      display: `## @${them}

_No messages yet._

Start with \`vibe dm @${them} "hello"\``
    };
  }

  let display = `## Thread with @${them}\n\n`;

  thread.forEach(m => {
    const isMe = m.from === myHandle;
    const sender = isMe ? 'you' : `@${m.from}`;
    const time = store.formatTimeAgo(m.timestamp);

    display += `**${sender}** — _${time}_\n`;
    display += `${m.body}\n\n`;
  });

  display += `---\n\`vibe dm @${them} "message"\` to reply`;

  return { display };
}

module.exports = { definition, handler };
