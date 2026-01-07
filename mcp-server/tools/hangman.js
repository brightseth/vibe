/**
 * vibe hangman — Play hangman word guessing game
 *
 * Single-player game where you guess letters to find the hidden word
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit } = require('./_shared');

// Hangman game implementation
const hangman = require('../games/hangman');

const definition = {
  name: 'vibe_hangman',
  description: 'Play hangman - guess letters to find the hidden word',
  inputSchema: {
    type: 'object',
    properties: {
      guess: {
        type: 'string',
        description: 'Letter to guess (a-z) or "new" to start a new game'
      },
      difficulty: {
        type: 'string',
        description: 'Difficulty level for new games (easy, medium, hard)',
        enum: ['easy', 'medium', 'hard']
      }
    },
    required: []
  }
};

/**
 * Get latest hangman game state for user
 */
async function getLatestHangmanState(handle) {
  // Get user's thread with themselves (for single-player games)
  const thread = await store.getThread(handle, handle);
  
  // Find the most recent hangman game
  for (let i = thread.length - 1; i >= 0; i--) {
    const msg = thread[i];
    if (msg.payload?.type === 'game' && msg.payload?.game === 'hangman') {
      return msg.payload.state;
    }
  }
  return null;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { guess, difficulty = 'medium' } = args;
  const myHandle = config.getHandle();

  // Get current game state
  let gameState = await getLatestHangmanState(myHandle);

  // Start new game
  if (!gameState || guess === 'new' || (gameState.gameOver && !guess)) {
    gameState = hangman.createInitialHangmanState(difficulty);
    const payload = createGamePayload('hangman', gameState);

    await store.sendMessage(myHandle, myHandle, `New ${difficulty} hangman game started!`, 'dm', payload);

    const display = hangman.formatHangmanDisplay(gameState);
    return {
      display: `## New Hangman Game (${difficulty})\n\n${display}\n\nGuess letters with: \`vibe hangman --guess a\``
    };
  }

  // Show current game if no guess
  if (!guess) {
    const display = hangman.formatHangmanDisplay(gameState);
    const status = gameState.gameOver ? 
      '\nGame over! Use `vibe hangman` with no arguments to start a new game.' :
      '\nGuess letters with: `vibe hangman --guess a`';
    
    return {
      display: `## Hangman Game\n\n${display}${status}`
    };
  }

  // Make a guess
  const result = hangman.makeGuess(gameState, guess);
  
  if (result.error) {
    const display = hangman.formatHangmanDisplay(gameState);
    return {
      display: `## Hangman Game\n\n${display}\n\n❌ **${result.error}**\n\nTry again: \`vibe hangman --guess a\``
    };
  }

  // Update game state
  const newGameState = result.gameState;
  const payload = createGamePayload('hangman', newGameState);

  // Send message with updated state
  let message = `Guessed "${guess.toUpperCase()}".`;
  if (newGameState.gameOver) {
    if (newGameState.won) {
      message += ` 🎉 You won! The word was "${newGameState.word.toUpperCase()}".`;
    } else {
      message += ` 💀 Game over! The word was "${newGameState.word.toUpperCase()}".`;
    }
  } else {
    if (newGameState.correctGuesses.includes(guess.toLowerCase())) {
      message += ' Good guess! ✅';
    } else {
      message += ' Not in the word! ❌';
    }
  }

  await store.sendMessage(myHandle, myHandle, message, 'dm', payload);

  const display = hangman.formatHangmanDisplay(newGameState);
  const status = newGameState.gameOver ?
    '\n\n🎮 Use `vibe hangman` to start a new game!' :
    '\n\nKeep guessing: `vibe hangman --guess e`';

  return {
    display: `## Hangman Game\n\n${display}${status}`
  };
}

module.exports = { definition, handler };