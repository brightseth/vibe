/**
 * Riddle Game implementation for /vibe
 * Challenge your mind with classic riddles and brain teasers!
 * Features multiple difficulty levels and hint system
 */

// Riddle database organized by difficulty
const RIDDLES = {
  easy: [
    {
      question: "What has keys but no locks, space but no room, and you can enter but not go inside?",
      answer: "keyboard",
      hints: ["It's something you use with computers", "It has letters and numbers on it", "You type on it"],
      category: "technology"
    },
    {
      question: "What gets wet while drying?",
      answer: "towel",
      hints: ["It's found in bathrooms", "You use it after a shower", "It absorbs water"],
      category: "household"
    },
    {
      question: "What goes up but never comes down?",
      answer: "age",
      hints: ["It's something everyone has", "It changes every year", "Time affects it"],
      category: "abstract"
    },
    {
      question: "What has hands but cannot clap?",
      answer: "clock",
      hints: ["You look at it to tell time", "It's usually round", "It has numbers on it"],
      category: "objects"
    },
    {
      question: "What can you break without touching it?",
      answer: "promise",
      hints: ["It's not a physical object", "People make these to each other", "Trust is involved"],
      category: "abstract"
    }
  ],
  
  medium: [
    {
      question: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
      answer: "map",
      hints: ["I show locations", "I'm flat and can be folded", "Travelers use me for directions"],
      category: "objects"
    },
    {
      question: "The more you take, the more you leave behind. What am I?",
      answer: "footsteps",
      hints: ["You make me when you walk", "I'm left on the ground", "Animals make me too"],
      category: "abstract"
    },
    {
      question: "What belongs to you but is used more by others?",
      answer: "name",
      hints: ["It identifies you", "People call you by it", "It's on your ID"],
      category: "abstract"
    },
    {
      question: "I'm light as a feather, yet the strongest person can't hold me for 5 minutes. What am I?",
      answer: "breath",
      hints: ["You do it automatically", "It's essential for life", "You can hold it temporarily"],
      category: "body"
    },
    {
      question: "What runs around a house but doesn't move?",
      answer: "fence",
      hints: ["It surrounds property", "It marks boundaries", "It's often made of wood or metal"],
      category: "household"
    }
  ],
  
  hard: [
    {
      question: "I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?",
      answer: "echo",
      hints: ["You hear me in mountains", "I repeat what you say", "I'm a sound phenomenon"],
      category: "nature"
    },
    {
      question: "What can travel around the world while staying in a corner?",
      answer: "stamp",
      hints: ["I'm found on mail", "I have pictures and values", "I help letters reach destinations"],
      category: "objects"
    },
    {
      question: "I have a golden head and a golden tail, but no body. What am I?",
      answer: "coin",
      hints: ["I have value", "You find me in wallets", "I'm made of metal"],
      category: "objects"
    },
    {
      question: "What disappears as soon as you say its name?",
      answer: "silence",
      hints: ["It's the absence of something", "Libraries try to maintain it", "Speaking breaks it"],
      category: "abstract"
    },
    {
      question: "I can be cracked, made, told, and played. What am I?",
      answer: "joke",
      hints: ["I make people laugh", "Comedians tell me", "I can be funny or bad"],
      category: "entertainment"
    }
  ],
  
  expert: [
    {
      question: "What has roots as nobody sees, is taller than trees, up, up it goes, and yet never grows?",
      answer: "mountain",
      hints: ["I touch the sky", "I'm made of rock", "Climbers try to reach my peak"],
      category: "nature"
    },
    {
      question: "Alive without breath, as cold as death, never thirsty, ever drinking, all in mail never clinking.",
      answer: "fish",
      hints: ["I live underwater", "I have scales", "I breathe through gills"],
      category: "animals"
    },
    {
      question: "What is so fragile that saying its name breaks it?",
      answer: "silence",
      hints: ["It's the absence of sound", "Libraries cherish it", "Even a whisper destroys it"],
      category: "abstract"
    },
    {
      question: "I am not seen, cannot be felt, cannot be heard, cannot be smelt. I lie behind stars and under hills, and empty holes I fill. What am I?",
      answer: "darkness",
      hints: ["I exist without light", "I'm everywhere at night", "I hide things from view"],
      category: "abstract"
    }
  ]
};

