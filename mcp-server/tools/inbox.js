/**
 * vibe inbox — See your messages
 */

const config = require('../config');
const store = require('../store');
const notify = require('../notify');
const { requireInit, header, emptyState, formatTimeAgo, truncate, divider } = require('./_shared');
const { actions, formatActions } = require('./_actions');

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

  // Check for notifications (will handle deduplication internally)
  notify.checkAll(store);

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
  let display = header(`Inbox${totalUnread > 0 ? ` — ${totalUnread} UNREAD` : ''}`);
  display += '\n\n';

  sorted.forEach(thread => {
    const unreadBadge = thread.unread > 0 ? ` 📬 NEW MESSAGE` : '';
    const agentBadge = thread.isAgent ? '🤖 ' : '';
    const preview = truncate(thread.lastMessage || '', 60);
    const timeAgo = formatTimeAgo(thread.lastTimestamp);

    display += `${agentBadge}**@${thread.handle}**${unreadBadge}\n`;
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

  // Add guided mode actions
  const threadSummaries = sorted.slice(0, 4).map(t => ({ handle: t.handle, unread: t.unread || 0 }));
  response.actions = formatActions(actions.afterInbox(threadSummaries));

  return response;
}

module.exports = { definition, handler };
