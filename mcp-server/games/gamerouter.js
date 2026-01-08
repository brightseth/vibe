/**
 * Game Router - Quick launcher for any workshop game
 * Routes game commands to the appropriate game implementation
 * Makes all games easily accessible with simple commands
 */

// Import all game systems
const arcade = require('./arcade');
const drawing = require('./drawing');
const pixelart = require('./pixelart');
const gamestatus = require('./gamestatus');
const hangman = require('./hangman');
const wordchain = require('./wordchain');
const twentyquestions = require('./twentyquestions');
const wordassociation = require('./wordassociation');

// Game routing table - maps game IDs to their implementations
const GAME_ROUTES = {
  // Discovery & navigation
  'arcade': {
    type: 'navigation',
    module: arcade,
    createState: arcade.createInitialArcadeState,
    display: arcade.formatArcadeDisplay,
    handleCommand: arcade.handleArcadeCommand,
    description: 'Browse all available games'
  },
  
  'gamestatus': {
    type: 'status',
    module: gamestatus,
    createState: gamestatus.createInitialGameStatusState,
    display: gamestatus.formatGameStatusDisplay,
    handleCommand: gamestatus.handleGameStatusCommand,
    description: 'See game overview and get recommendations'
  },
  
  // Creative & collaborative games
  'drawing': {
    type: 'collaborative',
    module: drawing,
    createState: drawing.createInitialDrawingState,
    display: drawing.formatDrawingDisplay,
    handleCommand: null, // Uses direct methods
    description: 'Collaborative drawing canvas'
  },
  
  'pixelart': {
    type: 'collaborative', 
    module: pixelart,
    createState: pixelart.createInitialPixelArtState,
    display: pixelart.formatPixelArtDisplay,
    handleCommand: null,
    description: 'Collaborative pixel art creation'
  },
  
  // Single-player games
  'hangman': {
    type: 'singleplayer',
    module: hangman,
    createState: hangman.createInitialHangmanState,
    display: hangman.formatHangmanDisplay,
    handleCommand: null,
    description: 'Classic word guessing game'
  },
  
  'twentyquestions': {
    type: 'interactive',
    module: twentyquestions,
    createState: twentyquestions.createInitialTwentyQuestionsState,
    display: twentyquestions.formatTwentyQuestionsDisplay,
    handleCommand: null,
    description: 'Guess what I\'m thinking!'
  },
  
  // Multiplayer word games  
  'wordchain': {
    type: 'multiplayer',
    module: wordchain,
    createState: wordchain.createInitialWordChainState,
    display: wordchain.formatWordChainDisplay,
    handleCommand: null,
    description: 'Build chains of connected words'
  },
  
  'wordassociation': {
    type: 'multiplayer',
    module: wordassociation,
    createState: wordassociation.createInitialWordAssociationState,
    display: wordassociation.formatWordAssociationDisplay,
    handleCommand: null,
    description: 'Quick-fire word connections'
  }
};

// Get list of all routable games
function getAvailableGames() {
  return Object.keys(GAME_ROUTES);
}

// Check if a game is available
function gameAvailable(gameId) {
  return !!GAME_ROUTES[gameId];
}

// Get game info
function getGameRoute(gameId) {
  return GAME_ROUTES[gameId];
}

// Create initial state for any game
function createGameState(gameId) {
  const route = GAME_ROUTES[gameId];
  if (!route) {
    return { error: `Game '${gameId}' not found!` };
  }
  
  try {
    const state = route.createState();
    return { 
      success: true, 
      gameState: state,
      gameType: route.type,
      gameId: gameId
    };
  } catch (error) {
    return { error: `Failed to create ${gameId}: ${error.message}` };
  }
}

// Display game state
function displayGame(gameId, gameState) {
  const route = GAME_ROUTES[gameId];
  if (!route) {
    return `Error: Game '${gameId}' not found!`;
  }
  
  try {
    return route.display(gameState);
  } catch (error) {
    return `Error displaying ${gameId}: ${error.message}`;
  }
}

// Handle game command
function handleGameCommand(gameId, gameState, command) {
  const route = GAME_ROUTES[gameId];
  if (!route) {
    return { error: `Game '${gameId}' not found!` };
  }
  
  if (!route.handleCommand) {
    return { error: `Game '${gameId}' doesn't support text commands. Use specific game actions.` };
  }
  
  try {
    return route.handleCommand(gameState, command);
  } catch (error) {
    return { error: `Command failed: ${error.message}` };
  }
}

// Get game suggestions based on preferences
function getGameSuggestions(playerCount = 'any', difficulty = 'any', category = 'any') {
  const allGames = arcade.GAMES;
  let suggestions = Object.entries(allGames);
  
  // Filter by player count
  if (playerCount !== 'any') {
    suggestions = suggestions.filter(([id, game]) => {
      if (playerCount === 'solo') return game.players === 'Solo';
      if (playerCount === 'multiplayer') return game.players !== 'Solo';
      return true;
    });
  }
  
  // Filter by difficulty
  if (difficulty !== 'any') {
    suggestions = suggestions.filter(([id, game]) => 
      game.difficulty.toLowerCase() === difficulty.toLowerCase()
    );
  }
  
  // Filter by category
  if (category !== 'any') {
    suggestions = suggestions.filter(([id, game]) => game.category === category);
  }
  
  return suggestions.map(([id, game]) => ({
    id,
    name: game.name,
    description: game.description,
    players: game.players,
    difficulty: game.difficulty,
    category: game.category,
    icon: game.icon,
    available: gameAvailable(id)
  }));
}