// Create initial riddle game state
function createInitialRiddleState(difficulty = 'medium') {
  const availableRiddles = RIDDLES[difficulty] || RIDDLES.medium;
  const selectedRiddle = availableRiddles[Math.floor(Math.random() * availableRiddles.length)];
  
  return {
    difficulty: difficulty,
    currentRiddle: selectedRiddle,
    guesses: [],
    hintsUsed: 0,
    moves: 0,
    gameOver: false,
    won: false,
    startTime: Date.now(),
    maxHints: selectedRiddle.hints.length
  };
}

// Make a guess at the riddle
function makeGuess(gameState, guess) {
  const { currentRiddle, guesses, moves, gameOver } = gameState;
  
  // Validate input
  if (!guess || typeof guess !== 'string') {
    return { error: 'Please enter your guess!' };
  }
  
  if (gameOver) {
    return { error: 'Game is over! Start a new riddle to play again.' };
  }
  
  // Normalize guess and answer for comparison
  const normalizedGuess = guess.toLowerCase().trim();
  const normalizedAnswer = currentRiddle.answer.toLowerCase().trim();
  
  // Check if already guessed
  if (guesses.some(g => g.toLowerCase() === normalizedGuess)) {
    return { error: `You already guessed "${guess}". Try something different!` };
  }
  
  const newGuesses = [...guesses, guess];
  const newMoves = moves + 1;
  const won = normalizedGuess === normalizedAnswer;
  const gameOver = won;
  
  // Calculate final time if won
  const endTime = won ? Date.now() : null;
  const timeToSolve = won ? Math.round((endTime - gameState.startTime) / 1000) : null;
  
  const newGameState = {
    ...gameState,
    guesses: newGuesses,
    moves: newMoves,
    gameOver: gameOver,
    won: won,
    lastGuess: guess,
    endTime: endTime,
    timeToSolve: timeToSolve
  };
  
  return { success: true, gameState: newGameState };
}

// Get a hint for the current riddle
function getHint(gameState) {
  const { currentRiddle, hintsUsed, gameOver } = gameState;
  
  if (gameOver) {
    return { error: 'Game is over! The answer was already revealed.' };
  }
  
  if (hintsUsed >= currentRiddle.hints.length) {
    return { error: 'No more hints available! You\'ve used all of them.' };
  }
  
  const hint = currentRiddle.hints[hintsUsed];
  const newGameState = {
    ...gameState,
    hintsUsed: hintsUsed + 1,
    lastHint: hint
  };
  
  return { success: true, gameState: newGameState, hint: hint };
}

// Skip to next riddle (same difficulty)
function skipRiddle(gameState) {
  const { difficulty, currentRiddle } = gameState;
  const availableRiddles = RIDDLES[difficulty] || RIDDLES.medium;
  
  // Find a different riddle
  let newRiddle;
  do {
    newRiddle = availableRiddles[Math.floor(Math.random() * availableRiddles.length)];
  } while (newRiddle.question === currentRiddle.question && availableRiddles.length > 1);
  
  return createInitialRiddleState(difficulty);
}

