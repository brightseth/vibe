/**
 * vibe multiplayer-game — Join multiplayer games like drawing, tic-tac-toe rooms, etc.
 *
 * Supports: drawing, multiplayer-tictactoe, wordchain, storybuilder
 */

const config = require('../config');
const store = require('../store');
const { requireInit, normalizeHandle } = require('./_shared');

// Game implementations
const drawing = require('../games/drawing');
const multiTicTacToe = require('../games/multiplayer-tictactoe');
const wordchain = require('../games/wordchain');
const storybuilder = require('../games/storybuilder');

// Global game state storage (in memory for now)
const globalGameRooms = {};

const definition = {
  name: 'vibe_multiplayer_game',
  description: 'Join or interact with multiplayer games (drawing, multiplayer-tictactoe, wordchain, storybuilder)',
  inputSchema: {
    type: 'object',
    properties: {
      game: {
        type: 'string',
        description: 'Game type to join/play',
        enum: ['drawing', 'multiplayer-tictactoe', 'wordchain', 'storybuilder']
      },
      action: {
        type: 'string',
        description: 'Action to take (join, leave, draw, move, etc.)',
        enum: ['join', 'leave', 'show', 'draw', 'move', 'clear', 'theme', 'restart', 'spectate', 'word', 'sentence']
      },
      x: {
        type: 'number',
        description: 'X coordinate for drawing (0-19)'
      },
      y: {
        type: 'number',
        description: 'Y coordinate for drawing (0-11)'
      },
      char: {
        type: 'string',
        description: 'Character to draw (empty, dot, circle, square, star, heart, tree, house, sun, moon, water, mountain, person, cat, dog, car, plane, flower, umbrella, rainbow)'
      },
      position: {
        type: 'number',
        description: 'Position for tic-tac-toe (1-9)'
      },
      word: {
        type: 'string',
        description: 'Word to add to word chain'
      },
      sentence: {
        type: 'string',
        description: 'Sentence to add to story'
      },
      theme: {
        type: 'string',
        description: 'Theme to set for drawing game'
      },
      roomName: {
        type: 'string',
        description: 'Room name for multiplayer-tictactoe'
      }
    },
    required: ['game', 'action']
  }
};

// Get or create global game room
function getGameRoom(gameType, roomId = 'default') {
  const key = `${gameType}:${roomId}`;
  
  if (!globalGameRooms[key]) {
    if (gameType === 'drawing') {
      globalGameRooms[key] = drawing.createInitialDrawingState();
    } else if (gameType === 'multiplayer-tictactoe') {
      const myHandle = config.getHandle();
      globalGameRooms[key] = multiTicTacToe.createInitialMultiplayerTicTacToeState(myHandle, roomId);
    } else if (gameType === 'wordchain') {
      globalGameRooms[key] = wordchain.createInitialWordChainState();
    } else if (gameType === 'storybuilder') {
      globalGameRooms[key] = storybuilder.createInitialStoryState();
    }
  }
  
  return globalGameRooms[key];
}

