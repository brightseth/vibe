/**
 * Collaborative Pixel Art game implementation for /vibe
 * A shared pixel grid where multiple users can create art together
 * Place colored pixels to create collaborative pixel art masterpieces!
 */

// Pixel art canvas dimensions
const CANVAS_SIZE = 16; // 16x16 grid for manageable display

// Available pixel colors using colored squares
const PIXEL_COLORS = {
  'empty': '⬜', // Empty/white
  'black': '⬛', // Black
  'red': '🟥', // Red
  'blue': '🟦', // Blue
  'green': '🟩', // Green
  'yellow': '🟨', // Yellow
  'orange': '🟧', // Orange
  'purple': '🟪', // Purple
  'brown': '🟫', // Brown
  'pink': '🩷', // Pink (if available, fallback to red)
  'gray': '⬜', // Light gray (using white as fallback)
  'darkgray': '⬛', // Dark gray (using black as fallback)
};

// Alternative color representation for better compatibility
const ALT_COLORS = {
  'empty': '⬜',
  'black': '⬛',
  'red': '🔴',
  'blue': '🔵',
  'green': '🟢',
  'yellow': '🟡',
  'orange': '🟠',
  'purple': '🟣',
  'brown': '🟤',
  'pink': '🌸',
  'gray': '⚪',
  'darkgray': '⚫'
};

// Create initial pixel art game state
function createInitialPixelArtState() {
  // Initialize empty canvas
  const canvas = Array(CANVAS_SIZE).fill(null).map(() => 
    Array(CANVAS_SIZE).fill('empty')
  );

  return {
    canvas: canvas,
    players: [],
    pixelMoves: [],
    maxPlayers: 10,
    gameOver: false,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    theme: null, // Optional art theme/challenge
    mode: 'collaborative', // 'collaborative', 'battle', 'themed'
    colorMode: 'squares' // 'squares' or 'circles'
  };
}

// Add player to pixel art session
function addPlayer(gameState, playerHandle) {
  if (gameState.players.includes(playerHandle)) {
    return { error: 'Player already in the pixel art session' };
  }

  if (gameState.players.length >= gameState.maxPlayers) {
    return { error: `Pixel art session is full (max ${gameState.maxPlayers} players)` };
  }

  const newPlayers = [...gameState.players, playerHandle];
  
  return {
    success: true,
    gameState: {
      ...gameState,
      players: newPlayers,
      lastActivity: new Date().toISOString()
    }
  };
}

// Place a pixel at position
function placePixel(gameState, x, y, color, playerHandle) {
  const { canvas, players, pixelMoves } = gameState;
  
  // Validate player
  if (!players.includes(playerHandle)) {
    return { error: 'You need to join the pixel art session first!' };
  }
  
  // Validate position
  if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) {
    return { error: `Position out of bounds. Canvas is ${CANVAS_SIZE}x${CANVAS_SIZE}` };
  }
  
  // Validate color
  if (!PIXEL_COLORS[color]) {
    const availableColors = Object.keys(PIXEL_COLORS).join(', ');
    return { error: `Invalid color '${color}'. Available: ${availableColors}` };
  }
  
  // Update canvas
  const newCanvas = canvas.map(row => [...row]);
  newCanvas[y][x] = color;
  
  // Record the move
  const move = {
    x, y, color, 
    player: playerHandle,
    timestamp: new Date().toISOString(),
    moveNumber: pixelMoves.length + 1,
    previousColor: canvas[y][x]
  };
  
  const newMoves = [...pixelMoves, move];
  
  const newGameState = {
    ...gameState,
    canvas: newCanvas,
    pixelMoves: newMoves,
    lastActivity: new Date().toISOString()
  };
  
  return { success: true, gameState: newGameState };
}

