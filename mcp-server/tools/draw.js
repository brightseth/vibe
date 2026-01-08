/**
 * vibe draw — Collaborative drawing game for /vibe
 *
 * Create art together on a shared canvas! Draw pixels, make shapes,
 * play Pictionary, or just doodle with friends.
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');
const drawing = require('../games/drawing');

const definition = {
  name: 'vibe_draw',
  description: 'Collaborative drawing game - create art together on a shared canvas',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Drawing action to take',
        enum: ['start', 'join', 'draw', 'line', 'clear', 'theme', 'show', 'stats', 'help']
      },
      room: {
        type: 'string',
        description: 'Drawing room name (optional, defaults to "main")'
      },
      x: {
        type: 'number',
        description: 'X coordinate (0-19 for draw action)'
      },
      y: {
        type: 'number',
        description: 'Y coordinate (0-11 for draw action)'
      },
      x2: {
        type: 'number',
        description: 'End X coordinate (for line action)'
      },
      y2: {
        type: 'number',
        description: 'End Y coordinate (for line action)'
      },
      char: {
        type: 'string',
        description: 'Character to draw (e.g., dot, circle, square, star, heart, tree, etc.)'
      },
      theme: {
        type: 'string',
        description: 'Drawing theme/prompt to set'
      }
    },
    required: ['action']
  }
};

// Global drawing rooms storage (in memory for now)
let drawingRooms = {};

function getRoom(roomName = 'main') {
  if (!drawingRooms[roomName]) {
    drawingRooms[roomName] = drawing.createInitialDrawingState();
  }
  return drawingRooms[roomName];
}

function saveRoom(roomName, gameState) {
  drawingRooms[roomName] = gameState;
}

// Post drawing activity to board
async function postDrawingActivity(action, playerHandle, roomName) {
  const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
  
  try {
    let content = '';
    switch (action) {
      case 'start':
        content = `🎨 @${playerHandle} started a drawing session${roomName !== 'main' ? ` in "${roomName}"` : ''}`;
        break;
      case 'join':
        content = `🎨 @${playerHandle} joined the drawing session${roomName !== 'main' ? ` in "${roomName}"` : ''}`;
        break;
      case 'theme':
        content = `🎯 @${playerHandle} set a drawing theme${roomName !== 'main' ? ` in "${roomName}"` : ''}`;
        break;
      default:
        return; // Don't post for individual drawing actions
    }

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
    console.error('[draw] Failed to post to board:', e.message);
  }
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { action, room = 'main', x, y, x2, y2, char, theme } = args;
  const myHandle = config.getHandle();

  switch (action) {
    case 'help': {
      return {
        display: `## 🎨 Collaborative Drawing Help

**Basic Actions:**
\`vibe draw --action start\` - Start/show drawing canvas
\`vibe draw --action join\` - Join the drawing session
\`vibe draw --action draw --x 10 --y 5 --char star\` - Draw a character at position

**Advanced Drawing:**
\`vibe draw --action line --x 0 --y 0 --x2 5 --y2 5 --char dot\` - Draw line
\`vibe draw --action clear --x 0 --y 0 --x2 5 --y2 5\` - Clear region
\`vibe draw --action theme --theme "house"\` - Set drawing theme

**Info:**
\`vibe draw --action show\` - Show current canvas
\`vibe draw --action stats\` - Show canvas statistics

**Characters:** dot, circle, square, star, heart, tree, house, sun, moon, water, mountain, person, cat, dog, car, plane, flower, umbrella, rainbow

**Canvas:** 20x12 grid (x: 0-19, y: 0-11)
**Rooms:** Use \`--room "roomname"\` for separate canvases`
      };
    }

    case 'start': {
      const gameState = getRoom(room);
      
      // Add player if not already in
      const joinResult = drawing.addPlayer(gameState, myHandle);
      if (joinResult.success) {
        saveRoom(room, joinResult.gameState);
        if (!gameState.players.includes(myHandle)) {
          postDrawingActivity('start', myHandle, room);
        }
      }

      const currentState = getRoom(room);
      const display = drawing.formatDrawingDisplay(currentState);
      
      return {
        display: `## ${room !== 'main' ? `Drawing Room "${room}"` : 'Main Drawing Canvas'}\n\n${display}\n**Tip:** Use \`vibe draw --action help\` for drawing commands`
      };
    }

    case 'join': {
      const gameState = getRoom(room);
      const result = drawing.addPlayer(gameState, myHandle);
      
      if (result.error) {
        return { display: result.error };
      }

      saveRoom(room, result.gameState);
      postDrawingActivity('join', myHandle, room);

      const display = drawing.formatDrawingDisplay(result.gameState);
      return {
        display: `## Joined Drawing Session!\n\n${display}\n**You can now draw!** Use \`vibe draw --action draw --x X --y Y --char CHARACTER\``
      };
    }

    case 'show': {
      const gameState = getRoom(room);
      const display = drawing.formatDrawingDisplay(gameState);
      
      return {
        display: `## ${room !== 'main' ? `Drawing Room "${room}"` : 'Current Canvas'}\n\n${display}`
      };
    }

    case 'draw': {
      if (x === undefined || y === undefined || !char) {
        return { display: 'Draw action requires --x, --y, and --char parameters' };
      }

      const gameState = getRoom(room);
      
      // Auto-join if not in session
      if (!gameState.players.includes(myHandle)) {
        const joinResult = drawing.addPlayer(gameState, myHandle);
        if (joinResult.error) {
          return { display: joinResult.error };
        }
        saveRoom(room, joinResult.gameState);
      }

      const currentState = getRoom(room);
      const charValue = drawing.DRAWING_CHARS[char] || char;
      const result = drawing.makeMove(currentState, x, y, charValue, myHandle);

      if (result.error) {
        return { display: result.error };
      }

      saveRoom(room, result.gameState);
      const display = drawing.formatDrawingDisplay(result.gameState);

      return {
        display: `## Drew ${charValue} at (${x},${y})\n\n${display}`
      };
    }

    case 'line': {
      if (x === undefined || y === undefined || x2 === undefined || y2 === undefined || !char) {
        return { display: 'Line action requires --x, --y, --x2, --y2, and --char parameters' };
      }

      const gameState = getRoom(room);
      
      // Auto-join if not in session
      if (!gameState.players.includes(myHandle)) {
        const joinResult = drawing.addPlayer(gameState, myHandle);
        if (joinResult.error) {
          return { display: joinResult.error };
        }
        saveRoom(room, joinResult.gameState);
      }

      const currentState = getRoom(room);
      const charValue = drawing.DRAWING_CHARS[char] || char;
      const result = drawing.drawLine(currentState, x, y, x2, y2, charValue, myHandle);

      if (result.error) {
        return { display: result.error };
      }

      saveRoom(room, result.gameState);
      const display = drawing.formatDrawingDisplay(result.gameState);

      return {
        display: `## Drew line from (${x},${y}) to (${x2},${y2})\n\n${display}`
      };
    }

    case 'clear': {
      if (x === undefined || y === undefined) {
        return { display: 'Clear action requires --x, --y (and optionally --x2, --y2 for region)' };
      }

      const gameState = getRoom(room);
      
      if (!gameState.players.includes(myHandle)) {
        return { display: 'You need to join the drawing session first!' };
      }

      const x1 = x2 !== undefined ? x2 : x;
      const y1 = y2 !== undefined ? y2 : y;
      const result = drawing.clearRegion(gameState, x, y, x1, y1, myHandle);

      if (result.error) {
        return { display: result.error };
      }

      saveRoom(room, result.gameState);
      const display = drawing.formatDrawingDisplay(result.gameState);

      const regionText = (x === x1 && y === y1) ? `(${x},${y})` : `(${x},${y}) to (${x1},${y1})`;
      return {
        display: `## Cleared region ${regionText}\n\n${display}`
      };
    }

    case 'theme': {
      if (!theme) {
        return { display: 'Theme action requires --theme parameter' };
      }

      const gameState = getRoom(room);
      
      if (!gameState.players.includes(myHandle)) {
        return { display: 'You need to join the drawing session first!' };
      }

      const result = drawing.setTheme(gameState, theme, myHandle);

      if (result.error) {
        return { display: result.error };
      }

      saveRoom(room, result.gameState);
      postDrawingActivity('theme', myHandle, room);

      const tips = drawing.getDrawingTips(theme);
      const display = drawing.formatDrawingDisplay(result.gameState);

      return {
        display: `## Set Drawing Theme: "${theme}"\n\n${display}\n**Drawing Tips:**\n${tips.map(tip => `• ${tip}`).join('\n')}`
      };
    }

    case 'stats': {
      const gameState = getRoom(room);
      const stats = drawing.getCanvasStats(gameState);
      const display = drawing.formatDrawingDisplay(gameState);

      let statsText = `**Canvas Statistics:**\n`;
      statsText += `• Total moves: ${stats.totalMoves}\n`;
      statsText += `• Canvas filled: ${stats.fillPercentage}% (${stats.totalDrawnCells}/${drawing.CANVAS_WIDTH * drawing.CANVAS_HEIGHT} cells)\n`;
      statsText += `• Unique characters used: ${stats.uniqueCharsUsed}\n`;
      
      if (stats.mostUsedChar) {
        statsText += `• Most used character: ${stats.mostUsedChar[0]} (${stats.mostUsedChar[1]} times)\n`;
      }
      
      if (Object.keys(stats.playerMoves).length > 0) {
        statsText += `\n**Player Activity:**\n`;
        Object.entries(stats.playerMoves)
          .sort(([,a], [,b]) => b - a)
          .forEach(([player, moves]) => {
            statsText += `• @${player}: ${moves} moves\n`;
          });
      }

      return {
        display: `## ${room !== 'main' ? `Drawing Room "${room}" Stats` : 'Canvas Statistics'}\n\n${display}\n${statsText}`
      };
    }

    default: {
      return { display: `Unknown action "${action}". Use --action help for available commands.` };
    }
  }
}

module.exports = { definition, handler };