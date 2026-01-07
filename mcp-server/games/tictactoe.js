/**
 * Tic-Tac-Toe game implementation for /vibe
 * Classic 3x3 grid game with AI opponent support
 * Includes multiple difficulty levels: easy, medium, hard
 */

// Create initial tic-tac-toe state
function createInitialTicTacToeState(difficulty = 'medium') {
  return {
    board: Array(9).fill(''), // 3x3 grid as flat array
    turn: 'X', // X always goes first
    moves: 0,
    winner: null,
    gameOver: false,
    isDraw: false,
    playerSymbol: 'X', // Player is X, AI is O
    aiSymbol: 'O',
    difficulty: difficulty // easy, medium, hard
  };
}

// Check for winner in tic-tac-toe
function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]             // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return null;
}

// Make a move
function makeMove(gameState, position, playerSymbol) {
  const { board, moves, winner, gameOver } = gameState;
  
  // Validate move
  if (gameOver) {
    return { error: 'Game is already over' };
  }
  
  if (position < 1 || position > 9) {
    return { error: 'Position must be 1-9' };
  }
  
  const index = position - 1; // Convert to 0-based index
  
  if (board[index]) {
    return { error: 'Position already taken' };
  }

  // Make the move
  const newBoard = [...board];
  newBoard[index] = playerSymbol;
  
  const newMoves = moves + 1;
  const newWinner = checkWinner(newBoard);
  const newIsDraw = !newWinner && newBoard.every(cell => cell !== '');
  const newGameOver = newWinner || newIsDraw;
  const nextTurn = playerSymbol === 'X' ? 'O' : 'X';
  
  const newGameState = {
    ...gameState,
    board: newBoard,
    turn: newGameOver ? playerSymbol : nextTurn,
    moves: newMoves,
    winner: newWinner,
    gameOver: newGameOver,
    isDraw: newIsDraw,
    lastMove: { position, symbol: playerSymbol }
  };
  
  return { success: true, gameState: newGameState };
}

// Minimax algorithm for perfect AI play (hard difficulty)
function minimax(board, depth, isMaximizing, aiSymbol, playerSymbol, alpha = -Infinity, beta = Infinity) {
  const winner = checkWinner(board);
  
  // Base cases
  if (winner === aiSymbol) return 10 - depth;
  if (winner === playerSymbol) return depth - 10;
  if (board.every(cell => cell !== '')) return 0; // Draw
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = aiSymbol;
        const eval = minimax(board, depth + 1, false, aiSymbol, playerSymbol, alpha, beta);
        board[i] = '';
        maxEval = Math.max(maxEval, eval);
        alpha = Math.max(alpha, eval);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === '') {
        board[i] = playerSymbol;
        const eval = minimax(board, depth + 1, true, aiSymbol, playerSymbol, alpha, beta);
        board[i] = '';
        minEval = Math.min(minEval, eval);
        beta = Math.min(beta, eval);
        if (beta <= alpha) break; // Alpha-beta pruning
      }
    }
    return minEval;
  }
}

// Get best move using minimax (for hard difficulty)
function getBestMove(board, aiSymbol, playerSymbol) {
  let bestMove = -1;
  let bestValue = -Infinity;
  
  for (let i = 0; i < 9; i++) {
    if (board[i] === '') {
      board[i] = aiSymbol;
      const moveValue = minimax(board, 0, false, aiSymbol, playerSymbol);
      board[i] = '';
      
      if (moveValue > bestValue) {
        bestMove = i + 1; // Convert to 1-based index
        bestValue = moveValue;
      }
    }
  }
  
  return bestMove;
}

// AI Strategy with difficulty levels
function getAIMove(gameState, difficulty = 'medium') {
  const { board, aiSymbol, playerSymbol } = gameState;
  const availablePositions = getAvailablePositions(board);
  
  if (availablePositions.length === 0) {
    return null;
  }

  // Override difficulty if specified in gameState
  if (gameState.difficulty) {
    difficulty = gameState.difficulty;
  }

  switch (difficulty) {
    case 'easy':
      return getEasyAIMove(board, availablePositions, aiSymbol, playerSymbol);
    case 'medium':
      return getMediumAIMove(board, availablePositions, aiSymbol, playerSymbol);
    case 'hard':
      return getHardAIMove(board, aiSymbol, playerSymbol);
    default:
      return getMediumAIMove(board, availablePositions, aiSymbol, playerSymbol);
  }
}

// Easy AI: Mostly random with occasional smart moves
function getEasyAIMove(board, availablePositions, aiSymbol, playerSymbol) {
  // 70% chance to play randomly
  if (Math.random() < 0.7) {
    const randomIndex = Math.floor(Math.random() * availablePositions.length);
    return availablePositions[randomIndex];
  }
  
  // 30% chance to make a smart move
  // 1. Try to win (15% chance)
  if (Math.random() < 0.5) {
    for (const pos of availablePositions) {
      const testBoard = [...board];
      testBoard[pos - 1] = aiSymbol;
      if (checkWinner(testBoard) === aiSymbol) {
        return pos;
      }
    }
  }
  
  // 2. Sometimes block player (15% chance)
  if (Math.random() < 0.5) {
    for (const pos of availablePositions) {
      const testBoard = [...board];
      testBoard[pos - 1] = playerSymbol;
      if (checkWinner(testBoard) === playerSymbol) {
        return pos;
      }
    }
  }
  
  // Fallback to random
  const randomIndex = Math.floor(Math.random() * availablePositions.length);
  return availablePositions[randomIndex];
}

