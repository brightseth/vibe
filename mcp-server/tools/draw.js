/**
 * vibe draw — Start or join collaborative drawing sessions
 *
 * Create shared canvases where multiple users can draw together in real-time!
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Drawing game implementation
const drawing = require('../games/drawing');

const definition = {
  name: 'vibe_draw',
  description: 'Start or join collaborative drawing sessions. Create art together!',
  inputSchema: {
    type: 'object',
    properties: {
      room: {
        type: 'string',
        description: 'Drawing room name (e.g., "canvas1", "art-studio")'
      },
      action: {
        type: 'string',
        description: 'What to do',
        enum: ['join', 'draw', 'line', 'clear', 'theme', 'stats', 'help']
      },
      x: {
        type: 'number',
        description: 'X coordinate (0-19)'
      },
      y: {
        type: 'number',
        description: 'Y coordinate (0-11)'
      },
      x1: {
        type: 'number',
        description: 'End X coordinate for lines/clearing'
      },
      y1: {
        type: 'number',
        description: 'End Y coordinate for lines/clearing'
      },
      char: {
        type: 'string',
        description: 'Character to draw (empty, dot, circle, square, star, heart, etc.)'
      },
      theme: {
        type: 'string',
        description: 'Drawing theme/prompt to set'
      }
    },
    required: ['room']
  }
};

/**
 * Get drawing state from global store
 */
async function getDrawingState(room) {
  try {
    // Use a special "global" thread for drawing rooms
    const globalThread = await store.getThread('drawing-rooms', room);
    
    // Find the most recent drawing payload
    for (let i = globalThread.length - 1; i >= 0; i--) {
      const msg = globalThread[i];
      if (msg.payload?.type === 'game' && msg.payload?.game === 'drawing') {
        return msg.payload.state;
      }
    }
    return null;
  } catch (e) {
    // Room doesn't exist yet
    return null;
  }
}

/**
 * Save drawing state to global store
 */
async function saveDrawingState(room, gameState) {
  const payload = createGamePayload('drawing', gameState);
  await store.sendMessage('drawing-rooms', room, `Canvas updated by @${config.getHandle()}`, 'dm', payload);
  return payload;
}

/**
 * Format drawing display
 */
function formatDrawingDisplay(gameState, room) {
  let display = drawing.formatDrawingDisplay(gameState);
  display = `## 🎨 Drawing Room: ${room}\n\n` + display;
  
  // Add usage instructions
  display += '\n**Commands:**\n';
  display += '• `vibe draw ${room} --action join` - Join this drawing room\n';
  display += '• `vibe draw ${room} --action draw --x 5 --y 3 --char dot` - Draw at position\n';
  display += '• `vibe draw ${room} --action line --x 0 --y 0 --x1 5 --y1 5 --char square` - Draw line\n';
  display += '• `vibe draw ${room} --action clear --x 0 --y 0 --x1 5 --y1 5` - Clear region\n';
  display += '• `vibe draw ${room} --action theme --theme "sunset landscape"` - Set theme\n';
  display += '• `vibe draw ${room} --action stats` - Show canvas statistics\n';
  
  return display;
}

/**
 * Post drawing activity to board
 */
