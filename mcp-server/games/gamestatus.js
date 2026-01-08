/**
 * Game Status Checker - See what games are available and what's happening
 * Helps users discover games and find active sessions to join
 */

// Import arcade data for game information
const { GAMES, CATEGORIES } = require('./arcade');

// Create initial game status state
function createInitialGameStatusState() {
  return {
    view: 'overview', // 'overview', 'category', 'active'
    selectedCategory: null,
    lastChecked: new Date().toISOString(),
    refreshCount: 0
  };
}

// Get overview of all available games
function getGameOverview() {
  const totalGames = Object.keys(GAMES).length;
  const categoryCounts = {};
  
  // Count games by category
  Object.values(GAMES).forEach(game => {
    categoryCounts[game.category] = (categoryCounts[game.category] || 0) + 1;
  });
  
  // Count by player type
  const playerTypes = {
    solo: 0,
    multiplayer: 0,
    versus: 0
  };
  
  Object.values(GAMES).forEach(game => {
    if (game.players === 'Solo') {
      playerTypes.solo++;
    } else if (game.players.includes('v1') || game.players === '1v1') {
      playerTypes.versus++;
    } else {
      playerTypes.multiplayer++;
    }
  });
  
  return {
    totalGames,
    categoryCounts,
    playerTypes
  };
}

// Get featured games (popular/recommended)
function getFeaturedGames() {
  // Hand-picked selection of great games to try
  const featured = [
    'tictactoe', // Classic and simple
    'chess', // Strategic depth
    'drawing', // Creative collaboration
    'pixelart', // Artistic fun
    'hangman', // Word game classic
    'wordchain', // Interactive word game
    'snake', // Action-packed
    'werewolf', // Social deduction
    'twentyquestions' // Interactive guessing
  ];
  
  return featured
    .filter(id => GAMES[id]) // Make sure game exists
    .map(id => ({ id, ...GAMES[id] }));
}

// Get games by difficulty level
function getGamesByDifficulty(difficulty) {
  return Object.entries(GAMES)
    .filter(([id, game]) => game.difficulty.toLowerCase() === difficulty.toLowerCase())
    .map(([id, game]) => ({ id, ...game }));
}

// Get games suitable for quick play (easy/medium difficulty)
function getQuickPlayGames() {
  return Object.entries(GAMES)
    .filter(([id, game]) => ['Easy', 'Medium'].includes(game.difficulty))
    .map(([id, game]) => ({ id, ...game }));
}

// Get games by player count preference
function getGamesByPlayerType(playerType) {
  const filters = {
    solo: game => game.players === 'Solo',
    competitive: game => game.players.includes('v1') || game.players === '1v1',
    multiplayer: game => !game.players.includes('Solo') && !game.players.includes('v1'),
    any: () => true
  };
  
  const filter = filters[playerType] || filters.any;
  
  return Object.entries(GAMES)
    .filter(([id, game]) => filter(game))
    .map(([id, game]) => ({ id, ...game }));
}

// Format game status display
function formatGameStatusDisplay(gameState) {
  const { view, selectedCategory, refreshCount } = gameState;
  const overview = getGameOverview();
  
  let display = '';
  
  if (view === 'overview') {
    // Main game status overview
    display += '🎮 **GAME STATUS & DISCOVERY**\n\n';
    display += `**📊 Overview** • Refresh #${refreshCount + 1}\n`;
    display += `**${overview.totalGames} games available** in the Workshop Arcade\n\n`;
    
    // Category breakdown
    display += '**📂 Games by Category:**\n';
    Object.entries(overview.categoryCounts).forEach(([category, count]) => {
      const categoryInfo = CATEGORIES[category];
      if (categoryInfo) {
        display += `${categoryInfo.icon} ${categoryInfo.name}: **${count} games**\n`;
      }
    });
    display += '\n';
    
    // Player type breakdown
    display += '**👥 Games by Player Type:**\n';
    display += `🎯 Solo games: **${overview.playerTypes.solo}**\n`;
    display += `⚔️ 1v1 competitive: **${overview.playerTypes.versus}**\n`;
    display += `👥 Multiplayer: **${overview.playerTypes.multiplayer}**\n\n`;
    
    // Featured games
    const featured = getFeaturedGames();
    display += '**⭐ Featured Games (Great to Try):**\n';
    featured.slice(0, 6).forEach(game => {
      display += `${game.icon} **${game.name}** (${game.players}) - ${game.description}\n`;
    });
    display += '\n';
    
    // Quick recommendations
    display += '**🚀 Quick Recommendations:**\n';
    display += '• **New to games?** Try Tic-Tac-Toe or Number Guessing\n';
    display += '• **Want creativity?** Check out Collaborative Drawing or Pixel Art\n';
    display += '• **Like words?** Try Hangman, Word Chain, or Twenty Questions\n';
    display += '• **Social fun?** Werewolf or Two Truths & A Lie are great with friends\n\n';
    
    display += '**💡 Commands:**\n';
    display += '• Type `arcade` or `games` to launch the full Workshop Arcade\n';
    display += '• Type `easy`, `medium`, or `hard` to filter by difficulty\n';
    display += '• Type `solo`, `competitive`, or `multiplayer` to filter by type\n';
    display += '• Type `refresh` to update this status\n';
    
  } else if (view === 'category') {
    // Category-specific view (if implemented)
    const categoryInfo = CATEGORIES[selectedCategory];
    display += `${categoryInfo.icon} **${categoryInfo.name.toUpperCase()}**\n\n`;
    display += `*${categoryInfo.description}*\n\n`;
    
    const categoryGames = Object.entries(GAMES)
      .filter(([id, game]) => game.category === selectedCategory)
      .map(([id, game]) => ({ id, ...game }));
      
    categoryGames.forEach(game => {
      display += `${game.icon} **${game.name}** (${game.players})\n`;
      display += `   *${game.description}*\n\n`;
    });
  }
  
  return display;
}

