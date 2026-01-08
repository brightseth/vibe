/**
 * Multiplayer Tic-Tac-Toe game implementation for /vibe
 * Room-based system where players can create/join games and play together
 * Multiple rooms can run simultaneously with spectators allowed
 */

const BOARD_SIZE = 9; // 3x3 grid

// Create initial multiplayer tic-tac-toe state
function createInitialMultiplayerTicTacToeState(host, roomName = null) {
  return {
    roomName: roomName || `${host}'s game`,
    host: host,
    players: [], // [player1, player2] - exactly 2 players to play
    spectators: [], // Can watch the game
    board: Array(BOARD_SIZE).fill(''), // 3x3 grid as flat array
    turn: 'X', // X always starts
    moves: 0,
    winner: null,
    gameOver: false,
    isDraw: false,
    currentPlayerIndex: 0, // 0 or 1, indexes into players array
    playerSymbols: {}, // { handle: 'X' | 'O' }
    gameStarted: false,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    history: [] // Move history for replay/analysis
  };
}

// Join a game room (as player or spectator)
function joinRoom(gameState, playerHandle, asSpectator = false) {
  const { players, spectators, gameStarted, host } = gameState;
  
  // Check if already in the game
  if (players.includes(playerHandle) || spectators.includes(playerHandle)) {
    return { error: 'Already in this game room' };
  }
  
  if (!asSpectator && players.length < 2 && !gameStarted) {
    // Join as player
    const newPlayers = [...players, playerHandle];
    const playerSymbols = { ...gameState.playerSymbols };
    
    // Assign symbols - host gets X (goes first), second player gets O
    if (playerHandle === host) {
      playerSymbols[playerHandle] = 'X';
    } else if (newPlayers.length === 1) {
      playerSymbols[playerHandle] = 'X';
    } else {
      // Second player gets O
      playerSymbols[playerHandle] = 'O';
    }
    
    // Start game if we now have 2 players
    const shouldStart = newPlayers.length === 2;
    
    return {
      success: true,
      gameState: {
        ...gameState,
        players: newPlayers,
        playerSymbols,
        gameStarted: shouldStart,
        lastActivity: new Date().toISOString()
      }
    };
  } else {
    // Join as spectator
    return {
      success: true,
      gameState: {
        ...gameState,
        spectators: [...spectators, playerHandle],
        lastActivity: new Date().toISOString()
      }
    };
  }
}

