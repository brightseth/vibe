/**
 * Rock Paper Scissors game implementation for /vibe
 * Classic hand game with emoji display and best-of-series support
 */

// Game choices and their emojis
const CHOICES = {
  rock: { emoji: '🪨', beats: 'scissors', name: 'Rock' },
  paper: { emoji: '📄', beats: 'rock', name: 'Paper' },
  scissors: { emoji: '✂️', beats: 'paper', name: 'Scissors' }
};

// Battle animations for different outcomes
const BATTLE_ANIMATIONS = {
  rock_scissors: '🪨 crushes ✂️',
  paper_rock: '📄 covers 🪨',
  scissors_paper: '✂️ cuts 📄',
  scissors_rock: '✂️ breaks against 🪨',
  rock_paper: '🪨 gets covered by 📄',
  paper_scissors: '📄 gets cut by ✂️'
};

// Victory messages
const VICTORY_MESSAGES = [
  'Victory! 🎉',
  'Nice one! 🔥',
  'You got it! ⚡',
  'Well played! 🌟',
  'Boom! 💥'
];

const DEFEAT_MESSAGES = [
  'Not this time! 😅',
  'So close! 🤷',
  'Next round! 💪',
  'Almost! 🎯',
  'Good try! 👍'
];

// Get random choice for AI opponent
function getRandomChoice() {
  const choices = Object.keys(CHOICES);
  return choices[Math.floor(Math.random() * choices.length)];
}

// Create initial game state
function createInitialRPSState(bestOf = 1) {
  return {
    bestOf: bestOf,
    playerScore: 0,
    opponentScore: 0,
    rounds: [],
    gameOver: false,
    winner: null,
    currentRound: 1,
    waitingForMove: true,
    gameType: 'rps' // rock paper scissors
  };
}

// Determine winner of a single round
function determineRoundWinner(playerChoice, opponentChoice) {
  if (playerChoice === opponentChoice) {
    return 'tie';
  }
  
  return CHOICES[playerChoice].beats === opponentChoice ? 'player' : 'opponent';
}

// Make a move in the game
function makeMove(gameState, playerMove, opponentMove = null) {
  const { bestOf, playerScore, opponentScore, rounds, currentRound } = gameState;
  
  // Validate player move
  const normalizedPlayerMove = playerMove.toLowerCase().trim();
  if (!CHOICES[normalizedPlayerMove]) {
    return { error: 'Invalid choice! Use: rock, paper, or scissors' };
  }
  
  // Check if game is already over
  if (gameState.gameOver) {
    return { error: 'Game is over! Start a new game to play again.' };
  }
  
  // Generate opponent move if not provided (for AI games)
  const opponentChoice = opponentMove || getRandomChoice();
  const playerChoice = normalizedPlayerMove;
  
  // Determine round winner
  const roundResult = determineRoundWinner(playerChoice, opponentChoice);
  
  // Create round record
  const roundData = {
    round: currentRound,
    playerChoice,
    opponentChoice,
    result: roundResult,
    animation: roundResult === 'tie' ? 
      `${CHOICES[playerChoice].emoji} vs ${CHOICES[opponentChoice].emoji} - Tie!` :
      roundResult === 'player' ?
        BATTLE_ANIMATIONS[`${playerChoice}_${opponentChoice}`] :
        BATTLE_ANIMATIONS[`${opponentChoice}_${playerChoice}`]
  };
  
  // Update scores
  let newPlayerScore = playerScore;
  let newOpponentScore = opponentScore;
  
  if (roundResult === 'player') {
    newPlayerScore++;
  } else if (roundResult === 'opponent') {
    newOpponentScore++;
  }
  
  // Check if game is over (first to win majority of bestOf rounds)
  const roundsToWin = Math.ceil(bestOf / 2);
  const gameOver = newPlayerScore >= roundsToWin || newOpponentScore >= roundsToWin;
  
  let winner = null;
  if (gameOver) {
    winner = newPlayerScore > newOpponentScore ? 'player' : 'opponent';
  }
  
  const newGameState = {
    ...gameState,
    playerScore: newPlayerScore,
    opponentScore: newOpponentScore,
    rounds: [...rounds, roundData],
    currentRound: currentRound + 1,
    gameOver: gameOver,
    winner: winner,
    waitingForMove: !gameOver,
    lastRound: roundData
  };
  
  return { success: true, gameState: newGameState };
}

