/**
 * Collaborative Drawing — Create or join a shared drawing session
 * 
 * Multiple users can draw together on a shared canvas in real-time.
 * Perfect for sketching, doodling, or playing Pictionary together!
 */

const config = require('../config');
const store = require('../store');
const { requireInit, normalizeHandle } = require('./_shared');
const drawing = require('../games/drawing');

const definition = {
  name: 'vibe_collaborative_drawing',
  description: 'Create or join a collaborative drawing session with multiple users. Draw together on a shared canvas!',
  inputSchema: {
    type: 'object',
    properties: {
      room: {
        type: 'string',
        description: 'Drawing room name (creates if doesn\'t exist, e.g., "art-party", "sketch-together")'
      },
      action: {
        type: 'string',
        description: 'Action to take',
        enum: ['view', 'draw', 'line', 'clear', 'theme']
      },
      x: {
        type: 'number',
        description: 'X coordinate (0-19 for draw/line actions)'
      },
      y: {
        type: 'number', 
        description: 'Y coordinate (0-11 for draw/line actions)'
      },
      x1: {
        type: 'number',
        description: 'End X coordinate (for line action)'
      },
      y1: {
        type: 'number',
        description: 'End Y coordinate (for line action)'
      },
      char: {
        type: 'string',
        description: 'Character/emoji to draw (e.g., "star", "heart", "tree"). See available chars in canvas display.'
      },
      theme: {
        type: 'string',
        description: 'Drawing theme/prompt to set for the room'
      }
    },
    required: ['room']
  }
};

// Storage key for drawing sessions
function getDrawingRoomKey(roomName) {
  return `drawing_room:${roomName.toLowerCase()}`;
}

// Get or create drawing room
async function getOrCreateRoom(roomName) {
  const key = getDrawingRoomKey(roomName);
  
  try {
    const existing = await store.kv.get(key);
    if (existing) {
      return JSON.parse(existing);
    }
  } catch (e) {
    console.log(`[drawing] Creating new room: ${roomName}`);
  }
  
  // Create new room
  const newRoom = drawing.createInitialDrawingState();
  await store.kv.set(key, JSON.stringify(newRoom));
  return newRoom;
}

// Save room state
async function saveRoom(roomName, gameState) {
  const key = getDrawingRoomKey(roomName);
  await store.kv.set(key, JSON.stringify(gameState));
}

