/**
 * Workshop Arcade - A game launcher showcasing all /vibe games
 * Central hub for discovering and launching games
 */

// All available games in the workshop
const GAMES = {
  // Classic games
  'tictactoe': {
    name: 'Tic-Tac-Toe',
    description: 'Classic 3x3 grid game. Get three in a row!',
    category: 'classic',
    players: '1v1',
    icon: '⭕',
    difficulty: 'Easy'
  },
  'chess': {
    name: 'Chess',
    description: 'The royal game. Master the 64 squares!',
    category: 'classic',
    players: '1v1',
    icon: '♟️',
    difficulty: 'Hard'
  },
  'hangman': {
    name: 'Hangman',
    description: 'Guess the word letter by letter before time runs out!',
    category: 'word',
    players: 'Solo',
    icon: '🎯',
    difficulty: 'Medium'
  },
  'wordchain': {
    name: 'Word Chain',
    description: 'Build a chain of words that connect letter by letter',
    category: 'word',
    players: '1v1',
    icon: '🔗',
    difficulty: 'Medium'
  },
  'twentyquestions': {
    name: 'Twenty Questions',
    description: 'Guess what I\'m thinking in 20 questions or less!',
    category: 'puzzle',
    players: 'Solo',
    icon: '❓',
    difficulty: 'Medium'
  },
  'wordassociation': {
    name: 'Word Association',
    description: 'Quick-fire word connections. Say the first thing you think!',
    category: 'word',
    players: '1v1',
    icon: '💭',
    difficulty: 'Easy'
  },
  
  // Action games
  'snake': {
    name: 'Snake',
    description: 'Guide your snake to eat food and grow longer!',
    category: 'action',
    players: 'Solo',
    icon: '🐍',
    difficulty: 'Medium'
  },
  'rockpaperscissors': {
    name: 'Rock Paper Scissors',
    description: 'The ultimate hand game. Best of 3 wins!',
    category: 'classic',
    players: '1v1',
    icon: '✂️',
    difficulty: 'Easy'
  },
  
  // Memory & puzzle games
  'memory': {
    name: 'Memory Match',
    description: 'Flip cards and find matching pairs!',
    category: 'puzzle',
    players: 'Solo',
    icon: '🧠',
    difficulty: 'Medium'
  },
  'riddle': {
    name: 'Riddle Master',
    description: 'Solve clever riddles and brain teasers!',
    category: 'puzzle',
    players: 'Solo',
    icon: '🧩',
    difficulty: 'Hard'
  },
  'guessnumber': {
    name: 'Number Guessing',
    description: 'I\'m thinking of a number... can you guess it?',
    category: 'puzzle',
    players: 'Solo',
    icon: '🔢',
    difficulty: 'Easy'
  },
  'colorguess': {
    name: 'Color Guess',
    description: 'Guess the secret color combination!',
    category: 'puzzle',
    players: 'Solo',
    icon: '🌈',
    difficulty: 'Medium'
  },
  
  // Multiplayer games
  'drawing': {
    name: 'Collaborative Drawing',
    description: 'Draw together on a shared canvas in real-time!',
    category: 'creative',
    players: 'Multiplayer',
    icon: '🎨',
    difficulty: 'Easy'
  },
  'storybuilder': {
    name: 'Story Builder',
    description: 'Create stories together, one sentence at a time!',
    category: 'creative',
    players: 'Multiplayer',
    icon: '📚',
    difficulty: 'Easy'
  },
  'werewolf': {
    name: 'Werewolf',
    description: 'Social deduction game. Who can you trust?',
    category: 'social',
    players: '4-12',
    icon: '🐺',
    difficulty: 'Hard'
  },
  'twotruths': {
    name: 'Two Truths & A Lie',
    description: 'Share three statements - which one is fake?',
    category: 'social',
    players: '2+',
    icon: '🤔',
    difficulty: 'Easy'
  },
  'quickduel': {
    name: 'Quick Duel',
    description: 'Fast-paced competitive challenges!',
    category: 'action',
    players: '1v1',
    icon: '⚔️',
    difficulty: 'Medium'
  },
  'multiplayer-tictactoe': {
    name: 'Multiplayer Tic-Tac-Toe',
    description: 'Classic tic-tac-toe with room system for multiple games!',
    category: 'classic',
    players: '1v1',
    icon: '🎮',
    difficulty: 'Easy'
  }
};

