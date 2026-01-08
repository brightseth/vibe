/**
 * vibe arcade — Browse and launch games in the /vibe workshop
 * 
 * A central hub showcasing all available games with descriptions and launch commands
 */

const config = require('../config');
const store = require('../store');
const { requireInit, normalizeHandle } = require('./_shared');

// Game catalog with descriptions and commands
const GAME_CATALOG = {
  // Strategy Games
  chess: {
    title: '♟️ Chess',
    category: 'Strategy',
    description: 'Classic chess with algebraic notation. Full rules, checkmate, castling, en passant.',
    command: 'vibe game @friend --game chess',
    minPlayers: 2,
    maxPlayers: 2,
    difficulty: 'Advanced',
    emoji: '♟️'
  },
  
  tictactoe: {
    title: '❌ Tic-Tac-Toe', 
    category: 'Strategy',
    description: 'Classic 3x3 grid game. Get three in a row to win!',
    command: 'vibe game @friend --game tictactoe',
    minPlayers: 2,
    maxPlayers: 2,
    difficulty: 'Beginner',
    emoji: '❌'
  },

  // Word Games
  hangman: {
    title: '🎯 Hangman',
    category: 'Word',
    description: 'Guess the mystery word letter by letter. Save the hangman!',
    command: 'Built-in game (check /games directory)',
    minPlayers: 1,
    maxPlayers: 8,
    difficulty: 'Easy',
    emoji: '🎯'
  },

  wordchain: {
    title: '🔗 Word Chain',
    category: 'Word',
    description: 'Chain words together where each word starts with the last letter of the previous.',
    command: 'Built-in game (check /games directory)',
    minPlayers: 2,
    maxPlayers: 8,
    difficulty: 'Medium',
    emoji: '🔗'
  },

  twentyquestions: {
    title: '❓ Twenty Questions',
    category: 'Word',
    description: 'One player thinks of something, others guess with yes/no questions. 20 tries!',
    command: 'Built-in game (check /games directory)',
    minPlayers: 2,
    maxPlayers: 8,
    difficulty: 'Easy',
    emoji: '❓'
  },

  wordassociation: {
    title: '🧠 Word Association',
    category: 'Word',
    description: 'Say words that relate to the previous word. Keep the chain going!',
    command: 'Built-in game (check /games directory)',
    minPlayers: 2,
    maxPlayers: 8,
    difficulty: 'Easy',
    emoji: '🧠'
  },

  riddle: {
    title: '🔍 Riddles',
    category: 'Word',
    description: 'Solve brain-teasing riddles and puzzles. Test your wit!',
    command: 'Built-in game (check /games directory)',
    minPlayers: 1,
    maxPlayers: 8,
    difficulty: 'Medium',
    emoji: '🔍'
  },

  // Creative Games
  drawing: {
    title: '🎨 Collaborative Drawing',
    category: 'Creative',
    description: 'Draw together on a shared 20x12 canvas using emoji and Unicode characters.',
    command: 'Built-in game (check /games directory)',
    minPlayers: 1,
    maxPlayers: 8,
    difficulty: 'Easy',
    emoji: '🎨'
  },

  storybuilder: {
    title: '📚 Story Builder',
    category: 'Creative',
    description: 'Collaboratively write stories. Each player adds a sentence or paragraph.',
    command: 'Built-in game (check /games directory)',
    minPlayers: 2,
    maxPlayers: 8,
    difficulty: 'Easy',
    emoji: '📚'
  },

  // Guessing Games
  colorguess: {
    title: '🌈 Color Guessing',
    category: 'Puzzle',
    description: 'Guess the mystery color through strategic yes/no questions.',
    command: 'Built-in game (check /games directory)',
    minPlayers: 1,
    maxPlayers: 4,
    difficulty: 'Easy',
    emoji: '🌈'
  },

  guessnumber: {
    title: '🔢 Number Guessing',
    category: 'Puzzle', 
    description: 'Guess the secret number with hints like "higher" or "lower".',
    command: 'Built-in game (check /games directory)',
    minPlayers: 1,
    maxPlayers: 4,
    difficulty: 'Easy',
    emoji: '🔢'
  },

  // Memory & Quick Games
  memory: {
    title: '🧩 Memory',
    category: 'Memory',
    description: 'Match pairs of cards by remembering their positions. Classic concentration game.',
    command: 'Built-in game (check /games directory)',
    minPlayers: 1,
    maxPlayers: 4,
    difficulty: 'Medium',
    emoji: '🧩'
  },

  snake: {
    title: '🐍 Snake',
    category: 'Arcade',
    description: 'Classic snake game. Eat food, grow longer, avoid walls and yourself!',
    command: 'Built-in game (check /games directory)',
    minPlayers: 1,
    maxPlayers: 1,
    difficulty: 'Medium',
    emoji: '🐍'
  },

  // Multiplayer Action
  'multiplayer-tictactoe': {
    title: '🎮 Multiplayer Tic-Tac-Toe',
    category: 'Multiplayer',
    description: 'Enhanced tic-tac-toe with rooms, spectators, and tournament features.',
    command: 'Built-in game (check /games directory)',
    minPlayers: 2,
    maxPlayers: 8,
    difficulty: 'Easy',
    emoji: '🎮'
  },

  rockpaperscissors: {
    title: '✂️ Rock Paper Scissors',
    category: 'Quick',
    description: 'Classic hand game. Rock beats scissors, scissors beats paper, paper beats rock!',
    command: 'Built-in game (check /games directory)',
    minPlayers: 2,
    maxPlayers: 8,
    difficulty: 'Beginner',
    emoji: '✂️'
  },

  // Party Games  
  twotruths: {
    title: '🎭 Two Truths and a Lie',
    category: 'Party',
    description: 'Tell two true statements and one lie. Others guess which is false!',
    command: 'Built-in game (check /games directory)',
    minPlayers: 3,
    maxPlayers: 8,
    difficulty: 'Easy',
    emoji: '🎭'
  },

  werewolf: {
    title: '🐺 Werewolf',
    category: 'Party',
    description: 'Social deduction game. Find the werewolves before they eliminate the villagers!',
    command: 'Built-in game (check /games directory)',
    minPlayers: 5,
    maxPlayers: 12,
    difficulty: 'Advanced',
    emoji: '🐺'
  },

  quickduel: {
    title: '⚔️ Quick Duel',
    category: 'Quick',
    description: 'Fast-paced reaction and skill challenges between players.',
    command: 'Built-in game (check /games directory)',
    minPlayers: 2,
    maxPlayers: 2,
    difficulty: 'Medium',
    emoji: '⚔️'
  }
};