// Fill a rectangular region with a color
function fillRegion(gameState, x0, y0, x1, y1, color, playerHandle) {
  const { players } = gameState;
  
  if (!players.includes(playerHandle)) {
    return { error: 'You need to join the pixel art session first!' };
  }
  
  if (!PIXEL_COLORS[color]) {
    return { error: `Invalid color '${color}'` };
  }
  
  // Ensure coordinates are in bounds and properly ordered
  const minX = Math.max(0, Math.min(x0, x1));
  const maxX = Math.min(CANVAS_SIZE - 1, Math.max(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxY = Math.min(CANVAS_SIZE - 1, Math.max(y0, y1));
  
  let currentGameState = gameState;
  
  // Fill pixel by pixel to maintain move history
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const result = placePixel(currentGameState, x, y, color, playerHandle);
      if (result.success) {
        currentGameState = result.gameState;
      }
    }
  }
  
  return { success: true, gameState: currentGameState };
}

// Clear the entire canvas
function clearCanvas(gameState, playerHandle) {
  const { players } = gameState;
  
  if (!players.includes(playerHandle)) {
    return { error: 'You need to join the pixel art session first!' };
  }
  
  const canvas = Array(CANVAS_SIZE).fill(null).map(() => 
    Array(CANVAS_SIZE).fill('empty')
  );
  
  const clearMove = {
    action: 'clear_all',
    player: playerHandle,
    timestamp: new Date().toISOString(),
    moveNumber: gameState.pixelMoves.length + 1
  };
  
  return {
    success: true,
    gameState: {
      ...gameState,
      canvas: canvas,
      pixelMoves: [...gameState.pixelMoves, clearMove],
      lastActivity: new Date().toISOString()
    }
  };
}

// Toggle color mode between squares and circles
function toggleColorMode(gameState, playerHandle) {
  const { players } = gameState;
  
  if (!players.includes(playerHandle)) {
    return { error: 'You need to join the pixel art session first!' };
  }
  
  const newMode = gameState.colorMode === 'squares' ? 'circles' : 'squares';
  
  return {
    success: true,
    gameState: {
      ...gameState,
      colorMode: newMode,
      lastActivity: new Date().toISOString()
    }
  };
}

// Format pixel art display
function formatPixelArtDisplay(gameState) {
  const { canvas, players, pixelMoves, theme, mode, colorMode } = gameState;
  
  let display = `🎨 **Collaborative Pixel Art** (${players.length} artist${players.length !== 1 ? 's' : ''})\n`;
  display += `*${CANVAS_SIZE}x${CANVAS_SIZE} pixel canvas*\n\n`;
  
  // Show theme if set
  if (theme) {
    display += `🎯 **Theme:** ${theme}\n\n`;
  }
  
  // Choose color palette based on mode
  const colors = colorMode === 'circles' ? ALT_COLORS : PIXEL_COLORS;
  
  // Show canvas with coordinate labels
  display += '```\n';
  
  // Top coordinate labels (0-9, A-F for 10-15)
  let topLabels = '  ';
  for (let x = 0; x < CANVAS_SIZE; x++) {
    if (x < 10) {
      topLabels += x;
    } else {
      topLabels += String.fromCharCode(65 + x - 10); // A, B, C, D, E, F
    }
  }
  display += topLabels + '\n';
  
  // Canvas rows with left coordinate labels
  for (let y = 0; y < CANVAS_SIZE; y++) {
    let row = (y < 10 ? y : String.fromCharCode(65 + y - 10)) + ' ';
    for (let x = 0; x < CANVAS_SIZE; x++) {
      const pixelColor = canvas[y][x];
      row += colors[pixelColor] || colors['empty'];
    }
    display += row + '\n';
  }
  
  display += '```\n\n';
  
  // Show players
  if (players.length > 0) {
    display += `**Artists:** ${players.map(p => `@${p}`).join(', ')}\n\n`;
  }
  
  // Show recent activity
  if (pixelMoves.length > 0) {
    const recentMoves = pixelMoves.slice(-4).filter(m => m.action !== 'clear_all'); // Last 4 non-clear moves
    if (recentMoves.length > 0) {
      display += '**Recent pixels:**\n';
      for (const move of recentMoves) {
        display += `• @${move.player} placed ${colors[move.color]} at (${move.x},${move.y})\n`;
      }
      display += '\n';
    }
  }
  
  // Show available colors
  display += `**Available colors** (${colorMode} mode):\n`;
  const colorEntries = Object.entries(colors);
  const colorLines = [];
  for (let i = 0; i < colorEntries.length; i += 4) {
    const group = colorEntries.slice(i, i + 4);
    colorLines.push(group.map(([name, pixel]) => `${pixel}${name}`).join(' '));
  }
  display += colorLines.join('\n') + '\n\n';
  
  // Show commands
  display += '**Commands:**\n';
  display += '• `pixel X Y COLOR` - Place pixel at coordinates (e.g., `pixel 5 3 red`)\n';
  display += '• `fill X0 Y0 X1 Y1 COLOR` - Fill rectangular area\n';
  display += '• `clear` - Clear entire canvas\n';
  display += '• `toggle` - Switch between square/circle colors\n\n';
  
  return display;
}