// Format riddle display
function formatRiddleDisplay(gameState) {
  const { difficulty, currentRiddle, guesses, hintsUsed, moves, gameOver, won, timeToSolve, lastGuess, lastHint } = gameState;
  
  const difficultyEmoji = {
    'easy': '🟢',
    'medium': '🟡', 
    'hard': '🔴',
    'expert': '💀'
  };
  
  let display = `🧩 **Riddle Challenge** ${difficultyEmoji[difficulty] || '🟡'} ${difficulty.toUpperCase()}\n\n`;
  
  // Show the riddle question
  display += `**The Riddle:**\n*${currentRiddle.question}*\n\n`;
  
  // Show hints if any have been used
  if (hintsUsed > 0) {
    display += `**Hints used (${hintsUsed}/${currentRiddle.hints.length}):**\n`;
    for (let i = 0; i < hintsUsed; i++) {
      display += `${i + 1}. ${currentRiddle.hints[i]}\n`;
    }
    display += '\n';
  }
  
  // Show recent guess feedback
  if (lastGuess && !won) {
    display += `**Last guess:** "${lastGuess}" ❌\n`;
    display += `*Not quite right, keep thinking!*\n\n`;
  }
  
  // Show all previous guesses
  if (guesses.length > 0 && !won) {
    display += `**Your guesses:** ${guesses.join(', ')}\n\n`;
  }
  
  // Show game result
  if (gameOver) {
    if (won) {
      display += `🎉 **Congratulations!** \n`;
      display += `**Answer:** ${currentRiddle.answer}\n`;
      display += `**Solved in:** ${moves} guesses`;
      if (timeToSolve) {
        display += ` and ${timeToSolve} seconds`;
      }
      display += '\n';
      
      // Performance feedback
      if (moves === 1) {
        display += '⭐ **Amazing!** First try! Are you a mind reader?';
      } else if (moves <= 3) {
        display += '🔥 **Excellent!** Great logical thinking!';
      } else if (moves <= 5) {
        display += '👍 **Well done!** You figured it out!';
      } else {
        display += '🎯 **You got it!** Persistence pays off!';
      }
      
      if (hintsUsed === 0) {
        display += '\n💎 **Bonus:** Solved without hints! Impressive!';
      }
    }
  } else {
    display += `**Status:** Thinking... (${moves} guesses)\n`;
    display += `**Hints available:** ${currentRiddle.hints.length - hintsUsed} remaining\n\n`;
    display += '💭 *Take your time and think carefully!*';
  }
  
  return display;
}

// Get available difficulties with descriptions
function getDifficultyInfo() {
  return {
    easy: {
      description: '🟢 **EASY**: Simple riddles to warm up your brain',
      riddles: RIDDLES.easy.length
    },
    medium: {
      description: '🟡 **MEDIUM**: Classic riddles that require some thinking',
      riddles: RIDDLES.medium.length
    },
    hard: {
      description: '🔴 **HARD**: Challenging riddles for puzzle enthusiasts',
      riddles: RIDDLES.hard.length
    },
    expert: {
      description: '💀 **EXPERT**: Mind-bending riddles for the brave',
      riddles: RIDDLES.expert.length
    }
  };
}

// Get riddle statistics
function getRiddleStats() {
  let totalRiddles = 0;
  let byCategory = {};
  
  Object.values(RIDDLES).forEach(difficultyRiddles => {
    totalRiddles += difficultyRiddles.length;
    difficultyRiddles.forEach(riddle => {
      byCategory[riddle.category] = (byCategory[riddle.category] || 0) + 1;
    });
  });
  
  return {
    total: totalRiddles,
    byDifficulty: Object.fromEntries(
      Object.entries(RIDDLES).map(([diff, riddles]) => [diff, riddles.length])
    ),
    byCategory
  };
}

// Get a random riddle for testing/preview
function getRandomRiddle(difficulty = null) {
  if (difficulty && RIDDLES[difficulty]) {
    const riddles = RIDDLES[difficulty];
    return riddles[Math.floor(Math.random() * riddles.length)];
  }
  
  // Random from all difficulties
  const allRiddles = Object.values(RIDDLES).flat();
  return allRiddles[Math.floor(Math.random() * allRiddles.length)];
}

module.exports = {
  createInitialRiddleState,
  makeGuess,
  getHint,
  skipRiddle,
  formatRiddleDisplay,
  getDifficultyInfo,
  getRiddleStats,
  getRandomRiddle,
  RIDDLES
};