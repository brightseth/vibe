/**
 * vibe arcade — Browse and launch games from the Workshop Arcade
 *
 * Comprehensive game launcher for all /vibe games
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload, formatPayload } = require('../protocol');
const { requireInit } = require('./_shared');

// Import all game modules
const arcade = require('../games/arcade');
const hangman = require('../games/hangman');
const wordchain = require('../games/wordchain');
const twentyquestions = require('../games/twentyquestions');
const wordassociation = require('../games/wordassociation');
const snake = require('../games/snake');
const rockpaperscissors = require('../games/rockpaperscissors');
const memory = require('../games/memory');
const riddle = require('../games/riddle');
const guessnumber = require('../games/guessnumber');
const colorguess = require('../games/colorguess');

const definition = {
  name: 'vibe_arcade',
  description: 'Browse and launch games from the Workshop Arcade. View game collection, get recommendations, or start playing!',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'What to do: browse, launch, recommend, help',
        enum: ['browse', 'launch', 'recommend', 'help']
      },
      game: {
        type: 'string',
        description: 'Game to launch (hangman, guessnumber, etc.) - used with launch action'
      },
      command: {
        type: 'string',
        description: 'Arcade navigation command (category name, game name, back, main) - used with browse action'
      },
      difficulty: {
        type: 'string',
        description: 'Difficulty level for supported games',
        enum: ['easy', 'medium', 'hard']
      },
      move: {
        type: 'string',
        description: 'Game move/input for continuing a game'
      }
    }
  }
};

// Get user's arcade state or create new one
async function getUserArcadeState(handle) {
  const key = `arcade:${handle}`;
  let state = await store.getGlobalData(key);
  
  if (!state) {
    state = arcade.createInitialArcadeState();
    await store.setGlobalData(key, state);
  }
  
  return state;
}

// Save user's arcade state
async function saveUserArcadeState(handle, state) {
  const key = `arcade:${handle}`;
  await store.setGlobalData(key, state);
}

// Get user's game state for a specific game
async function getUserGameState(handle, gameType) {
  const key = `game:${handle}:${gameType}`;
  return await store.getGlobalData(key);
}

// Save user's game state
async function saveUserGameState(handle, gameType, gameState) {
  const key = `game:${handle}:${gameType}`;
  await store.setGlobalData(key, gameState);
}

// Launch a single-player game
async function launchGame(handle, gameType, difficulty = 'medium', move = null) {
  let gameState = await getUserGameState(handle, gameType);
  let isNewGame = false;

  // Handle different game types
  switch (gameType) {
    case 'hangman':
      if (!gameState || gameState.gameOver || move === 'new') {
        gameState = hangman.createInitialHangmanState(difficulty);
        isNewGame = true;
      }
      
      if (move && move !== 'new') {
        const result = hangman.makeGuess(gameState, move);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        gameState = result.gameState;
      }
      
      await saveUserGameState(handle, gameType, gameState);
      
      let display = hangman.formatHangmanDisplay(gameState);
      if (isNewGame) {
        display = `🎯 **Started new Hangman game!**\n\n${display}`;
        const hint = hangman.getHint(gameState.word, gameState.difficulty);
        display += `\n\n💡 **Hint:** ${hint}`;
      }
      
      if (!gameState.gameOver) {
        display += '\n\n*Use `vibe arcade --action launch --game hangman --move X` to guess a letter*';
      } else {
        display += '\n\n*Use `vibe arcade --action launch --game hangman --move new` to start again*';
      }
      
      return { display };

    case 'guessnumber':
      if (!gameState || gameState.gameOver || move === 'new') {
        gameState = guessnumber.createInitialGuessNumberState(difficulty);
        isNewGame = true;
      }
      
      if (move && move !== 'new' && !isNaN(move)) {
        const result = guessnumber.makeGuess(gameState, move);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        gameState = result.gameState;
      }
      
      await saveUserGameState(handle, gameType, gameState);
      
      let display = guessnumber.formatGuessNumberDisplay(gameState);
      if (isNewGame) {
        display = `🔢 **Started new Number Guessing game!**\n\n${display}`;
      }
      
      if (!gameState.gameOver) {
        display += '\n\n*Use `vibe arcade --action launch --game guessnumber --move 42` to make a guess*';
      } else {
        display += '\n\n*Use `vibe arcade --action launch --game guessnumber --move new` to start again*';
      }
      
      return { display };

    // Add more games here as needed
    default:
      // Check if it's a game that exists in the arcade but not integrated yet
      if (arcade.GAMES[gameType]) {
        const game = arcade.GAMES[gameType];
        return { 
          display: `🎮 **${game.name}** is available in the arcade but not yet integrated with the launcher.\n\n${game.icon} *${game.description}*\n\n**Currently supported:** hangman, guessnumber\n\n🚀 More games coming soon to the launcher!` 
        };
      } else {
        return { display: `❌ Game "${gameType}" not found in the arcade.\n\nUse \`vibe arcade --action browse\` to see available games!` };
      }
  }
}

// Get a game recommendation
function getRecommendation(category = null) {
  if (category) {
    const games = arcade.getGamesByCategory(category);
    if (games.length === 0) {
      return null;
    }
    const game = games[Math.floor(Math.random() * games.length)];
    return game;
  } else {
    return arcade.getRandomRecommendation();
  }
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const handle = config.getHandle();
  const { action = 'browse', game, command, difficulty = 'medium', move } = args;

  switch (action) {
    case 'browse':
      // Arcade browsing interface
      let arcadeState = await getUserArcadeState(handle);
      
      if (command) {
        const result = arcade.handleArcadeCommand(arcadeState, command);
        if (result.error) {
          return { display: `❌ ${result.error}` };
        }
        arcadeState = result.gameState;
        await saveUserArcadeState(handle, arcadeState);
      }
      
      const display = arcade.formatArcadeDisplay(arcadeState);
      return { display };

    case 'launch':
      if (!game) {
        return { display: '❌ Please specify a game to launch. Use `--game hangman` for example.\n\n**Available:** hangman, guessnumber' };
      }
      
      return await launchGame(handle, game, difficulty, move);

    case 'recommend':
      const recommendation = getRecommendation();
      let recDisplay = `🎯 **Game Recommendation**\n\n`;
      recDisplay += `${recommendation.icon} **${recommendation.name}**\n`;
      recDisplay += `*${recommendation.description}*\n\n`;
      recDisplay += `**Category:** ${arcade.CATEGORIES[recommendation.category].name}\n`;
      recDisplay += `**Players:** ${recommendation.players}\n`;
      recDisplay += `**Difficulty:** ${recommendation.difficulty}\n\n`;
      
      if (['hangman', 'guessnumber'].includes(recommendation.id)) {
        recDisplay += `✅ **Ready to play!** Use \`vibe arcade --action launch --game ${recommendation.id}\``;
      } else {
        recDisplay += `🚧 *This game is in the arcade but not yet available in the launcher.*`;
      }
      
      return { display: recDisplay };

    case 'help':
      let helpDisplay = `🎮 **Workshop Arcade Help**\n\n`;
      helpDisplay += `**Browse games:** \`vibe arcade --action browse\`\n`;
      helpDisplay += `**Navigate arcade:** \`vibe arcade --action browse --command classic\`\n`;
      helpDisplay += `**Launch game:** \`vibe arcade --action launch --game hangman\`\n`;
      helpDisplay += `**Make moves:** \`vibe arcade --action launch --game hangman --move A\`\n`;
      helpDisplay += `**Get recommendation:** \`vibe arcade --action recommend\`\n\n`;
      
      helpDisplay += `**🎯 Ready to launch:**\n`;
      helpDisplay += `• **Hangman** - guess the word letter by letter\n`;
      helpDisplay += `• **Number Guessing** - find the secret number\n\n`;
      
      helpDisplay += `**🚧 In arcade (${Object.keys(arcade.GAMES).length - 2} more games):**\n`;
      helpDisplay += `Chess, Tic-Tac-Toe, Word Chain, Snake, Memory, and more!\n\n`;
      
      helpDisplay += `**🚀 Coming soon:** Full integration with all arcade games!`;
      
      return { display: helpDisplay };

    default:
      return { display: '❌ Invalid action. Use: browse, launch, recommend, or help' };
  }
}

module.exports = { definition, handler };