// Post drawing activity to board
async function postDrawingActivity(roomName, playerHandle, action, details = '') {
  const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
  
  try {
    let content = '';
    switch (action) {
      case 'created':
        content = `🎨 @${playerHandle} created collaborative drawing room "${roomName}" — join in!`;
        break;
      case 'joined':
        content = `🎨 @${playerHandle} joined the "${roomName}" drawing session`;
        break;
      case 'drew':
        content = `🎨 @${playerHandle} is drawing in "${roomName}" ${details}`;
        break;
      case 'theme':
        content = `🎯 @${playerHandle} set drawing theme in "${roomName}": ${details}`;
        break;
      default:
        return; // Don't post for other actions
    }

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
    console.error('[drawing] Failed to post to board:', e.message);
  }
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { room, action = 'view', x, y, x1, y1, char, theme } = args;
  const myHandle = config.getHandle();
  
  if (!room) {
    return { display: 'Room name is required. Use something like "art-party" or "sketch-together"' };
  }

  // Normalize room name
  const roomName = room.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  try {
    // Get or create room
    let gameState = await getOrCreateRoom(roomName);
    let wasNewRoom = gameState.players.length === 0;
    
    // Add player to room if not already there
    if (!gameState.players.includes(myHandle)) {
      const addResult = drawing.addPlayer(gameState, myHandle);
      if (addResult.error) {
        return { display: addResult.error };
      }
      gameState = addResult.gameState;
      await saveRoom(roomName, gameState);
      
      // Post activity
      if (wasNewRoom) {
        await postDrawingActivity(roomName, myHandle, 'created');
      } else {
        await postDrawingActivity(roomName, myHandle, 'joined');
      }
    }
    
    // Handle different actions
    switch (action) {
      case 'view':
        // Just show current state
        break;
        
      case 'draw':
        if (x === undefined || y === undefined || !char) {
          return { display: 'Draw action requires x, y coordinates and char. Example: `--action draw --x 10 --y 5 --char heart`' };
        }
        
        // Validate character name
        const drawChar = drawing.DRAWING_CHARS[char];
        if (!drawChar) {
          const availableChars = Object.keys(drawing.DRAWING_CHARS).join(', ');
          return { display: `Invalid character "${char}". Available: ${availableChars}` };
        }
        
        const drawResult = drawing.makeMove(gameState, x, y, drawChar, myHandle);
        if (drawResult.error) {
          return { display: drawResult.error };
        }
        
        gameState = drawResult.gameState;
        await saveRoom(roomName, gameState);
        await postDrawingActivity(roomName, myHandle, 'drew', `(${drawChar} at ${x},${y})`);
        break;
        
      case 'line':
        if (x === undefined || y === undefined || x1 === undefined || y1 === undefined || !char) {
          return { display: 'Line action requires x, y, x1, y1 coordinates and char. Example: `--action line --x 5 --y 5 --x1 15 --y1 8 --char star`' };
        }
        
        const lineChar = drawing.DRAWING_CHARS[char];
        if (!lineChar) {
          const availableChars = Object.keys(drawing.DRAWING_CHARS).join(', ');
          return { display: `Invalid character "${char}". Available: ${availableChars}` };
        }
        
        const lineResult = drawing.drawLine(gameState, x, y, x1, y1, lineChar, myHandle);
        if (lineResult.error) {
          return { display: lineResult.error };
        }
        
        gameState = lineResult.gameState;
        await saveRoom(roomName, gameState);
        await postDrawingActivity(roomName, myHandle, 'drew', `line from (${x},${y}) to (${x1},${y1})`);
        break;
        
      case 'clear':
        if (x === undefined || y === undefined) {
          // Clear entire canvas
          const clearResult = drawing.clearRegion(gameState, 0, 0, drawing.CANVAS_WIDTH - 1, drawing.CANVAS_HEIGHT - 1, myHandle);
          if (clearResult.error) {
            return { display: clearResult.error };
          }
          gameState = clearResult.gameState;
          await postDrawingActivity(roomName, myHandle, 'drew', '(cleared canvas)');
        } else {
          // Clear specific region
          const clearX1 = x1 !== undefined ? x1 : x;
          const clearY1 = y1 !== undefined ? y1 : y;
          const clearResult = drawing.clearRegion(gameState, x, y, clearX1, clearY1, myHandle);
          if (clearResult.error) {
            return { display: clearResult.error };
          }
          gameState = clearResult.gameState;
          await postDrawingActivity(roomName, myHandle, 'drew', `(cleared region ${x},${y} to ${clearX1},${clearY1})`);
        }
        await saveRoom(roomName, gameState);
        break;
        
      case 'theme':
        if (!theme) {
          return { display: 'Theme action requires a theme. Example: `--action theme --theme "draw a house"`' };
        }
        
        const themeResult = drawing.setTheme(gameState, theme, myHandle);
        if (themeResult.error) {
          return { display: themeResult.error };
        }
        
        gameState = themeResult.gameState;
        await saveRoom(roomName, gameState);
        await postDrawingActivity(roomName, myHandle, 'theme', theme);
        break;
        
      default:
        return { display: `Unknown action "${action}". Use: view, draw, line, clear, or theme` };
    }
    
    // Format and return display
    const display = drawing.formatDrawingDisplay(gameState);
    const stats = drawing.getCanvasStats(gameState);
    
    let result = `# 🎨 Collaborative Drawing Room: "${roomName}"\n\n${display}`;
    
    // Add usage instructions
    result += '\n**How to draw:**\n';
    result += `• \`vibe collaborative-drawing --room "${roomName}" --action draw --x 10 --y 5 --char heart\`\n`;
    result += `• \`vibe collaborative-drawing --room "${roomName}" --action line --x 5 --y 3 --x1 15 --y1 8 --char star\`\n`;
    result += `• \`vibe collaborative-drawing --room "${roomName}" --action clear\` (clear all)\n`;
    result += `• \`vibe collaborative-drawing --room "${roomName}" --action theme --theme "draw a sunset"\`\n\n`;
    
    // Add tips if there's a theme
    if (gameState.theme) {
      const tips = drawing.getDrawingTips(gameState.theme);
      result += `**Drawing tips for "${gameState.theme}":**\n`;
      result += tips.map(tip => `• ${tip}`).join('\n') + '\n\n';
    }
    
    // Add stats
    result += `**Canvas stats:** ${stats.fillPercentage}% filled, ${stats.totalMoves} moves, ${stats.uniqueCharsUsed} different characters used\n`;
    
    if (stats.mostUsedChar) {
      result += `Most used: ${stats.mostUsedChar[0]} (${stats.mostUsedChar[1]} times)\n`;
    }
    
    return { display: result };
    
  } catch (error) {
    console.error('[drawing] Error:', error);
    return { display: `Error: ${error.message}` };
  }
}

module.exports = { definition, handler };