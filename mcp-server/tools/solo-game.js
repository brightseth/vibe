/**
 * vibe solo-game — Play single-player games
 *
 * Supports: hangman, rps (rock paper scissors)
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit } = require('./_shared');

// Import game implementations
const hangman = require('../games/hangman');
const rps = require('../games/rockpaperscissors');

// Post game results to board
async function postSoloGameResult(player, game, won, score = null) {
  const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';

  try {
    let content;
    if (won) {
      content = score 
        ? `@${player} won ${game} with a score of ${score}! 🎉`
        : `@${player} won ${game}! 🎉`;
    } else {
      content = `@${player} played ${game}`;
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
    console.error('[solo-game] Failed to post to board:', e.message);
  }
}

const definition = {
  name: 'vibe_solo_game',
  description: 'Play single-player games. Supports: hangman, rps (rock paper scissors)',
  inputSchema: {
    type: 'object',
    properties: {
      game: {
        type: 'string',
        description: 'Game to play',
        enum: ['hangman', 'rps']
      },
      action: {
        type: 'string',
        description: 'Game action: hangman(guess, hint, new, status) | rps(rock, paper, scissors, new, status)'
      },
      guess: {
        type: 'string',
        description: 'Letter to guess (for hangman)'
      },
      move: {
        type: 'string',
        description: 'Your move for rock paper scissors (rock, paper, scissors)'
      },
      difficulty: {
        type: 'string',
        description: 'Game difficulty (easy, medium, hard)',
        enum: ['easy', 'medium', 'hard']
      },
      bestof: {
        type: 'number',
        description: 'Best of X rounds for RPS (1, 3, 5)',
        enum: [1, 3, 5]
      }
    },
    required: ['game']
  }
};

/**
 * Get current game state for a player
 */
async function getCurrentGameState(player, game) {
  // For solo games, we store state with a special key
  const thread = await store.getThread(player, `solo-${game}`);
  
  // Find the most recent game payload
  for (let i = thread.length - 1; i >= 0; i--) {
    const msg = thread[i];
    if (msg.payload?.type === 'game' && msg.payload?.game === game) {
      return msg.payload.state;
    }
  }
  return null;
}

/**
 * Save game state
 */
async function saveGameState(player, game, gameState, message) {
  const payload = createGamePayload(game, gameState);
  await store.sendMessage(player, `solo-${game}`, message, 'dm', payload);
}

/**
 * Format hangman display
 */
function formatHangmanPayload(payload) {
  return hangman.formatHangmanDisplay(payload.state);
}

/**
 * Format RPS display
 */