// Leave the room
function leaveRoom(gameState, playerHandle) {
  const { players, spectators, gameStarted, gameOver } = gameState;
  
  const wasPlayer = players.includes(playerHandle);
  const wasSpectator = spectators.includes(playerHandle);
  
  if (!wasPlayer && !wasSpectator) {
    return { error: 'Not in this game room' };
  }
  
  // If game is in progress and a player leaves, end the game
  if (wasPlayer && gameStarted && !gameOver) {
    const remainingPlayer = players.find(p => p !== playerHandle);
    return {
      success: true,
      gameState: {
        ...gameState,
        players: players.filter(p => p !== playerHandle),
        spectators: spectators.filter(s => s !== playerHandle),
        winner: remainingPlayer,
        gameOver: true,
        lastActivity: new Date().toISOString(),
        history: [...gameState.history, { 
          type: 'forfeit', 
          player: playerHandle, 
          timestamp: new Date().toISOString() 
        }]
      }
    };
  }
  
  // Normal leave
  return {
    success: true,
    gameState: {
      ...gameState,
      players: players.filter(p => p !== playerHandle),
      spectators: spectators.filter(s => s !== playerHandle),
      lastActivity: new Date().toISOString()
    }
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
function makeMove(gameState, position, playerHandle) {
  const { board, players, turn, moves, winner, gameOver, gameStarted, playerSymbols } = gameState;
  
  // Validate game state
  if (!gameStarted) {
    return { error: 'Game hasn\'t started yet. Need 2 players.' };
  }
  
  if (gameOver) {
    return { error: 'Game is already over' };
  }
  
  // Validate player
  if (!players.includes(playerHandle)) {
    return { error: 'You are not a player in this game' };
  }
  
  // Check if it's player's turn
  const playerSymbol = playerSymbols[playerHandle];
  if (playerSymbol !== turn) {
    return { error: `Not your turn! Waiting for ${turn}` };
  }
  
  // Validate position
  if (position < 1 || position > 9) {
    return { error: 'Position must be 1-9' };
  }
  
  const index = position - 1; // Convert to 0-based index
  if (board[index]) {
    return { error: `Position ${position} is already taken` };
  }

  // Make the move
  const newBoard = [...board];
  newBoard[index] = playerSymbol;
  
  const newMoves = moves + 1;
  const newWinner = checkWinner(newBoard);
  const newIsDraw = !newWinner && newBoard.every(cell => cell !== '');
  const newGameOver = newWinner || newIsDraw;
  const nextTurn = playerSymbol === 'X' ? 'O' : 'X';
  
  // Record move in history
  const moveRecord = {
    type: 'move',
    player: playerHandle,
    symbol: playerSymbol,
    position: position,
    timestamp: new Date().toISOString(),
    moveNumber: newMoves
  };
  
  const newGameState = {
    ...gameState,
    board: newBoard,
    turn: newGameOver ? playerSymbol : nextTurn,
    moves: newMoves,
    winner: newWinner,
    gameOver: newGameOver,
    isDraw: newIsDraw,
    lastActivity: new Date().toISOString(),
    history: [...gameState.history, moveRecord]
  };
  
  return { success: true, gameState: newGameState };
}

// Restart the game (keep same players)
function restartGame(gameState, playerHandle) {
  const { players, host, spectators, playerSymbols } = gameState;
  
  // Only players can restart
  if (!players.includes(playerHandle)) {
    return { error: 'Only players can restart the game' };
  }
  
  // Need 2 players to restart
  if (players.length !== 2) {
    return { error: 'Need 2 players to restart the game' };
  }
  
  return {
    success: true,
    gameState: {
      ...gameState,
      board: Array(BOARD_SIZE).fill(''),
      turn: 'X', // X always starts
      moves: 0,
      winner: null,
      gameOver: false,
      isDraw: false,
      currentPlayerIndex: 0,
      gameStarted: true,
      lastActivity: new Date().toISOString(),
      history: []
    }
  };
}

// Format multiplayer tic-tac-toe for display
function formatMultiplayerTicTacToeDisplay(gameState, viewerHandle = null) {
  const { 
    roomName, host, players, spectators, board, turn, moves, winner, isDraw, 
    gameStarted, playerSymbols, gameOver, history 
  } = gameState;
  
  let display = `🎯 **Multiplayer Tic-Tac-Toe** - ${roomName}\n\n`;
  
  // Game status
  if (!gameStarted) {
    display += `**Waiting for players...** (${players.length}/2)\n`;
    if (players.length > 0) {
      display += `Players: ${players.map(p => `@${p} (${playerSymbols[p] || '?'})`).join(', ')}\n`;
    }
    if (spectators.length > 0) {
      display += `Spectators: ${spectators.map(s => `@${s}`).join(', ')}\n`;
    }
    display += '\n';
    
    if (players.length < 2) {
      display += 'Join with `/game multiplayer-tictactoe --join`\n';
      display += 'Or spectate with `/game multiplayer-tictactoe --spectate`\n';
    }
    
    return display;
  }
  
  // Show board
  const symbols = board.map((cell, i) => cell || (i + 1).toString());
  
  display += `**Move ${moves}**\n`;
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
  
  // Game status
  if (winner) {
    const winnerHandle = Object.keys(playerSymbols).find(h => playerSymbols[h] === winner);
    display += `🎉 **@${winnerHandle} wins!** (${winner})\n\n`;
  } else if (isDraw) {
    display += `🤝 **Draw!** Well played!\n\n`;
  } else if (gameStarted) {
    const currentPlayerHandle = Object.keys(playerSymbols).find(h => playerSymbols[h] === turn);
    display += `**@${currentPlayerHandle}'s turn** (${turn})\n\n`;
  }
  
  // Show players
  display += `**Players:**\n`;
  for (const player of players) {
    const symbol = playerSymbols[player];
    const status = symbol === turn && !gameOver ? ' ← current turn' : '';
    display += `• @${player} (${symbol})${status}\n`;
  }
  
  // Show spectators if any
  if (spectators.length > 0) {
    display += `\n**Spectators (${spectators.length}):** ${spectators.map(s => `@${s}`).join(', ')}\n`;
  }
  
  // Show controls based on viewer's role
  display += '\n';
  if (players.includes(viewerHandle)) {
    if (!gameOver) {
      display += `**Your commands:**\n`;
      display += `• \`/game multiplayer-tictactoe --move N\` - Play position 1-9\n`;
      display += `• \`/game multiplayer-tictactoe --leave\` - Leave game\n`;
    } else {
      display += `**Game over!** Use \`/game multiplayer-tictactoe --restart\` to play again\n`;
    }
  } else if (spectators.includes(viewerHandle)) {
    display += `**You are spectating.** Use \`/game multiplayer-tictactoe --leave\` to stop watching\n`;
  } else {
    if (!gameStarted) {
      display += `**Join:** \`/game multiplayer-tictactoe --join\` or \`/game multiplayer-tictactoe --spectate\`\n`;
    } else {
      display += `**Spectate:** \`/game multiplayer-tictactoe --spectate\`\n`;
    }
  }
  
  // Show recent moves
  if (history.length > 0) {
    const recentMoves = history.filter(h => h.type === 'move').slice(-3);
    if (recentMoves.length > 0) {
      display += `\n**Recent moves:**\n`;
      for (const move of recentMoves) {
        display += `• @${move.player} played ${move.symbol} at position ${move.position}\n`;
      }
    }
  }
  
  return display;
}

// Get game statistics
function getGameStats(gameState) {
  const { moves, history, players, spectators } = gameState;
  
  const moveHistory = history.filter(h => h.type === 'move');
  const playerMoves = {};
  
  for (const move of moveHistory) {
    playerMoves[move.player] = (playerMoves[move.player] || 0) + 1;
  }
  
  return {
    totalMoves: moves,
    totalPlayers: players.length,
    totalSpectators: spectators.length,
    playerMoves,
    gameStarted: gameState.gameStarted,
    gameOver: gameState.gameOver,
    winner: gameState.winner
  };
}

// Check if game is ready to start
function canStartGame(gameState) {
  return gameState.players.length === 2 && !gameState.gameStarted;
}

// Get available positions
function getAvailablePositions(gameState) {
  return gameState.board
    .map((cell, index) => cell === '' ? index + 1 : null)
    .filter(pos => pos !== null);
}

module.exports = {
  createInitialMultiplayerTicTacToeState,
  joinRoom,
  leaveRoom,
  makeMove,
  restartGame,
  formatMultiplayerTicTacToeDisplay,
  checkWinner,
  getGameStats,
  canStartGame,
  getAvailablePositions
};