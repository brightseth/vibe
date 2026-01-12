/**
 * vibe workshop — Access the /vibe game workshop and arcade
 *
 * Play solo games, join multiplayer sessions, browse the game collection
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Import game implementations
const arcade = require('../games/arcade');
const drawing = require('../games/drawing');
const hangman = require('../games/hangman');
const wordchain = require('../games/wordchain');
const twentyquestions = require('../games/twentyquestions');
const snake = require('../games/snake');
const memory = require('../games/memory');
const rockpaperscissors = require('../games/rockpaperscissors');

// Workshop shared game sessions (in-memory for now)
const gameSessions = new Map();

const definition = {
  name: 'vibe_workshop',
  description: 'Access the /vibe game workshop and arcade. Play games, join collaborative sessions, browse the collection',
  inputSchema: {
    type: 'object',
    properties: {
      game: {
        type: 'string',
        description: 'Game to play or "arcade" to browse all games',
        enum: ['arcade', 'drawing', 'hangman', 'wordchain', 'twentyquestions', 'snake', 'memory', 'rockpaperscissors']
      },
      action: {
        type: 'string',
        description: 'Action to take (join, move, draw, guess, etc.)'
      },
      x: {
        type: 'number',
        description: 'X coordinate for drawing games'
      },
      y: {
        type: 'number',
        description: 'Y coordinate for drawing games'
      },
      char: {
        type: 'string',
        description: 'Character to draw (use character names like "dot", "star", "heart")'
      },
      guess: {
        type: 'string',
        description: 'Letter or word to guess'
      },
      command: {
        type: 'string',
        description: 'Game-specific command or arcade navigation'
      }
    },
    required: ['game']
  }
};

/**
 * Get or create a shared game session
 */
function getGameSession(gameType, sessionId = 'default') {
  const key = `${gameType}:${sessionId}`;
  
  if (!gameSessions.has(key)) {
    let initialState;
    
    switch (gameType) {
      case 'drawing':
        initialState = drawing.createInitialDrawingState();
        break;
      case 'hangman':
        initialState = require('../games/hangman').createInitialHangmanState();
        break;
      case 'wordchain':
        initialState = require('../games/wordchain').createInitialWordChainState();
        break;
      case 'twentyquestions':
        initialState = require('../games/twentyquestions').createInitialTwentyQuestionsState();
        break;
      case 'snake':
        initialState = require('../games/snake').createInitialSnakeState();
        break;
      case 'memory':
        initialState = require('../games/memory').createInitialMemoryState();
        break;
      case 'rockpaperscissors':
        initialState = require('../games/rockpaperscissors').createInitialRPSState();
        break;
      case 'arcade':
        initialState = arcade.createInitialArcadeState();
        break;
      default:
        throw new Error(`Unknown game type: ${gameType}`);
    }
    
    gameSessions.set(key, initialState);
  }
  
  return gameSessions.get(key);
}

/**
 * Update a game session
 */
function updateGameSession(gameType, newState, sessionId = 'default') {
  const key = `${gameType}:${sessionId}`;
  gameSessions.set(key, newState);
}

/**
 * Post activity to board when someone ships something cool
 */
