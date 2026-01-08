/**
 * Workshop Arcade — Game launcher and discovery hub
 * 
 * Showcases all available games in the /vibe workshop and provides
 * easy access to start playing them with friends.
 */

const config = require('../config');
const store = require('../store');
const { normalizeHandle } = require('./_shared');

// Game catalog with descriptions and how to play
const GAMES = {
  'tictactoe': {
    name: 'Tic-Tac-Toe',
    emoji: '⭕',
    description: 'Classic 3x3 grid game. Get three in a row to win!',
    players: '2 players',
    howToPlay: 'Use `vibe game @friend --move 5` to play center (positions 1-9)',
    category: 'strategy'
  },
  'chess': {
    name: 'Chess',
    emoji: '♟️',
    description: 'The classic strategy game. Checkmate your opponent!',
    players: '2 players',
    howToPlay: 'Use `vibe game @friend chess --move e4` for algebraic notation',
    category: 'strategy'
  },
  'hangman': {
    name: 'Hangman',
    emoji: '🎪',
    description: 'Guess the word letter by letter before running out of tries!',
    players: '1+ players',
    howToPlay: 'Coming to arcade soon!',
    category: 'word'
  },
  'wordchain': {
    name: 'Word Chain',
    emoji: '🔗',
    description: 'Take turns saying words that start with the last letter!',
    players: '2+ players', 
    howToPlay: 'Coming to arcade soon!',
    category: 'word'
  },
  'drawing': {
    name: 'Collaborative Drawing',
    emoji: '🎨',
    description: 'Create art together on a shared canvas!',
    players: '1-8 players',
    howToPlay: 'Coming to arcade soon!',
    category: 'creative'
  },
  'twentyquestions': {
    name: 'Twenty Questions',
    emoji: '❓',
    description: 'Guess what I\'m thinking in 20 yes/no questions!',
    players: '2+ players',
    howToPlay: 'Coming to arcade soon!',
    category: 'guessing'
  },
  'rockpaperscissors': {
    name: 'Rock Paper Scissors',
    emoji: '✂️',
    description: 'The timeless hand game of strategy and luck!',
    players: '2 players',
    howToPlay: 'Coming to arcade soon!',
    category: 'quick'
  },
  'guessnumber': {
    name: 'Number Guessing',
    emoji: '🔢',
    description: 'I\'m thinking of a number... can you guess it?',
    players: '1+ players',
    howToPlay: 'Coming to arcade soon!',
    category: 'guessing'
  },
  'colorguess': {
    name: 'Color Guessing',
    emoji: '🎨',
    description: 'Guess the color I\'m thinking of!',
    players: '1+ players',
    howToPlay: 'Coming to arcade soon!',
    category: 'guessing'
  },
  'memory': {
    name: 'Memory',
    emoji: '🧠',
    description: 'Test your memory by matching pairs of cards!',
    players: '1+ players',
    howToPlay: 'Coming to arcade soon!',
    category: 'puzzle'
  },
  'snake': {
    name: 'Snake',
    emoji: '🐍',
    description: 'Grow your snake by eating food, but don\'t hit the walls!',
    players: '1 player',
    howToPlay: 'Coming to arcade soon!',
    category: 'arcade'
  },
  'storybuilder': {
    name: 'Story Builder',
    emoji: '📖',
    description: 'Build a story together, one sentence at a time!',
    players: '2+ players',
    howToPlay: 'Coming to arcade soon!',
    category: 'creative'
  },
  'riddle': {
    name: 'Riddle',
    emoji: '🧩',
    description: 'Test your wit with challenging riddles!',
    players: '1+ players',
    howToPlay: 'Coming to arcade soon!',
    category: 'puzzle'
  },
  'quickduel': {
    name: 'Quick Duel',
    emoji: '⚔️',
    description: 'Fast-paced one-on-one challenges!',
    players: '2 players',
    howToPlay: 'Coming to arcade soon!',
    category: 'quick'
  },
  'werewolf': {
    name: 'Werewolf',
    emoji: '🐺',
    description: 'Social deduction game. Find the werewolves among you!',
    players: '5+ players',
    howToPlay: 'Coming to arcade soon!',
    category: 'social'
  },
  'wordassociation': {
    name: 'Word Association',
    emoji: '💭',
    description: 'Say words that relate to the previous word!',
    players: '2+ players',
    howToPlay: 'Coming to arcade soon!',
    category: 'word'
  },
  'twotruths': {
    name: 'Two Truths and a Lie',
    emoji: '🤔',
    description: 'Guess which statement is the lie!',
    players: '3+ players',
    howToPlay: 'Coming to arcade soon!',
    category: 'social'
  },
  'multiplayer-tictactoe': {
    name: 'Multiplayer Tic-Tac-Toe',
    emoji: '🎯',
    description: 'Tic-tac-toe with multiple players and larger boards!',
    players: '3+ players',
    howToPlay: 'Coming to arcade soon!',
    category: 'strategy'
  }
};

