/**
 * Game Roulette - Discover random games from the /vibe workshop
 * Perfect for when you want to play something but don't know what!
 */

const arcade = require('./arcade');

// Game difficulty weights for smart recommendations
const DIFFICULTY_WEIGHTS = {
  'Easy': 0.4,
  'Medium': 0.4, 
  'Hard': 0.2
};

// Player count weights for recommendations
const PLAYER_WEIGHTS = {
  'Solo': 0.3,
  '1v1': 0.4,
  '1v2': 0.1,
  'Multiplayer': 0.2
};

// Create initial game roulette state
function createInitialGameRouletteState() {
  return {
    lastRecommendation: null,
    userPreferences: {},
    playHistory: [],
    sessionStarted: new Date().toISOString(),
    totalRecommendations: 0
  };
}

// Get a random game recommendation
function getRandomGame(gameState, userHandle = null, preferences = {}) {
  const { GAMES } = arcade;
  const gameIds = Object.keys(GAMES);
  
  // Apply preferences if provided
  let filteredGames = gameIds;
  
  if (preferences.difficulty) {
    filteredGames = filteredGames.filter(id => 
      GAMES[id].difficulty.toLowerCase() === preferences.difficulty.toLowerCase()
    );
  }
  
  if (preferences.category) {
    filteredGames = filteredGames.filter(id => 
      GAMES[id].category === preferences.category
    );
  }
  
  if (preferences.players) {
    filteredGames = filteredGames.filter(id => 
      GAMES[id].players === preferences.players
    );
  }
  
  // Avoid recommending the same game twice in a row
  if (gameState.lastRecommendation && filteredGames.length > 1) {
    filteredGames = filteredGames.filter(id => id !== gameState.lastRecommendation.id);
  }
  
  if (filteredGames.length === 0) {
    return { error: 'No games match your preferences!' };
  }
  
  // Pick random game
  const randomId = filteredGames[Math.floor(Math.random() * filteredGames.length)];
  const game = { id: randomId, ...GAMES[randomId] };
  
  // Update game state
  const newGameState = {
    ...gameState,
    lastRecommendation: game,
    totalRecommendations: gameState.totalRecommendations + 1,
    playHistory: [...gameState.playHistory.slice(-9), game] // Keep last 10
  };
  
  if (userHandle) {
    // Track user preferences
    newGameState.userPreferences[userHandle] = {
      ...gameState.userPreferences[userHandle],
      lastSeen: new Date().toISOString(),
      totalRequests: (gameState.userPreferences[userHandle]?.totalRequests || 0) + 1
    };
  }
  
  return { success: true, gameState: newGameState, recommendation: game };
}

// Get smart recommendation based on user history
function getSmartRecommendation(gameState, userHandle, mood = null) {
  const { GAMES, CATEGORIES } = arcade;
  
  // Mood-based filtering
  const moodCategories = {
    'chill': ['word', 'puzzle'],
    'competitive': ['classic', 'action'], 
    'social': ['social', 'creative'],
    'quick': ['classic', 'action'],
    'thoughtful': ['puzzle', 'word'],
    'creative': ['creative', 'social']
  };
  
  let preferences = {};
  if (mood && moodCategories[mood]) {
    preferences.categoryList = moodCategories[mood];
  }
  
  return getRecommendationWithFilters(gameState, userHandle, preferences);
}

// Get recommendation with advanced filters
function getRecommendationWithFilters(gameState, userHandle, filters = {}) {
  const { GAMES } = arcade;
  let candidateGames = Object.keys(GAMES);
  
  // Apply category list filter
  if (filters.categoryList) {
    candidateGames = candidateGames.filter(id => 
      filters.categoryList.includes(GAMES[id].category)
    );
  }
  
  // Apply other filters
  if (filters.difficulty) {
    candidateGames = candidateGames.filter(id => 
      GAMES[id].difficulty.toLowerCase() === filters.difficulty.toLowerCase()
    );
  }
  
  if (filters.maxPlayers && filters.maxPlayers < 4) {
    candidateGames = candidateGames.filter(id => 
      GAMES[id].players === 'Solo' || GAMES[id].players === '1v1'
    );
  }
  
  // Weighted random selection
  if (candidateGames.length > 1) {
    const weights = candidateGames.map(id => {
      const game = GAMES[id];
      let weight = 1.0;
      
      // Prefer easier games slightly
      if (game.difficulty === 'Easy') weight *= 1.2;
      else if (game.difficulty === 'Hard') weight *= 0.8;
      
      // Prefer variety - reduce weight if recently recommended
      const recentHistory = gameState.playHistory.slice(-3);
      if (recentHistory.some(h => h.id === id)) {
        weight *= 0.3;
      }
      
      return weight;
    });
    
    // Weighted random selection
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < candidateGames.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        const gameId = candidateGames[i];
        const game = { id: gameId, ...GAMES[gameId] };
        
        const newGameState = {
          ...gameState,
          lastRecommendation: game,
          totalRecommendations: gameState.totalRecommendations + 1,
          playHistory: [...gameState.playHistory.slice(-9), game]
        };
        
        return { success: true, gameState: newGameState, recommendation: game };
      }
    }
  }
  
  // Fallback to simple random
  return getRandomGame(gameState, userHandle, filters);
}

