/**
 * vibe status — Set your mood/status
 */

const config = require('../config');
const store = require('../store');
const { trackMood } = require('./summarize');

const MOODS = {
  'shipping': '🔥',
  'thinking': '🧠',
  'afk': '☕',
  'debugging': '🐛',
  'pairing': '👯',
  'deep': '🎧',
  'celebrating': '🎉',
  'struggling': '😤',
  'clear': null
};

const definition = {
  name: 'vibe_status',
  description: 'Set your mood/status. Options: shipping, thinking, afk, debugging, pairing, deep, celebrating, struggling, clear',
  inputSchema: {
    type: 'object',
    properties: {
      mood: {
        type: 'string',
        description: 'Your mood (shipping, thinking, afk, debugging, pairing, deep, celebrating, struggling, clear)'
      }
    },
    required: ['mood']
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  const { mood } = args;
  const moodKey = mood.toLowerCase().replace(/[^a-z]/g, '');

  if (!MOODS.hasOwnProperty(moodKey)) {
    const options = Object.entries(MOODS)
      .filter(([k, v]) => v)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ');
    return {
      display: `Unknown mood. Options: ${options}, or "clear" to remove`
    };
  }

  const emoji = MOODS[moodKey];
  const handle = config.getHandle();

  // Update presence with mood via context
  await store.heartbeat(handle, config.getOneLiner(), { mood: emoji });

  // Track for session summary
  if (emoji) {
    trackMood(emoji);
  }

  if (!emoji) {
    return { display: 'Status cleared.' };
  }

  return {
    display: `Status set: ${emoji} ${moodKey}\n\nOthers will see this next to your name.`
  };
}

module.exports = { definition, handler };