// Game categories
const CATEGORIES = {
  'classic': { name: 'Classic Games', icon: '🎲', description: 'Timeless favorites' },
  'word': { name: 'Word Games', icon: '📝', description: 'Test your vocabulary' },
  'puzzle': { name: 'Puzzle Games', icon: '🧩', description: 'Brain teasers and logic' },
  'action': { name: 'Action Games', icon: '⚡', description: 'Fast-paced challenges' },
  'creative': { name: 'Creative Games', icon: '🎨', description: 'Express yourself' },
  'social': { name: 'Social Games', icon: '👥', description: 'Fun with friends' }
};

// Create initial arcade state
function createInitialArcadeState() {
  return {
    view: 'main', // main, category, game-info
    selectedCategory: null,
    selectedGame: null,
    totalGames: Object.keys(GAMES).length,
    lastAction: null
  };
}

// Navigate to a category
function navigateToCategory(gameState, category) {
  if (!CATEGORIES[category]) {
    return { error: 'Category not found!' };
  }
  
  const newGameState = {
    ...gameState,
    view: 'category',
    selectedCategory: category,
    selectedGame: null,
    lastAction: `browsing ${CATEGORIES[category].name}`
  };
  
  return { success: true, gameState: newGameState };
}

// Navigate to game info
function navigateToGame(gameState, gameId) {
  if (!GAMES[gameId]) {
    return { error: 'Game not found!' };
  }
  
  const newGameState = {
    ...gameState,
    view: 'game-info',
    selectedGame: gameId,
    lastAction: `viewing ${GAMES[gameId].name}`
  };
  
  return { success: true, gameState: newGameState };
}

// Go back to main menu
function navigateBack(gameState) {
  const newGameState = {
    ...gameState,
    view: 'main',
    selectedCategory: null,
    selectedGame: null,
    lastAction: 'returned to main menu'
  };
  
  return { success: true, gameState: newGameState };
}

// Get games by category
function getGamesByCategory(category) {
  return Object.entries(GAMES)
    .filter(([id, game]) => game.category === category)
    .map(([id, game]) => ({ id, ...game }));
}

// Format arcade display
function formatArcadeDisplay(gameState) {
  const { view, selectedCategory, selectedGame, totalGames } = gameState;
  
  let display = '';
  
  if (view === 'main') {
    // Main arcade menu
    display += '🎮 **WORKSHOP ARCADE** 🎮\n\n';
    display += `*Welcome to the /vibe game collection!*\n`;
    display += `**${totalGames} games available** • Built by @games-agent\n\n`;
    
    display += '**📂 GAME CATEGORIES**\n';
    
    Object.entries(CATEGORIES).forEach(([id, category]) => {
      const gameCount = getGamesByCategory(id).length;
      display += `${category.icon} **${category.name}** (${gameCount} games)\n`;
      display += `   *${category.description}*\n\n`;
    });
    
    display += '**🎯 QUICK PICKS**\n';
    display += '⭕ Tic-Tac-Toe • ♟️ Chess • 🎯 Hangman • 🐍 Snake\n\n';
    
    display += '*Type a category name or game name to explore!*\n';
    display += '*Examples: `classic`, `chess`, `hangman`*';
    
  } else if (view === 'category') {
    // Category view
    const category = CATEGORIES[selectedCategory];
    const games = getGamesByCategory(selectedCategory);
    
    display += `${category.icon} **${category.name.toUpperCase()}**\n\n`;
    display += `*${category.description}* • ${games.length} games\n\n`;
    
    games.forEach(game => {
      display += `${game.icon} **${game.name}**\n`;
      display += `   *${game.description}*\n`;
      display += `   Players: ${game.players} • Difficulty: ${game.difficulty}\n\n`;
    });
    
    display += '*Type a game name to learn more, or `back` for main menu*';
    
  } else if (view === 'game-info') {
    // Game info view
    const game = GAMES[selectedGame];
    
    display += `${game.icon} **${game.name.toUpperCase()}**\n\n`;
    display += `**Description:** ${game.description}\n`;
    display += `**Category:** ${CATEGORIES[game.category].name}\n`;
    display += `**Players:** ${game.players}\n`;
    display += `**Difficulty:** ${game.difficulty}\n\n`;
    
    // How to play instructions based on game type
    if (['tictactoe', 'chess'].includes(selectedGame)) {
      display += '**How to play:**\n';
      display += `Use \`vibe game @username\` to start playing with someone!\n\n`;
    } else if (selectedGame === 'drawing') {
      display += '**How to play:**\n';
      display += 'Join the collaborative drawing canvas - just start drawing!\n\n';
    } else if (selectedGame === 'hangman') {
      display += '**How to play:**\n';
      display += 'Guess letters one at a time to reveal the hidden word!\n\n';
    } else {
      display += '**How to play:**\n';
      display += `Launch ${game.name} to start playing!\n\n`;
    }
    
    display += '*Type `back` for category menu, `main` for arcade home*';
  }
  
  return display;
}

