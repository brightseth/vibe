/**
 * Guess the Number game implementation for /vibe
 * Classic number guessing game with hints and difficulty levels
 */

// Create initial guess the number state
function createInitialGuessNumberState(difficulty = 'medium') {
  const ranges = {
    easy: { min: 1, max: 10 },
    medium: { min: 1, max: 50 },
    hard: { min: 1, max: 100 },
    extreme: { min: 1, max: 1000 }
  };
  
  const range = ranges[difficulty] || ranges.medium;
  const targetNumber = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  
  return {
    targetNumber: targetNumber,
    guesses: [],
    moves: 0,
    gameOver: false,
    won: false,
    difficulty: difficulty,
    range: range,
    hints: []
  };
}

// Make a guess
function makeGuess(gameState, guess) {
  const { targetNumber, guesses, moves, gameOver, range } = gameState;
  
  // Parse guess as number
  const guessNumber = parseInt(guess);
  
  // Validate guess
  if (isNaN(guessNumber)) {
    return { error: 'Please enter a valid number!' };
  }
  
  if (guessNumber < range.min || guessNumber > range.max) {
    return { error: `Please guess a number between ${range.min} and ${range.max}!` };
  }
  
  // Check if already guessed
  if (guesses.includes(guessNumber)) {
    return { error: `You already guessed ${guessNumber}! Try a different number.` };
  }
  
  // Check if game is already over
  if (gameOver) {
    return { error: 'Game is over! Start a new game to play again.' };
  }
  
  // Process the guess
  const newGuesses = [...guesses, guessNumber];
  const newMoves = moves + 1;
  let hint = '';
  let won = false;
  
  if (guessNumber === targetNumber) {
    // Correct guess!
    won = true;
    hint = '🎯 Perfect! You got it!';
  } else if (guessNumber < targetNumber) {
    // Too low
    const diff = targetNumber - guessNumber;
    if (diff <= 2) {
      hint = '📈 Very close! Go a bit higher!';
    } else if (diff <= 5) {
      hint = '📈 Close! Too low, but getting warmer!';
    } else if (diff <= 10) {
      hint = '📈 Too low! Go higher!';
    } else {
      hint = '📈 Way too low! Much higher!';
    }
  } else {
    // Too high
    const diff = guessNumber - targetNumber;
    if (diff <= 2) {
      hint = '📉 Very close! Go a bit lower!';
    } else if (diff <= 5) {
      hint = '📉 Close! Too high, but getting warmer!';
    } else if (diff <= 10) {
      hint = '📉 Too high! Go lower!';
    } else {
      hint = '📉 Way too high! Much lower!';
    }
  }
  
  const newHints = [...gameState.hints, hint];
  const newGameOver = won;
  
  const newGameState = {
    ...gameState,
    guesses: newGuesses,
    moves: newMoves,
    gameOver: newGameOver,
    won: won,
    hints: newHints,
    lastGuess: guessNumber,
    lastHint: hint
  };
  
  return { success: true, gameState: newGameState };
}

// Format display for guess the number game
function formatGuessNumberDisplay(gameState) {
  const { guesses, moves, gameOver, won, difficulty, range, lastGuess, lastHint, targetNumber } = gameState;
  
  let display = `🔢 **Guess the Number** (${difficulty}) - Move ${moves}\n\n`;
  
  // Show range
  display += `**Range:** ${range.min} - ${range.max}\n\n`;
  
  // Show latest guess and hint
  if (lastGuess) {
    display += `**Last guess:** ${lastGuess}\n`;
    if (lastHint) {
      display += `**Hint:** ${lastHint}\n\n`;
    }
  }
  
  // Show all guesses in order
  if (guesses.length > 0) {
    display += `**Your guesses:** ${guesses.join(', ')}\n\n`;
  }
  
  // Show game status
  if (gameOver) {
    if (won) {
      display += `🎉 **Congratulations!** You guessed ${targetNumber} in ${moves} tries!\n\n`;
      
      // Add performance feedback
      const maxOptimal = Math.ceil(Math.log2(range.max - range.min + 1));
      if (moves <= maxOptimal) {
        display += '⭐ **Excellent strategy!** You used optimal guessing!';
      } else if (moves <= maxOptimal + 2) {
        display += '👍 **Great job!** Very efficient guessing!';
      } else if (moves <= maxOptimal + 5) {
        display += '👌 **Not bad!** Room for improvement with binary search!';
      } else {
        display += '🎯 **You got there!** Try narrowing down with middle numbers next time!';
      }
    }
  } else {
    display += '**Keep guessing! You can do it! 🎯**';
    
    // Give strategic hint after several guesses
    if (moves >= 3 && moves % 3 === 0) {
      display += '\n\n💡 **Tip:** Try guessing numbers in the middle of your remaining range!';
    }
  }
  
  return display;
}

// Get optimal strategy hint
function getStrategyHint(gameState) {
  const { guesses, range } = gameState;
  
  if (guesses.length === 0) {
    const middle = Math.floor((range.min + range.max) / 2);
    return `Try starting with ${middle} (middle of the range) for optimal strategy!`;
  }
  
  // Find remaining range based on guesses
  let min = range.min;
  let max = range.max;
  
  guesses.forEach(guess => {
    const hints = gameState.hints;
    const hintIndex = guesses.indexOf(guess);
    if (hints[hintIndex]) {
      if (hints[hintIndex].includes('higher') || hints[hintIndex].includes('low')) {
        min = Math.max(min, guess + 1);
      } else if (hints[hintIndex].includes('lower') || hints[hintIndex].includes('high')) {
        max = Math.min(max, guess - 1);
      }
    }
  });
  
  if (min >= max) {
    return 'Keep going! You\'re very close!';
  }
  
  const middle = Math.floor((min + max) / 2);
  return `Try ${middle} (middle of ${min}-${max} range)`;
}

// Get difficulty info
function getDifficultyInfo() {
  return {
    easy: { range: '1-10', description: 'Perfect for beginners' },
    medium: { range: '1-50', description: 'Good balance of challenge and fun' },
    hard: { range: '1-100', description: 'Classic number guessing challenge' },
    extreme: { range: '1-1000', description: 'For the truly brave!' }
  };
}

module.exports = {
  createInitialGuessNumberState,
  makeGuess,
  formatGuessNumberDisplay,
  getStrategyHint,
  getDifficultyInfo
};