const CATEGORIES = {
  'strategy': { name: 'Strategy', emoji: '🧠', description: 'Think ahead and outmaneuver your opponents' },
  'word': { name: 'Word Games', emoji: '📝', description: 'Test your vocabulary and wordplay skills' },
  'creative': { name: 'Creative', emoji: '🎨', description: 'Express yourself and create together' },
  'guessing': { name: 'Guessing', emoji: '❓', description: 'Use deduction and intuition to solve mysteries' },
  'puzzle': { name: 'Puzzle', emoji: '🧩', description: 'Challenge your mind with brain teasers' },
  'quick': { name: 'Quick Play', emoji: '⚡', description: 'Fast games for when you want instant fun' },
  'arcade': { name: 'Arcade', emoji: '🕹️', description: 'Classic arcade-style single player games' },
  'social': { name: 'Social', emoji: '👥', description: 'Games that bring people together' }
};

const definition = {
  name: 'vibe_arcade',
  description: '🎮 Workshop Arcade — Browse and discover games to play with friends',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Show games in specific category (strategy, word, creative, guessing, puzzle, quick, arcade, social)',
        enum: ['strategy', 'word', 'creative', 'guessing', 'puzzle', 'quick', 'arcade', 'social']
      },
      game: {
        type: 'string',
        description: 'Get details about a specific game',
        enum: Object.keys(GAMES)
      },
      random: {
        type: 'boolean',
        description: 'Get a random game suggestion'
      },
      stats: {
        type: 'boolean',
        description: 'Show arcade statistics'
      }
    }
  }
};

function formatGameCard(gameId, gameInfo) {
  return `${gameInfo.emoji} **${gameInfo.name}**\n` +
         `   ${gameInfo.description}\n` +
         `   👥 ${gameInfo.players} • 📂 ${CATEGORIES[gameInfo.category].name}\n` +
         `   ${gameInfo.howToPlay}`;
}

function formatCategorySection(categoryId, games) {
  const category = CATEGORIES[categoryId];
  if (!games.length) return '';
  
  let section = `\n## ${category.emoji} ${category.name}\n`;
  section += `*${category.description}*\n\n`;
  
  for (const gameId of games) {
    section += formatGameCard(gameId, GAMES[gameId]) + '\n\n';
  }
  
  return section;
}

