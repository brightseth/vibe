/**
 * vibe draw — Collaborative drawing canvas
 *
 * Create shared art with others in real-time!
 */

const config = require('../config');
const store = require('../store');
const { requireInit } = require('./_shared');

// Drawing game implementation
const drawing = require('../games/drawing');

const definition = {
  name: 'vibe_draw',
  description: 'Collaborative drawing canvas - create shared art with others in real-time',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to take',
        enum: ['new', 'join', 'draw', 'line', 'clear', 'theme', 'stats', 'show']
      },
      x: {
        type: 'number',
        description: 'X coordinate (0-19) for drawing'
      },
      y: {
        type: 'number',
        description: 'Y coordinate (0-11) for drawing'  
      },
      x1: {
        type: 'number',
        description: 'End X coordinate for lines or regions'
      },
      y1: {
        type: 'number',
        description: 'End Y coordinate for lines or regions'
      },
      char: {
        type: 'string',
        description: 'Character to draw (empty, dot, circle, square, star, heart, tree, house, sun, moon, water, mountain, person, cat, dog, car, plane, flower, umbrella, rainbow)'
      },
      theme: {
        type: 'string',
        description: 'Theme for the drawing session'
      },
      room: {
        type: 'string',
        description: 'Room name (default: main)'
      }
    }
  }
};

// Global drawing rooms storage
const drawingRooms = new Map();

function getRoom(roomName = 'main') {
  if (!drawingRooms.has(roomName)) {
    drawingRooms.set(roomName, drawing.createInitialDrawingState());
  }
  return drawingRooms.get(roomName);
}

function setRoom(roomName, gameState) {
  drawingRooms.set(roomName, gameState);
}