// Update global game room
function updateGameRoom(gameType, roomId, newState) {
  const key = `${gameType}:${roomId}`;
  globalGameRooms[key] = newState;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { game, action, x, y, char, position, word, sentence, theme, roomName } = args;
  const myHandle = config.getHandle();
  const roomId = roomName || 'default';

  // Get current game state
  let gameState = getGameRoom(game, roomId);
  
  try {
    if (game === 'drawing') {
      if (action === 'join') {
        const result = drawing.addPlayer(gameState, myHandle);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        return { display: `🎨 **Joined Collaborative Drawing!**\n\n${drawing.formatDrawingDisplay(result.gameState)}\n\nUse commands like:\n• \`vibe multiplayer-game drawing draw --x 10 --y 5 --char star\`\n• \`vibe multiplayer-game drawing theme --theme "house"\`` };
      
      } else if (action === 'draw') {
        if (x === undefined || y === undefined || !char) {
          return { display: 'Need x, y coordinates and character to draw. Example: `vibe multiplayer-game drawing draw --x 10 --y 5 --char star`' };
        }
        
        // Convert char name to actual character
        const charMap = drawing.DRAWING_CHARS;
        const actualChar = charMap[char] || char;
        
        const result = drawing.makeMove(gameState, x, y, actualChar, myHandle);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        return { display: `🎨 **Drew ${actualChar} at (${x},${y})**\n\n${drawing.formatDrawingDisplay(result.gameState)}` };
      
      } else if (action === 'clear') {
        const x0 = x || 0;
        const y0 = y || 0;
        const x1 = args.x1 || x0;
        const y1 = args.y1 || y0;
        
        const result = drawing.clearRegion(gameState, x0, y0, x1, y1, myHandle);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        return { display: `🧹 **Cleared region**\n\n${drawing.formatDrawingDisplay(result.gameState)}` };
      
      } else if (action === 'theme') {
        if (!theme) {
          return { display: 'Need a theme! Example: `vibe multiplayer-game drawing theme --theme "house"`' };
        }
        const result = drawing.setTheme(gameState, theme, myHandle);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        const tips = drawing.getDrawingTips(theme);
        return { display: `🎯 **Set theme: ${theme}**\n\n**Tips:** ${tips.join(', ')}\n\n${drawing.formatDrawingDisplay(result.gameState)}` };
      
      } else if (action === 'show') {
        return { display: drawing.formatDrawingDisplay(gameState) };
      }

    } else if (game === 'multiplayer-tictactoe') {
      if (action === 'join') {
        const result = multiTicTacToe.joinRoom(gameState, myHandle, false);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        return { display: `🎯 **Joined Multiplayer Tic-Tac-Toe!**\n\n${multiTicTacToe.formatMultiplayerTicTacToeDisplay(result.gameState, myHandle)}` };
      
      } else if (action === 'spectate') {
        const result = multiTicTacToe.joinRoom(gameState, myHandle, true);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        return { display: `👁️ **Now spectating Multiplayer Tic-Tac-Toe**\n\n${multiTicTacToe.formatMultiplayerTicTacToeDisplay(result.gameState, myHandle)}` };
      
      } else if (action === 'move') {
        if (!position) {
          return { display: 'Need position (1-9)! Example: `vibe multiplayer-game multiplayer-tictactoe move --position 5`' };
        }
        const result = multiTicTacToe.makeMove(gameState, position, myHandle);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        return { display: `🎯 **Played position ${position}**\n\n${multiTicTacToe.formatMultiplayerTicTacToeDisplay(result.gameState, myHandle)}` };
      
      } else if (action === 'restart') {
        const result = multiTicTacToe.restartGame(gameState, myHandle);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        return { display: `🔄 **Restarted game!**\n\n${multiTicTacToe.formatMultiplayerTicTacToeDisplay(result.gameState, myHandle)}` };
      
      } else if (action === 'leave') {
        const result = multiTicTacToe.leaveRoom(gameState, myHandle);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        return { display: '👋 Left the game room.' };
      
      } else if (action === 'show') {
        return { display: multiTicTacToe.formatMultiplayerTicTacToeDisplay(gameState, myHandle) };
      }

    } else if (game === 'wordchain') {
      if (action === 'join') {
        const result = wordchain.addPlayer(gameState, myHandle);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        return { display: `🔗 **Joined Word Chain!**\n\n${wordchain.formatWordChainDisplay(result.gameState)}` };
      
      } else if (action === 'word') {
        if (!word) {
          return { display: 'Need a word! Example: `vibe multiplayer-game wordchain word --word "apple"`' };
        }
        const result = wordchain.addWord(gameState, word, myHandle);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        return { display: `🔗 **Added word: ${word}**\n\n${wordchain.formatWordChainDisplay(result.gameState)}` };
      
      } else if (action === 'show') {
        return { display: wordchain.formatWordChainDisplay(gameState) };
      }

    } else if (game === 'storybuilder') {
      if (action === 'join') {
        const result = storybuilder.addPlayer(gameState, myHandle);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        return { display: `📚 **Joined Story Builder!**\n\n${storybuilder.formatStoryDisplay(result.gameState)}` };
      
      } else if (action === 'sentence') {
        if (!sentence) {
          return { display: 'Need a sentence! Example: `vibe multiplayer-game storybuilder sentence --sentence "Once upon a time..."`' };
        }
        const result = storybuilder.addSentence(gameState, sentence, myHandle);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameRoom(game, roomId, result.gameState);
        return { display: `📚 **Added sentence!**\n\n${storybuilder.formatStoryDisplay(result.gameState)}` };
      
      } else if (action === 'show') {
        return { display: storybuilder.formatStoryDisplay(gameState) };
      }
    }

    return { display: `❌ Unknown action "${action}" for game "${game}"` };

  } catch (error) {
    return { display: `❌ Error: ${error.message}` };
  }
}

module.exports = { definition, handler };