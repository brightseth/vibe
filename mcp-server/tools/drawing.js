/**
 * vibe drawing — Start or join a collaborative drawing session
 *
 * A shared canvas where multiple users can draw together in real-time
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Drawing game implementation
const drawing = require('../games/drawing');

const definition = {
  name: 'vibe_drawing',
  description: 'Start or join a collaborative drawing session. Draw together on a shared canvas!',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to perform',
        enum: ['start', 'join', 'draw', 'line', 'clear', 'theme', 'view', 'stats']
      },
      room: {
        type: 'string',
        description: 'Drawing room name (default: general)'
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
        description: 'End X coordinate for line drawing'
      },
      y1: {
        type: 'number',
        description: 'End Y coordinate for line drawing'
      },
      char: {
        type: 'string',
        description: 'Character to draw (empty, dot, circle, square, star, heart, tree, house, sun, moon, water, mountain, person, cat, dog, car, plane, flower, umbrella, rainbow)'
      },
      theme: {
        type: 'string',
        description: 'Drawing theme/prompt to set'
      }
    },
    required: ['action']
  }
};

/**
 * Get drawing game state from global store
 */
async function getDrawingState(room) {
  try {
    const key = `drawing:${room}`;
    const state = await store.get(key);
    return state ? JSON.parse(state) : null;
  } catch (e) {
    console.error('[drawing] Failed to get state:', e.message);
    return null;
  }
}

/**
 * Save drawing game state to global store
 */
async function saveDrawingState(room, state) {
  try {
    const key = `drawing:${room}`;
    await store.set(key, JSON.stringify(state));
  } catch (e) {
    console.error('[drawing] Failed to save state:', e.message);
  }
}

/**
 * Post drawing activity to board
 */
