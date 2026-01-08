/**
 * vibe riddle — Brain-bending riddle challenges
 *
 * Challenge your mind with classic riddles and brain teasers!
 * Multiple difficulty levels from easy warm-ups to expert mind-benders.
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Import riddle game implementation
const riddle = require('../games/riddle');

const definition = {
  name: 'vibe_riddle',
  description: 'Challenge your mind with brain-bending riddles and puzzles across multiple difficulty levels!',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to take',
        enum: ['new', 'guess', 'hint', 'skip', 'status', 'stats', 'difficulties']
      },
      difficulty: {
        type: 'string',
        description: 'Difficulty level for new riddles',
        enum: ['easy', 'medium', 'hard', 'expert']
      },
      guess: {
        type: 'string',
        description: 'Your answer guess'
      }
    },
    required: []
  }
};

/**
 * Get current riddle game state for the player
 */
async function getCurrentGame(playerHandle) {
  // Store riddle games in a personal thread with a riddle bot
  const riddleBotHandle = 'riddle-master';
  const thread = await store.getThread(playerHandle, riddleBotHandle);
  
  // Find the most recent riddle game
  for (let i = thread.length - 1; i >= 0; i--) {
    const msg = thread[i];
    if (msg.payload?.type === 'game' && msg.payload?.game === 'riddle') {
      return { gameState: msg.payload.state, thread };
    }
  }
  
  return { gameState: null, thread };
}

/**
 * Save riddle game state
 */
async function saveGameState(playerHandle, gameState, action) {
  const riddleBotHandle = 'riddle-master';
  const payload = createGamePayload('riddle', gameState);
  
  let message;
  switch (action.type) {
    case 'new':
      message = `🧩 New ${action.difficulty} riddle started!`;
      break;
    case 'guess':
      message = action.won ? 
        `🎉 Correct! "${action.guess}" was right!` : 
        `❌ "${action.guess}" - keep thinking!`;
      break;
    case 'hint':
      message = `💡 Hint ${action.hintNumber}: ${action.hint}`;
      break;
    case 'skip':
      message = `⏭️ Skipped to a new ${action.difficulty} riddle`;
      break;
    default:
      message = 'Riddle game updated';
  }
  
  await store.sendMessage(playerHandle, riddleBotHandle, message, 'dm', payload);
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { action = 'status', difficulty = 'medium', guess } = args;
  const myHandle = config.getHandle();

  // Show difficulty information
  if (action === 'difficulties') {
    const difficulties = riddle.getDifficultyInfo();
    
    let display = `🧩 **Riddle Difficulty Levels**\n\n`;
    
    Object.entries(difficulties).forEach(([level, info]) => {
      display += `${info.description}\n`;
      display += `   📚 ${info.riddles} riddles available\n\n`;
    });
    
    display += `Start a riddle: \`vibe riddle --action new --difficulty [level]\`\n`;
    display += `Example: \`vibe riddle --action new --difficulty easy\``;
    
    return { display };
  }

  // Show riddle statistics
  if (action === 'stats') {
    const stats = riddle.getRiddleStats();
    
    let display = `📊 **Riddle Collection Stats**\n\n`;
    display += `**Total riddles:** ${stats.total}\n\n`;
    
    display += `**By difficulty:**\n`;
    Object.entries(stats.byDifficulty).forEach(([diff, count]) => {
      const emoji = { easy: '🟢', medium: '🟡', hard: '🔴', expert: '💀' }[diff] || '🟡';
      display += `• ${emoji} ${diff}: ${count} riddles\n`;
    });
    
    display += `\n**By category:**\n`;
    Object.entries(stats.byCategory).forEach(([category, count]) => {
      const emoji = {
        technology: '💻', household: '🏠', abstract: '🤔', objects: '📦',
        nature: '🌿', body: '👤', animals: '🐾', entertainment: '🎭'
      }[category] || '📚';
      display += `• ${emoji} ${category}: ${count} riddles\n`;
    });
    
    return { display };
  }

  // Get current game state
  const { gameState } = await getCurrentGame(myHandle);

  // Start a new riddle
  if (action === 'new') {
    const newGameState = riddle.createInitialRiddleState(difficulty);
    
    await saveGameState(myHandle, newGameState, { 
      type: 'new', 
      difficulty 
    });

    const display = riddle.formatRiddleDisplay(newGameState);
    return {
      display: `${display}\n\n**Commands:**\n• \`vibe riddle --action guess --guess "your answer"\` - Make a guess\n• \`vibe riddle --action hint\` - Get a hint\n• \`vibe riddle --action skip\` - Skip to new riddle`
    };
  }

  // No active game and no new game requested
  if (!gameState) {
    return {
      display: `🧩 **Riddle Challenge**\n\nNo active riddle! Ready to test your mind?\n\n**Commands:**\n• \`vibe riddle --action new\` - Start medium riddle\n• \`vibe riddle --action new --difficulty easy\` - Start easy riddle\n• \`vibe riddle --action difficulties\` - See all levels\n• \`vibe riddle --action stats\` - View riddle collection\n\n**Difficulty levels:** easy, medium, hard, expert`
    };
  }

  // Make a guess
  if (action === 'guess') {
    if (!guess) {
      return { display: '❌ Please provide your guess! Example: `--guess "keyboard"`' };
    }

    const result = riddle.makeGuess(gameState, guess);
    if (result.error) {
      return { display: `❌ ${result.error}` };
    }

    await saveGameState(myHandle, result.gameState, {
      type: 'guess',
      guess: guess,
      won: result.gameState.won
    });

    const display = riddle.formatRiddleDisplay(result.gameState);
    
    if (result.gameState.won) {
      return {
        display: `${display}\n\n🎉 **Riddle solved!** Want another challenge?\n• \`vibe riddle --action new\` - Same difficulty\n• \`vibe riddle --action new --difficulty hard\` - Harder challenge`
      };
    } else {
      return {
        display: `${display}\n\n**Keep trying!**\n• \`vibe riddle --action guess --guess "your answer"\` - Another guess\n• \`vibe riddle --action hint\` - Need a hint?`
      };
    }
  }

  // Get a hint
  if (action === 'hint') {
    const result = riddle.getHint(gameState);
    if (result.error) {
      return { display: `❌ ${result.error}` };
    }

    await saveGameState(myHandle, result.gameState, {
      type: 'hint',
      hint: result.hint,
      hintNumber: result.gameState.hintsUsed
    });

    const display = riddle.formatRiddleDisplay(result.gameState);
    return {
      display: `💡 **Hint:** ${result.hint}\n\n${display}`
    };
  }

  // Skip current riddle
  if (action === 'skip') {
    const newGameState = riddle.skipRiddle(gameState);
    
    await saveGameState(myHandle, newGameState, {
      type: 'skip',
      difficulty: newGameState.difficulty
    });

    const display = riddle.formatRiddleDisplay(newGameState);
    return {
      display: `⏭️ **New riddle loaded!**\n\n${display}\n\nPrevious riddle answer: **${gameState.currentRiddle.answer}**`
    };
  }

  // Show current status (default)
  const display = riddle.formatRiddleDisplay(gameState);
  
  const instructions = gameState.gameOver ?
    '\n\n**Game complete!** Start a new one with `vibe riddle --action new`' :
    '\n\n**Commands:**\n• `vibe riddle --action guess --guess "your answer"`\n• `vibe riddle --action hint` - Get a clue\n• `vibe riddle --action skip` - New riddle';
  
  return {
    display: `${display}${instructions}`
  };
}

module.exports = { definition, handler };