/**
 * vibe inbox — See your messages
 */

const config = require('../config');
const store = require('../store');
const { requireInit, header, emptyState, formatTimeAgo, truncate, divider } = require('./_shared');

const definition = {
  name: 'vibe_inbox',
  description: 'See your unread messages and recent threads.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const threads = await store.getInbox(myHandle);

  if (!threads || threads.length === 0) {
    return {
      display: `${header('Inbox')}\n\n${emptyState('No messages yet.', 'Say "message someone" to start a conversation')}`
    };
  }

  // Sort: unread first, then by most recent
  const sorted = threads.sort((a, b) => {
    if (a.unread > 0 && b.unread === 0) return -1;
    if (b.unread > 0 && a.unread === 0) return 1;
    return (b.lastTimestamp || 0) - (a.lastTimestamp || 0);
  });

  const totalUnread = sorted.reduce((sum, t) => sum + (t.unread || 0), 0);
  let display = header(`Inbox${totalUnread > 0 ? ` (${totalUnread} unread)` : ''}`);
  display += '\n\n';

  sorted.forEach(thread => {
    const unreadBadge = thread.unread > 0 ? ` 📬 ${thread.unread} new` : '';
    const preview = truncate(thread.lastMessage || '', 60);
    const timeAgo = formatTimeAgo(thread.lastTimestamp);

    display += `**@${thread.handle}**${unreadBadge}\n`;
    if (preview) {
      display += `  "${preview}"\n`;
    }
    if (timeAgo) {
      display += `  _${timeAgo}_\n`;
    }
    display += '\n';
  });

  display += `${divider()}Say "open thread with @handle" to read more`;

  // Build response with optional hints for structured flows
  const response = { display };

  // Trigger triage flow when 5+ unread messages
  if (totalUnread >= 5) {
    response.hint = 'structured_triage_recommended';
    response.unread_count = totalUnread;
    response.threads = sorted.filter(t => t.unread > 0).map(t => ({
      handle: t.handle,
      unread: t.unread,
      preview: truncate(t.lastMessage || '', 40)
    }));
  }
  // Suggest compose when inbox is empty or fully read
  else if (threads.length === 0 || totalUnread === 0) {
    response.hint = 'suggest_compose';
  }

  return response;
}

module.exports = { definition, handler };