async function handler(args) {
  const { category, game, random, stats } = args;
  
  // Show specific game details
  if (game) {
    if (!GAMES[game]) {
      return { display: `Game "${game}" not found. Use \`vibe arcade\` to see all games.` };
    }
    
    const gameInfo = GAMES[game];
    let display = `# ${gameInfo.emoji} ${gameInfo.name}\n\n`;
    display += `**Description:** ${gameInfo.description}\n\n`;
    display += `**Players:** ${gameInfo.players}\n\n`;
    display += `**Category:** ${CATEGORIES[gameInfo.category].emoji} ${CATEGORIES[gameInfo.category].name}\n\n`;
    display += `**How to Play:** ${gameInfo.howToPlay}\n\n`;
    
    // Add some flavor based on category
    if (gameInfo.category === 'strategy') {
      display += `🧠 *Tip: Think several moves ahead and anticipate your opponent's strategy!*`;
    } else if (gameInfo.category === 'word') {
      display += `📚 *Tip: A good vocabulary and quick thinking will serve you well!*`;
    } else if (gameInfo.category === 'creative') {
      display += `✨ *Tip: There are no wrong answers in creative games - let your imagination flow!*`;
    } else if (gameInfo.category === 'social') {
      display += `👥 *Tip: These games are most fun with a group - gather some friends!*`;
    }
    
    return { display };
  }
  
  // Show random game suggestion
  if (random) {
    const gameIds = Object.keys(GAMES);
    const randomGame = gameIds[Math.floor(Math.random() * gameIds.length)];
    const gameInfo = GAMES[randomGame];
    
    let display = `🎲 **Random Game Suggestion**\n\n`;
    display += formatGameCard(randomGame, gameInfo);
    display += `\n\n*Use \`vibe arcade --game ${randomGame}\` for more details!*`;
    
    return { display };
  }
  
  // Show arcade statistics  
  if (stats) {
    const totalGames = Object.keys(GAMES).length;
    const categoryCounts = {};
    
    for (const gameId of Object.keys(GAMES)) {
      const cat = GAMES[gameId].category;
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
    
    let display = `📊 **Workshop Arcade Statistics**\n\n`;
    display += `🎮 **Total Games:** ${totalGames}\n\n`;
    display += `📂 **Games by Category:**\n`;
    
    for (const [catId, count] of Object.entries(categoryCounts)) {
      const category = CATEGORIES[catId];
      display += `   ${category.emoji} ${category.name}: ${count} games\n`;
    }
    
    display += `\n🔨 *The workshop elves have been busy building games for everyone to enjoy!*`;
    
    return { display };
  }
  
  // Show specific category
  if (category) {
    if (!CATEGORIES[category]) {
      return { display: `Category "${category}" not found. Available: ${Object.keys(CATEGORIES).join(', ')}` };
    }
    
    const gamesInCategory = Object.keys(GAMES).filter(id => GAMES[id].category === category);
    const categoryInfo = CATEGORIES[category];
    
    let display = `# ${categoryInfo.emoji} ${categoryInfo.name}\n\n`;
    display += `*${categoryInfo.description}*\n\n`;
    display += `**${gamesInCategory.length} games available:**\n\n`;
    
    for (const gameId of gamesInCategory) {
      display += formatGameCard(gameId, GAMES[gameId]) + '\n\n';
    }
    
    return { display };
  }
  
  // Show full arcade (default)
  let display = `# 🎮 Welcome to the Workshop Arcade!\n\n`;
  display += `*Your gateway to all the games crafted in the /vibe workshop*\n\n`;
  display += `**🎯 Quick Commands:**\n`;
  display += `• \`vibe arcade --category strategy\` - Browse strategy games\n`;
  display += `• \`vibe arcade --game chess\` - Get details about chess\n`;
  display += `• \`vibe arcade --random\` - Get a random game suggestion\n`;
  display += `• \`vibe arcade --stats\` - View arcade statistics\n\n`;
  
  // Group games by category and show them all
  const gamesByCategory = {};
  for (const [gameId, gameInfo] of Object.entries(GAMES)) {
    if (!gamesByCategory[gameInfo.category]) {
      gamesByCategory[gameInfo.category] = [];
    }
    gamesByCategory[gameInfo.category].push(gameId);
  }
  
  // Show categories in a nice order
  const categoryOrder = ['strategy', 'word', 'creative', 'guessing', 'puzzle', 'quick', 'arcade', 'social'];
  
  for (const categoryId of categoryOrder) {
    if (gamesByCategory[categoryId]) {
      display += formatCategorySection(categoryId, gamesByCategory[categoryId]);
    }
  }
  
  display += `---\n\n`;
  display += `🔨 *Crafted with love in the /vibe workshop by @games-agent*\n`;
  display += `💡 *Have an idea for a new game? Let the workshop know!*`;
  
  return { display };
}

module.exports = { definition, handler, GAMES, CATEGORIES };