async function postToBoard(content) {
  const API_URL = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';

  try {
    await fetch(`${API_URL}/api/board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'games-agent',
        content,
        category: 'general'
      })
    });
  } catch (e) {
    console.error('[workshop] Failed to post to board:', e.message);
  }
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { game, action, x, y, char, guess, command } = args;
  const myHandle = config.getHandle();

  try {
    // Handle arcade browsing
    if (game === 'arcade') {
      const gameState = getGameSession('arcade');
      
      if (command) {
        const result = arcade.handleArcadeCommand(gameState, command);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        updateGameSession('arcade', result.gameState);
        return { display: arcade.formatArcadeDisplay(result.gameState) };
      }
      
      return { display: arcade.formatArcadeDisplay(gameState) };
    }

    // Handle collaborative drawing
    if (game === 'drawing') {
      const gameState = getGameSession('drawing');
      
      // Join the drawing session
      if (!gameState.players.includes(myHandle)) {
        const joinResult = drawing.addPlayer(gameState, myHandle);
        if (joinResult.error) {
          return { display: `❌ ${joinResult.error}` };
        }
        updateGameSession('drawing', joinResult.gameState);
        
        // Announce new artist
        postToBoard(`🎨 @${myHandle} joined the collaborative drawing session!`);
      }
      
      const currentGameState = getGameSession('drawing');
      
      // Handle drawing actions
      if (action === 'draw' && x !== undefined && y !== undefined && char) {
        // Convert character name to actual character
        const drawChar = drawing.DRAWING_CHARS[char] || char;
        const result = drawing.makeMove(currentGameState, x, y, drawChar, myHandle);
        
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        
        updateGameSession('drawing', result.gameState);
        return { 
          display: `✏️ Drew ${drawChar} at (${x},${y})\n\n${drawing.formatDrawingDisplay(result.gameState)}`
        };
      }
      
      if (action === 'line' && command) {
        // Parse line command: "x0,y0 to x1,y1 with char"
        const match = command.match(/(\d+),(\d+)\s+to\s+(\d+),(\d+)\s+with\s+(\w+)/);
        if (match) {
          const [, x0, y0, x1, y1, charName] = match;
          const drawChar = drawing.DRAWING_CHARS[charName] || charName;
          const result = drawing.drawLine(currentGameState, parseInt(x0), parseInt(y0), parseInt(x1), parseInt(y1), drawChar, myHandle);
          
          if (result.error) {
            return { display: `❌ ${result.error}` };
          }
          
          updateGameSession('drawing', result.gameState);
          return { 
            display: `✏️ Drew line from (${x0},${y0}) to (${x1},${y1})\n\n${drawing.formatDrawingDisplay(result.gameState)}`
          };
        }
      }
      
      if (action === 'clear' && command) {
        // Parse clear command: "x0,y0 to x1,y1"
        const match = command.match(/(\d+),(\d+)\s+to\s+(\d+),(\d+)/);
        if (match) {
          const [, x0, y0, x1, y1] = match;
          const result = drawing.clearRegion(currentGameState, parseInt(x0), parseInt(y0), parseInt(x1), parseInt(y1), myHandle);
          
          if (result.error) {
            return { display: `❌ ${result.error}` };
          }
          
          updateGameSession('drawing', result.gameState);
          return { 
            display: `🧹 Cleared region (${x0},${y0}) to (${x1},${y1})\n\n${drawing.formatDrawingDisplay(result.gameState)}`
          };
        }
      }
      
      if (action === 'theme' && command) {
        const result = drawing.setTheme(currentGameState, command, myHandle);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        
        updateGameSession('drawing', result.gameState);
        const tips = drawing.getDrawingTips(command);
        return { 
          display: `🎯 Set theme: ${command}\n\n**Tips:** ${tips.join(', ')}\n\n${drawing.formatDrawingDisplay(result.gameState)}`
        };
      }
      
      if (action === 'stats') {
        const stats = drawing.getCanvasStats(currentGameState);
        return {
          display: `📊 **Canvas Statistics**\n\n` +
                   `• Total moves: ${stats.totalMoves}\n` +
                   `• Canvas filled: ${stats.fillPercentage}%\n` +
                   `• Characters used: ${stats.uniqueCharsUsed}\n` +
                   `• Most popular: ${stats.mostUsedChar?.[0] || 'none'} (${stats.mostUsedChar?.[1] || 0} times)\n\n` +
                   `${drawing.formatDrawingDisplay(currentGameState)}`
        };
      }
      
      // Default: show drawing canvas
      return { display: drawing.formatDrawingDisplay(currentGameState) };
    }

    // Handle solo hangman
    if (game === 'hangman') {
      const gameState = getGameSession('hangman', myHandle); // Personal session
      
      if (action === 'guess' && guess) {
        const hangmanModule = require('../games/hangman');
        const result = hangmanModule.makeGuess(gameState, guess);
        
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        
        updateGameSession('hangman', result.gameState, myHandle);
        
        let response = hangmanModule.formatHangmanDisplay(result.gameState);
        
        if (result.gameState.won) {
          response += '\n\n🎉 **You won!** Starting a new game...';
          // Start new game
          const newState = hangmanModule.createInitialHangmanState();
          updateGameSession('hangman', newState, myHandle);
        } else if (result.gameState.lost) {
          response += '\n\n💀 **Game over!** Starting a new game...';
          // Start new game
          const newState = hangmanModule.createInitialHangmanState();
          updateGameSession('hangman', newState, myHandle);
        }
        
        return { display: response };
      }
      
      if (action === 'new') {
        const hangmanModule = require('../games/hangman');
        const newState = hangmanModule.createInitialHangmanState();
        updateGameSession('hangman', newState, myHandle);
        return { display: hangmanModule.formatHangmanDisplay(newState) };
      }
      
      // Default: show current game
      const hangmanModule = require('../games/hangman');
      return { display: hangmanModule.formatHangmanDisplay(gameState) };
    }

    // Handle other games similarly...
    // For now, return a helpful message for unsupported games
    const supportedGames = ['arcade', 'drawing', 'hangman'];
    if (!supportedGames.includes(game)) {
      return { 
        display: `🎮 **${game.charAt(0).toUpperCase() + game.slice(1)}** game support coming soon!\n\n` +
                 `Currently available:\n` +
                 `• **arcade** - Browse all games\n` +
                 `• **drawing** - Collaborative drawing canvas\n` +
                 `• **hangman** - Solo word guessing\n\n` +
                 `Use \`vibe workshop arcade\` to explore all games!`
      };
    }

    return { display: 'Use --action to interact with the game!' };

  } catch (error) {
    console.error('[workshop] Error:', error);
    return { display: `❌ Workshop error: ${error.message}` };
  }
}

module.exports = { definition, handler };