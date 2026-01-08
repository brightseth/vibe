/**
 * Snake Game implementation for /vibe
 * Classic arcade action! Control the snake, eat food, grow longer, avoid walls and yourself.
 * Simple controls, endless fun, and high score tracking.
 */

// Game configuration
const BOARD_WIDTH = 15;
const BOARD_HEIGHT = 12;
const INITIAL_SNAKE_LENGTH = 3;

// Direction constants
const DIRECTIONS = {
  'UP': 'UP',
  'DOWN': 'DOWN',
  'LEFT': 'LEFT',
  'RIGHT': 'RIGHT'
};

// Opposite directions (to prevent instant death by going backwards)
const OPPOSITE_DIRECTIONS = {
  'UP': 'DOWN',
  'DOWN': 'UP',
  'LEFT': 'RIGHT',
  'RIGHT': 'LEFT'
};

// Visual representation
const SYMBOLS = {
  empty: '⬜',
  snake: '🟩',  // Snake body
  head: '🟢',   // Snake head (brighter green)
  food: '🍎',   // Food
  wall: '⬛'    // Walls (if we add them later)
};

// Create initial snake game state
function createInitialSnakeState(playerHandle) {
  // Start snake in the middle of the board
  const centerX = Math.floor(BOARD_WIDTH / 2);
  const centerY = Math.floor(BOARD_HEIGHT / 2);
  
  const initialSnake = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    initialSnake.push({ x: centerX - i, y: centerY });
  }
  
  return {
    player: playerHandle,
    snake: initialSnake,
    direction: 'RIGHT',
    food: generateRandomFood(initialSnake),
    score: 0,
    gameOver: false,
    moves: 0,
    speed: 1, // Game speed level (1-5)
    createdAt: new Date().toISOString(),
    lastMove: new Date().toISOString(),
    highScore: 0, // Track personal best
    reason: null // Game over reason
  };
}

// Generate random food position that doesn't overlap with snake
function generateRandomFood(snake) {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const x = Math.floor(Math.random() * BOARD_WIDTH);
    const y = Math.floor(Math.random() * BOARD_HEIGHT);
    
    // Check if this position is occupied by snake
    const occupied = snake.some(segment => segment.x === x && segment.y === y);
    
    if (!occupied) {
      return { x, y };
    }
    
    attempts++;
  }
  
  // Fallback if we can't find a spot (board is almost full)
  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const occupied = snake.some(segment => segment.x === x && segment.y === y);
      if (!occupied) {
        return { x, y };
      }
    }
  }
  
  // If board is completely full (shouldn't happen with our board size)
  return { x: 0, y: 0 };
}

// Change snake direction
function changeDirection(gameState, newDirection, playerHandle) {
  const { player, direction, gameOver } = gameState;
  
  if (playerHandle !== player) {
    return { error: 'Not your game!' };
  }
  
  if (gameOver) {
    return { error: 'Game is over! Start a new game to play again.' };
  }
  
  // Validate direction
  if (!DIRECTIONS[newDirection.toUpperCase()]) {
    return { error: 'Invalid direction. Use: up, down, left, right' };
  }
  
  const normalizedDirection = newDirection.toUpperCase();
  
  // Prevent going in opposite direction (instant death)
  if (OPPOSITE_DIRECTIONS[direction] === normalizedDirection) {
    return { error: 'Cannot reverse direction!' };
  }
  
  return {
    success: true,
    gameState: {
      ...gameState,
      direction: normalizedDirection,
      lastMove: new Date().toISOString()
    }
  };
}