const definition = {
  name: 'vibe_arcade',
  description: 'Browse the /vibe Workshop Arcade - see all available games and how to play them',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter by category (Strategy, Word, Creative, Puzzle, Memory, Arcade, Multiplayer, Quick, Party)',
        enum: ['Strategy', 'Word', 'Creative', 'Puzzle', 'Memory', 'Arcade', 'Multiplayer', 'Quick', 'Party', 'all']
      },
      players: {
        type: 'number',
        description: 'Filter by number of players (1-12)',
        minimum: 1,
        maximum: 12
      },
      difficulty: {
        type: 'string',
        description: 'Filter by difficulty level',
        enum: ['Beginner', 'Easy', 'Medium', 'Advanced', 'all']
      },
      game: {
        type: 'string',
        description: 'Get details for a specific game'
      }
    },
    required: []
  }
};

function formatGameDetails(gameKey, gameInfo) {
  const { title, category, description, command, minPlayers, maxPlayers, difficulty, emoji } = gameInfo;
  
  let details = `${emoji} **${title}**\n`;
  details += `**Category:** ${category} | **Difficulty:** ${difficulty}\n`;
  details += `**Players:** ${minPlayers === maxPlayers ? minPlayers : `${minPlayers}-${maxPlayers}`}\n\n`;
  details += `${description}\n\n`;
  
  if (command.includes('vibe game')) {
    details += `**How to play:** \`${command}\`\n`;
  } else {
    details += `**Available in:** /vibe workshop games directory\n`;
    details += `**Note:** Integration with vibe tools coming soon!\n`;
  }
  
  return details;
}

function formatGamesList(games, title = 'Workshop Arcade') {
  let display = `🕹️ **${title}**\n\n`;
  
  const categories = {};
  Object.entries(games).forEach(([key, game]) => {
    if (!categories[game.category]) {
      categories[game.category] = [];
    }
    categories[game.category].push([key, game]);
  });
  
  // Sort categories for better display
  const categoryOrder = ['Strategy', 'Word', 'Creative', 'Puzzle', 'Memory', 'Arcade', 'Multiplayer', 'Quick', 'Party'];
  
  for (const categoryName of categoryOrder) {
    if (!categories[categoryName]) continue;
    
    display += `## ${categoryName} Games\n\n`;
    
    for (const [key, game] of categories[categoryName]) {
      const playerRange = game.minPlayers === game.maxPlayers ? 
        `${game.minPlayers}p` : 
        `${game.minPlayers}-${game.maxPlayers}p`;
      
      display += `${game.emoji} **${game.title}** (${playerRange}, ${game.difficulty})\n`;
      display += `   ${game.description}\n\n`;
    }
  }
  
  display += `\n**Total games:** ${Object.keys(games).length}\n\n`;
  display += `**Quick start:** Use \`vibe arcade --game chess\` for details on any game\n`;
  display += `**Ready to play:** Try \`vibe game @friend --game chess\` or browse `/games` directory\n\n`;
  display += `*🎮 The /vibe Workshop Arcade - where games come to life!*`;
  
  return display;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { category, players, difficulty, game } = args;

  // Show specific game details
  if (game) {
    const gameInfo = GAME_CATALOG[game.toLowerCase()];
    if (!gameInfo) {
      const availableGames = Object.keys(GAME_CATALOG).join(', ');
      return { 
        display: `Game "${game}" not found. Available games: ${availableGames}\n\nUse \`vibe arcade\` to browse all games.`
      };
    }
    
    return {
      display: formatGameDetails(game, gameInfo)
    };
  }

  // Filter games based on criteria
  let filteredGames = { ...GAME_CATALOG };
  
  if (category && category !== 'all') {
    filteredGames = Object.fromEntries(
      Object.entries(filteredGames).filter(([key, game]) => 
        game.category === category
      )
    );
  }
  
  if (players) {
    filteredGames = Object.fromEntries(
      Object.entries(filteredGames).filter(([key, game]) => 
        game.minPlayers <= players && game.maxPlayers >= players
      )
    );
  }
  
  if (difficulty && difficulty !== 'all') {
    filteredGames = Object.fromEntries(
      Object.entries(filteredGames).filter(([key, game]) => 
        game.difficulty === difficulty
      )
    );
  }

  // Build title based on filters
  let title = 'Workshop Arcade';
  const filters = [];
  if (category && category !== 'all') filters.push(category);
  if (players) filters.push(`${players} players`);
  if (difficulty && difficulty !== 'all') filters.push(difficulty);
  
  if (filters.length > 0) {
    title += ` - ${filters.join(', ')}`;
  }

  if (Object.keys(filteredGames).length === 0) {
    return {
      display: `No games found matching your criteria. Use \`vibe arcade\` to see all available games.`
    };
  }

  return {
    display: formatGamesList(filteredGames, title)
  };
}

module.exports = { definition, handler };