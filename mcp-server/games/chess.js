/**
 * Chess game implementation for /vibe
 * Supports standard chess rules with algebraic notation
 */

// Chess piece values for basic evaluation
const PIECE_VALUES = {
  'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 0,
  'p': -1, 'n': -3, 'b': -3, 'r': -5, 'q': -9, 'k': 0
};

// Initial chess board setup
const INITIAL_BOARD = [
  ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
  ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['', '', '', '', '', '', '', ''],
  ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
  ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

// Convert file letters to indices
function fileToIndex(file) {
  return file.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
}

function indexToFile(index) {
  return String.fromCharCode(97 + index);
}

// Convert rank numbers to indices (rank 1 = index 7, rank 8 = index 0)
function rankToIndex(rank) {
  return 8 - parseInt(rank);
}

function indexToRank(index) {
  return (8 - index).toString();
}

// Parse algebraic notation to board coordinates
function parseAlgebraicNotation(notation, board, isWhiteTurn) {
  // Remove check/checkmate indicators
  const move = notation.replace(/[+#]$/, '');
  
  // Handle castling
  if (move === 'O-O' || move === '0-0') {
    return isWhiteTurn ? 
      { from: [7, 4], to: [7, 6], type: 'castle-short' } :
      { from: [0, 4], to: [0, 6], type: 'castle-short' };
  }
  if (move === 'O-O-O' || move === '0-0-0') {
    return isWhiteTurn ? 
      { from: [7, 4], to: [7, 2], type: 'castle-long' } :
      { from: [0, 4], to: [0, 2], type: 'castle-long' };
  }

  // Handle pawn moves (no piece letter)
  if (/^[a-h][1-8]$/.test(move)) {
    // Simple pawn move like e4
    const toFile = fileToIndex(move[0]);
    const toRank = rankToIndex(move[1]);
    const fromRank = isWhiteTurn ? toRank + 1 : toRank - 1;
    
    // Check if it's a valid pawn move
    if (fromRank >= 0 && fromRank < 8 && board[fromRank][toFile] === (isWhiteTurn ? 'P' : 'p')) {
      return { from: [fromRank, toFile], to: [toRank, toFile], type: 'move' };
    }
    
    // Check for double pawn move
    const doubleFromRank = isWhiteTurn ? 6 : 1;
    if (board[doubleFromRank][toFile] === (isWhiteTurn ? 'P' : 'p') && board[toRank][toFile] === '') {
      return { from: [doubleFromRank, toFile], to: [toRank, toFile], type: 'move' };
    }
  }

  // Handle pawn captures like exd5
  if (/^[a-h]x[a-h][1-8]$/.test(move)) {
    const fromFile = fileToIndex(move[0]);
    const toFile = fileToIndex(move[2]);
    const toRank = rankToIndex(move[3]);
    const fromRank = isWhiteTurn ? toRank + 1 : toRank - 1;
    
    if (fromRank >= 0 && fromRank < 8 && board[fromRank][fromFile] === (isWhiteTurn ? 'P' : 'p')) {
      return { from: [fromRank, fromFile], to: [toRank, toFile], type: 'capture' };
    }
  }

  // Handle piece moves like Nf3, Bb5, etc.
  const pieceMatch = move.match(/^([NBRQK])([a-h]?[1-8]?)(x?)([a-h][1-8])$/);
  if (pieceMatch) {
    const piece = isWhiteTurn ? pieceMatch[1] : pieceMatch[1].toLowerCase();
    const disambiguator = pieceMatch[2];
    const isCapture = pieceMatch[3] === 'x';
    const toSquare = pieceMatch[4];
    const toFile = fileToIndex(toSquare[0]);
    const toRank = rankToIndex(toSquare[1]);

    // Find the piece that can make this move
    const possibleMoves = findPieceLocations(board, piece);
    const validFromSquares = possibleMoves.filter(([fromRank, fromFile]) => {
      return canPieceMove(board, piece, fromRank, fromFile, toRank, toFile);
    });

    // Apply disambiguator if provided
    if (disambiguator) {
      if (/[a-h]/.test(disambiguator)) {
        const disambiguatorFile = fileToIndex(disambiguator);
        return validFromSquares.find(([r, f]) => f === disambiguatorFile);
      } else if (/[1-8]/.test(disambiguator)) {
        const disambiguatorRank = rankToIndex(disambiguator);
        return validFromSquares.find(([r, f]) => r === disambiguatorRank);
      }
    }

    if (validFromSquares.length === 1) {
      return { 
        from: validFromSquares[0], 
        to: [toRank, toFile], 
        type: isCapture ? 'capture' : 'move' 
      };
    }
  }

  return null; // Invalid notation
}

// Find all locations of a specific piece on the board
function findPieceLocations(board, piece) {
  const locations = [];
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      if (board[rank][file] === piece) {
        locations.push([rank, file]);
      }
    }
  }
  return locations;
}

// Check if a piece can legally move from one square to another
function canPieceMove(board, piece, fromRank, fromFile, toRank, toFile) {
  const pieceType = piece.toLowerCase();
  const dx = toFile - fromFile;
  const dy = toRank - fromRank;

  switch (pieceType) {
    case 'p': // Pawn
      const direction = piece === 'P' ? -1 : 1;
      const startRank = piece === 'P' ? 6 : 1;
      
      // Forward move
      if (dx === 0) {
        if (dy === direction && board[toRank][toFile] === '') return true;
        if (fromRank === startRank && dy === 2 * direction && board[toRank][toFile] === '') return true;
      }
      // Capture
      if (Math.abs(dx) === 1 && dy === direction) {
        const targetPiece = board[toRank][toFile];
        return targetPiece !== '' && isOpponentPiece(piece, targetPiece);
      }
      return false;

    case 'r': // Rook
      if (dx === 0 || dy === 0) {
        return isPathClear(board, fromRank, fromFile, toRank, toFile);
      }
      return false;

    case 'n': // Knight
      return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || 
             (Math.abs(dx) === 1 && Math.abs(dy) === 2);

    case 'b': // Bishop
      if (Math.abs(dx) === Math.abs(dy)) {
        return isPathClear(board, fromRank, fromFile, toRank, toFile);
      }
      return false;

    case 'q': // Queen
      if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) {
        return isPathClear(board, fromRank, fromFile, toRank, toFile);
      }
      return false;

    case 'k': // King
      return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;

    default:
      return false;
  }
}

