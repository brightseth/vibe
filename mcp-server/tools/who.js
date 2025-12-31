/**
 * vibe who — See who's around
 */

const config = require('../config');
const store = require('../store');

const definition = {
  name: 'vibe_who',
  description: 'See who\'s online and what they\'re building.',
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

  const users = store.getActiveUsers();
  const myHandle = config.getHandle();

  if (users.length === 0) {
    return {
      display: `## Who's Around

_No one else is here yet._

Invite someone to install /vibe.`
    };
  }

  let display = `## Who's Around\n\n`;

  users.forEach(u => {
    const isMe = u.handle === myHandle;
    const status = u.status === 'active' ? '●' : '○';
    const tag = isMe ? ' (you)' : '';

    display += `${status} **@${u.handle}**${tag} — ${u.one_liner}\n`;
    display += `  _${u.last_seen}_\n\n`;
  });

  return { display };
}

module.exports = { definition, handler };
