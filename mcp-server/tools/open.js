/**
 * vibe open — View thread with someone
 */

const config = require('../config');
const store = require('../store');

/**
 * Render a payload into display text
 */
function renderPayload(payload) {
  if (!payload) return null;

  const type = payload.type || 'data';

  // Game state (tic-tac-toe)
  if (type === 'game' && payload.game === 'tictactoe') {
    const board = payload.state?.board || Array(9).fill('');
    const turn = payload.state?.turn || '?';
    const winner = payload.state?.winner;

    // Render 3x3 board
    const cell = (i) => board[i] || '·';
    let grid = '```\n';
    grid += ` ${cell(0)} │ ${cell(1)} │ ${cell(2)} \n`;
    grid += `───┼───┼───\n`;
    grid += ` ${cell(3)} │ ${cell(4)} │ ${cell(5)} \n`;
    grid += `───┼───┼───\n`;
    grid += ` ${cell(6)} │ ${cell(7)} │ ${cell(8)} \n`;
    grid += '```';

    if (winner) {
      grid += `\n🏆 **${winner} wins!**`;
    } else if (board.every(c => c)) {
      grid += `\n🤝 **Draw!**`;
    } else {
      grid += `\n_${turn}'s turn_`;
    }

    return grid;
  }

  // Code review request
  if (type === 'review') {
    let display = '📝 **Code Review Request**\n';
    if (payload.files) {
      display += `Files: ${payload.files.join(', ')}\n`;
    }
    if (payload.description) {
      display += `"${payload.description}"`;
    }
    return display;
  }

  // Handoff
  if (type === 'handoff') {
    let display = '🤝 **Handoff**\n';
    if (payload.context) {
      display += payload.context;
    }
    return display;
  }

  // Generic payload - show type
  return `📦 _${type} payload_`;
}

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
  const thread = await store.getThread(myHandle, them);
  await store.markThreadRead(myHandle, them);

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

Start with \`vibe dm @${them} "hello"\``
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

    // Render payload if present
    if (m.payload) {
      const rendered = renderPayload(m.payload);
      if (rendered) {
        display += `${rendered}\n`;
      }
    }

    display += '\n';
  });

  if (typingNotice) {
    display += typingNotice + '\n';
  }

  display += `---\n\`vibe dm @${them} "message"\` to reply`;

  return { display };
}

module.exports = { definition, handler };
