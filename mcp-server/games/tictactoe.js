/**
 * Tic-Tac-Toe game implementation for /vibe
 * Classic 3x3 grid game
 */

// Create initial tic-tac-toe state
function createInitialTicTacToeState() {
  return {
    board: Array(9).fill(''), // 3x3 grid as flat array
    turn: 'X', // X always goes first
    moves: 0,
    winner: null,
    gameOver: false,
    isDraw: false
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

// Format tic-tac-toe board for display
function formatTicTacToeDisplay(gameState) {
  const { board, moves, winner, isDraw, turn, lastMove } = gameState;
  
  let display = `⭕ **Tic-Tac-Toe** (${moves} moves)\n\n`;
  
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
    display += `🎉 **Winner: ${winner}**`;
  } else if (isDraw) {
    display += `🤝 **Draw!** Game over.`;
  } else {
    display += `Turn: **${turn}**`;
    if (lastMove) {
      display += `\nLast move: ${lastMove.symbol} at position ${lastMove.position}`;
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

module.exports = {
  createInitialTicTacToeState,
  makeMove,
  formatTicTacToeDisplay,
  checkWinner,
  getAvailablePositions
};