/**
 * vibe drawing — Collaborative drawing canvas
 *
 * A shared canvas where multiple users can draw together in real-time.
 * Create art, doodles, or play drawing games like Pictionary!
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Drawing game implementation
const drawing = require('../games/drawing');

const definition = {
  name: 'vibe_drawing',
  description: 'Collaborative drawing canvas. Draw together, create art, play Pictionary!',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to take',
        enum: ['new', 'join', 'draw', 'line', 'clear', 'status', 'theme', 'stats']
      },
      x: {
        type: 'number',
        description: 'X coordinate (0-19)'
      },
      y: {
        type: 'number', 
        description: 'Y coordinate (0-11)'
      },
      x2: {
        type: 'number',
        description: 'End X coordinate for lines and regions'
      },
      y2: {
        type: 'number',
        description: 'End Y coordinate for lines and regions'  
      },
      char: {
        type: 'string',
        description: 'Character to draw (empty, dot, circle, square, star, heart, tree, house, sun, moon, etc.)',
        enum: ['empty', 'dot', 'circle', 'square', 'star', 'heart', 'tree', 'house', 'sun', 'moon', 'water', 'mountain', 'person', 'cat', 'dog', 'car', 'plane', 'flower', 'umbrella', 'rainbow']
      },
      theme: {
        type: 'string',
        description: 'Drawing theme/prompt to set'
      },
      room: {
        type: 'string',
        description: 'Drawing room ID (optional, defaults to "main")'
      }
    },
    required: []
  }
};

// Store active drawing sessions (in production this would be in a database)
const drawingSessions = {};

/**
 * Get or create drawing session
 */
function getDrawingSession(roomId = 'main') {
  if (!drawingSessions[roomId]) {
    drawingSessions[roomId] = drawing.createInitialDrawingState();
  }
  return drawingSessions[roomId];
}

/**
 * Save drawing session state
 */