// Handle game status commands
function handleGameStatusCommand(gameState, command) {
  const cmd = command.toLowerCase().trim();
  
  // Refresh command
  if (cmd === 'refresh' || cmd === 'update') {
    return {
      success: true,
      gameState: {
        ...gameState,
        lastChecked: new Date().toISOString(),
        refreshCount: gameState.refreshCount + 1
      }
    };
  }
  
  // Difficulty filters
  if (['easy', 'medium', 'hard'].includes(cmd)) {
    const games = getGamesByDifficulty(cmd);
    let response = `🎯 **${cmd.toUpperCase()} DIFFICULTY GAMES**\n\n`;
    
    games.forEach(game => {
      response += `${game.icon} **${game.name}** (${game.players})\n`;
      response += `   *${game.description}*\n\n`;
    });
    
    response += `*Found ${games.length} games with ${cmd} difficulty*`;
    
    return { success: true, customDisplay: response };
  }
  
  // Player type filters
  if (['solo', 'competitive', 'multiplayer'].includes(cmd)) {
    const games = getGamesByPlayerType(cmd);
    let response = `👥 **${cmd.toUpperCase()} GAMES**\n\n`;
    
    games.forEach(game => {
      response += `${game.icon} **${game.name}** (${game.players})\n`;
      response += `   *${game.description}*\n\n`;
    });
    
    response += `*Found ${games.length} ${cmd} games*`;
    
    return { success: true, customDisplay: response };
  }
  
  // Quick play filter
  if (cmd === 'quick' || cmd === 'quickplay') {
    const games = getQuickPlayGames();
    let response = `⚡ **QUICK PLAY GAMES**\n\n`;
    response += `*Easy to learn, fun to play!*\n\n`;
    
    games.slice(0, 8).forEach(game => {
      response += `${game.icon} **${game.name}** (${game.players})\n`;
      response += `   *${game.description}*\n\n`;
    });
    
    return { success: true, customDisplay: response };
  }
  
  // Category navigation
  if (CATEGORIES[cmd]) {
    return {
      success: true,
      gameState: {
        ...gameState,
        view: 'category',
        selectedCategory: cmd
      }
    };
  }
  
  // Back to overview
  if (cmd === 'back' || cmd === 'overview' || cmd === 'main') {
    return {
      success: true,
      gameState: {
        ...gameState,
        view: 'overview',
        selectedCategory: null
      }
    };
  }
  
  // Launch arcade
  if (cmd === 'arcade' || cmd === 'games' || cmd === 'launcher') {
    return { 
      success: true, 
      customDisplay: '🎮 **Workshop Arcade** - Use the `arcade` game to launch the full game browser!\n\nType `vibe arcade` or start any specific game by name.'
    };
  }
  
  // Help
  if (cmd === 'help' || cmd === '?') {
    let help = '🎮 **Game Status Commands**\n\n';
    help += '**Filters:**\n';
    help += '• `easy`, `medium`, `hard` - Games by difficulty\n';
    help += '• `solo`, `competitive`, `multiplayer` - Games by player type\n';
    help += '• `quick` - Easy to learn games\n\n';
    help += '**Categories:**\n';
    Object.entries(CATEGORIES).forEach(([id, cat]) => {
      help += `• \`${id}\` - ${cat.name}\n`;
    });
    help += '\n**Actions:**\n';
    help += '• `refresh` - Update game status\n';
    help += '• `arcade` - Launch full game browser\n';
    help += '• `back` - Return to overview\n';
    
    return { success: true, customDisplay: help };
  }
  
  // Unknown command
  return { 
    error: `Unknown command '${cmd}'. Try 'help' for available commands, or 'arcade' to browse all games.` 
  };
}

// Get a random game recommendation with reason
function getRandomGameRecommendation() {
  const allGames = Object.entries(GAMES);
  const randomGame = allGames[Math.floor(Math.random() * allGames.length)];
  const [id, game] = randomGame;
  
  const reasons = [
    'Great for beginners!',
    'Quick to learn, hard to master',
    'Perfect for a coffee break',
    'Lots of replayability',
    'Fan favorite in the workshop',
    'Creative and fun',
    'Good brain exercise',
    'Social and interactive'
  ];
  
  const reason = reasons[Math.floor(Math.random() * reasons.length)];
  
  return {
    id,
    game,
    reason
  };
}

// Check if a specific game exists
function gameExists(gameId) {
  return !!GAMES[gameId];
}

// Get game info by ID
function getGameInfo(gameId) {
  return GAMES[gameId] ? { id: gameId, ...GAMES[gameId] } : null;
}

module.exports = {
  createInitialGameStatusState,
  getGameOverview,
  getFeaturedGames,
  getGamesByDifficulty,
  getGamesByPlayerType,
  getQuickPlayGames,
  formatGameStatusDisplay,
  handleGameStatusCommand,
  getRandomGameRecommendation,
  gameExists,
  getGameInfo
};