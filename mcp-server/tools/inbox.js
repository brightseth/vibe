/**
 * vibe inbox — See your messages
 */

const config = require('../config');
const store = require('../store');

const definition = {
  name: 'vibe_inbox',
  description: 'See your unread messages and recent threads.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  const myHandle = config.getHandle();
  const inbox = store.getInbox(myHandle);

  if (inbox.length === 0) {
    return {
      display: `## Inbox

_No messages yet._

Send one with \`vibe dm @someone "hello"\``
    };
  }

  // Group by sender, show unread first
  const bySender = {};
  inbox.forEach(m => {
    if (!bySender[m.from]) {
      bySender[m.from] = { messages: [], unread: 0 };
    }
    bySender[m.from].messages.push(m);
    if (!m.read_at) {
      bySender[m.from].unread++;
    }
  });

  // Sort: unread senders first, then by most recent message
  const senders = Object.keys(bySender).sort((a, b) => {
    if (bySender[a].unread > 0 && bySender[b].unread === 0) return -1;
    if (bySender[b].unread > 0 && bySender[a].unread === 0) return 1;
    return bySender[b].messages[0].timestamp - bySender[a].messages[0].timestamp;
  });

  let display = `## Inbox\n\n`;

  senders.forEach(sender => {
    const data = bySender[sender];
    const latest = data.messages[0];
    const unreadBadge = data.unread > 0 ? ` (${data.unread} new)` : '';
    const preview = latest.body.slice(0, 50) + (latest.body.length > 50 ? '...' : '');
    const time = store.formatTimeAgo(latest.timestamp);

    display += `**@${sender}**${unreadBadge}\n`;
    display += `  "${preview}" — _${time}_\n\n`;
  });

  display += `---\n\`vibe open @handle\` to see full thread`;

  return { display };
}

module.exports = { definition, handler };