// Check if path between two squares is clear
function isPathClear(board, fromRank, fromFile, toRank, toFile) {
  const dx = toFile - fromFile;
  const dy = toRank - fromRank;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  
  const stepX = dx === 0 ? 0 : dx / Math.abs(dx);
  const stepY = dy === 0 ? 0 : dy / Math.abs(dy);

  for (let i = 1; i < steps; i++) {
    const checkRank = fromRank + stepY * i;
    const checkFile = fromFile + stepX * i;
    if (board[checkRank][checkFile] !== '') {
      return false;
    }
  }

  return true;
}

// Check if two pieces are opponents
function isOpponentPiece(piece1, piece2) {
  return (piece1 >= 'A' && piece1 <= 'Z') !== (piece2 >= 'A' && piece2 <= 'Z');
}

// Check if a piece is white
function isWhitePiece(piece) {
  return piece >= 'A' && piece <= 'Z';
}

// Find king position
function findKing(board, isWhite) {
  const king = isWhite ? 'K' : 'k';
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      if (board[rank][file] === king) {
        return [rank, file];
      }
    }
  }
  return null;
}

// Check if a square is attacked by opponent
function isSquareAttacked(board, rank, file, byWhite) {
  // Check all opponent pieces
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (!piece) continue;
      if (isWhitePiece(piece) !== byWhite) continue;

      // Check if this piece can attack the target square
      if (canPieceMove(board, piece, r, f, rank, file)) {
        return true;
      }
    }
  }
  return false;
}

// Check if king is in check
function isKingInCheck(board, isWhiteKing) {
  const kingPos = findKing(board, isWhiteKing);
  if (!kingPos) return false;
  return isSquareAttacked(board, kingPos[0], kingPos[1], !isWhiteKing);
}

// Get all legal moves for a player
function getAllLegalMoves(board, isWhiteTurn) {
  const moves = [];

  for (let fromRank = 0; fromRank < 8; fromRank++) {
    for (let fromFile = 0; fromFile < 8; fromFile++) {
      const piece = board[fromRank][fromFile];
      if (!piece) continue;
      if (isWhitePiece(piece) !== isWhiteTurn) continue;

      // Try all possible destination squares
      for (let toRank = 0; toRank < 8; toRank++) {
        for (let toFile = 0; toFile < 8; toFile++) {
          if (fromRank === toRank && fromFile === toFile) continue;

          // Check if piece can move there
          if (!canPieceMove(board, piece, fromRank, fromFile, toRank, toFile)) continue;

          // Check if destination has own piece
          const destPiece = board[toRank][toFile];
          if (destPiece && isWhitePiece(destPiece) === isWhiteTurn) continue;

          // Simulate move and check if king is still in check
          const testBoard = board.map(row => [...row]);
          testBoard[toRank][toFile] = piece;
          testBoard[fromRank][fromFile] = '';

          if (!isKingInCheck(testBoard, isWhiteTurn)) {
            moves.push({
              from: [fromRank, fromFile],
              to: [toRank, toFile],
              piece
            });
          }
        }
      }
    }
  }

  return moves;
}

