/**
 * Memory Pattern Game implementation for /vibe
 * Challenge your memory with increasingly complex emoji sequences!
 * Like Simon Says but with colorful emojis - perfect for quick brain training
 */

// Available pattern emojis - visually distinct and memorable
const PATTERN_EMOJIS = ['🔴', '🟡', '🟢', '🔵', '🟣', '🟠', '⚫', '⚪'];

// Difficulty levels affect sequence length and speed
const DIFFICULTY_LEVELS = {
  easy: {
    name: 'Easy',
    emoji: '🟢',
    startLength: 3,
    maxLength: 6,
    emojiCount: 4, // Use fewer emojis
    description: 'Short sequences, 4 colors'
  },
  medium: {
    name: 'Medium', 
    emoji: '🟡',
    startLength: 4,
    maxLength: 8,
    emojiCount: 6,
    description: 'Medium sequences, 6 colors'
  },
  hard: {
    name: 'Hard',
    emoji: '🔴',
    startLength: 5,
    maxLength: 10,
    emojiCount: 8,
    description: 'Long sequences, all 8 colors'
  }
};

// Fun encouragement messages
const ENCOURAGEMENT = [
  "Great memory! 🧠", "You're on fire! 🔥", "Excellent recall! ⭐",
  "Perfect! 💫", "Amazing focus! 🎯", "Memory master! 👑",
  "Brilliant! ✨", "Outstanding! 🌟", "Incredible! 🚀"
];

const WRONG_MESSAGES = [
  "Close, but not quite! 🤔", "Almost had it! 💭", "Good try! 🎯",
  "So close! 😅", "Keep practicing! 💪", "Nearly perfect! 🌟"
];

// Create initial memory game state
function createInitialMemoryState(difficulty = 'medium') {
  const difficultyConfig = DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS.medium;
  const availableEmojis = PATTERN_EMOJIS.slice(0, difficultyConfig.emojiCount);
  
  // Generate first pattern
  const pattern = generatePattern(availableEmojis, difficultyConfig.startLength);
  
  return {
    difficulty: difficulty,
    difficultyConfig: difficultyConfig,
    availableEmojis: availableEmojis,
    currentPattern: pattern,
    playerInput: [],
    level: 1,
    score: 0,
    gameOver: false,
    won: false,
    showingPattern: true,
    inputPhase: false,
    consecutiveCorrect: 0,
    totalCorrect: 0,
    totalAttempts: 0,
    startTime: Date.now(),
    lastResult: null,
    maxLevelReached: 1
  };
}

// Generate a random pattern of emojis
function generatePattern(availableEmojis, length) {
  const pattern = [];
  for (let i = 0; i < length; i++) {
    const randomEmoji = availableEmojis[Math.floor(Math.random() * availableEmojis.length)];
    pattern.push(randomEmoji);
  }
  return pattern;
}

// Start the input phase (player can now enter their guess)
function startInput(gameState) {
  if (gameState.gameOver) {
    return { error: 'Game is over! Start a new game to play again.' };
  }
  
  if (!gameState.showingPattern) {
    return { error: 'Already in input phase! Enter your pattern guess.' };
  }
  
  return {
    success: true,
    gameState: {
      ...gameState,
      showingPattern: false,
      inputPhase: true,
      playerInput: []
    }
  };
}

// Submit the complete pattern guess
function submitPattern(gameState, patternInput) {
  if (gameState.gameOver) {
    return { error: 'Game is over! Start a new game to play again.' };
  }
  
  if (gameState.showingPattern) {
    return { error: 'Wait for the input phase! Use `/game memory --input` first.' };
  }
  
  if (!patternInput || typeof patternInput !== 'string') {
    return { error: 'Please enter your pattern guess!' };
  }
  
  // Parse input - could be space-separated, comma-separated, or just concatenated
  let inputEmojis;
  if (patternInput.includes(' ')) {
    inputEmojis = patternInput.split(' ').filter(e => e.trim().length > 0);
  } else if (patternInput.includes(',')) {
    inputEmojis = patternInput.split(',').map(e => e.trim()).filter(e => e.length > 0);
  } else {
    // Try to split emoji string (this is tricky, but we'll try character by character)
    inputEmojis = Array.from(patternInput).filter(char => 
      PATTERN_EMOJIS.includes(char)
    );
  }
  
  // Validate input emojis
  const invalidEmojis = inputEmojis.filter(emoji => !gameState.availableEmojis.includes(emoji));
  if (invalidEmojis.length > 0) {
    const validEmojis = gameState.availableEmojis.join(' ');
    return { error: `Invalid emojis: ${invalidEmojis.join(' ')}. Use only: ${validEmojis}` };
  }
  
  // Check if pattern matches
  const correct = arraysEqual(inputEmojis, gameState.currentPattern);
  const newTotalAttempts = gameState.totalAttempts + 1;
  const newTotalCorrect = correct ? gameState.totalCorrect + 1 : gameState.totalCorrect;
  const newConsecutiveCorrect = correct ? gameState.consecutiveCorrect + 1 : 0;
  
  let newGameState = {
    ...gameState,
    playerInput: inputEmojis,
    totalAttempts: newTotalAttempts,
    totalCorrect: newTotalCorrect,
    consecutiveCorrect: newConsecutiveCorrect,
    lastResult: correct ? 'correct' : 'wrong',
    inputPhase: false
  };
  
  if (correct) {
    // Correct! Advance to next level
    const newLevel = gameState.level + 1;
    const newScore = gameState.score + (gameState.level * 10); // More points for harder levels
    const maxLevelReached = Math.max(gameState.maxLevelReached, newLevel);
    
    // Check if we've reached the maximum length for this difficulty
    const maxLength = gameState.difficultyConfig.maxLength;
    if (gameState.currentPattern.length >= maxLength) {
      // Won the game!
      newGameState = {
        ...newGameState,
        gameOver: true,
        won: true,
        score: newScore,
        level: newLevel,
        maxLevelReached: maxLevelReached,
        endTime: Date.now()
      };
    } else {
      // Generate next pattern (slightly longer)
      const nextLength = Math.min(
        gameState.currentPattern.length + 1,
        maxLength
      );
      const nextPattern = generatePattern(gameState.availableEmojis, nextLength);
      
      newGameState = {
        ...newGameState,
        currentPattern: nextPattern,
        level: newLevel,
        score: newScore,
        maxLevelReached: maxLevelReached,
        showingPattern: true,
        playerInput: []
      };
    }
  } else {
    // Wrong! Game over
    newGameState = {
      ...newGameState,
      gameOver: true,
      won: false,
      endTime: Date.now()
    };
  }
  
  return { success: true, gameState: newGameState };
}