// Set pixel art theme/challenge
function setTheme(gameState, theme, playerHandle) {
  const { players } = gameState;
  
  if (!players.includes(playerHandle)) {
    return { error: 'You need to join the pixel art session first!' };
  }
  
  return {
    success: true,
    gameState: {
      ...gameState,
      theme: theme,
      lastActivity: new Date().toISOString()
    }
  };
}

// Get pixel art statistics
function getPixelArtStats(gameState) {
  const { canvas, pixelMoves, players } = gameState;
  
  // Count colors used
  const colorCount = {};
  for (const row of canvas) {
    for (const pixel of row) {
      if (pixel !== 'empty') {
        colorCount[pixel] = (colorCount[pixel] || 0) + 1;
      }
    }
  }
  
  // Count moves per player
  const playerMoves = {};
  for (const move of pixelMoves) {
    if (move.player && move.action !== 'clear_all') {
      playerMoves[move.player] = (playerMoves[move.player] || 0) + 1;
    }
  }
  
  const totalColoredPixels = Object.values(colorCount).reduce((a, b) => a + b, 0);
  const totalPixels = CANVAS_SIZE * CANVAS_SIZE;
  const fillPercentage = Math.round((totalColoredPixels / totalPixels) * 100);
  
  return {
    totalMoves: pixelMoves.length,
    totalColoredPixels,
    fillPercentage,
    uniqueColorsUsed: Object.keys(colorCount).length,
    colorCount,
    playerMoves,
    mostUsedColor: Object.entries(colorCount).sort(([,a], [,b]) => b - a)[0]
  };
}

// Generate art suggestions based on theme
function getArtSuggestions(theme) {
  const suggestions = {
    'nature': ['Use green for grass/trees', 'Blue for sky/water', 'Yellow for sun', 'Brown for tree trunks'],
    'pixel character': ['Start with basic shape', 'Use black for outlines', 'Add simple features', 'Keep it small and recognizable'],
    'landscape': ['Blue sky at top', 'Green ground at bottom', 'Add simple shapes for trees/mountains'],
    'abstract': ['Use complementary colors', 'Try patterns or geometric shapes', 'Experiment with color gradients'],
    'flag': ['Research the flag colors', 'Plan the layout first', 'Use fill command for large areas'],
    'emoji': ['Pick a simple emoji to recreate', 'Use basic shapes', 'Focus on recognizable features'],
    'retro game': ['Use limited color palette', 'Think 8-bit style', 'Simple geometric shapes work best']
  };
  
  const defaultSuggestions = [
    'Start with simple shapes',
    'Use contrasting colors',
    'Plan before placing pixels',
    'Collaborate with other artists!'
  ];
  
  return suggestions[theme?.toLowerCase()] || defaultSuggestions;
}

// Export a simple text version of the canvas
function exportCanvasAsText(gameState) {
  const { canvas, colorMode } = gameState;
  const colors = colorMode === 'circles' ? ALT_COLORS : PIXEL_COLORS;
  
  let textCanvas = '';
  for (const row of canvas) {
    for (const pixel of row) {
      textCanvas += colors[pixel] || colors['empty'];
    }
    textCanvas += '\n';
  }
  
  return textCanvas;
}

module.exports = {
  createInitialPixelArtState,
  addPlayer,
  placePixel,
  fillRegion,
  clearCanvas,
  toggleColorMode,
  formatPixelArtDisplay,
  setTheme,
  getPixelArtStats,
  getArtSuggestions,
  exportCanvasAsText,
  PIXEL_COLORS,
  ALT_COLORS,
  CANVAS_SIZE
};