// Medium AI: Balanced strategy with some randomness
function getMediumAIMove(board, availablePositions, aiSymbol, playerSymbol) {
  // 1. Always try to win first
  for (const pos of availablePositions) {
    const testBoard = [...board];
    testBoard[pos - 1] = aiSymbol;
    if (checkWinner(testBoard) === aiSymbol) {
      return pos;
    }
  }

  // 2. Always block player from winning
  for (const pos of availablePositions) {
    const testBoard = [...board];
    testBoard[pos - 1] = playerSymbol;
    if (checkWinner(testBoard) === playerSymbol) {
      return pos;
    }
  }

  // 3. Add some randomness to avoid being too predictable (30% chance)
  if (Math.random() < 0.3) {
    const randomIndex = Math.floor(Math.random() * availablePositions.length);
    return availablePositions[randomIndex];
  }

  // 4. Take center if available
  if (availablePositions.includes(5)) {
    return 5;
  }

  // 5. Take corners
  const corners = [1, 3, 7, 9];
  const availableCorners = corners.filter(c => availablePositions.includes(c));
  if (availableCorners.length > 0) {
    const randomCorner = availableCorners[Math.floor(Math.random() * availableCorners.length)];
    return randomCorner;
  }

  // 6. Take any remaining position
  const randomIndex = Math.floor(Math.random() * availablePositions.length);
  return availablePositions[randomIndex];
}

// Hard AI: Perfect play using minimax algorithm
function getHardAIMove(board, aiSymbol, playerSymbol) {
  return getBestMove(board, aiSymbol, playerSymbol);
}

// Make AI move
function makeAIMove(gameState, difficulty = null) {
  if (gameState.gameOver || gameState.turn !== gameState.aiSymbol) {
    return { error: 'Not AI turn or game is over' };
  }

  const aiPosition = getAIMove(gameState, difficulty);
  if (!aiPosition) {
    return { error: 'No moves available' };
  }

  return makeMove(gameState, aiPosition, gameState.aiSymbol);
}

// Format tic-tac-toe board for display
function formatTicTacToeDisplay(gameState) {
  const { board, moves, winner, isDraw, turn, lastMove, playerSymbol, aiSymbol, difficulty } = gameState;
  
  const difficultyEmoji = {
    'easy': '😊',
    'medium': '🤔',
    'hard': '🧠'
  };
  
  const difficultyText = difficulty ? `${difficultyEmoji[difficulty] || '🤔'} ${difficulty.toUpperCase()}` : 'MEDIUM 🤔';
  
  let display = `🎯 **Tic-Tac-Toe vs AI** (${difficultyText}) - ${moves} moves\n\n`;
  
  // Create 3x3 grid display
  const symbols = board.map((cell, i) => cell || (i + 1).toString());
  
  display += '```\n';
  for (let row = 0; row < 3; row++) {
    const line = [];
    for (let col = 0; col < 3; col++) {
      const index = row * 3 + col;
      line.push(symbols[index]);
    }
    display += line.join(' │ ') + '\n';
    if (row < 2) display += '──┼───┼──\n';
  }
  display += '```\n\n';
  
  if (winner) {
    if (winner === playerSymbol) {
      display += `🎉 **You won!** Great job!`;
    } else {
      display += `🤖 **AI wins!** Better luck next time!`;
    }
  } else if (isDraw) {
    display += `🤝 **Draw!** Well played!`;
  } else {
    if (turn === playerSymbol) {
      display += `Your turn! Choose position 1-9`;
    } else {
      display += `AI is thinking... 🤔`;
    }
    
    if (lastMove) {
      const mover = lastMove.symbol === playerSymbol ? 'You' : 'AI';
      display += `\nLast move: ${mover} played ${lastMove.symbol} at position ${lastMove.position}`;
    }
  }
  
  return display;
}

// Get available positions
function getAvailablePositions(board) {
  return board
    .map((cell, index) => cell === '' ? index + 1 : null)
    .filter(pos => pos !== null);
}

// Get difficulty description for users
function getDifficultyDescription(difficulty) {
  const descriptions = {
    'easy': '😊 **EASY**: AI plays mostly randomly, great for beginners!',
    'medium': '🤔 **MEDIUM**: AI uses basic strategy but makes some mistakes.',
    'hard': '🧠 **HARD**: AI plays perfectly, can you beat it?'
  };
  return descriptions[difficulty] || descriptions['medium'];
}

module.exports = {
  createInitialTicTacToeState,
  makeMove,
  makeAIMove,
  formatTicTacToeDisplay,
  checkWinner,
  getAvailablePositions,
  getAIMove,
  getDifficultyDescription
};