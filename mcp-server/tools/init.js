/**
 * vibe init — Set your identity
 */

const config = require('../config');
const store = require('../store');

const definition = {
  name: 'vibe_init',
  description: 'Set your identity for /vibe. Required before messaging.',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Your handle (lowercase, no @)'
      },
      one_liner: {
        type: 'string',
        description: 'What are you building? (one line)'
      }
    },
    required: ['handle', 'one_liner']
  }
};

async function handler(args) {
  const { handle, one_liner } = args;

  // Normalize handle
  const h = handle.toLowerCase().replace('@', '').replace(/[^a-z0-9_-]/g, '');

  if (!h || h.length < 2) {
    return {
      display: 'Handle must be at least 2 characters (letters, numbers, - or _)'
    };
  }

  // Save config
  const cfg = config.load();
  cfg.handle = h;
  cfg.one_liner = one_liner || '';
  cfg.visible = true;
  config.save(cfg);

  // Register presence
  store.heartbeat(h, one_liner);

  return {
    display: `## Identity Set

**@${h}**
_${one_liner}_

You're now visible to others. Try:
- \`vibe who\` — see who's around
- \`vibe dm @someone "hello"\` — send a message`
  };
}

module.exports = { definition, handler };
