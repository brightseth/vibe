/**
 * vibe game — Start or continue a game with someone
 *
 * Supports: tic-tac-toe, chess
 */

const config = require('../config');
const store = require('../store');
const { createTicTacToePayload, createGamePayload, formatPayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Chess game implementation
const chess = require('../games/chess');

// Post game results to board and Discord
async function postGameResult(winner, loser, isDraw, game = 'tic-tac-toe') {
  const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';

  // Post to board
  try {
    const content = isDraw
      ? `@${winner} and @${loser} tied at ${game}`
      : `@${winner} beat @${loser} at ${game}`;

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
    console.error('[game] Failed to post to board:', e.message);
  }

  // Post to Discord
  try {
    await fetch(`${API_URL}/api/discord-bridge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'game',
        data: {
          game: game,
          winner: isDraw ? winner : winner,
          loser: isDraw ? loser : loser,
          player1: winner,
          player2: loser,
          draw: isDraw
        }
      })
    });
  } catch (e) {
    console.error('[game] Failed to post to Discord:', e.message);
  }
}

const definition = {
  name: 'vibe_game',
  description: 'Start or continue a game with someone. Supports: tictactoe, chess',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Who to play with (e.g., @solienne)'
      },
      game: {
        type: 'string',
        description: 'Game to play (default: tictactoe)',
        enum: ['tictactoe', 'chess']
      },
      move: {
        type: ['number', 'string'],
        description: 'Move to make (tictactoe: 1-9, chess: algebraic notation like e4, Nf3)'
      }
    },
    required: ['handle']
  }
};

/**
 * Parse game state from thread
 */
function getGameState(thread, game) {
  // Find the most recent game payload of this type
  for (let i = thread.length - 1; i >= 0; i--) {
    const msg = thread[i];
    if (msg.payload?.type === 'game' && msg.payload?.game === game) {
      return msg.payload.state;
    }
  }
  return null;
}

/**
 * Check for winner in tic-tac-toe
 */
function checkTicTacToeWinner(board) {
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

/**
 * Format chess board for display
 */
function formatChessPayload(payload) {
  const state = payload.state || {};
  const board = state.board || [];
  
  if (!board.length) return '♟️ **Chess** (setting up...)';

  const files = '  a b c d e f g h';
  let display = '♟️ **Chess** ' + (state.moves ? `(move ${state.moves})` : '(new game)') + '\n```\n' + files + '\n';
  
  for (let rank = 0; rank < 8; rank++) {
    let row = (8 - rank) + ' ';
    for (let file = 0; file < 8; file++) {
      const piece = board[rank] && board[rank][file];
      // Use chess piece Unicode symbols
      const pieceSymbols = {
        'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
      };
      const symbol = piece ? (pieceSymbols[piece] || piece) : ((rank + file) % 2 === 0 ? '·' : ' ');
      row += symbol + ' ';
    }
    row += (8 - rank);
    display += row + '\n';
  }
  
  display += files + '\n```\n';
  
  if (state.winner) {
    display += `**Winner: ${state.winner}**`;
  } else if (state.checkmate) {
    display += '**Checkmate!**';
  } else if (state.stalemate) {
    display += '**Stalemate!**';
  } else if (state.check) {
    display += '**Check!** ';
  }
  
  if (!state.winner && !state.checkmate && !state.stalemate) {
    display += `Turn: **${state.turn || 'white'}**`;
  }
  
  if (state.lastMove) {
    display += `\nLast move: ${state.lastMove.notation}`;
  }

  return display;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { handle, move } = args;
  const game = args.game || 'tictactoe';
  const myHandle = config.getHandle();
  const them = normalizeHandle(handle);

  if (them === myHandle) {
    return { display: 'You can\'t play a game with yourself.' };
  }

  // Get existing thread
  const thread = await store.getThread(myHandle, them);
  let gameState = getGameState(thread, game);

  // Show current state if no move provided
  if (!move) {
    if (!gameState) {
      // Start new game
      if (game === 'chess') {
        const newState = chess.createInitialChessState();
        const payload = createGamePayload('chess', newState);
        
        await store.sendMessage(myHandle, them, 'Starting a new chess game! You can play white and go first.', 'dm', payload);

        return {
          display: `## New Chess Game with @${them}\n\n${formatChessPayload(payload)}\n\nUse \`vibe game @${them} --move e4\` to make moves in algebraic notation`
        };
      } else {
        // Default to tic-tac-toe
        const newBoard = Array(9).fill('');
        const payload = createTicTacToePayload(newBoard, 'X', 0);

        await store.sendMessage(myHandle, them, 'Starting a new game! You can go first.', 'dm', payload);

        return {
          display: `## New Game with @${them}\n\n${formatPayload(payload)}\n\nUse \`vibe game @${them} --move 5\` to play center (positions 1-9)`
        };
      }
    }

    // Show existing game
    let payload;
    let displayText;
    
    if (game === 'chess') {
      payload = createGamePayload('chess', gameState);
      displayText = `## Chess Game with @${them}\n\n${formatChessPayload(payload)}\n`;
      
      if (gameState.winner || gameState.checkmate) {
        displayText += `\nGame over! Use \`vibe game @${them}\` with no move to start a new game.`;
      } else {
        displayText += `\nUse \`vibe game @${them} --move e4\` to make moves in algebraic notation`;
      }
    } else {
      payload = createTicTacToePayload(
        gameState.board,
        gameState.turn,
        gameState.moves,
        gameState.winner
      );
      displayText = `## Game with @${them}\n\n${formatPayload(payload)}\n`;

      if (gameState.winner) {
        displayText += `\nGame over! Use \`vibe game @${them}\` with no move to start a new game.`;
      } else if (gameState.board.every(c => c)) {
        displayText += `\nDraw! Use \`vibe game @${them}\` with no move to start a new game.`;
      } else {
        displayText += `\nUse \`vibe game @${them} --move N\` to play (1-9)`;
      }
    }

    return { display: displayText };
  }

  // Make a move
  if (game === 'chess') {
    // Initialize game if needed
    if (!gameState) {
      gameState = chess.createInitialChessState();
    }

    // Check if game is over
    if (gameState.winner || gameState.checkmate || gameState.stalemate) {
      return { display: 'This game is over. Start a new game with `vibe game @' + them + '` (no move).' };
    }

    // Make chess move
    const result = chess.makeMove(gameState, move);
    if (result.error) {
      return { display: `Invalid move: ${result.error}` };
    }

    const newGameState = result.gameState;
    const payload = createGamePayload('chess', newGameState);

    // Send message with game state
    let message = `Played ${move}.`;
    if (newGameState.check) message += ' Check!';
    if (newGameState.checkmate) {
      message += ' Checkmate! I win! 🎉';
      postGameResult(myHandle, them, false, 'chess');
    } else if (newGameState.stalemate) {
      message += ' Stalemate! 🤝';
      postGameResult(myHandle, them, true, 'chess');
    } else {
      message += ' Your turn!';
    }

    await store.sendMessage(myHandle, them, message, 'dm', payload);

    return {
      display: `## Chess Game with @${them}\n\n${formatChessPayload(payload)}\n\n${newGameState.checkmate ? '🎉 You win!' : newGameState.stalemate ? '🤝 Stalemate!' : `Waiting for @${them}...`}`
    };

  } else {
    // Tic-tac-toe logic
    const position = move - 1; // Convert 1-9 to 0-8

    if (position < 0 || position > 8) {
      return { display: 'Invalid position. Use 1-9 (left-to-right, top-to-bottom).' };
    }

    // Initialize game if needed
    if (!gameState) {
      gameState = {
        board: Array(9).fill(''),
        turn: 'X',
        moves: 0,
        winner: null
      };
    }

    // Check if game is over
    if (gameState.winner || gameState.board.every(c => c)) {
      return { display: 'This game is over. Start a new game with `vibe game @' + them + '` (no move).' };
    }

    // Check if position is taken
    if (gameState.board[position]) {
      return { display: `Position ${move} is already taken. Choose an empty spot.` };
    }

    // Determine my symbol (X goes first, alternate based on moves)
    let mySymbol;
    if (gameState.moves === 0) {
      mySymbol = 'X';
    } else {
      // If last player used X, I use O (and vice versa)
      mySymbol = gameState.turn;
    }

    // Make the move
    const newBoard = [...gameState.board];
    newBoard[position] = mySymbol;
    const newMoves = gameState.moves + 1;
    const winner = checkTicTacToeWinner(newBoard);
    const nextTurn = mySymbol === 'X' ? 'O' : 'X';

    // Create payload
    const payload = createTicTacToePayload(
      newBoard,
      winner ? mySymbol : nextTurn,
      newMoves,
      winner
    );

    // Send message with game state
    let message = '';
    if (winner) {
      message = winner === mySymbol ? 'I win! 🎉' : 'Good game!';
      // Post to board
      postGameResult(myHandle, them, false, 'tic-tac-toe');
    } else if (newBoard.every(c => c)) {
      message = 'Draw! 🤝';
      // Post to board
      postGameResult(myHandle, them, true, 'tic-tac-toe');
    } else {
      message = `Played ${mySymbol} at position ${move}. Your turn!`;
    }

    await store.sendMessage(myHandle, them, message, 'dm', payload);

    return {
      display: `## Game with @${them}\n\n${formatPayload(payload)}\n\n${winner ? '🎉 You win!' : newBoard.every(c => c) ? '🤝 Draw!' : `Waiting for @${them}...`}`
    };
  }
}

module.exports = { definition, handler };