// Format game display
function formatRPSDisplay(gameState, opponentName = 'Computer') {
  const { bestOf, playerScore, opponentScore, rounds, gameOver, winner, currentRound, lastRound } = gameState;
  
  let display = `🎮 **Rock Paper Scissors**`;
  
  if (bestOf > 1) {
    display += ` (Best of ${bestOf})\n`;
  } else {
    display += '\n';
  }
  
  display += `**Score:** You ${playerScore} - ${opponentScore} ${opponentName}\n\n`;
  
  // Show last round result if exists
  if (lastRound) {
    display += `**Round ${lastRound.round} Result:**\n`;
    display += `${lastRound.animation}\n\n`;
    
    if (lastRound.result === 'player') {
      display += `${VICTORY_MESSAGES[Math.floor(Math.random() * VICTORY_MESSAGES.length)]}\n`;
    } else if (lastRound.result === 'opponent') {
      display += `${DEFEAT_MESSAGES[Math.floor(Math.random() * DEFEAT_MESSAGES.length)]}\n`;
    } else {
      display += `It's a tie! 🤝\n`;
    }
    display += '\n';
  }
  
  // Show game status
  if (gameOver) {
    if (winner === 'player') {
      display += `🏆 **YOU WIN THE GAME!** 🏆\n`;
      display += `Congratulations! You beat ${opponentName} ${playerScore}-${opponentScore}!\n`;
    } else if (winner === 'opponent') {
      display += `💀 **GAME OVER** 💀\n`;
      display += `${opponentName} wins ${opponentScore}-${playerScore}. Better luck next time!\n`;
    }
    display += '\nStart a new game to play again!';
  } else {
    display += `**Round ${currentRound}** - Make your choice!\n`;
    display += `🪨 Rock  📄 Paper  ✂️ Scissors\n`;
    display += `\nType your move: rock, paper, or scissors`;
  }
  
  // Show round history for longer games
  if (rounds.length > 1 && bestOf > 1) {
    display += `\n\n**Round History:**\n`;
    rounds.slice(-3).forEach(round => {
      const result = round.result === 'player' ? '✅' : round.result === 'opponent' ? '❌' : '🤝';
      display += `R${round.round}: ${CHOICES[round.playerChoice].emoji} vs ${CHOICES[round.opponentChoice].emoji} ${result}\n`;
    });
  }
  
  return display;
}

// Get move from text input
function parseMove(input) {
  const normalized = input.toLowerCase().trim();
  
  // Support various aliases
  const aliases = {
    r: 'rock',
    rock: 'rock',
    stone: 'rock',
    
    p: 'paper',
    paper: 'paper',
    
    s: 'scissors',
    scissors: 'scissors',
    scissor: 'scissors'
  };
  
  return aliases[normalized] || null;
}

// Create a multiplayer game state (for player vs player)
function createMultiplayerRPSState(bestOf = 1) {
  return {
    ...createInitialRPSState(bestOf),
    gameType: 'rps_multiplayer',
    player1Move: null,
    player2Move: null,
    waitingForBoth: true,
    waitingForMove: false // Different for multiplayer
  };
}

// Make multiplayer move
function makeMultiplayerMove(gameState, playerId, move) {
  if (gameState.gameOver) {
    return { error: 'Game is over! Start a new game to play again.' };
  }
  
  const parsedMove = parseMove(move);
  if (!parsedMove) {
    return { error: 'Invalid choice! Use: rock, paper, or scissors' };
  }
  
  const newGameState = { ...gameState };
  
  if (playerId === 1) {
    if (newGameState.player1Move) {
      return { error: 'You already made your move this round!' };
    }
    newGameState.player1Move = parsedMove;
  } else {
    if (newGameState.player2Move) {
      return { error: 'You already made your move this round!' };
    }
    newGameState.player2Move = parsedMove;
  }
  
  // Check if both players have moved
  if (newGameState.player1Move && newGameState.player2Move) {
    // Process the round
    const result = makeMove({
      ...newGameState,
      gameType: 'rps' // Temporarily treat as single player for processing
    }, newGameState.player1Move, newGameState.player2Move);
    
    if (result.success) {
      const processedState = result.gameState;
      newGameState.playerScore = processedState.playerScore;
      newGameState.opponentScore = processedState.opponentScore;
      newGameState.rounds = processedState.rounds;
      newGameState.currentRound = processedState.currentRound;
      newGameState.gameOver = processedState.gameOver;
      newGameState.winner = processedState.winner;
      newGameState.lastRound = processedState.lastRound;
      
      // Reset for next round
      newGameState.player1Move = null;
      newGameState.player2Move = null;
      newGameState.waitingForBoth = !processedState.gameOver;
    }
  }
  
  return { success: true, gameState: newGameState };
}

module.exports = {
  createInitialRPSState,
  createMultiplayerRPSState,
  makeMove,
  makeMultiplayerMove,
  formatRPSDisplay,
  parseMove,
  getRandomChoice,
  CHOICES
};