// Check for checkmate or stalemate
function getGameEndState(board, isWhiteTurn) {
  const legalMoves = getAllLegalMoves(board, isWhiteTurn);
  const inCheck = isKingInCheck(board, isWhiteTurn);

  if (legalMoves.length === 0) {
    if (inCheck) {
      return { checkmate: true, winner: isWhiteTurn ? 'black' : 'white' };
    } else {
      return { stalemate: true };
    }
  }

  return { check: inCheck };
}

// Convert move to algebraic notation
function moveToAlgebraicNotation(board, move) {
  const { from, to, piece } = move;
  const [fromRank, fromFile] = from;
  const [toRank, toFile] = to;
  
  const toSquare = indexToFile(toFile) + indexToRank(toRank);
  const isCapture = board[toRank][toFile] !== '';
  
  if (piece.toLowerCase() === 'p') {
    if (isCapture) {
      return indexToFile(fromFile) + 'x' + toSquare;
    } else {
      return toSquare;
    }
  } else {
    const pieceSymbol = piece.toUpperCase();
    const captureSymbol = isCapture ? 'x' : '';
    return pieceSymbol + captureSymbol + toSquare;
  }
}

// Create initial chess state
function createInitialChessState() {
  return {
    board: INITIAL_BOARD.map(row => [...row]),
    turn: 'white',
    moves: 0,
    history: [],
    check: false,
    checkmate: false,
    stalemate: false,
    winner: null
  };
}

// Format chess board for display
function formatChessBoard(board, lastMove = null) {
  const files = '  a b c d e f g h';
  let display = '```\n' + files + '\n';
  
  for (let rank = 0; rank < 8; rank++) {
    let row = (8 - rank) + ' ';
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      const symbol = piece || (rank + file) % 2 === 0 ? '·' : ' ';
      row += symbol + ' ';
    }
    row += (8 - rank);
    display += row + '\n';
  }
  
  display += files + '\n```';
  return display;
}

// Make a move on the chess board
function makeMove(gameState, moveNotation) {
  const { board, turn, moves, history } = gameState;
  const isWhiteTurn = turn === 'white';
  
  const parsedMove = parseAlgebraicNotation(moveNotation, board, isWhiteTurn);
  if (!parsedMove) {
    return { error: 'Invalid move notation' };
  }

  const { from, to, type } = parsedMove;
  const [fromRank, fromFile] = from;
  const [toRank, toFile] = to;
  
  // Get the piece being moved
  const piece = board[fromRank][fromFile];
  if (!piece) {
    return { error: 'No piece at source square' };
  }

  // Check if it's the correct player's piece
  const isPieceWhite = piece >= 'A' && piece <= 'Z';
  if (isPieceWhite !== isWhiteTurn) {
    return { error: 'Not your piece' };
  }

  // Create new board state
  const newBoard = board.map(row => [...row]);
  newBoard[fromRank][fromFile] = '';
  newBoard[toRank][toFile] = piece;

  // Handle castling
  if (type === 'castle-short') {
    const rookFromFile = 7;
    const rookToFile = 5;
    const rankIndex = isWhiteTurn ? 7 : 0;
    newBoard[rankIndex][rookFromFile] = '';
    newBoard[rankIndex][rookToFile] = isWhiteTurn ? 'R' : 'r';
  } else if (type === 'castle-long') {
    const rookFromFile = 0;
    const rookToFile = 3;
    const rankIndex = isWhiteTurn ? 7 : 0;
    newBoard[rankIndex][rookFromFile] = '';
    newBoard[rankIndex][rookToFile] = isWhiteTurn ? 'R' : 'r';
  }

  // Check game end state for opponent
  const nextPlayerIsWhite = !isWhiteTurn;
  const endState = getGameEndState(newBoard, nextPlayerIsWhite);

  const newGameState = {
    board: newBoard,
    turn: isWhiteTurn ? 'black' : 'white',
    moves: moves + 1,
    history: [...history, moveNotation],
    check: endState.check || false,
    checkmate: endState.checkmate || false,
    stalemate: endState.stalemate || false,
    winner: endState.winner || null,
    lastMove: { from, to, notation: moveNotation }
  };

  return { success: true, gameState: newGameState };
}

module.exports = {
  createInitialChessState,
  makeMove,
  formatChessBoard,
  parseAlgebraicNotation,
  moveToAlgebraicNotation,
  isKingInCheck,
  getAllLegalMoves,
  getGameEndState
};