// Move the snake one step
function moveSnake(gameState) {
  const { snake, direction, food, score, moves, speed } = gameState;
  
  if (gameState.gameOver) {
    return { success: true, gameState }; // Already over, no change
  }
  
  // Calculate new head position
  const head = snake[0];
  let newX = head.x;
  let newY = head.y;
  
  switch (direction) {
    case 'UP':
      newY -= 1;
      break;
    case 'DOWN':
      newY += 1;
      break;
    case 'LEFT':
      newX -= 1;
      break;
    case 'RIGHT':
      newX += 1;
      break;
  }
  
  // Check wall collision
  if (newX < 0 || newX >= BOARD_WIDTH || newY < 0 || newY >= BOARD_HEIGHT) {
    return {
      success: true,
      gameState: {
        ...gameState,
        gameOver: true,
        reason: 'Hit the wall!',
        highScore: Math.max(gameState.highScore || 0, score)
      }
    };
  }
  
  // Check self collision
  const selfCollision = snake.some(segment => segment.x === newX && segment.y === newY);
  if (selfCollision) {
    return {
      success: true,
      gameState: {
        ...gameState,
        gameOver: true,
        reason: 'Bit yourself!',
        highScore: Math.max(gameState.highScore || 0, score)
      }
    };
  }
  
  // Create new head
  const newHead = { x: newX, y: newY };
  const newSnake = [newHead, ...snake];
  
  // Check if food was eaten
  const ateFood = newX === food.x && newY === food.y;
  
  let finalSnake;
  let newScore = score;
  let newFood = food;
  let newSpeed = speed;
  
  if (ateFood) {
    // Keep tail (snake grows)
    finalSnake = newSnake;
    newScore = score + 10;
    newFood = generateRandomFood(newSnake);
    
    // Increase speed every 50 points (max speed 5)
    newSpeed = Math.min(5, Math.floor(newScore / 50) + 1);
  } else {
    // Remove tail (snake moves)
    finalSnake = newSnake.slice(0, -1);
  }
  
  return {
    success: true,
    gameState: {
      ...gameState,
      snake: finalSnake,
      food: newFood,
      score: newScore,
      moves: moves + 1,
      speed: newSpeed,
      lastMove: new Date().toISOString(),
      highScore: Math.max(gameState.highScore || 0, newScore)
    }
  };
}

// Auto-move the snake (for continuous play)
function autoMove(gameState) {
  if (gameState.gameOver) {
    return { success: true, gameState };
  }
  
  return moveSnake(gameState);
}