async function postDrawingActivity(room, player, action, details = '') {
  const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';

  try {
    const content = `🎨 @${player} ${action} in drawing room "${room}" ${details}`;

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
    console.error('[draw] Failed to post to board:', e.message);
  }
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { room, action = 'join', x, y, x1, y1, char, theme } = args;
  const myHandle = config.getHandle();

  if (!room || room.length < 1) {
    return { display: 'Please provide a room name (e.g., `vibe draw canvas1`)' };
  }

  // Normalize room name (lowercase, no special chars)
  const normalizedRoom = room.toLowerCase().replace(/[^a-z0-9-]/g, '');

  // Get current drawing state
  let gameState = await getDrawingState(normalizedRoom);

  // Handle different actions
  if (action === 'help') {
    return {
      display: `## 🎨 Collaborative Drawing Help\n\n` +
        `**Available characters:**\n` +
        Object.entries(drawing.DRAWING_CHARS)
          .map(([name, char]) => `• ${char} (${name})`)
          .join('\n') + '\n\n' +
        `**Example commands:**\n` +
        `• \`vibe draw ${normalizedRoom} --action join\` - Join room\n` +
        `• \`vibe draw ${normalizedRoom} --action draw --x 10 --y 6 --char heart\` - Draw heart at center\n` +
        `• \`vibe draw ${normalizedRoom} --action line --x 0 --y 0 --x1 19 --y1 0 --char square\` - Draw top border\n` +
        `• \`vibe draw ${normalizedRoom} --action clear --x 0 --y 0 --x1 5 --y1 5\` - Clear corner\n` +
        `• \`vibe draw ${normalizedRoom} --action theme --theme "space scene"\` - Set theme\n`
    };
  }

  if (action === 'join') {
    // Create new canvas if doesn't exist
    if (!gameState) {
      gameState = drawing.createInitialDrawingState();
    }

    // Add player
    const result = drawing.addPlayer(gameState, myHandle);
    if (result.error) {
      return { display: result.error };
    }

    // Save state
    await saveDrawingState(normalizedRoom, result.gameState);
    
    // Post to board
    await postDrawingActivity(normalizedRoom, myHandle, 'joined');

    return {
      display: formatDrawingDisplay(result.gameState, normalizedRoom)
    };
  }

  // All other actions require existing canvas and player membership
  if (!gameState) {
    return { 
      display: `Drawing room "${normalizedRoom}" doesn't exist. Use \`vibe draw ${normalizedRoom} --action join\` to create it!` 
    };
  }

  if (!gameState.players.includes(myHandle)) {
    return { 
      display: `You need to join the drawing room first! Use \`vibe draw ${normalizedRoom} --action join\`` 
    };
  }

  if (action === 'stats') {
    const stats = drawing.getCanvasStats(gameState);
    let statsDisplay = `## 📊 Canvas Statistics for "${normalizedRoom}"\n\n`;
    statsDisplay += `**Overall:**\n`;
    statsDisplay += `• Total moves: ${stats.totalMoves}\n`;
    statsDisplay += `• Canvas filled: ${stats.fillPercentage}% (${stats.totalDrawnCells}/${drawing.CANVAS_WIDTH * drawing.CANVAS_HEIGHT} cells)\n`;
    statsDisplay += `• Unique characters used: ${stats.uniqueCharsUsed}\n`;
    
    if (stats.mostUsedChar) {
      statsDisplay += `• Most used: ${stats.mostUsedChar[0]} (${stats.mostUsedChar[1]} times)\n`;
    }
    
    statsDisplay += `\n**Player activity:**\n`;
    Object.entries(stats.playerMoves)
      .sort(([,a], [,b]) => b - a)
      .forEach(([player, moves]) => {
        statsDisplay += `• @${player}: ${moves} moves\n`;
      });

    if (Object.keys(stats.charCount).length > 0) {
      statsDisplay += `\n**Characters used:**\n`;
      Object.entries(stats.charCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10) // Top 10
        .forEach(([char, count]) => {
          statsDisplay += `• ${char}: ${count}\n`;
        });
    }

    return { display: statsDisplay };
  }

  if (action === 'theme') {
    if (!theme) {
      return { display: 'Please provide a theme with --theme "your theme here"' };
    }

    const result = drawing.setTheme(gameState, theme, myHandle);
    if (result.error) {
      return { display: result.error };
    }

    await saveDrawingState(normalizedRoom, result.gameState);
    await postDrawingActivity(normalizedRoom, myHandle, 'set theme', `"${theme}"`);

    const tips = drawing.getDrawingTips(theme);
    let display = formatDrawingDisplay(result.gameState, normalizedRoom);
    display += `\n**💡 Tips for "${theme}":**\n`;
    display += tips.map(tip => `• ${tip}`).join('\n') + '\n';

    return { display };
  }

  if (action === 'draw') {
    if (x === undefined || y === undefined || !char) {
      return { display: 'For drawing: provide --x, --y, and --char (e.g., --x 5 --y 3 --char heart)' };
    }

    // Validate character name
    const charKey = char.toLowerCase();
    const actualChar = drawing.DRAWING_CHARS[charKey];
    if (!actualChar) {
      const available = Object.keys(drawing.DRAWING_CHARS).join(', ');
      return { display: `Unknown character "${char}". Available: ${available}` };
    }

    const result = drawing.makeMove(gameState, x, y, actualChar, myHandle);
    if (result.error) {
      return { display: result.error };
    }

    await saveDrawingState(normalizedRoom, result.gameState);
    await postDrawingActivity(normalizedRoom, myHandle, 'drew', `${actualChar} at (${x},${y})`);

    return {
      display: formatDrawingDisplay(result.gameState, normalizedRoom)
    };
  }

  if (action === 'line') {
    if (x === undefined || y === undefined || x1 === undefined || y1 === undefined || !char) {
      return { display: 'For lines: provide --x, --y, --x1, --y1, and --char' };
    }

    const charKey = char.toLowerCase();
    const actualChar = drawing.DRAWING_CHARS[charKey];
    if (!actualChar) {
      const available = Object.keys(drawing.DRAWING_CHARS).join(', ');
      return { display: `Unknown character "${char}". Available: ${available}` };
    }

    const result = drawing.drawLine(gameState, x, y, x1, y1, actualChar, myHandle);
    if (result.error) {
      return { display: result.error };
    }

    await saveDrawingState(normalizedRoom, result.gameState);
    await postDrawingActivity(normalizedRoom, myHandle, 'drew line', `from (${x},${y}) to (${x1},${y1})`);

    return {
      display: formatDrawingDisplay(result.gameState, normalizedRoom)
    };
  }

  if (action === 'clear') {
    if (x === undefined || y === undefined || x1 === undefined || y1 === undefined) {
      return { display: 'For clearing: provide --x, --y, --x1, --y1 to define the region' };
    }

    const result = drawing.clearRegion(gameState, x, y, x1, y1, myHandle);
    if (result.error) {
      return { display: result.error };
    }

    await saveDrawingState(normalizedRoom, result.gameState);
    await postDrawingActivity(normalizedRoom, myHandle, 'cleared region', `(${x},${y}) to (${x1},${y1})`);

    return {
      display: formatDrawingDisplay(result.gameState, normalizedRoom)
    };
  }

  // Default: show current canvas
  return {
    display: formatDrawingDisplay(gameState, normalizedRoom)
  };
}

module.exports = { definition, handler };