function formatRPSPayload(payload) {
  return rps.formatRPSDisplay(payload.state, 'Computer');
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { game, action, guess, move, difficulty, bestof } = args;
  const myHandle = config.getHandle();

  if (game === 'hangman') {
    // Get current game state
    let gameState = await getCurrentGameState(myHandle, 'hangman');

    // Handle different actions
    if (action === 'new' || !gameState) {
      // Start new game
      const gameDifficulty = difficulty || 'medium';
      gameState = hangman.createInitialHangmanState(gameDifficulty);
      
      await saveGameState(myHandle, 'hangman', gameState, `Started new ${gameDifficulty} hangman game!`);
      
      const payload = createGamePayload('hangman', gameState);
      return {
        display: `## New Hangman Game (${gameDifficulty})\n\n${formatHangmanPayload(payload)}\n\nUse \`vibe solo-game hangman --guess a\` to guess letters`
      };
    }

    if (action === 'status' || (!action && !guess)) {
      // Show current game state
      const payload = createGamePayload('hangman', gameState);
      let displayText = `## Hangman Game\n\n${formatHangmanPayload(payload)}`;
      
      if (gameState.gameOver) {
        displayText += `\n\nUse \`vibe solo-game hangman --action new\` to start a new game`;
      } else {
        displayText += `\n\nUse \`vibe solo-game hangman --guess X\` to guess a letter`;
      }
      
      return { display: displayText };
    }

    if (action === 'hint') {
      // Show hint
      const hint = hangman.getHint(gameState.word, gameState.difficulty);
      return { display: `💡 **Hint:** ${hint}` };
    }

    if (action === 'guess' || guess) {
      // Make a guess
      const guessLetter = guess || action;
      
      if (!guessLetter) {
        return { display: 'Please specify a letter to guess: `vibe solo-game hangman --guess a`' };
      }

      const result = hangman.makeGuess(gameState, guessLetter);
      
      if (result.error) {
        return { display: `Error: ${result.error}` };
      }

      const newGameState = result.gameState;
      
      // Save updated state
      let message = `Guessed "${guessLetter.toUpperCase()}"`;
      if (newGameState.gameOver) {
        if (newGameState.won) {
          message += ' - You won! 🎉';
          // Post to board for wins
          postSoloGameResult(myHandle, 'hangman', true, `${newGameState.moves} guesses`);
        } else {
          message += ' - Game over! 💀';
        }
      }
      
      await saveGameState(myHandle, 'hangman', newGameState, message);
      
      const payload = createGamePayload('hangman', newGameState);
      let displayText = `## Hangman Game\n\n${formatHangmanPayload(payload)}`;
      
      if (newGameState.gameOver) {
        displayText += `\n\nUse \`vibe solo-game hangman --action new\` to start a new game`;
      } else {
        displayText += `\n\nUse \`vibe solo-game hangman --guess X\` to guess another letter`;
      }
      
      return { display: displayText };
    }

    return { display: 'Unknown action. Use: new, status, guess, or hint' };
  }

  if (game === 'rps') {
    // Get current game state
    let gameState = await getCurrentGameState(myHandle, 'rps');

    // Handle different actions
    if (action === 'new' || !gameState) {
      // Start new game
      const gameBestOf = bestof || 1;
      gameState = rps.createInitialRPSState(gameBestOf);
      
      await saveGameState(myHandle, 'rps', gameState, `Started new Rock Paper Scissors game (best of ${gameBestOf})!`);
      
      const payload = createGamePayload('rps', gameState);
      return {
        display: `## New Rock Paper Scissors Game${gameBestOf > 1 ? ` (Best of ${gameBestOf})` : ''}\n\n${formatRPSPayload(payload)}\n\nUse \`vibe solo-game rps --move rock\` (or paper/scissors) to play`
      };
    }

    if (action === 'status' || (!action && !move)) {
      // Show current game state
      const payload = createGamePayload('rps', gameState);
      let displayText = `## Rock Paper Scissors${gameState.bestOf > 1 ? ` (Best of ${gameState.bestOf})` : ''}\n\n${formatRPSPayload(payload)}`;
      
      if (gameState.gameOver) {
        displayText += `\n\nUse \`vibe solo-game rps --action new\` to start a new game`;
      } else {
        displayText += `\n\nUse \`vibe solo-game rps --move rock\` (or paper/scissors) to make your move`;
      }
      
      return { display: displayText };
    }

    // Handle moves (rock, paper, scissors can be action or move parameter)
    const playerMove = move || action;
    if (playerMove && ['rock', 'paper', 'scissors'].includes(playerMove.toLowerCase())) {
      
      const result = rps.makeMove(gameState, playerMove);
      
      if (result.error) {
        return { display: `Error: ${result.error}` };
      }

      const newGameState = result.gameState;
      
      // Save updated state
      let message = `Played ${playerMove}`;
      if (newGameState.gameOver) {
        if (newGameState.winner === 'player') {
          message += ' - You won the game! 🎉';
          // Post to board for wins
          postSoloGameResult(myHandle, 'Rock Paper Scissors', true, `${newGameState.playerScore}-${newGameState.opponentScore}`);
        } else {
          message += ' - You lost the game! 💀';
        }
      } else {
        message += ` vs ${newGameState.lastRound.opponentChoice}`;
      }
      
      await saveGameState(myHandle, 'rps', newGameState, message);
      
      const payload = createGamePayload('rps', newGameState);
      let displayText = `## Rock Paper Scissors${newGameState.bestOf > 1 ? ` (Best of ${newGameState.bestOf})` : ''}\n\n${formatRPSPayload(payload)}`;
      
      if (newGameState.gameOver) {
        displayText += `\n\nUse \`vibe solo-game rps --action new\` to start a new game`;
      } else {
        displayText += `\n\nUse \`vibe solo-game rps --move rock\` (or paper/scissors) for the next round`;
      }
      
      return { display: displayText };
    }

    return { display: 'Unknown action. Use: rock, paper, scissors, new, or status' };
  }

  return { display: 'Unknown game. Supported games: hangman, rps' };
}

module.exports = { definition, handler };