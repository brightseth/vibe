/**
 * vibe react — Quick emoji reactions
 *
 * "react fire to stan" → sends 🔥
 */

const config = require('../config');
const store = require('../store');

const REACTIONS = {
  'fire': '🔥',
  '🔥': '🔥',
  'heart': '❤️',
  'love': '❤️',
  '❤️': '❤️',
  'eyes': '👀',
  '👀': '👀',
  'clap': '👏',
  '👏': '👏',
  'rocket': '🚀',
  '🚀': '🚀',
  'ship': '🚢',
  '🚢': '🚢',
  '100': '💯',
  'hundred': '💯',
  '💯': '💯',
  'thinking': '🤔',
  '🤔': '🤔',
  'laugh': '😂',
  'lol': '😂',
  '😂': '😂',
  'cool': '😎',
  '😎': '😎',
  'wave': '👋',
  '👋': '👋',
  'thumbsup': '👍',
  'yes': '👍',
  '+1': '👍',
  '👍': '👍',
  'party': '🎉',
  '🎉': '🎉',
  'fist': '🤜',
  'bump': '🤜',
  '🤜': '🤜',
  'brain': '🧠',
  '🧠': '🧠',
  'chef': '👨‍🍳',
  'chefkiss': '🤌',
  '🤌': '🤌',
};

const definition = {
  name: 'vibe_react',
  description: 'Send a quick emoji reaction. Fire, heart, eyes, clap, rocket, party, etc.',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Who to react to (e.g., @stan)'
      },
      reaction: {
        type: 'string',
        description: 'The reaction: fire, heart, eyes, clap, rocket, 100, party, brain, etc.'
      },
      note: {
        type: 'string',
        description: 'Optional short note with the reaction'
      }
    },
    required: ['handle', 'reaction']
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  const { handle, reaction, note } = args;
  const myHandle = config.getHandle();
  const them = handle?.toLowerCase().replace('@', '');

  if (!them) {
    return { display: 'Who should I react to? e.g., `react fire to @stan`' };
  }

  if (them === myHandle) {
    return { display: 'You can\'t react to yourself.' };
  }

  // Normalize reaction
  const emoji = REACTIONS[reaction?.toLowerCase()] || reaction;

  if (!emoji || emoji.length > 4) {
    const available = 'fire 🔥, heart ❤️, eyes 👀, clap 👏, rocket 🚀, 100 💯, party 🎉, brain 🧠, chefkiss 🤌';
    return { display: `Pick a reaction:\n${available}` };
  }

  // Send as a reaction-type message
  const body = note ? `${emoji} ${note}` : emoji;
  await store.sendMessage(myHandle, them, body, 'reaction');

  return {
    display: `${emoji} → **@${them}**${note ? `\n\n"${note}"` : ''}`
  };
}

module.exports = { definition, handler };