function saveDrawingSession(roomId, gameState) {
  drawingSessions[roomId] = gameState;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { action = 'status', x, y, x2, y2, char, theme, room = 'main' } = args;
  const myHandle = config.getHandle();

  // Get current drawing session
  let gameState = getDrawingSession(room);

  // Handle different actions
  switch (action) {
    case 'new':
      // Create a new drawing session
      gameState = drawing.createInitialDrawingState();
      const addResult = drawing.addPlayer(gameState, myHandle);
      if (addResult.error) {
        return { display: `❌ ${addResult.error}` };
      }
      
      gameState = addResult.gameState;
      saveDrawingSession(room, gameState);
      
      return {
        display: `🎨 **New Drawing Canvas Created!**\n\n${drawing.formatDrawingDisplay(gameState)}` +
                 `**Commands:**\n` +
                 `• \`vibe drawing --action draw --x 5 --y 3 --char star\` - Draw a star at (5,3)\n` +
                 `• \`vibe drawing --action line --x 0 --y 0 --x2 5 --y2 5 --char dot\` - Draw a line\n` +
                 `• \`vibe drawing --action clear --x 0 --y 0 --x2 10 --y2 5\` - Clear region\n` +
                 `• \`vibe drawing --action theme --theme "house"\` - Set drawing theme\n` +
                 `• \`vibe drawing --action join\` - Join this canvas\n\n` +
                 `Room ID: \`${room}\` - Share with others to collaborate!`
      };

    case 'join':
      // Join existing drawing session
      const joinResult = drawing.addPlayer(gameState, myHandle);
      if (joinResult.error) {
        return { display: `❌ ${joinResult.error}` };
      }
      
      gameState = joinResult.gameState;
      saveDrawingSession(room, gameState);
      
      return {
        display: `🎨 **Joined Drawing Canvas!**\n\n${drawing.formatDrawingDisplay(gameState)}` +
                 `You can now draw on this canvas with others!`
      };

    case 'draw':
      // Draw a single character
      if (x === undefined || y === undefined) {
        return { display: '❌ X and Y coordinates required. Example: `--x 5 --y 3`' };
      }
      
      if (!char) {
        return { display: '❌ Character required. Example: `--char star`\n\n' +
                          'Available: ' + Object.keys(drawing.DRAWING_CHARS).join(', ') };
      }
      
      const drawChar = drawing.DRAWING_CHARS[char];
      if (!drawChar) {
        return { display: `❌ Invalid character "${char}". Available: ${Object.keys(drawing.DRAWING_CHARS).join(', ')}` };
      }
      
      const drawResult = drawing.makeMove(gameState, x, y, drawChar, myHandle);
      if (drawResult.error) {
        return { display: `❌ ${drawResult.error}` };
      }
      
      gameState = drawResult.gameState;
      saveDrawingSession(room, gameState);
      
      return {
        display: `✅ Drew ${drawChar} at (${x},${y})\n\n${drawing.formatDrawingDisplay(gameState)}`
      };

    case 'line':
      // Draw a line between two points
      if (x === undefined || y === undefined || x2 === undefined || y2 === undefined) {
        return { display: '❌ Start and end coordinates required. Example: `--x 0 --y 0 --x2 5 --y2 5`' };
      }
      
      if (!char) {
        return { display: '❌ Character required for line. Example: `--char dot`' };
      }
      
      const lineChar = drawing.DRAWING_CHARS[char];
      if (!lineChar) {
        return { display: `❌ Invalid character "${char}". Available: ${Object.keys(drawing.DRAWING_CHARS).join(', ')}` };
      }
      
      const lineResult = drawing.drawLine(gameState, x, y, x2, y2, lineChar, myHandle);
      if (lineResult.error) {
        return { display: `❌ ${lineResult.error}` };
      }
      
      gameState = lineResult.gameState;
      saveDrawingSession(room, gameState);
      
      return {
        display: `✅ Drew line from (${x},${y}) to (${x2},${y2})\n\n${drawing.formatDrawingDisplay(gameState)}`
      };

    case 'clear':
      // Clear a region
      if (x === undefined || y === undefined) {
        // Clear single point
        const clearResult = drawing.makeMove(gameState, x || 0, y || 0, drawing.DRAWING_CHARS.empty, myHandle);
        if (clearResult.error) {
          return { display: `❌ ${clearResult.error}` };
        }
        gameState = clearResult.gameState;
      } else {
        // Clear region
        const clearResult = drawing.clearRegion(gameState, x, y, x2 || x, y2 || y, myHandle);
        if (clearResult.error) {
          return { display: `❌ ${clearResult.error}` };
        }
        gameState = clearResult.gameState;
      }
      
      saveDrawingSession(room, gameState);
      
      return {
        display: `✅ Cleared region\n\n${drawing.formatDrawingDisplay(gameState)}`
      };

    case 'theme':
      // Set drawing theme
      if (!theme) {
        return { display: '❌ Theme required. Example: `--theme "house"` or `--theme "landscape"`' };
      }
      
      const themeResult = drawing.setTheme(gameState, theme, myHandle);
      if (themeResult.error) {
        return { display: `❌ ${themeResult.error}` };
      }
      
      gameState = themeResult.gameState;
      saveDrawingSession(room, gameState);
      
      const tips = drawing.getDrawingTips(theme);
      return {
        display: `🎯 **Theme set to: "${theme}"**\n\n${drawing.formatDrawingDisplay(gameState)}` +
                 `**Drawing tips for "${theme}":**\n${tips.map(tip => `• ${tip}`).join('\n')}`
      };

    case 'stats':
      // Show canvas statistics
      const stats = drawing.getCanvasStats(gameState);
      
      let statsDisplay = `📊 **Canvas Statistics**\n\n`;
      statsDisplay += `• Total moves: ${stats.totalMoves}\n`;
      statsDisplay += `• Canvas fill: ${stats.fillPercentage}% (${stats.totalDrawnCells}/${drawing.CANVAS_WIDTH * drawing.CANVAS_HEIGHT} cells)\n`;
      statsDisplay += `• Unique characters used: ${stats.uniqueCharsUsed}\n`;
      
      if (stats.mostUsedChar) {
        statsDisplay += `• Most used character: ${stats.mostUsedChar[0]} (${stats.mostUsedChar[1]} times)\n`;
      }
      
      if (Object.keys(stats.playerMoves).length > 0) {
        statsDisplay += `\n**Artist contributions:**\n`;
        const sortedPlayers = Object.entries(stats.playerMoves).sort(([,a], [,b]) => b - a);
        for (const [player, moves] of sortedPlayers) {
          statsDisplay += `• @${player}: ${moves} moves\n`;
        }
      }
      
      return {
        display: `${statsDisplay}\n${drawing.formatDrawingDisplay(gameState)}`
      };

    case 'status':
    default:
      // Show current canvas state
      return {
        display: `${drawing.formatDrawingDisplay(gameState)}` +
                 `**Commands:**\n` +
                 `• \`--action draw --x X --y Y --char CHAR\` - Draw character\n` +
                 `• \`--action line --x X1 --y Y1 --x2 X2 --y2 Y2 --char CHAR\` - Draw line\n` +
                 `• \`--action clear --x X --y Y [--x2 X2 --y2 Y2]\` - Clear area\n` +
                 `• \`--action join\` - Join this canvas\n` +
                 `• \`--action theme --theme "THEME"\` - Set theme\n` +
                 `• \`--action stats\` - Show statistics\n\n` +
                 `Room: \`${room}\` | Canvas size: ${drawing.CANVAS_WIDTH}×${drawing.CANVAS_HEIGHT}`
      };
  }
}

module.exports = { definition, handler };