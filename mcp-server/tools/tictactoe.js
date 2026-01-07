/**
 * Tic-Tac-Toe tool - Play against AI with different difficulty levels
 * 
 * Usage:
 * vibe tictactoe --difficulty easy (start new game)
 * vibe tictactoe --move 5 (make move)
 * vibe tictactoe (show current game)
 */

const config = require('../config');
const store = require('../store');
const { 
  createInitialTicTacToeState, 
  makeMove, 
  makeAIMove, 
  formatTicTacToeDisplay,
  getDifficultyDescription
} = require('../games/tictactoe');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_tictactoe',
  description: 'Play tic-tac-toe against AI with different difficulty levels (easy, medium, hard)',
  inputSchema: {
    type: 'object',
    properties: {
      difficulty: {
        type: 'string',
        description: 'AI difficulty level',
        enum: ['easy', 'medium', 'hard']
      },
      move: {
        type: 'number',
        description: 'Position to play (1-9)',
        minimum: 1,
        maximum: 9
      },
      reset: {
        type: 'boolean',
        description: 'Reset/start new game'
      }
    },
    required: []
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { difficulty, move, reset } = args;
  const myHandle = config.getHandle();
  
  // Get or create game state from memory
  let gameState = await store.getMemory(myHandle, 'tictactoe_game');
  
  // Start new game if requested, no game exists, or game is over
  if (reset || !gameState || gameState.gameOver) {
    const newDifficulty = difficulty || 'medium';
    gameState = createInitialTicTacToeState(newDifficulty);
    await store.setMemory(myHandle, 'tictactoe_game', gameState);
    
    return {
      display: `🎯 **New Tic-Tac-Toe Game Started!**\n\n${getDifficultyDescription(newDifficulty)}\n\n${formatTicTacToeDisplay(gameState)}\n\n💡 Use \`vibe tictactoe --move N\` to play position 1-9`
    };
  }
  
  // Show current game if no move specified
  if (move === undefined) {
    let display = `🎯 **Current Tic-Tac-Toe Game**\n\n${formatTicTacToeDisplay(gameState)}`;
    
    if (gameState.gameOver) {
      display += `\n\n💡 Use \`vibe tictactoe --reset\` to start a new game`;
      display += `\n💡 Use \`vibe tictactoe --difficulty hard\` to start with different difficulty`;
    } else {
      display += `\n\n💡 Use \`vibe tictactoe --move N\` to play position 1-9`;
    }
    
    return { display };
  }
  
  // Check if game is over
  if (gameState.gameOver) {
    return {
      display: `🎯 **Game Over!**\n\n${formatTicTacToeDisplay(gameState)}\n\n💡 Use \`vibe tictactoe --reset\` to start a new game`
    };
  }
  
  // Check if it's player's turn
  if (gameState.turn !== gameState.playerSymbol) {
    return {
      display: `⏳ **Not your turn!**\n\n${formatTicTacToeDisplay(gameState)}\n\nWait for AI to move.`
    };
  }
  
  // Make player move
  const playerMoveResult = makeMove(gameState, move, gameState.playerSymbol);
  
  if (playerMoveResult.error) {
    return {
      display: `❌ **Invalid move:** ${playerMoveResult.error}\n\n${formatTicTacToeDisplay(gameState)}\n\n💡 Choose an empty position (1-9)`
    };
  }
  
  gameState = playerMoveResult.gameState;
  
  // Check if game ended after player move
  if (gameState.gameOver) {
    await store.setMemory(myHandle, 'tictactoe_game', gameState);
    
    let endMessage = '';
    if (gameState.winner === gameState.playerSymbol) {
      endMessage = `🎉 **Congratulations! You won!**`;
    } else if (gameState.isDraw) {
      endMessage = `🤝 **It's a draw!** Well played!`;
    }
    
    return {
      display: `${endMessage}\n\n${formatTicTacToeDisplay(gameState)}\n\n💡 Use \`vibe tictactoe --reset\` to start a new game`
    };
  }
  
  // Make AI move
  const aiMoveResult = makeAIMove(gameState);
  
  if (aiMoveResult.error) {
    return {
      display: `🤖 **AI Error:** ${aiMoveResult.error}\n\n${formatTicTacToeDisplay(gameState)}`
    };
  }
  
  gameState = aiMoveResult.gameState;
  
  // Save game state
  await store.setMemory(myHandle, 'tictactoe_game', gameState);
  
  // Check if game ended after AI move
  let endMessage = '';
  if (gameState.gameOver) {
    if (gameState.winner === gameState.aiSymbol) {
      endMessage = `🤖 **AI wins!** Try again!\n\n`;
    } else if (gameState.isDraw) {
      endMessage = `🤝 **It's a draw!** Good game!\n\n`;
    }
    endMessage += `💡 Use \`vibe tictactoe --reset\` to start a new game`;
  } else {
    endMessage = `💡 Your turn! Use \`vibe tictactoe --move N\` to play position 1-9`;
  }
  
  return {
    display: `🎯 **Move Complete**\n\n${formatTicTacToeDisplay(gameState)}\n\n${endMessage}`
  };
}

module.exports = { definition, handler };