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
  const threads = await store.getInbox(myHandle);

  if (!threads || threads.length === 0) {
    return {
      display: `## Inbox

_No messages yet._

Send one with \`vibe dm @someone "hello"\``
    };
  }

  // Sort: unread first, then by most recent
  const sorted = threads.sort((a, b) => {
    if (a.unread > 0 && b.unread === 0) return -1;
    if (b.unread > 0 && a.unread === 0) return 1;
    return (b.lastTimestamp || 0) - (a.lastTimestamp || 0);
  });

  const totalUnread = sorted.reduce((sum, t) => sum + (t.unread || 0), 0);
  let display = `## Inbox`;
  if (totalUnread > 0) {
    display += ` (${totalUnread} unread)`;
  }
  display += `\n\n`;

  sorted.forEach(thread => {
    const unreadBadge = thread.unread > 0 ? ` 📬 ${thread.unread} new` : '';
    const preview = (thread.lastMessage || '').substring(0, 60);
    const timeAgo = store.formatTimeAgo ? store.formatTimeAgo(thread.lastTimestamp) : '';

    display += `**@${thread.handle}**${unreadBadge}\n`;
    if (preview) {
      display += `  "${preview}${thread.lastMessage?.length > 60 ? '...' : ''}"\n`;
    }
    if (timeAgo) {
      display += `  _${timeAgo}_\n`;
    }
    display += `\n`;
  });

  display += `---\n\`vibe open @handle\` to read full thread`;

  return { display };
}

module.exports = { definition, handler };
