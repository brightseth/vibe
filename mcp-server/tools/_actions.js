/**
 * Shared action definitions for Guided Mode
 *
 * These actions get returned by tools and rendered as AskUserQuestion
 * by Claude Code, giving users a tab-able menu of next steps.
 *
 * Each action has:
 * - label: Short text shown in the option (1-5 words)
 * - description: What happens if selected
 * - command: What the user says to trigger it (for Claude to execute)
 */

const config = require('../config');

// Context-aware action generators
const actions = {
  // After vibe_start or vibe_who
  dashboard: (context = {}) => {
    const { unreadCount = 0, onlineUsers = [], suggestion } = context;
    const result = [];

    // Priority 1: Unread messages
    if (unreadCount > 0) {
      result.push({
        label: 'Check messages',
        description: `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`,
        command: 'check my messages'
      });
    }

    // Priority 2: Suggested connection
    if (suggestion) {
      const reason = {
        just_joined: 'just joined',
        shipping: 'is shipping',
        needs_help: 'might need help',
        active_now: 'is active'
      }[suggestion.reason] || 'is around';

      result.push({
        label: `Message @${suggestion.handle}`,
        description: `${suggestion.handle} ${reason}`,
        command: `message @${suggestion.handle}`
      });
    }

    // Priority 3: Online users (if no suggestion)
    if (!suggestion && onlineUsers.length > 0) {
      const user = onlineUsers[0];
      result.push({
        label: `Message @${user}`,
        description: 'Start a conversation',
        command: `message @${user}`
      });
    }

    // Always available
    result.push({
      label: 'Share context',
      description: 'Show what you\'re working on',
      command: 'share my context'
    });

    result.push({
      label: 'Set status',
      description: 'shipping, thinking, debugging, etc.',
      command: 'set my status'
    });

    return result.slice(0, 4); // Max 4 options for AskUserQuestion
  },

  // After sending a DM
  afterDm: (handle) => [
    {
      label: 'Send another',
      description: `Continue conversation with @${handle}`,
      command: `message @${handle}`
    },
    {
      label: 'React',
      description: 'Send a quick emoji reaction',
      command: `react to @${handle}`
    },
    {
      label: 'Remember something',
      description: `Save a note about @${handle}`,
      command: `remember something about @${handle}`
    },
    {
      label: 'Back to dashboard',
      description: 'See who else is around',
      command: 'who\'s around'
    }
  ],

  // After checking inbox
  afterInbox: (threads = []) => {
    const result = [];

    // Suggest replying to most recent unread
    if (threads.length > 0) {
      const first = threads[0];
      result.push({
        label: `Reply to @${first.handle}`,
        description: 'Continue this thread',
        command: `message @${first.handle}`
      });
    }

    // If multiple threads, offer to open another
    if (threads.length > 1) {
      const second = threads[1];
      result.push({
        label: `Open @${second.handle}`,
        description: 'See this conversation',
        command: `open thread with @${second.handle}`
      });
    }

    result.push({
      label: 'Who\'s online',
      description: 'See who\'s building right now',
      command: 'who\'s around'
    });

    result.push({
      label: 'Share context',
      description: 'Show what you\'re working on',
      command: 'share my context'
    });

    return result.slice(0, 4);
  },

  // When room is empty
  emptyRoom: () => [
    {
      label: 'Invite someone',
      description: 'Generate a shareable invite link',
      command: 'generate invite link'
    },
    {
      label: 'Post to board',
      description: 'Share what you\'re building',
      command: 'post to the vibe board'
    },
    {
      label: 'Set status',
      description: 'Let others know you\'re here',
      command: 'set my status to shipping'
    },
    {
      label: 'Check X mentions',
      description: 'See Twitter activity',
      command: 'check my X mentions'
    }
  ],

  // Status selection
  statusOptions: () => [
    {
      label: 'Shipping',
      description: 'In the zone, making progress',
      command: 'set status shipping'
    },
    {
      label: 'Thinking',
      description: 'Planning or designing',
      command: 'set status thinking'
    },
    {
      label: 'Debugging',
      description: 'Fixing something',
      command: 'set status debugging'
    },
    {
      label: 'Pairing',
      description: 'Open to collaboration',
      command: 'set status pairing'
    }
  ],

  // Reaction selection
  reactionOptions: (handle) => [
    {
      label: 'Fire',
      description: 'That\'s awesome',
      command: `react fire to @${handle}`
    },
    {
      label: 'Rocket',
      description: 'Ship it!',
      command: `react rocket to @${handle}`
    },
    {
      label: 'Eyes',
      description: 'I see you',
      command: `react eyes to @${handle}`
    },
    {
      label: 'Brain',
      description: 'Smart thinking',
      command: `react brain to @${handle}`
    }
  ]
};

// Format actions for the response object
function formatActions(actionList) {
  // Skip if guided mode is disabled
  if (!config.getGuidedMode()) return null;

  if (!actionList || actionList.length === 0) return null;

  return {
    guided_mode: true,
    question: 'What do you want to do?',
    options: actionList.map(a => ({
      label: a.label,
      description: a.description,
      command: a.command
    }))
  };
}

module.exports = { actions, formatActions };
