/**
 * vibe games — Browse and launch workshop games
 * 
 * Discover all available games, get recommendations, and launch games
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload, formatPayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Import game systems
const arcade = require('../games/arcade');
const gamerouter = require('../games/gamerouter');

// Track active game sessions per user
const activeSessions = new Map();

const definition = {
  name: 'vibe_games',
  description: 'Browse and launch workshop games. Discover new games, get recommendations, or launch any game.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'What to do: browse, launch, suggest, help, status',
        enum: ['browse', 'launch', 'suggest', 'help', 'status', 'quit']
      },
      game: {
        type: 'string',
        description: 'Game to launch (e.g., hangman, wordchain, drawing)'
      },
      category: {
        type: 'string',
        description: 'Game category to browse (classic, word, puzzle, action, creative, social)'
      },
      difficulty: {
        type: 'string',
        description: 'Difficulty preference for suggestions (easy, medium, hard)',
        enum: ['easy', 'medium', 'hard']
      },
      players: {
        type: 'string',
        description: 'Player preference for suggestions (solo, multiplayer)',
        enum: ['solo', 'multiplayer']
      },
      command: {
        type: 'string',
        description: 'Command to send to active game'
      }
    },
    required: []
  }
};

// Get user session
function getUserSession(handle) {
  if (!activeSessions.has(handle)) {
    activeSessions.set(handle, {
      currentGame: null,
      gameState: null,
      arcadeState: arcade.createInitialArcadeState(),
      lastActivity: new Date().toISOString()
    });
  }
  return activeSessions.get(handle);
}

// Clear user session
function clearUserSession(handle) {
  activeSessions.delete(handle);
}

// Format game list for display
function formatGameList(games, title = 'Games') {
  if (!games || games.length === 0) {
    return `**${title}**\n*No games found.*`;
  }
  
  let display = `**${title}** (${games.length} games)\n\n`;
  
  games.forEach(game => {
    display += `${game.icon || '🎮'} **${game.name}**\n`;
    display += `   *${game.description}*\n`;
    display += `   Players: ${game.players} • Difficulty: ${game.difficulty}\n\n`;
  });
  
  return display;
}

// Launch a specific game
function launchGame(session, gameId) {
  // Check if game exists
  if (!gamerouter.gameAvailable(gameId)) {
    const availableGames = gamerouter.getAvailableGames();
    return { 
      error: `Game '${gameId}' not found! Available games: ${availableGames.join(', ')}`
    };
  }
  
  // Create game state
  const result = gamerouter.createGameState(gameId);
  if (result.error) {
    return { error: result.error };
  }
  
  // Update session
  session.currentGame = gameId;
  session.gameState = result.gameState;
  session.lastActivity = new Date().toISOString();
  
  // Get display
  const display = gamerouter.displayGame(gameId, result.gameState);
  const instructions = gamerouter.getQuickStart(gameId);
  
  return {
    success: true,
    display: display + '\n\n💡 **Quick Start:** ' + instructions + '\n\n*Use `vibe games --command [action]` to play, or `vibe games --action quit` to exit.*'
  };
}

// Handle game command
function handleGameCommand(session, command) {
  if (!session.currentGame || !session.gameState) {
    return { error: 'No active game. Use `vibe games --action launch --game [name]` to start a game.' };
  }
  
  const result = gamerouter.handleGameCommand(session.currentGame, session.gameState, command);
  if (result.error) {
    return { error: result.error };
  }
  
  // Update session
  if (result.gameState) {
    session.gameState = result.gameState;
    session.lastActivity = new Date().toISOString();
  }
  
  // Format response
  let display = '';
  if (result.display) {
    display = result.display;
  } else if (result.gameState) {
    display = gamerouter.displayGame(session.currentGame, result.gameState);
  } else {
    display = 'Command processed.';
  }
  
  return { success: true, display: display };
}

// Generate game recommendations
function getRecommendations(difficulty = 'any', players = 'any') {
  const suggestions = gamerouter.getGameSuggestions(players, difficulty);
  
  let display = '🎯 **Game Recommendations**\n\n';
  
  if (difficulty !== 'any') {
    display += `*${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} difficulty games*\n`;
  }
  if (players !== 'any') {
    display += `*${players.charAt(0).toUpperCase() + players.slice(1)} games*\n`;
  }
  
  display += '\n';
  
  const recommendedGames = suggestions.slice(0, 6); // Show top 6 recommendations
  
  recommendedGames.forEach(game => {
    const status = game.available ? '✅' : '🚧';
    display += `${status} ${game.icon || '🎮'} **${game.name}** (${game.players})\n`;
    display += `   *${game.description}*\n`;
    display += `   Launch with: \`vibe games --action launch --game ${game.id}\`\n\n`;
  });
  
  if (suggestions.length > 6) {
    display += `*... and ${suggestions.length - 6} more games! Use \`vibe games --action browse\` to see all.*\n`;
  }
  
  return display;
}

// Generate help text
function generateHelp() {
  return `🎮 **Workshop Games Help**

**Actions:**
• \`vibe games --action browse\` - Browse all available games
• \`vibe games --action browse --category word\` - Browse word games  
• \`vibe games --action launch --game hangman\` - Launch hangman game
• \`vibe games --action suggest\` - Get game recommendations
• \`vibe games --action suggest --difficulty easy --players solo\` - Filtered suggestions
• \`vibe games --action status\` - See your current game status
• \`vibe games --action quit\` - Quit current game

**Game Categories:**
🎲 classic • 📝 word • 🧩 puzzle • ⚡ action • 🎨 creative • 👥 social

**While Playing:**
• \`vibe games --command [action]\` - Send command to current game
• Each game has its own commands - check the quick start guide!

**Popular Games:**
⭕ tic-tac-toe • 🎯 hangman • 🔗 wordchain • 🎨 drawing • ❓ twentyquestions

*Type \`vibe games --action browse\` to see all ${gamerouter.getAvailableGames().length} available games!*`;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { action = 'browse', game, category, difficulty, players, command } = args;
  const myHandle = config.getHandle();
  const session = getUserSession(myHandle);

  try {
    switch (action) {
      case 'help':
        return { display: generateHelp() };

      case 'browse': {
        if (category) {
          // Browse specific category using arcade
          const result = arcade.navigateToCategory(session.arcadeState, category);
          if (result.error) {
            return { display: result.error };
          }
          session.arcadeState = result.gameState;
          const display = arcade.formatArcadeDisplay(session.arcadeState);
          return { display };
        } else {
          // Browse all games using arcade
          session.arcadeState = arcade.createInitialArcadeState();
          const display = arcade.formatArcadeDisplay(session.arcadeState);
          return { display };
        }
      }

      case 'launch': {
        if (!game) {
          return { display: 'Please specify a game to launch. Use `vibe games --action browse` to see available games.' };
        }
        return launchGame(session, game);
      }

      case 'suggest': {
        const display = getRecommendations(difficulty, players);
        return { display };
      }

      case 'status': {
        if (session.currentGame) {
          const display = gamerouter.displayGame(session.currentGame, session.gameState);
          return { 
            display: `**Current Game:** ${session.currentGame}\n\n${display}\n\n*Use \`vibe games --command [action]\` to play, or \`vibe games --action quit\` to exit.*`
          };
        } else {
          const totalGames = gamerouter.getAvailableGames().length;
          return { 
            display: `**No Active Game**\n\n🎮 **${totalGames} games available** in the Workshop\n\nUse \`vibe games --action launch --game [name]\` to start a game\nOr \`vibe games --action browse\` to explore all games` 
          };
        }
      }

      case 'quit': {
        if (session.currentGame) {
          const gameName = session.currentGame;
          session.currentGame = null;
          session.gameState = null;
          return { display: `✅ Quit ${gameName}. Use \`vibe games --action browse\` to find another game!` };
        } else {
          return { display: 'No active game to quit.' };
        }
      }

      default: {
        // If we have a command and active game, handle it
        if (command && session.currentGame) {
          return handleGameCommand(session, command);
        }
        
        // Default to browse if no specific action
        session.arcadeState = arcade.createInitialArcadeState();
        const display = arcade.formatArcadeDisplay(session.arcadeState);
        return { display };
      }
    }

  } catch (error) {
    console.error('[games] Error:', error);
    return { display: `Error: ${error.message}. Try \`vibe games --action help\` for usage.` };
  }
}

// Clean up inactive sessions (called periodically)
function cleanupInactiveSessions() {
  const now = Date.now();
  const TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  for (const [handle, session] of activeSessions.entries()) {
    const lastActivity = new Date(session.lastActivity).getTime();
    if (now - lastActivity > TIMEOUT) {
      activeSessions.delete(handle);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupInactiveSessions, 10 * 60 * 1000);

module.exports = { definition, handler };