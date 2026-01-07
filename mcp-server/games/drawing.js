/**
 * Collaborative Drawing game implementation for /vibe
 * A shared canvas where multiple users can draw together in real-time
 * Create art, doodles, or play drawing games like Pictionary!
 */

// Drawing canvas dimensions (character-based art)
const CANVAS_WIDTH = 20;
const CANVAS_HEIGHT = 12;

// Drawing tools and colors (using Unicode characters)
const DRAWING_CHARS = {
  empty: '⬜', // Empty space
  dot: '⚫', // Small dot
  circle: '⚪', // Circle 
  square: '⬛', // Filled square
  star: '⭐', // Star
  heart: '❤️', // Heart
  tree: '🌲', // Tree
  house: '🏠', // House
  sun: '☀️', // Sun
  moon: '🌙', // Moon
  water: '🌊', // Wave
  mountain: '⛰️', // Mountain
  person: '🧍', // Person
  cat: '🐱', // Cat
  dog: '🐕', // Dog
  car: '🚗', // Car
  plane: '✈️', // Plane
  flower: '🌸', // Flower
  umbrella: '☂️', // Umbrella
  rainbow: '🌈' // Rainbow
};

// Create initial drawing game state
function createInitialDrawingState() {
  // Initialize empty canvas
  const canvas = Array(CANVAS_HEIGHT).fill(null).map(() => 
    Array(CANVAS_WIDTH).fill(DRAWING_CHARS.empty)
  );

  return {
    canvas: canvas,
    players: [],
    moves: [],
    maxPlayers: 8,
    gameOver: false,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    theme: null, // Optional drawing theme/prompt
    mode: 'freeform' // 'freeform', 'pictionary', 'collaborative'
  };
}

// Add player to drawing session
function addPlayer(gameState, playerHandle) {
  if (gameState.players.includes(playerHandle)) {
    return { error: 'Player already in the drawing session' };
  }

  if (gameState.players.length >= gameState.maxPlayers) {
    return { error: `Drawing session is full (max ${gameState.maxPlayers} players)` };
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

// Make a drawing move (place character at position)
function makeMove(gameState, x, y, char, playerHandle) {
  const { canvas, players, moves } = gameState;
  
  // Validate player
  if (!players.includes(playerHandle)) {
    return { error: 'You need to join the drawing session first!' };
  }
  
  // Validate position
  if (x < 0 || x >= CANVAS_WIDTH || y < 0 || y >= CANVAS_HEIGHT) {
    return { error: `Position out of bounds. Canvas is ${CANVAS_WIDTH}x${CANVAS_HEIGHT}` };
  }
  
  // Validate character
  const validChars = Object.values(DRAWING_CHARS);
  if (!validChars.includes(char)) {
    return { error: `Invalid character. Use one of: ${Object.keys(DRAWING_CHARS).join(', ')}` };
  }
  
  // Update canvas
  const newCanvas = canvas.map(row => [...row]);
  newCanvas[y][x] = char;
  
  // Record the move
  const move = {
    x, y, char, 
    player: playerHandle,
    timestamp: new Date().toISOString(),
    moveNumber: moves.length + 1
  };
  
  const newMoves = [...moves, move];
  
  const newGameState = {
    ...gameState,
    canvas: newCanvas,
    moves: newMoves,
    lastActivity: new Date().toISOString()
  };
  
  return { success: true, gameState: newGameState };
}

// Draw a line between two points (simple Bresenham-like algorithm)
function drawLine(gameState, x0, y0, x1, y1, char, playerHandle) {
  let moves = [];
  
  // Simple line drawing - just plot points between start and end
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const steps = Math.max(dx, dy);
  
  if (steps === 0) {
    // Single point
    const result = makeMove(gameState, x0, y0, char, playerHandle);
    return result;
  }
  
  const xInc = (x1 - x0) / steps;
  const yInc = (y1 - y0) / steps;
  
  let currentGameState = gameState;
  
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + i * xInc);
    const y = Math.round(y0 + i * yInc);
    
    const result = makeMove(currentGameState, x, y, char, playerHandle);
    if (result.error) {
      // Stop on first error but return what we accomplished
      break;
    }
    currentGameState = result.gameState;
  }
  
  return { success: true, gameState: currentGameState };
}

// Clear a region of the canvas
function clearRegion(gameState, x0, y0, x1, y1, playerHandle) {
  const { players } = gameState;
  
  if (!players.includes(playerHandle)) {
    return { error: 'You need to join the drawing session first!' };
  }
  
  // Ensure coordinates are in bounds and properly ordered
  const minX = Math.max(0, Math.min(x0, x1));
  const maxX = Math.min(CANVAS_WIDTH - 1, Math.max(x0, x1));
  const minY = Math.max(0, Math.min(y0, y1));
  const maxY = Math.min(CANVAS_HEIGHT - 1, Math.max(y0, y1));
  
  const newCanvas = gameState.canvas.map(row => [...row]);
  
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      newCanvas[y][x] = DRAWING_CHARS.empty;
    }
  }
  
  const clearMove = {
    action: 'clear',
    x0: minX, y0: minY, x1: maxX, y1: maxY,
    player: playerHandle,
    timestamp: new Date().toISOString(),
    moveNumber: gameState.moves.length + 1
  };
  
  return {
    success: true,
    gameState: {
      ...gameState,
      canvas: newCanvas,
      moves: [...gameState.moves, clearMove],
      lastActivity: new Date().toISOString()
    }
  };
}

