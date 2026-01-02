/**
 * vibe consent — Manage connection requests
 *
 * Actions:
 * - (no args) — Show pending requests
 * - accept @handle — Accept connection
 * - block @handle — Block user
 */

const config = require('../config');
const store = require('../store');
const { requireInit, header, emptyState, formatTimeAgo, divider } = require('./_shared');

const definition = {
  name: 'vibe_consent',
  description: 'Manage connection requests. Accept or block incoming requests.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to take: accept, block (or omit to see pending requests)',
        enum: ['accept', 'block']
      },
      handle: {
        type: 'string',
        description: 'User handle to accept or block (e.g., @alice)'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const { action, handle } = args;

  // No action: show pending requests
  if (!action) {
    const pending = await store.getPendingConsents(myHandle);

    if (!pending || pending.length === 0) {
      return {
        display: `${header('Connection Requests')}\n\n${emptyState('No pending requests.', 'Others can request to connect by messaging you.')}`
      };
    }

    let display = header(`Connection Requests (${pending.length})`);
    display += '\n\n';

    pending.forEach(req => {
      const timeAgo = req.requestedAt ? formatTimeAgo(new Date(req.requestedAt).getTime()) : '';
      display += `**@${req.from}**\n`;
      if (req.message) {
        display += `  "${req.message}"\n`;
      }
      if (timeAgo) {
        display += `  _${timeAgo}_\n`;
      }
      display += '\n';
    });

    display += `${divider()}`;
    display += `\`vibe consent accept @handle\` to connect\n`;
    display += `\`vibe consent block @handle\` to block`;

    return { display };
  }

  // Validate handle is provided for actions
  if (!handle) {
    return {
      display: `${header('Error')}\n\nPlease specify a handle: \`vibe consent ${action} @handle\``
    };
  }

  const targetHandle = handle.toLowerCase().replace('@', '');

  if (action === 'accept') {
    const result = await store.acceptConsent(targetHandle, myHandle);

    if (result.success) {
      return {
        display: `${header('Connected')}\n\n**@${targetHandle}** can now message you freely.\n\n${divider()}\`vibe dm @${targetHandle} "hey!"\` to start chatting`
      };
    } else {
      return {
        display: `${header('Error')}\n\n${result.error || 'Failed to accept connection'}`
      };
    }
  }

  if (action === 'block') {
    const result = await store.blockUser(targetHandle, myHandle);

    if (result.success) {
      return {
        display: `${header('Blocked')}\n\n**@${targetHandle}** has been blocked. They cannot message you.`
      };
    } else {
      return {
        display: `${header('Error')}\n\n${result.error || 'Failed to block user'}`
      };
    }
  }

  return {
    display: `${header('Error')}\n\nUnknown action: ${action}`
  };
}

module.exports = { definition, handler };