// Get games by current "vibe"
function getGamesByVibe(vibe) {
  const { GAMES } = arcade;
  const vibes = {
    'competitive': ['chess', 'tictactoe', 'multiplayer-tictactoe', 'quickduel', 'rockpaperscissors'],
    'social': ['storybuilder', 'drawing', 'twotruths', 'werewolf', 'wordassociation'],
    'solo': ['snake', 'memory', 'hangman', 'riddle', 'guessnumber', 'colorguess'],
    'quick': ['rockpaperscissors', 'guessnumber', 'colorguess', 'quickduel'],
    'creative': ['drawing', 'storybuilder'],
    'thinking': ['chess', 'riddle', 'twentyquestions', 'hangman'],
    'party': ['werewolf', 'twotruths', 'wordassociation', 'drawing']
  };
  
  const gameIds = vibes[vibe.toLowerCase()] || [];
  return gameIds.map(id => ({ id, ...GAMES[id] })).filter(g => g.name);
}

// Format roulette display
function formatRouletteDisplay(gameState, recommendation, userHandle = null) {
  if (!recommendation) {
    return 'Game Roulette ready! Spin the wheel to discover your next game!';
  }
  
  const { icon, name, description, category, players, difficulty } = recommendation;
  
  let display = `🎲 **GAME ROULETTE** 🎲\n\n`;
  display += `${icon} **${name}**\n\n`;
  display += `**Description:** ${description}\n`;
  display += `**Category:** ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
  display += `**Players:** ${players}\n`;
  display += `**Difficulty:** ${difficulty}\n\n`;
  
  // Add contextual launch instructions
  if (['tictactoe', 'chess'].includes(recommendation.id)) {
    display += `**How to play:** \`vibe game @username\` to challenge someone!\n`;
  } else if (recommendation.id === 'drawing') {
    display += `**How to play:** Join the collaborative canvas and start drawing!\n`;
  } else if (recommendation.id === 'arcade') {
    display += `**How to play:** Browse all games in the Workshop Arcade!\n`;
  } else {
    display += `**How to play:** Launch ${name} and dive in!\n`;
  }
  
  display += `\n🎯 **Feeling lucky?** Spin again for another recommendation!`;
  
  if (gameState.totalRecommendations > 1) {
    display += `\n\n*This is recommendation #${gameState.totalRecommendations} in your session*`;
  }
  
  return display;
}

// Get roulette statistics
function getRouletteStats(gameState) {
  const { playHistory, totalRecommendations } = gameState;
  
  if (playHistory.length === 0) {
    return null;
  }
  
  // Category distribution
  const categoryCount = {};
  const difficultyCount = {};
  const playerCount = {};
  
  for (const game of playHistory) {
    categoryCount[game.category] = (categoryCount[game.category] || 0) + 1;
    difficultyCount[game.difficulty] = (difficultyCount[game.difficulty] || 0) + 1;
    playerCount[game.players] = (playerCount[game.players] || 0) + 1;
  }
  
  const mostRecommendedCategory = Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a)[0];
    
  const mostRecommendedDifficulty = Object.entries(difficultyCount)
    .sort(([,a], [,b]) => b - a)[0];
  
  return {
    totalRecommendations,
    sessionGames: playHistory.length,
    favoriteCategory: mostRecommendedCategory ? mostRecommendedCategory[0] : null,
    favoriteDifficulty: mostRecommendedDifficulty ? mostRecommendedDifficulty[0] : null,
    categoryDistribution: categoryCount,
    difficultyDistribution: difficultyCount,
    playerDistribution: playerCount
  };
}

// Generate fun recommendation messages
function getRandomRouletteMessage() {
  const messages = [
    "🎲 The roulette wheel is spinning...",
    "🎯 Searching for your perfect game match...",
    "🎰 Rolling the dice of destiny...",
    "🔮 Consulting the gaming crystal ball...", 
    "🎪 Welcome to the game carnival!",
    "🚀 Launching game discovery sequence...",
    "🎨 Painting your gaming adventure...",
    "⚡ Generating gaming lightning in a bottle...",
    "🧩 Assembling your perfect game puzzle...",
    "🌟 Aligning the gaming stars for you..."
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}

module.exports = {
  createInitialGameRouletteState,
  getRandomGame,
  getSmartRecommendation,
  getRecommendationWithFilters,
  getGamesByVibe,
  formatRouletteDisplay,
  getRouletteStats,
  getRandomRouletteMessage
};