// Post drawing session to board
async function postDrawingSession(roomName, players) {
  const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
  
  try {
    const content = `🎨 Collaborative drawing session in room "${roomName}" with ${players.map(p => `@${p}`).join(', ')}`;
    
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

  const myHandle = config.getHandle();
  const { action = 'show', x, y, x1, y1, char, theme, room = 'main' } = args;
  
  let gameState = getRoom(room);

  switch (action) {
    case 'new':
      // Create new drawing session
      gameState = drawing.createInitialDrawingState();
      const addResult = drawing.addPlayer(gameState, myHandle);
      if (addResult.error) {
        return { display: `Error: ${addResult.error}` };
      }
      
      gameState = addResult.gameState;
      setRoom(room, gameState);
      
      return {
        display: `🎨 **New Drawing Session Created!**\n\nRoom: **${room}**\n\n${drawing.formatDrawingDisplay(gameState)}\n\nInvite others with: \`vibe draw --action join --room ${room}\`\n\n**Quick start:**\n• \`vibe draw --action draw --x 10 --y 6 --char star\` - Draw a star at center\n• \`vibe draw --action line --x 5 --y 3 --x1 15 --y1 9 --char square\` - Draw a line\n• \`vibe draw --action theme --theme "sunset landscape"\` - Set drawing theme`
      };

    case 'join':
      // Join existing drawing session
      const joinResult = drawing.addPlayer(gameState, myHandle);
      if (joinResult.error) {
        return { display: `Error: ${joinResult.error}` };
      }
      
      gameState = joinResult.gameState;
      setRoom(room, gameState);
      
      // Post to board if this is getting collaborative
      if (gameState.players.length >= 2) {
        postDrawingSession(room, gameState.players);
      }
      
      return {
        display: `🎨 **Joined Drawing Session!**\n\nRoom: **${room}**\n\n${drawing.formatDrawingDisplay(gameState)}\n\n**Commands:**\n• \`vibe draw --action draw --x X --y Y --char CHAR\` - Draw at position\n• \`vibe draw --action line --x X --y Y --x1 X1 --y1 Y1 --char CHAR\` - Draw line\n• \`vibe draw --action clear --x X --y Y --x1 X1 --y1 Y1\` - Clear region\n• \`vibe draw --action show\` - View current canvas`
      };

    case 'draw':
      // Draw single character
      if (x === undefined || y === undefined || !char) {
        return { display: 'Error: Need x, y coordinates and char. Example: `vibe draw --action draw --x 10 --y 6 --char star`' };
      }
      
      // Convert char name to actual character
      const drawChar = drawing.DRAWING_CHARS[char] || char;
      
      const drawResult = drawing.makeMove(gameState, x, y, drawChar, myHandle);
      if (drawResult.error) {
        return { display: `Error: ${drawResult.error}` };
      }
      
      gameState = drawResult.gameState;
      setRoom(room, gameState);
      
      return {
        display: `🎨 **Drew ${drawChar} at (${x},${y})**\n\nRoom: **${room}**\n\n${drawing.formatDrawingDisplay(gameState)}`
      };

    case 'line':
      // Draw line between two points
      if (x === undefined || y === undefined || x1 === undefined || y1 === undefined || !char) {
        return { display: 'Error: Need x, y, x1, y1 coordinates and char. Example: `vibe draw --action line --x 5 --y 3 --x1 15 --y1 9 --char square`' };
      }
      
      const lineChar = drawing.DRAWING_CHARS[char] || char;
      
      const lineResult = drawing.drawLine(gameState, x, y, x1, y1, lineChar, myHandle);
      if (lineResult.error) {
        return { display: `Error: ${lineResult.error}` };
      }
      
      gameState = lineResult.gameState;
      setRoom(room, gameState);
      
      return {
        display: `🎨 **Drew line from (${x},${y}) to (${x1},${y1})**\n\nRoom: **${room}**\n\n${drawing.formatDrawingDisplay(gameState)}`
      };

    case 'clear':
      // Clear region of canvas
      if (x === undefined || y === undefined) {
        return { display: 'Error: Need at least x, y coordinates. Example: `vibe draw --action clear --x 5 --y 3 --x1 15 --y1 9`' };
      }
      
      const clearX1 = x1 !== undefined ? x1 : x;
      const clearY1 = y1 !== undefined ? y1 : y;
      
      const clearResult = drawing.clearRegion(gameState, x, y, clearX1, clearY1, myHandle);
      if (clearResult.error) {
        return { display: `Error: ${clearResult.error}` };
      }
      
      gameState = clearResult.gameState;
      setRoom(room, gameState);
      
      return {
        display: `🎨 **Cleared region (${x},${y}) to (${clearX1},${clearY1})**\n\nRoom: **${room}**\n\n${drawing.formatDrawingDisplay(gameState)}`
      };

    case 'theme':
      // Set drawing theme
      if (!theme) {
        return { display: 'Error: Need theme. Example: `vibe draw --action theme --theme "sunset landscape"`' };
      }
      
      const themeResult = drawing.setTheme(gameState, theme, myHandle);
      if (themeResult.error) {
        return { display: `Error: ${themeResult.error}` };
      }
      
      gameState = themeResult.gameState;
      setRoom(room, gameState);
      
      const tips = drawing.getDrawingTips(theme);
      
      return {
        display: `🎨 **Theme set to: ${theme}**\n\nRoom: **${room}**\n\n${drawing.formatDrawingDisplay(gameState)}\n\n**Tips for "${theme}":**\n${tips.map(tip => `• ${tip}`).join('\n')}`
      };

    case 'stats':
      // Show canvas statistics
      const stats = drawing.getCanvasStats(gameState);
      
      let statsDisplay = `📊 **Canvas Statistics**\n\nRoom: **${room}**\n\n`;
      statsDisplay += `• **Total moves:** ${stats.totalMoves}\n`;
      statsDisplay += `• **Canvas filled:** ${stats.fillPercentage}% (${stats.totalDrawnCells}/${drawing.CANVAS_WIDTH * drawing.CANVAS_HEIGHT} cells)\n`;
      statsDisplay += `• **Unique characters used:** ${stats.uniqueCharsUsed}\n`;
      
      if (stats.mostUsedChar) {
        statsDisplay += `• **Most used character:** ${stats.mostUsedChar[0]} (${stats.mostUsedChar[1]} times)\n`;
      }
      
      statsDisplay += `\n**Player contributions:**\n`;
      Object.entries(stats.playerMoves).forEach(([player, moves]) => {
        statsDisplay += `• @${player}: ${moves} moves\n`;
      });
      
      if (Object.keys(stats.charCount).length > 0) {
        statsDisplay += `\n**Character usage:**\n`;
        Object.entries(stats.charCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .forEach(([char, count]) => {
            statsDisplay += `• ${char}: ${count} times\n`;
          });
      }
      
      return { display: statsDisplay };

    case 'show':
    default:
      // Show current canvas
      if (!gameState.players.includes(myHandle)) {
        return {
          display: `🎨 **Drawing Canvas - Room: ${room}**\n\n${drawing.formatDrawingDisplay(gameState)}\n\n🔗 **Join the fun:** \`vibe draw --action join --room ${room}\`\n\n**Quick examples:**\n• \`vibe draw --action draw --x 10 --y 6 --char star\` - Draw a star\n• \`vibe draw --action theme --theme "house"\` - Set theme for inspiration`
        };
      }
      
      return {
        display: `🎨 **Drawing Canvas - Room: ${room}**\n\n${drawing.formatDrawingDisplay(gameState)}`
      };
  }
}

module.exports = { definition, handler };