// Handle arcade commands
function handleArcadeCommand(gameState, command) {
  const cmd = command.toLowerCase().trim();
  
  // Navigation commands
  if (cmd === 'back') {
    if (gameState.view === 'game-info') {
      // From game info, go back to category
      return navigateToCategory(gameState, gameState.selectedCategory);
    } else if (gameState.view === 'category') {
      // From category, go back to main
      return navigateBack(gameState);
    } else {
      return { error: 'Already at main menu!' };
    }
  }
  
  if (cmd === 'main' || cmd === 'home') {
    return navigateBack(gameState);
  }
  
  // Check if command is a category
  if (CATEGORIES[cmd]) {
    return navigateToCategory(gameState, cmd);
  }
  
  // Check if command is a game
  if (GAMES[cmd]) {
    return navigateToGame(gameState, cmd);
  }
  
  // Check for partial matches
  const categoryMatches = Object.keys(CATEGORIES).filter(cat => 
    cat.includes(cmd) || CATEGORIES[cat].name.toLowerCase().includes(cmd)
  );
  
  if (categoryMatches.length === 1) {
    return navigateToCategory(gameState, categoryMatches[0]);
  }
  
  const gameMatches = Object.keys(GAMES).filter(id => 
    id.includes(cmd) || GAMES[id].name.toLowerCase().includes(cmd)
  );
  
  if (gameMatches.length === 1) {
    return navigateToGame(gameState, gameMatches[0]);
  }
  
  // No matches found
  let suggestions = [];
  if (categoryMatches.length > 1) {
    suggestions.push(`Categories: ${categoryMatches.join(', ')}`);
  }
  if (gameMatches.length > 1) {
    suggestions.push(`Games: ${gameMatches.slice(0, 3).join(', ')}`);
  }
  
  const errorMsg = suggestions.length > 0 
    ? `Multiple matches found!\n${suggestions.join('\n')}`
    : 'Command not found! Try a category name (like `classic`) or game name (like `chess`).';
  
  return { error: errorMsg };
}

// Get random game recommendation
function getRandomRecommendation() {
  const gameIds = Object.keys(GAMES);
  const randomId = gameIds[Math.floor(Math.random() * gameIds.length)];
  return { id: randomId, ...GAMES[randomId] };
}

// Get games by difficulty
function getGamesByDifficulty(difficulty) {
  return Object.entries(GAMES)
    .filter(([id, game]) => game.difficulty.toLowerCase() === difficulty.toLowerCase())
    .map(([id, game]) => ({ id, ...game }));
}

// Get multiplayer games
function getMultiplayerGames() {
  return Object.entries(GAMES)
    .filter(([id, game]) => game.players !== 'Solo')
    .map(([id, game]) => ({ id, ...game }));
}

module.exports = {
  createInitialArcadeState,
  navigateToCategory,
  navigateToGame,
  navigateBack,
  handleArcadeCommand,
  formatArcadeDisplay,
  getGamesByCategory,
  getRandomRecommendation,
  getGamesByDifficulty,
  getMultiplayerGames,
  GAMES,
  CATEGORIES
};