async function postDrawingActivity(action, room, player, details = '') {
  const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';

  try {
    let content;
    switch (action) {
      case 'start':
        content = `🎨 @${player} started a drawing session in #${room}`;
        break;
      case 'join':
        content = `🖌️ @${player} joined the drawing session in #${room}`;
        break;
      case 'theme':
        content = `🎯 @${player} set drawing theme in #${room}: ${details}`;
        break;
      default:
        return; // Don't post for every drawing move
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
    console.error('[drawing] Failed to post to board:', e.message);
  }
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { action, room = 'general', x, y, x1, y1, char, theme } = args;
  const myHandle = config.getHandle();

  // Get current drawing state
  let drawingState = await getDrawingState(room);

  switch (action) {
    case 'start':
      // Create new drawing session
      drawingState = drawing.createInitialDrawingState();
      const addResult = drawing.addPlayer(drawingState, myHandle);
      if (addResult.error) {
        return { display: `Error: ${addResult.error}` };
      }
      drawingState = addResult.gameState;
      await saveDrawingState(room, drawingState);
      await postDrawingActivity('start', room, myHandle);

      return {
        display: `## 🎨 Started Drawing Session in #${room}\n\n${drawing.formatDrawingDisplay(drawingState)}\n\nUse \`vibe drawing --action join --room ${room}\` to let others join!\nUse \`vibe drawing --action draw --room ${room} --x 5 --y 5 --char star\` to draw!`
      };

    case 'join':
      if (!drawingState) {
        return { display: `No drawing session found in #${room}. Use \`vibe drawing --action start --room ${room}\` to create one!` };
      }

      const joinResult = drawing.addPlayer(drawingState, myHandle);
      if (joinResult.error) {
        return { display: `Error: ${joinResult.error}` };
      }

      drawingState = joinResult.gameState;
      await saveDrawingState(room, drawingState);
      await postDrawingActivity('join', room, myHandle);

      return {
        display: `## 🖌️ Joined Drawing Session in #${room}\n\n${drawing.formatDrawingDisplay(drawingState)}\n\nUse \`vibe drawing --action draw --room ${room} --x 10 --y 6 --char heart\` to draw!`
      };

    case 'draw':
      if (!drawingState) {
        return { display: `No drawing session found in #${room}. Use \`vibe drawing --action start --room ${room}\` to create one!` };
      }

      if (x === undefined || y === undefined || !char) {
        return { display: 'For drawing, you need: --x [0-19] --y [0-11] --char [character name]' };
      }

      // Validate character name and get symbol
      const charName = char.toLowerCase();
      if (!drawing.DRAWING_CHARS[charName]) {
        const validChars = Object.keys(drawing.DRAWING_CHARS).join(', ');
        return { display: `Invalid character "${char}". Valid options: ${validChars}` };
      }

      const drawResult = drawing.makeMove(drawingState, x, y, drawing.DRAWING_CHARS[charName], myHandle);
      if (drawResult.error) {
        return { display: `Error: ${drawResult.error}` };
      }

      drawingState = drawResult.gameState;
      await saveDrawingState(room, drawingState);

      return {
        display: `## 🎨 Drew in #${room}\n\n${drawing.formatDrawingDisplay(drawingState)}\n\nKeep drawing! Use \`vibe drawing --action view --room ${room}\` to see the canvas.`
      };

    case 'line':
      if (!drawingState) {
        return { display: `No drawing session found in #${room}. Use \`vibe drawing --action start --room ${room}\` to create one!` };
      }

      if (x === undefined || y === undefined || x1 === undefined || y1 === undefined || !char) {
        return { display: 'For line drawing, you need: --x [start x] --y [start y] --x1 [end x] --y1 [end y] --char [character name]' };
      }

      const charName2 = char.toLowerCase();
      if (!drawing.DRAWING_CHARS[charName2]) {
        const validChars = Object.keys(drawing.DRAWING_CHARS).join(', ');
        return { display: `Invalid character "${char}". Valid options: ${validChars}` };
      }

      const lineResult = drawing.drawLine(drawingState, x, y, x1, y1, drawing.DRAWING_CHARS[charName2], myHandle);
      if (lineResult.error) {
        return { display: `Error: ${lineResult.error}` };
      }

      drawingState = lineResult.gameState;
      await saveDrawingState(room, drawingState);

      return {
        display: `## 🎨 Drew Line in #${room}\n\n${drawing.formatDrawingDisplay(drawingState)}\n\nLooking good! Use \`vibe drawing --action view --room ${room}\` to see the full canvas.`
      };

    case 'clear':
      if (!drawingState) {
        return { display: `No drawing session found in #${room}.` };
      }

      const clearResult = drawing.clearRegion(drawingState, 
        x || 0, y || 0, 
        x1 !== undefined ? x1 : drawing.CANVAS_WIDTH - 1, 
        y1 !== undefined ? y1 : drawing.CANVAS_HEIGHT - 1, 
        myHandle
      );

      if (clearResult.error) {
        return { display: `Error: ${clearResult.error}` };
      }

      drawingState = clearResult.gameState;
      await saveDrawingState(room, drawingState);

      return {
        display: `## 🗑️ Cleared Region in #${room}\n\n${drawing.formatDrawingDisplay(drawingState)}\n\nCanvas cleared! Start drawing again.`
      };

    case 'theme':
      if (!drawingState) {
        return { display: `No drawing session found in #${room}.` };
      }

      if (!theme) {
        return { display: 'Please provide a --theme for the drawing session' };
      }

      const themeResult = drawing.setTheme(drawingState, theme, myHandle);
      if (themeResult.error) {
        return { display: `Error: ${themeResult.error}` };
      }

      drawingState = themeResult.gameState;
      await saveDrawingState(room, drawingState);
      await postDrawingActivity('theme', room, myHandle, theme);

      const tips = drawing.getDrawingTips(theme);
      
      return {
        display: `## 🎯 Set Theme in #${room}\n\n${drawing.formatDrawingDisplay(drawingState)}\n\n**Drawing tips for "${theme}":**\n${tips.map(tip => `• ${tip}`).join('\n')}`
      };

    case 'view':
      if (!drawingState) {
        return { display: `No drawing session found in #${room}. Use \`vibe drawing --action start --room ${room}\` to create one!` };
      }

      return {
        display: `## 🎨 Drawing Session in #${room}\n\n${drawing.formatDrawingDisplay(drawingState)}\n\nUse \`vibe drawing --action draw --room ${room} --x 10 --y 6 --char heart\` to draw!`
      };

    case 'stats':
      if (!drawingState) {
        return { display: `No drawing session found in #${room}.` };
      }

      const stats = drawing.getCanvasStats(drawingState);
      
      let statsDisplay = `## 📊 Drawing Stats for #${room}\n\n`;
      statsDisplay += `**Canvas:** ${stats.fillPercentage}% filled (${stats.totalDrawnCells}/${drawing.CANVAS_WIDTH * drawing.CANVAS_HEIGHT} cells)\n`;
      statsDisplay += `**Moves:** ${stats.totalMoves} total\n`;
      statsDisplay += `**Characters:** ${stats.uniqueCharsUsed} different types used\n\n`;

      if (stats.mostUsedChar) {
        statsDisplay += `**Most popular:** ${stats.mostUsedChar[0]} (used ${stats.mostUsedChar[1]} times)\n\n`;
      }

      if (Object.keys(stats.playerMoves).length > 0) {
        statsDisplay += `**Artists:**\n`;
        Object.entries(stats.playerMoves)
          .sort(([,a], [,b]) => b - a)
          .forEach(([player, moves]) => {
            statsDisplay += `• @${player}: ${moves} moves\n`;
          });
      }

      return { display: statsDisplay };

    default:
      return {
        display: `## 🎨 Collaborative Drawing\n\nAvailable actions:\n• \`--action start\` - Create new drawing session\n• \`--action join\` - Join existing session\n• \`--action draw --x [0-19] --y [0-11] --char [name]\` - Draw on canvas\n• \`--action line --x [x] --y [y] --x1 [x1] --y1 [y1] --char [name]\` - Draw line\n• \`--action clear\` - Clear canvas (optionally specify region)\n• \`--action theme --theme [text]\` - Set drawing theme\n• \`--action view\` - View current canvas\n• \`--action stats\` - View drawing statistics\n\nAdd \`--room [name]\` to specify room (default: general)`
      };
  }
}

module.exports = { definition, handler };