// Get quick start instructions for a game
function getQuickStart(gameId) {
  const instructions = {
    'arcade': 'Browse all games! Try typing category names like `classic` or game names like `chess`.',
    'gamestatus': 'See game overview! Try `easy`, `solo`, `multiplayer` to filter games.',
    'drawing': 'Join collaborative drawing! Use coordinates and character names to draw.',
    'pixelart': 'Create pixel art! Place colored pixels to make collaborative art.',
    'hangman': 'Guess letters to reveal the hidden word! Try common letters first.',
    'twentyquestions': 'Ask yes/no questions to guess what I\'m thinking! You have 20 tries.',
    'wordchain': 'Build word chains! Each word must connect to the previous word.',
    'wordassociation': 'Say the first word that comes to mind! Build associations.'
  };
  
  return instructions[gameId] || 'Game instructions not available. Check the game description for details.';
}

// Format router help/overview
function formatRouterHelp() {
  let help = '🎮 **GAME ROUTER - Quick Access to All Games**\n\n';
  
  // Group by type
  const byType = {};
  Object.entries(GAME_ROUTES).forEach(([id, route]) => {
    if (!byType[route.type]) byType[route.type] = [];
    byType[route.type].push({ id, ...route });
  });
  
  Object.entries(byType).forEach(([type, games]) => {
    const typeLabels = {
      navigation: '🧭 Navigation & Discovery',
      status: '📊 Game Information', 
      collaborative: '🎨 Collaborative Games',
      singleplayer: '🎯 Solo Games',
      multiplayer: '👥 Multiplayer Games',
      interactive: '🤖 Interactive Games'
    };
    
    help += `**${typeLabels[type] || type.toUpperCase()}**\n`;
    games.forEach(game => {
      help += `• \`${game.id}\` - ${game.description}\n`;
    });
    help += '\n';
  });
  
  help += '**Quick Commands:**\n';
  help += '• Type any game ID to launch it\n';  
  help += '• `available` - List all games\n';
  help += '• `suggest solo/multiplayer easy/medium` - Get recommendations\n';
  help += '• `arcade` - Browse full game collection\n';
  help += '• `gamestatus` - See what\'s available\n\n';
  
  help += '**Integration:**\n';
  help += 'Use `vibe game @user` for tic-tac-toe/chess\n';
  help += 'Use individual game names for other games\n';
  
  return help;
}

// Handle general router commands
function handleRouterCommand(command) {
  const cmd = command.toLowerCase().trim();
  
  if (cmd === 'available' || cmd === 'list') {
    const games = getAvailableGames();
    return {
      success: true,
      display: `**Available Games (${games.length}):**\n${games.join(', ')}\n\nType any game name to launch it!`
    };
  }
  
  if (cmd.startsWith('suggest')) {
    // Parse suggestion parameters
    const parts = cmd.split(' ').slice(1); // Remove 'suggest'
    let playerCount = 'any';
    let difficulty = 'any';
    
    parts.forEach(part => {
      if (['solo', 'multiplayer'].includes(part)) playerCount = part;
      if (['easy', 'medium', 'hard'].includes(part)) difficulty = part;
    });
    
    const suggestions = getGameSuggestions(playerCount, difficulty);
    
    let response = `🎯 **Game Suggestions** (${suggestions.length} games)\n`;
    if (playerCount !== 'any') response += `*${playerCount} games*\n`;
    if (difficulty !== 'any') response += `*${difficulty} difficulty*\n`;
    response += '\n';
    
    suggestions.slice(0, 8).forEach(game => {
      const status = game.available ? '✅' : '🚧';
      response += `${status} ${game.icon} **${game.name}** (${game.players})\n`;
      response += `   *${game.description}*\n\n`;
    });
    
    return { success: true, display: response };
  }
  
  if (cmd === 'help' || cmd === '?') {
    return { success: true, display: formatRouterHelp() };
  }
  
  // Check if it's a game launch command
  if (gameAvailable(cmd)) {
    const result = createGameState(cmd);
    if (result.error) {
      return { error: result.error };
    }
    
    const display = displayGame(cmd, result.gameState);
    const instructions = getQuickStart(cmd);
    
    return {
      success: true,
      display: display + '\n\n💡 **Quick Start:** ' + instructions,
      gameState: result.gameState,
      gameId: cmd,
      gameType: result.gameType
    };
  }
  
  return { error: `Unknown command '${cmd}'. Type 'help' for available commands or 'available' for game list.` };
}

module.exports = {
  GAME_ROUTES,
  getAvailableGames,
  gameAvailable,
  getGameRoute,
  createGameState,
  displayGame,
  handleGameCommand,
  getGameSuggestions,
  getQuickStart,
  formatRouterHelp,
  handleRouterCommand
};