// Format snake game for display
function formatSnakeDisplay(gameState) {
  const { snake, food, score, gameOver, moves, speed, reason, highScore, player } = gameState;
  
  let display = `🐍 **Snake Game** - @${player}\n\n`;
  
  if (gameOver) {
    display += `💀 **Game Over!** ${reason}\n`;
    display += `**Final Score:** ${score} points\n`;
    if (highScore > score) {
      display += `**High Score:** ${highScore} points\n`;
    } else {
      display += `🎉 **New High Score!** ${score} points\n`;
    }
    display += '\n';
  } else {
    display += `**Score:** ${score} | **Speed:** ${speed} | **Length:** ${snake.length}\n`;
    if (highScore > 0) {
      display += `**High Score:** ${highScore} points\n`;
    }
    display += '\n';
  }
  
  // Draw the game board
  display += '```\n';
  
  // Create empty board
  const board = Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(SYMBOLS.empty));
  
  // Place snake body
  for (let i = 1; i < snake.length; i++) {
    const segment = snake[i];
    if (segment.x >= 0 && segment.x < BOARD_WIDTH && segment.y >= 0 && segment.y < BOARD_HEIGHT) {
      board[segment.y][segment.x] = SYMBOLS.snake;
    }
  }
  
  // Place snake head (on top of body if needed)
  const head = snake[0];
  if (head.x >= 0 && head.x < BOARD_WIDTH && head.y >= 0 && head.y < BOARD_HEIGHT) {
    board[head.y][head.x] = SYMBOLS.head;
  }
  
  // Place food
  if (food.x >= 0 && food.x < BOARD_WIDTH && food.y >= 0 && food.y < BOARD_HEIGHT) {
    board[food.y][food.x] = SYMBOLS.food;
  }
  
  // Add border for clarity\n  display += '┌' + '─'.repeat(BOARD_WIDTH * 2) + '┐\n';\n  \n  // Draw board rows\n  for (let y = 0; y < BOARD_HEIGHT; y++) {\n    display += '│';\n    for (let x = 0; x < BOARD_WIDTH; x++) {\n      display += board[y][x];\n      if (x < BOARD_WIDTH - 1) display += '';\n    }\n    display += '│\\n';\n  }\n  \n  display += '└' + '─'.repeat(BOARD_WIDTH * 2) + '┘\\n';\n  display += '```\\n\\n';\n  \n  if (!gameOver) {\n    display += '**Controls:**\\n';\n    display += '• `w` or `up` - Move up\\n';\n    display += '• `s` or `down` - Move down\\n';\n    display += '• `a` or `left` - Move left\\n';\n    display += '• `d` or `right` - Move right\\n\\n';\n    \n    display += '💡 **Tip:** Eat the 🍎 to grow and score points!\\n';\n    \n    // Show game stats\n    const totalCells = BOARD_WIDTH * BOARD_HEIGHT;\n    const coverage = Math.round((snake.length / totalCells) * 100);\n    display += `**Board Coverage:** ${coverage}%\\n`;\n  } else {\n    display += 'Start a new game to play again! 🎮\\n';\n  }\n  \n  return display;\n}\n\n// Get game statistics\nfunction getSnakeStats(gameState) {\n  const { snake, score, moves, speed } = gameState;\n  \n  const totalCells = BOARD_WIDTH * BOARD_HEIGHT;\n  const coverage = (snake.length / totalCells) * 100;\n  \n  return {\n    score,\n    snakeLength: snake.length,\n    moves,\n    speed,\n    boardCoverage: Math.round(coverage * 100) / 100,\n    efficiency: moves > 0 ? Math.round((score / moves) * 100) / 100 : 0\n  };\n}\n\n// Check if game is won (snake fills entire board - nearly impossible!)\nfunction checkWin(gameState) {\n  const totalCells = BOARD_WIDTH * BOARD_HEIGHT;\n  return gameState.snake.length >= totalCells - 1; // -1 for food\n}\n\n// Get direction from various input formats\nfunction parseDirection(input) {\n  const normalized = input.toLowerCase().trim();\n  \n  const directionMap = {\n    'w': 'UP',\n    'up': 'UP',\n    'u': 'UP',\n    's': 'DOWN', \n    'down': 'DOWN',\n    'd': 'RIGHT',\n    'a': 'LEFT',\n    'left': 'LEFT',\n    'right': 'RIGHT',\n    'l': 'LEFT',\n    'r': 'RIGHT'\n  };\n  \n  return directionMap[normalized] || null;\n}\n\n// Generate tips based on game state\nfunction getGameTips(gameState) {\n  const { snake, score, moves, speed } = gameState;\n  \n  const tips = [];\n  \n  if (snake.length < 5) {\n    tips.push('🎯 Focus on eating food to grow your snake!');\n  }\n  \n  if (score > 0 && moves > score * 2) {\n    tips.push('⚡ Try to be more efficient - plan your path to the food!');\n  }\n  \n  if (speed >= 3) {\n    tips.push('🏃 You\\'re getting fast! Be careful with turns.');\n  }\n  \n  if (snake.length > 10) {\n    tips.push('🐍 Getting long! Watch out for your own tail.');\n  }\n  \n  const coverage = (snake.length / (BOARD_WIDTH * BOARD_HEIGHT)) * 100;\n  if (coverage > 30) {\n    tips.push('📈 Great coverage! Space is getting tight.');\n  }\n  \n  return tips;\n}\n\nmodule.exports = {\n  createInitialSnakeState,\n  changeDirection,\n  moveSnake,\n  autoMove,\n  formatSnakeDisplay,\n  getSnakeStats,\n  checkWin,\n  parseDirection,\n  getGameTips,\n  DIRECTIONS,\n  BOARD_WIDTH,\n  BOARD_HEIGHT\n};"