// Format drawing canvas for display
function formatDrawingDisplay(gameState) {
  const { canvas, players, moves, theme, mode } = gameState;
  
  let display = `🎨 **Collaborative Drawing** (${players.length} artist${players.length !== 1 ? 's' : ''})\n\n`;
  
  // Show theme if set
  if (theme) {
    display += `🎯 **Theme:** ${theme}\n\n`;
  }
  
  // Show canvas with coordinate labels
  display += '```\n';
  
  // Top coordinate labels
  let topLabels = '   ';
  for (let x = 0; x < CANVAS_WIDTH; x++) {
    if (x < 10) {
      topLabels += x + ' ';
    } else {
      topLabels += String.fromCharCode(55 + x); // A, B, C... for 10+
    }
  }
  display += topLabels + '\n';
  
  // Canvas rows with left coordinate labels
  for (let y = 0; y < CANVAS_HEIGHT; y++) {
    let row = (y < 10 ? ' ' + y : String.fromCharCode(55 + y)) + ' ';
    row += canvas[y].join('');
    display += row + '\n';
  }
  
  display += '```\n\n';
  
  // Show players
  if (players.length > 0) {
    display += `**Artists:** ${players.map(p => `@${p}`).join(', ')}\n\n`;
  }
  
  // Show recent activity
  if (moves.length > 0) {
    const recentMoves = moves.slice(-3); // Last 3 moves
    display += '**Recent activity:**\n';
    for (const move of recentMoves) {
      if (move.action === 'clear') {
        display += `• @${move.player} cleared region (${move.x0},${move.y0}) to (${move.x1},${move.y1})\n`;
      } else {
        display += `• @${move.player} drew ${move.char} at (${move.x},${move.y})\n`;
      }
    }
    display += '\n';
  }
  
  // Show available characters
  display += '**Available characters:**\n';
  const charEntries = Object.entries(DRAWING_CHARS);
  const charGroups = [];
  for (let i = 0; i < charEntries.length; i += 5) {
    const group = charEntries.slice(i, i + 5);
    charGroups.push(group.map(([name, char]) => `${char} (${name})`).join(' '));
  }
  display += charGroups.join('\n') + '\n\n';
  
  return display;
}

// Set drawing theme/prompt
function setTheme(gameState, theme, playerHandle) {
  const { players } = gameState;
  
  if (!players.includes(playerHandle)) {
    return { error: 'You need to join the drawing session first!' };
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

// Generate drawing tips based on theme
function getDrawingTips(theme) {
  const tips = {
    'house': ['Start with a ⬛ base', 'Add a roof with ⛰️', 'Use 🏠 for details'],
    'landscape': ['Use 🌲 for trees', '☀️ for sun', '🌊 for water', '⛰️ for mountains'],
    'portrait': ['Use 🧍 for people', '⚪⚫ for eyes', '❤️ for heart'],
    'animals': ['Try 🐱🐕 for pets', '🌲 for habitat', '⭐ for magical touches'],
    'vehicle': ['🚗 for cars', '✈️ for planes', '⬛ for roads'],
    'nature': ['🌸 for flowers', '🌲 for trees', '☀️🌙 for sky', '🌈 for color']
  };
  
  const defaultTips = ['Use ⬛⬜ for shapes', 'Add ⭐❤️ for details', 'Try 🌸🌲 for nature'];
  
  return tips[theme?.toLowerCase()] || defaultTips;
}

// Get canvas statistics
function getCanvasStats(gameState) {
  const { canvas, moves, players } = gameState;
  
  // Count characters used
  const charCount = {};
  for (const row of canvas) {
    for (const char of row) {
      if (char !== DRAWING_CHARS.empty) {
        charCount[char] = (charCount[char] || 0) + 1;
      }
    }
  }
  
  // Count moves per player
  const playerMoves = {};
  for (const move of moves) {
    if (move.player) {
      playerMoves[move.player] = (playerMoves[move.player] || 0) + 1;
    }
  }
  
  const totalDrawnCells = Object.values(charCount).reduce((a, b) => a + b, 0);
  const totalCells = CANVAS_WIDTH * CANVAS_HEIGHT;
  const fillPercentage = Math.round((totalDrawnCells / totalCells) * 100);
  
  return {
    totalMoves: moves.length,
    totalDrawnCells,
    fillPercentage,
    uniqueCharsUsed: Object.keys(charCount).length,
    charCount,
    playerMoves,
    mostUsedChar: Object.entries(charCount).sort(([,a], [,b]) => b - a)[0]
  };
}

module.exports = {
  createInitialDrawingState,
  addPlayer,
  makeMove,
  drawLine,
  clearRegion,
  formatDrawingDisplay,
  setTheme,
  getDrawingTips,
  getCanvasStats,
  DRAWING_CHARS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT
};