// Helper function to compare arrays
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Get a random encouragement message
function getRandomEncouragement() {
  return ENCOURAGEMENT[Math.floor(Math.random() * ENCOURAGEMENT.length)];
}

function getRandomWrongMessage() {
  return WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];
}

// Format memory game for display
function formatMemoryDisplay(gameState) {
  const { 
    difficulty, difficultyConfig, currentPattern, playerInput, level, score, 
    gameOver, won, showingPattern, inputPhase, lastResult, consecutiveCorrect,
    totalCorrect, totalAttempts, maxLevelReached, endTime, startTime
  } = gameState;
  
  let display = `🧠 **Memory Pattern Challenge** ${difficultyConfig.emoji} ${difficultyConfig.name.toUpperCase()}\n\n`;
  
  // Show level and score
  display += `**Level ${level}** • Score: ${score} • Streak: ${consecutiveCorrect}\n\n`;
  
  // Game result
  if (gameOver) {
    if (won) {
      display += `🏆 **CONGRATULATIONS! YOU WON!** 🏆\n`;
      display += `You completed all ${maxLevelReached - 1} levels! ${getRandomEncouragement()}\n\n`;
    } else {
      display += `💥 **Game Over!** ${getRandomWrongMessage()}\n`;
      display += `You reached level ${maxLevelReached} • Max sequence: ${currentPattern.length}\n\n`;
    }
    
    // Show final stats
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    const timeSeconds = Math.round((endTime - startTime) / 1000);
    display += `**Final Stats:**\n`;
    display += `• Accuracy: ${accuracy}% (${totalCorrect}/${totalAttempts})\n`;
    display += `• Time: ${timeSeconds} seconds\n`;
    display += `• Max Level: ${maxLevelReached}\n\n`;
    
    display += `Start a new game to try again!\n`;
    return display;
  }
  
  // Show pattern or input phase
  if (showingPattern) {
    display += `**🔍 MEMORIZE THIS PATTERN:**\n`;
    display += `${currentPattern.join(' ')}\n\n`;
    display += `**Sequence length:** ${currentPattern.length}\n`;
    display += `*Study it carefully, then use \`/game memory --input\` when ready!*\n`;
  } else if (inputPhase) {
    display += `**🎯 INPUT PHASE**\n`;
    display += `Enter the pattern you just saw!\n\n`;
    display += `**Available emojis:** ${gameState.availableEmojis.join(' ')}\n`;
    display += `**Expected length:** ${currentPattern.length}\n\n`;
    
    if (playerInput.length > 0) {
      display += `**Your input so far:** ${playerInput.join(' ')}\n`;
    }
    
    display += `*Use: \`/game memory --pattern "🔴 🟡 🟢"\` (space-separated)*\n`;
  } else {
    // Show result of last attempt
    if (lastResult === 'correct') {
      display += `✅ **Correct!** ${getRandomEncouragement()}\n`;
      display += `You got: ${playerInput.join(' ')}\n`;
      display += `Next pattern coming up...\n\n`;
      
      display += `**🔍 MEMORIZE THIS PATTERN:**\n`;
      display += `${currentPattern.join(' ')}\n\n`;
      display += `**Sequence length:** ${currentPattern.length}\n`;
      display += `*Study it, then use \`/game memory --input\` when ready!*\n`;
    } else if (lastResult === 'wrong') {
      display += `❌ **Incorrect!** ${getRandomWrongMessage()}\n`;
      display += `You entered: ${playerInput.join(' ')}\n`;
      display += `Correct was: ${currentPattern.join(' ')}\n\n`;
    }
  }
  
  // Show difficulty info
  display += `\n**Difficulty:** ${difficultyConfig.description}\n`;
  
  return display;
}

// Get available difficulties
function getDifficulties() {
  return Object.entries(DIFFICULTY_LEVELS).map(([key, config]) => ({
    key,
    name: config.name,
    emoji: config.emoji,
    description: config.description
  }));
}

// Get game statistics
function getMemoryStats(gameState) {
  const { level, score, consecutiveCorrect, totalCorrect, totalAttempts, maxLevelReached } = gameState;
  
  return {
    level,
    score,
    consecutiveCorrect,
    totalCorrect,
    totalAttempts,
    accuracy: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0,
    maxLevelReached
  };
}

module.exports = {
  createInitialMemoryState,
  startInput,
  submitPattern,
  formatMemoryDisplay,
  getDifficulties,
  getMemoryStats,
  PATTERN_EMOJIS,
  DIFFICULTY_LEVELS
};