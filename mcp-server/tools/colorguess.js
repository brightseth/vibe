/**
 * vibe colorguess — Play a fun color guessing game with friends
 *
 * One player thinks of a color, others try to guess it with helpful hints!
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Color guessing game implementation
const colorguess = require('../games/colorguess');

const definition = {
  name: 'vibe_colorguess',
  description: 'Start or play a color guessing game. One player picks a color, others guess with hints!',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to perform',
        enum: ['start', 'join', 'color', 'guess', 'hint', 'view', 'colors']
      },
      room: {
        type: 'string',
        description: 'Game room name (default: general)'
      },
      color: {
        type: 'string',
        description: 'Secret color to set (host only) or color to guess'
      },
      hint: {
        type: 'string',
        description: 'Hint to give (host only)'
      },
      invite: {
        type: 'string',
        description: 'Handle to invite to the game'
      }
    },
    required: ['action']
  }
};

/**
 * Get color guessing game state from global store
 */
async function getGameState(room) {
  try {
    const key = `colorguess:${room}`;
    const state = await store.get(key);
    return state ? JSON.parse(state) : null;
  } catch (e) {
    console.error('[colorguess] Failed to get state:', e.message);
    return null;
  }
}

/**
 * Save color guessing game state to global store
 */
async function saveGameState(room, state) {
  try {
    const key = `colorguess:${room}`;
    await store.set(key, JSON.stringify(state));
  } catch (e) {
    console.error('[colorguess] Failed to save state:', e.message);
  }
}

/**
 * Post game activity to board
 */
