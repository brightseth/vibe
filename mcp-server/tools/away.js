/**
 * vibe away — Set an AIM-style away message
 *
 * Part of the /vibe Nostalgia Stack.
 * Classic away messages with auto-away after 30min idle.
 */

const config = require('../config');
const store = require('../store');
const { requireInit } = require('./_shared');
const { markAway } = require('../intelligence/proactive');

// Preset suggestions for fun
const PRESETS = [
  'grabbing coffee ☕',
  'in a meeting 📅',
  'deep work mode 🎧',
  'lunch break 🍕',
  'gone for a walk 🚶',
  'taking a break 💆',
  'back in 5 ⏰',
  'do not disturb 🔕'
];

const definition = {
  name: 'vibe_away',
  description: 'Set an away message (AIM-style). Classic vibes. Use "vibe back" to return.',
  inputSchema: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Your away message (e.g., "grabbing coffee", "in a meeting")'
      }
    }
  }
};

async function handler(args) {
  // Require init
  const initCheck = requireInit();
  if (initCheck) {
    return initCheck;
  }

  const handle = config.getHandle();
  const message = args.message?.trim();

  // If no message, set generic away
  if (!message) {
    await store.setAwayStatus(handle, 'away', null);
    markAway();
    return { display: '☕ away' };
  }

  // Validate message length
  if (message.length > 100) {
    return { display: '⚠️ too long (100 char max)' };
  }

  // Set away status with message
  await store.setAwayStatus(handle, 'away', message);
  markAway();

  return { display: `☕ away — "${message}"` };
}

module.exports = { definition, handler };
