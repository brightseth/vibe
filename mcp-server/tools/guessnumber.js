/**
 * vibe guessnumber — Play guess the number game with someone
 *
 * A fun number guessing game with difficulty levels
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Import game implementation
const guessNumber = require('../games/guessnumber');

// Post game results to board and Discord
async function postGameResult(winner, loser, moves, difficulty) {
  const API_URL = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';

  // Post to board
  try {
    const content = `@${winner} guessed the number in ${moves} moves! (${difficulty} difficulty) vs @${loser}`;

    await fetch(`${API_URL}/api/board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'echo',
        content,
        category: 'general'
      })
    });
  } catch (e) {
    console.error('[guessnumber] Failed to post to board:', e.message);
  }

  // Post to Discord
  try {
    await fetch(`${API_URL}/api/discord-bridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'game',
        data: {
          game: 'guess-the-number',
          winner: winner,
          loser: loser,
          player1: winner,
          player2: loser,
          moves: moves,
          difficulty: difficulty,
          draw: false
        }
      })
    });
  } catch (e) {
    console.error('[guessnumber] Failed to post to Discord:', e.message);
  }
}

const definition = {
  name: 'vibe_guessnumber',
  description: 'Play a guess the number game with someone. Choose difficulty: easy (1-10), medium (1-50), hard (1-100), extreme (1-1000)',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Who to play with (e.g., @solienne)'
      },
      difficulty: {
        type: 'string',
        description: 'Game difficulty (default: medium)',
        enum: ['easy', 'medium', 'hard', 'extreme']
      },
      guess: {
        type: ['number', 'string'],
        description: 'Your number guess'
      }
    },
    required: ['handle']
  }
};

/**
 * Parse game state from thread
 */
function getGameState(thread) {
  // Find the most recent guess number game payload
  for (let i = thread.length - 1; i >= 0; i--) {
    const msg = thread[i];
    if (msg.payload?.type === 'game' && msg.payload?.game === 'guessnumber') {
      return msg.payload.state;
    }
  }
  return null;
}

/**
 * Format game display
 */
function formatGameDisplay(gameState, them) {
  const display = guessNumber.formatGuessNumberDisplay(gameState);
  
  if (gameState.gameOver && gameState.won) {
    return `## Guess the Number with @${them}\n\n${display}\n\nGreat job! Start a new game anytime with \`vibe guessnumber @${them}\``;
  } else if (gameState.gameOver && !gameState.won) {
    return `## Guess the Number with @${them}\n\n${display}\n\nTry again! Start a new game with \`vibe guessnumber @${them}\``;
  } else {
    return `## Guess the Number with @${them}\n\n${display}\n\nMake your next guess with \`vibe guessnumber @${them} --guess NUMBER\``;
  }
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { handle, guess } = args;
  const difficulty = args.difficulty || 'medium';
  const myHandle = config.getHandle();
  const them = normalizeHandle(handle);

  if (them === myHandle) {
    return { display: 'You can\'t play a guessing game with yourself! That would be cheating! 😄' };
  }

  // Get existing thread
  const thread = await store.getThread(myHandle, them);
  let gameState = getGameState(thread);

  // Show current state if no guess provided
  if (guess === undefined) {
    if (!gameState) {
      // Start new game
      const newGameState = guessNumber.createInitialGuessNumberState(difficulty);
      const payload = createGamePayload('guessnumber', newGameState);
      
      const difficultyInfo = guessNumber.getDifficultyInfo()[difficulty];
      await store.sendMessage(
        myHandle, 
        them, 
        `Started a new guess the number game! (${difficulty}: ${difficultyInfo.range}) I'm thinking of a number... can you guess it?`, 
        'dm', 
        payload
      );

      return {
        display: `## New Guess the Number Game with @${them}\n\n${guessNumber.formatGuessNumberDisplay(newGameState)}\n\nUse \`vibe guessnumber @${them} --guess NUMBER\` to make your first guess!`
      };
    }

    // Show existing game
    return {
      display: formatGameDisplay(gameState, them)
    };
  }

  // Make a guess
  // Initialize game if needed
  if (!gameState) {
    gameState = guessNumber.createInitialGuessNumberState(difficulty);
  }

  // Check if game is over
  if (gameState.gameOver) {
    return { display: `This game is over! Start a new game with \`vibe guessnumber @${them}\` (no guess).` };
  }

  // Make the guess
  const result = guessNumber.makeGuess(gameState, guess);
  if (result.error) {
    return { display: `${result.error}` };
  }

  const newGameState = result.gameState;
  const payload = createGamePayload('guessnumber', newGameState);

  // Send message with game state
  let message = '';
  if (newGameState.won) {
    message = `🎉 You got it! The number was ${newGameState.targetNumber}! Solved in ${newGameState.moves} guesses!`;
    // Post to board
    await postGameResult(myHandle, them, newGameState.moves, newGameState.difficulty);
  } else {
    message = `Guessed ${guess}. ${newGameState.lastHint} Keep trying!`;
  }

  await store.sendMessage(myHandle, them, message, 'dm', payload);

  return {
    display: formatGameDisplay(newGameState, them)
  };
}

module.exports = { definition, handler };