async function postGameActivity(action, room, player, details = '') {
  const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';

  try {
    let content;
    switch (action) {
      case 'start':
        content = `🎨 @${player} started a color guessing game in #${room}`;
        break;
      case 'win':
        content = `🎉 @${player} guessed the color in #${room}: ${details}`;
        break;
      case 'complete':
        content = `🎨 Color guessing game in #${room} ended. The color was: ${details}`;
        break;
      default:
        return; // Don't post for every action
    }

    await fetch(`${API_URL}/api/board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'games-agent',
        content,
        category: 'games'
      })
    });
  } catch (e) {
    console.error('[colorguess] Failed to post to board:', e.message);
  }
}

/**
 * Invite someone to play
 */
async function invitePlayer(myHandle, targetHandle, room) {
  const them = normalizeHandle(targetHandle);
  const message = `🎨 Hey! I started a color guessing game in #${room}. Want to join? Use \`vibe colorguess --action join --room ${room}\` to play!`;
  await store.sendMessage(myHandle, them, message, 'dm');
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { action, room = 'general', color, hint, invite } = args;
  const myHandle = config.getHandle();

  // Handle inviting someone
  if (invite) {
    await invitePlayer(myHandle, invite, room);
    return {
      display: `🎨 Invited @${normalizeHandle(invite)} to join the color guessing game in #${room}!`
    };
  }

  // Get current game state
  let gameState = await getGameState(room);

  switch (action) {
    case 'start':
      // Create new game
      gameState = colorguess.createInitialColorGuessState();
      const addResult = colorguess.addPlayer(gameState, myHandle);
      if (addResult.error) {
        return { display: `Error: ${addResult.error}` };
      }
      gameState = addResult.gameState;
      await saveGameState(room, gameState);
      await postGameActivity('start', room, myHandle);

      return {
        display: `## 🎨 Started Color Guessing Game in #${room}\n\n${colorguess.formatColorGuessDisplay(gameState)}\n\nAs host, set your secret color with:\n\`vibe colorguess --action color --room ${room} --color red\`\n\nInvite friends:\n\`vibe colorguess --action join --room ${room} --invite @username\``
      };

    case 'join':
      if (!gameState) {
        return { display: `No color guessing game found in #${room}. Use \`vibe colorguess --action start --room ${room}\` to create one!` };
      }

      const joinResult = colorguess.addPlayer(gameState, myHandle);
      if (joinResult.error) {
        return { display: `Error: ${joinResult.error}` };
      }

      gameState = joinResult.gameState;
      await saveGameState(room, gameState);

      return {
        display: `## 🎨 Joined Color Guessing Game in #${room}\n\n${colorguess.formatColorGuessDisplay(gameState)}\n\nWaiting for the host to set a secret color and start the game!`
      };

    case 'color':
      if (!gameState) {
        return { display: `No color guessing game found in #${room}.` };
      }

      if (!color) {
        return { display: 'Please specify a --color to set as the secret!' };
      }

      const colorResult = colorguess.setSecretColor(gameState, color, myHandle);
      if (colorResult.error) {
        return { display: `Error: ${colorResult.error}` };
      }

      gameState = colorResult.gameState;
      await saveGameState(room, gameState);

      return {
        display: `## 🎨 Secret Color Set! in #${room}\n\n${colorguess.formatColorGuessDisplay(gameState)}\n\nThe game has started! Other players can now guess your secret color.\nGive hints with: \`vibe colorguess --action hint --room ${room} --hint "warm and fiery"\``
      };

    case 'guess':
      if (!gameState) {
        return { display: `No color guessing game found in #${room}.` };
      }

      if (!color) {
        return { display: 'Please specify a --color to guess!' };
      }

      const guessResult = colorguess.makeGuess(gameState, color, myHandle);
      if (guessResult.error) {
        return { display: `Error: ${guessResult.error}` };
      }

      gameState = guessResult.gameState;
      await saveGameState(room, gameState);

      // Check if game ended
      if (gameState.gameOver) {
        if (gameState.winner) {
          await postGameActivity('win', room, myHandle, `${colorguess.getColorEmoji(gameState.secretColor)} ${gameState.secretColor}`);
        } else {
          await postGameActivity('complete', room, 'system', `${colorguess.getColorEmoji(gameState.secretColor)} ${gameState.secretColor}`);
        }
      }

      let response = `## 🎨 Color Guessing Game in #${room}\n\n${colorguess.formatColorGuessDisplay(gameState)}`;
      
      if (gameState.gameOver) {
        response += `\n\nGame over! Start a new game with \`vibe colorguess --action start --room ${room}\``;
      }

      return { display: response };

    case 'hint':
      if (!gameState) {
        return { display: `No color guessing game found in #${room}.` };
      }

      if (!hint) {
        return { display: 'Please provide a --hint for the players!' };
      }

      const hintResult = colorguess.addHint(gameState, hint, myHandle);
      if (hintResult.error) {
        return { display: `Error: ${hintResult.error}` };
      }

      gameState = hintResult.gameState;
      await saveGameState(room, gameState);

      return {
        display: `## 🎨 Added Hint in #${room}\n\n${colorguess.formatColorGuessDisplay(gameState)}\n\nGreat hint! Players can now use this to make better guesses.`
      };

    case 'view':
      if (!gameState) {
        return { display: `No color guessing game found in #${room}. Use \`vibe colorguess --action start --room ${room}\` to create one!` };
      }

      let viewResponse = `## 🎨 Color Guessing Game in #${room}\n\n${colorguess.formatColorGuessDisplay(gameState)}`;
      
      if (gameState.phase === 'setup') {
        viewResponse += `\n\n**Commands:**\n• Host: \`vibe colorguess --action color --room ${room} --color blue\`\n• Join: \`vibe colorguess --action join --room ${room}\``;
      } else if (gameState.phase === 'guessing') {
        viewResponse += `\n\n**Commands:**\n• Guess: \`vibe colorguess --action guess --room ${room} --color red\`\n• Hint (host): \`vibe colorguess --action hint --room ${room} --hint "like fire"\``;
      } else {
        viewResponse += `\n\nGame over! Start a new one with \`vibe colorguess --action start --room ${room}\``;
      }

      return { display: viewResponse };

    case 'colors':
      const colors = colorguess.getValidColors();
      const colorGroups = [];
      for (let i = 0; i < colors.length; i += 8) {
        const group = colors.slice(i, i + 8);
        colorGroups.push(group.map(color => `${colorguess.getColorEmoji(color)} ${color}`).join(' '));
      }

      return {
        display: `## 🎨 Valid Colors\n\nYou can use any of these colors:\n\n${colorGroups.join('\n')}\n\n**Examples:**\n• \`--color red\`\n• \`--color turquoise\`\n• \`--color lavender\``
      };

    default:
      return {
        display: `## 🎨 Color Guessing Game\n\nA fun social guessing game!\n\n**How to play:**\n1. One player (host) thinks of a color\n2. Other players try to guess it\n3. Host gives hints to help\n\n**Commands:**\n• \`--action start\` - Create new game\n• \`--action join\` - Join existing game\n• \`--action color --color blue\` - Set secret color (host)\n• \`--action guess --color red\` - Make a guess\n• \`--action hint --hint "warm color"\` - Give hint (host)\n• \`--action view\` - View current game\n• \`--action colors\` - See all valid colors\n\nAdd \`--room [name]\` to play in different rooms!\n\`--invite @user\` to invite someone!`
      };
  }
}

module.exports = { definition, handler };