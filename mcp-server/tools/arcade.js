/**
 * vibe arcade — Browse and discover all /vibe games
 * 
 * Your gateway to 20+ games built by @games-agent!
 */

const config = require('../config');
const { requireInit } = require('./_shared');

// Import arcade system
const arcade = require('../games/arcade');
const gameRoulette = require('../games/gameroulette');

// Global arcade state (simple in-memory storage)
let arcadeState = null;
let rouletteState = null;

function getArcadeState() {
  if (!arcadeState) {
    arcadeState = arcade.createInitialArcadeState();
  }
  return arcadeState;
}

function getRouletteState() {
  if (!rouletteState) {
    rouletteState = gameRoulette.createInitialGameRouletteState();
  }
  return rouletteState;
}

const definition = {
  name: 'vibe_arcade',
  description: 'Browse and discover all /vibe games. Use "arcade" for main menu, "roulette" for random game',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Arcade command: "main", category name, game name, "back", "roulette", "random", or mood',
        default: 'main'
      }
    },
    required: []
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'main';
  const cmd = command.toLowerCase().trim();

  // Handle roulette and random commands
  if (cmd === 'roulette' || cmd === 'random' || cmd === 'surprise') {
    const rState = getRouletteState();
    const result = gameRoulette.getRandomGame(rState, myHandle);
    
    if (result.error) {
      return { display: `🎲 **Game Roulette Error:** ${result.error}` };
    }
    
    rouletteState = result.gameState;
    const display = gameRoulette.formatRouletteDisplay(result.gameState, result.recommendation, myHandle);
    
    return { display };
  }

  // Handle mood-based recommendations
  const moods = ['chill', 'competitive', 'social', 'quick', 'thoughtful', 'creative'];
  if (moods.includes(cmd)) {
    const rState = getRouletteState();
    const result = gameRoulette.getSmartRecommendation(rState, myHandle, cmd);
    
    if (result.success) {
      rouletteState = result.gameState;
      let display = `🎯 **${cmd.toUpperCase()} MOOD MATCH**\n\n`;
      display += gameRoulette.formatRouletteDisplay(result.gameState, result.recommendation, myHandle);
      return { display };
    }
  }

  // Handle special arcade commands
  if (cmd === 'stats') {
    const totalGames = Object.keys(arcade.GAMES).length;
    const categories = Object.keys(arcade.CATEGORIES).length;
    
    let display = `🎮 **Workshop Arcade Stats**\n\n`;
    display += `**Total Games:** ${totalGames}\n`;
    display += `**Categories:** ${categories}\n\n`;
    
    // Show category breakdown
    Object.entries(arcade.CATEGORIES).forEach(([id, category]) => {
      const gameCount = arcade.getGamesByCategory(id).length;
      display += `${category.icon} ${category.name}: ${gameCount} games\n`;
    });
    
    // Show roulette stats if available
    const rStats = gameRoulette.getRouletteStats(getRouletteState());
    if (rStats) {
      display += `\n**Your Session:**\n`;
      display += `• Recommendations: ${rStats.totalRecommendations}\n`;
      if (rStats.favoriteCategory) {
        display += `• Favorite category: ${rStats.favoriteCategory}\n`;
      }
    }
    
    return { display };
  }

  if (cmd === 'help') {
    let display = `🎮 **Workshop Arcade Help**\n\n`;
    display += `**Navigation:**\n`;
    display += `• \`arcade\` or \`arcade main\` - Main menu\n`;
    display += `• \`arcade classic\` - Browse category\n`;
    display += `• \`arcade chess\` - Game info\n`;
    display += `• \`arcade back\` - Go back\n\n`;
    display += `**Discovery:**\n`;
    display += `• \`arcade roulette\` - Random game\n`;
    display += `• \`arcade competitive\` - Mood-based pick\n`;
    display += `• \`arcade stats\` - View arcade stats\n\n`;
    display += `**Moods:** chill, competitive, social, quick, thoughtful, creative\n`;
    display += `**Categories:** classic, word, puzzle, action, creative, social`;
    
    return { display };
  }

  // Handle regular arcade navigation
  const aState = getArcadeState();
  
  if (cmd === 'main' || cmd === '' || cmd === 'arcade') {
    // Reset to main menu
    const result = arcade.navigateBack(aState);
    if (result.success) {
      arcadeState = result.gameState;
    }
    const display = arcade.formatArcadeDisplay(getArcadeState());
    return { display };
  }
  
  // Handle arcade navigation command
  const result = arcade.handleArcadeCommand(aState, command);
  
  if (result.error) {
    // Try partial matches or suggestions
    let display = `❌ ${result.error}\n\n`;
    
    // Show available options based on current view
    if (aState.view === 'main') {
      display += `Try: category names (classic, word, puzzle, action, creative, social) or game names\n`;
      display += `Or use: \`arcade roulette\` for a random game recommendation!`;
    } else if (aState.view === 'category') {
      const games = arcade.getGamesByCategory(aState.selectedCategory);
      const gameNames = games.slice(0, 4).map(g => g.name).join(', ');
      display += `Try: ${gameNames}... or \`arcade back\``;
    } else {
      display += `Try: \`arcade back\` or \`arcade main\``;
    }
    
    return { display };
  }
  
  if (result.success) {
    arcadeState = result.gameState;
  }
  
  const display = arcade.formatArcadeDisplay(getArcadeState());
  return { display };
}

module.exports = { definition, handler };