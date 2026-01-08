/**
 * vibe draw — Join collaborative drawing sessions or create art together
 * 
 * A shared canvas where multiple users can draw together in real-time!
 */

const config = require('../config');
const store = require('../store');
const { requireInit, normalizeHandle } = require('./_shared');
const drawing = require('../games/drawing');

// Global drawing sessions storage (in-memory for now)
const drawingSessions = new Map();

const definition = {
  name: 'vibe_draw',
  description: 'Join or create collaborative drawing sessions. Draw together with others in real-time!',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to perform',
        enum: ['join', 'draw', 'line', 'clear', 'theme', 'stats', 'tips', 'list']
      },
      room: {
        type: 'string',
        description: 'Drawing room name (default: "main")'
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
        description: 'End X coordinate for lines'
      },
      y1: {
        type: 'number',
        description: 'End Y coordinate for lines'
      },
      char: {
        type: 'string',
        description: 'Character to draw (use character names: empty, dot, circle, square, star, heart, tree, house, sun, moon, etc.)'
      },
      theme: {
        type: 'string',
        description: 'Set drawing theme/prompt'
      }
    }
  }
};

// Post drawing activities to the board
async function postDrawingActivity(activity) {
  try {
    const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
    
    await fetch(`${API_URL}/api/board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'echo',
        content: activity,
        category: 'general'
      })
    });
  } catch (e) {
    console.error('[draw] Failed to post to board:', e.message);
  }
}

// Get or create drawing session
function getDrawingSession(roomName) {
  const sessionKey = roomName || 'main';
  
  if (!drawingSessions.has(sessionKey)) {
    drawingSessions.set(sessionKey, drawing.createInitialDrawingState());
  }
  
  return drawingSessions.get(sessionKey);
}

// Save drawing session
function saveDrawingSession(roomName, gameState) {
  const sessionKey = roomName || 'main';
  drawingSessions.set(sessionKey, gameState);
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { action = 'join', room, x, y, x1, y1, char, theme } = args;
  const myHandle = config.getHandle();
  const roomName = room || 'main';
  
  // List available commands
  if (action === 'list') {
    return {
      display: `## 🎨 Collaborative Drawing Commands

**Basic Usage:**
• \`vibe draw\` - Join the main drawing room
• \`vibe draw --action draw --x 5 --y 3 --char star\` - Draw a star at (5,3)
• \`vibe draw --action line --x 2 --y 1 --x1 8 --y1 6 --char dot\` - Draw a line
• \`vibe draw --action clear --x 0 --y 0 --x1 5 --y1 3\` - Clear a region
• \`vibe draw --action theme --theme "landscape"\` - Set drawing theme

**Available Characters:**
${Object.entries(drawing.DRAWING_CHARS).map(([name, char]) => `${char} (${name})`).join(' ')}

**Pro Tips:**
• Canvas is ${drawing.CANVAS_WIDTH}x${drawing.CANVAS_HEIGHT} (coordinates start at 0,0)
• Multiple people can draw at the same time!
• Use themes to inspire collaborative art
• Try \`--action stats\` to see drawing statistics`
    };
  }

  // Get drawing session
  let gameState = getDrawingSession(roomName);
  
  // Handle different actions
  if (action === 'join') {
    // Join the drawing session
    const result = drawing.addPlayer(gameState, myHandle);
    
    if (result.error) {
      return { display: result.error };
    }
    
    if (result.success) {
      gameState = result.gameState;
      saveDrawingSession(roomName, gameState);
      
      // Post to board if this is their first time joining
      if (gameState.players.length === 1) {
        await postDrawingActivity(`🎨 @${myHandle} started drawing in room "${roomName}"`);
      } else {
        await postDrawingActivity(`🎨 @${myHandle} joined the drawing session in "${roomName}" (${gameState.players.length} artists)`);
      }
    }
    
    const display = drawing.formatDrawingDisplay(gameState);
    return { display: `## Drawing Room: "${roomName}"\n\n${display}` };
  }
  
  if (action === 'draw') {
    // Make a single drawing move
    if (x === undefined || y === undefined || !char) {
      return { display: 'Please provide x, y coordinates and character name. Use `vibe draw --action list` for help.' };
    }
    
    // Convert character name to symbol
    const charSymbol = drawing.DRAWING_CHARS[char.toLowerCase()];
    if (!charSymbol) {
      const validChars = Object.keys(drawing.DRAWING_CHARS).join(', ');
      return { display: `Invalid character "${char}". Available: ${validChars}` };
    }
    
    const result = drawing.makeMove(gameState, x, y, charSymbol, myHandle);
    
    if (result.error) {
      return { display: result.error };
    }
    
    gameState = result.gameState;
    saveDrawingSession(roomName, gameState);
    
    const display = drawing.formatDrawingDisplay(gameState);
    return { display: `## Drawing Room: "${roomName}"\n\n${display}` };
  }
  
  if (action === 'line') {
    // Draw a line between two points
    if (x === undefined || y === undefined || x1 === undefined || y1 === undefined || !char) {
      return { display: 'Please provide x, y, x1, y1 coordinates and character name for line drawing.' };
    }
    
    const charSymbol = drawing.DRAWING_CHARS[char.toLowerCase()];
    if (!charSymbol) {
      const validChars = Object.keys(drawing.DRAWING_CHARS).join(', ');
      return { display: `Invalid character "${char}". Available: ${validChars}` };
    }
    
    const result = drawing.drawLine(gameState, x, y, x1, y1, charSymbol, myHandle);
    
    if (result.error) {
      return { display: result.error };
    }
    
    gameState = result.gameState;
    saveDrawingSession(roomName, gameState);
    
    const display = drawing.formatDrawingDisplay(gameState);
    return { display: `## Drawing Room: "${roomName}"\n\n${display}` };
  }
  
  if (action === 'clear') {
    // Clear a region
    const clearX1 = x1 !== undefined ? x1 : x;
    const clearY1 = y1 !== undefined ? y1 : y;
    
    if (x === undefined || y === undefined) {
      return { display: 'Please provide coordinates to clear. Use x,y for single point or x,y,x1,y1 for region.' };
    }
    
    const result = drawing.clearRegion(gameState, x, y, clearX1, clearY1, myHandle);
    
    if (result.error) {
      return { display: result.error };
    }
    
    gameState = result.gameState;
    saveDrawingSession(roomName, gameState);
    
    const display = drawing.formatDrawingDisplay(gameState);
    return { display: `## Drawing Room: "${roomName}"\n\n${display}` };
  }
  
  if (action === 'theme') {
    // Set drawing theme
    if (!theme) {
      return { display: 'Please provide a theme. Examples: landscape, portrait, house, animals, nature, vehicle' };
    }
    
    const result = drawing.setTheme(gameState, theme, myHandle);
    
    if (result.error) {
      return { display: result.error };
    }
    
    gameState = result.gameState;
    saveDrawingSession(roomName, gameState);
    
    // Get tips for this theme
    const tips = drawing.getDrawingTips(theme);
    
    await postDrawingActivity(`🎨 @${myHandle} set drawing theme to "${theme}" in room "${roomName}"`);
    
    const display = drawing.formatDrawingDisplay(gameState);
    return { 
      display: `## Drawing Room: "${roomName}" - Theme: ${theme}\n\n${display}\n**Tips for "${theme}":**\n${tips.map(tip => `• ${tip}`).join('\n')}` 
    };
  }
  
  if (action === 'stats') {
    // Show drawing statistics
    const stats = drawing.getCanvasStats(gameState);
    
    let statsDisplay = `## 📊 Drawing Stats for "${roomName}"\n\n`;
    statsDisplay += `**Canvas:** ${stats.fillPercentage}% filled (${stats.totalDrawnCells}/${drawing.CANVAS_WIDTH * drawing.CANVAS_HEIGHT} cells)\n`;
    statsDisplay += `**Total moves:** ${stats.totalMoves}\n`;
    statsDisplay += `**Unique characters used:** ${stats.uniqueCharsUsed}\n\n`;
    
    if (stats.mostUsedChar) {
      const [char, count] = stats.mostUsedChar;
      statsDisplay += `**Most used character:** ${char} (${count} times)\n\n`;
    }
    
    if (Object.keys(stats.playerMoves).length > 0) {
      statsDisplay += `**Moves by player:**\n`;
      Object.entries(stats.playerMoves)
        .sort(([,a], [,b]) => b - a)
        .forEach(([player, moves]) => {
          statsDisplay += `• @${player}: ${moves} moves\n`;
        });
      statsDisplay += '\n';
    }
    
    if (Object.keys(stats.charCount).length > 0) {
      statsDisplay += `**Character usage:**\n`;
      Object.entries(stats.charCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([char, count]) => {
          statsDisplay += `• ${char}: ${count} times\n`;
        });
    }
    
    const display = drawing.formatDrawingDisplay(gameState);
    return { display: statsDisplay + '\n---\n\n' + display };
  }
  
  if (action === 'tips') {
    // Show drawing tips
    const currentTheme = gameState.theme;
    const tips = drawing.getDrawingTips(currentTheme);
    
    let tipsDisplay = `## 🎨 Drawing Tips\n\n`;
    
    if (currentTheme) {
      tipsDisplay += `**For theme "${currentTheme}":**\n`;
    } else {
      tipsDisplay += `**General tips:**\n`;
    }
    
    tips.forEach(tip => {
      tipsDisplay += `• ${tip}\n`;
    });
    
    tipsDisplay += `\n**Canvas size:** ${drawing.CANVAS_WIDTH}x${drawing.CANVAS_HEIGHT}\n`;
    tipsDisplay += `**Coordinates:** (0,0) is top-left, (${drawing.CANVAS_WIDTH-1},${drawing.CANVAS_HEIGHT-1}) is bottom-right\n\n`;
    
    const display = drawing.formatDrawingDisplay(gameState);
    return { display: tipsDisplay + '\n---\n\n' + display };
  }
  
  return { display: 'Unknown action. Use `vibe draw --action list` for help.' };
}

module.exports = { definition, handler };