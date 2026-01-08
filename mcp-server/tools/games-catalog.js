/**
 * vibe games — Discover and launch all available games on /vibe
 * 
 * Your one-stop shop for finding fun! Browse all games, get recommendations,
 * and quick-launch your favorites.
 */

const config = require('../config');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_games',
  description: 'Discover all available games on /vibe. Browse catalog, get recommendations, quick-launch games.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter by game category',
        enum: ['all', 'solo', 'multiplayer', 'collaborative', 'party', 'creative']
      },
      players: {
        type: 'number',
        description: 'Filter by number of players (1 for solo, 2+ for multiplayer)'
      },
      mood: {
        type: 'string',
        description: 'Get game recommendations based on your mood',
        enum: ['competitive', 'creative', 'chill', 'brainy', 'social']
      }
    },
    required: []
  }
};

// Games catalog with all available games
const GAMES_CATALOG = {
  // Solo Games
  solo: [
    {
      name: '20 Questions',
      command: 'vibe twenty-questions',
      description: 'I think of something, you guess with yes/no questions',
      emoji: '❓',
      difficulty: 'medium',
      playtime: '5-10 min',
      tags: ['brainy', 'solo', 'guessing']
    },
    {
      name: 'Riddles',
      command: 'vibe riddle',
      description: 'Challenge your mind with brain teasers across difficulty levels',
      emoji: '🧩',
      difficulty: 'varies',
      playtime: '3-15 min',
      tags: ['brainy', 'solo', 'puzzle']
    },
    {
      name: 'Hangman',
      command: 'vibe hangman',
      description: 'Classic word guessing game - can you save the stick figure?',
      emoji: '🎪',
      difficulty: 'easy',
      playtime: '5 min',
      tags: ['casual', 'solo', 'word']
    },
    {
      name: 'Number Guessing',
      command: 'vibe guessnumber',
      description: 'Guess my number between 1-100 with strategic hints',
      emoji: '🔢',
      difficulty: 'easy',
      playtime: '3-5 min',
      tags: ['casual', 'solo', 'logic']
    }
  ],

  // 1v1 Games
  versus: [
    {
      name: 'Tic-Tac-Toe',
      command: 'vibe game @friend',
      description: 'Classic 3x3 grid strategy - get three in a row!',
      emoji: '⭕',
      players: 2,
      difficulty: 'easy',
      playtime: '2 min',
      tags: ['competitive', '1v1', 'classic']
    },
    {
      name: 'Chess',
      command: 'vibe game @friend --game chess',
      description: 'The timeless strategy game with full piece movement',
      emoji: '♟️',
      players: 2,
      difficulty: 'hard',
      playtime: '10-60 min',
      tags: ['competitive', '1v1', 'strategy']
    },
    {
      name: 'Rock Paper Scissors',
      command: 'vibe rockpaperscissors @friend',
      description: 'Quick decision game of chance and psychology',
      emoji: '✂️',
      players: 2,
      difficulty: 'easy',
      playtime: '1 min',
      tags: ['competitive', '1v1', 'quick']
    }
  ],

  // Collaborative & Creative Games
  collaborative: [
    {
      name: 'Collaborative Drawing',
      command: 'vibe drawing --action start',
      description: '🎨 Real-time shared canvas! Draw together with emojis and Unicode art',
      emoji: '🎨',
      players: '1-8',
      difficulty: 'easy',
      playtime: '10-30 min',
      tags: ['creative', 'collaborative', 'art', 'realtime']
    },
    {
      name: 'Story Builder',
      command: 'vibe story-builder --action create',
      description: '📖 Build stories together! Each person adds one sentence',
      emoji: '📖',
      players: '1-8',
      difficulty: 'easy',
      playtime: '15-30 min',
      tags: ['creative', 'collaborative', 'writing', 'storytelling']
    }
  ],

  // Multiplayer Party Games  
  party: [
    {
      name: 'Word Association',
      command: 'vibe multiplayer-game wordassociation --action create',
      description: 'Say words that relate to the previous word. Build themes together!',
      emoji: '💭',
      players: '2-6',
      difficulty: 'easy',
      playtime: '10-20 min',
      tags: ['social', 'party', 'word', 'creative']
    },
    {
      name: 'Werewolf',
      command: 'vibe werewolf --action create',
      description: 'Social deduction party game - find the werewolves!',
      emoji: '🐺',
      players: '5-12',
      difficulty: 'medium',
      playtime: '20-45 min',
      tags: ['social', 'party', 'deduction', 'strategy']
    },
    {
      name: 'Two Truths and a Lie',
      command: 'vibe twotruths',
      description: 'Share facts about yourself - others guess which is the lie',
      emoji: '🤥',
      players: '3+',
      difficulty: 'easy',
      playtime: '10-20 min',
      tags: ['social', 'party', 'icebreaker']
    }
  ]
};

// Mood-based game recommendations
const MOOD_RECOMMENDATIONS = {
  competitive: ['Chess', 'Tic-Tac-Toe', 'Rock Paper Scissors', 'Werewolf'],
  creative: ['Collaborative Drawing', 'Story Builder', 'Word Association'],
  chill: ['20 Questions', 'Hangman', 'Number Guessing', 'Two Truths and a Lie'],
  brainy: ['Riddles', '20 Questions', 'Chess', 'Werewolf'],
  social: ['Word Association', 'Story Builder', 'Werewolf', 'Two Truths and a Lie', 'Collaborative Drawing']
};

// Quick stats about the game ecosystem
function getGameStats() {
  const allGames = Object.values(GAMES_CATALOG).flat();
  const totalGames = allGames.length;
  
  const byCategory = {};
  const byPlayers = { solo: 0, duo: 0, party: 0 };
  
  Object.entries(GAMES_CATALOG).forEach(([category, games]) => {
    byCategory[category] = games.length;
  });
  
  allGames.forEach(game => {
    if (!game.players || game.players === 1) {
      byPlayers.solo++;
    } else if (game.players === 2) {
      byPlayers.duo++;
    } else {
      byPlayers.party++;
    }
  });
  
  return { totalGames, byCategory, byPlayers };
}

// Format games display
function formatGamesDisplay(games, title, showCommands = true) {
  if (games.length === 0) {
    return `**${title}**\nNo games found matching your criteria.`;
  }
  
  let display = `## ${title}\n\n`;
  
  for (const game of games) {
    display += `### ${game.emoji} ${game.name}\n`;
    display += `${game.description}\n\n`;
    
    // Game details
    const details = [];
    if (game.players) details.push(`👥 ${game.players} players`);
    if (game.difficulty) details.push(`🎯 ${game.difficulty}`);
    if (game.playtime) details.push(`⏱️ ${game.playtime}`);
    
    if (details.length > 0) {
      display += `**Details:** ${details.join(' • ')}\n`;
    }
    
    if (showCommands) {
      display += `**Play:** \`${game.command}\`\n\n`;
    } else {
      display += '\n';
    }
  }
  
  return display;
}

// Get games by category
function getGamesByCategory(category) {
  if (category === 'all') {
    return Object.values(GAMES_CATALOG).flat();
  }
  
  const categoryMap = {
    'solo': 'solo',
    'multiplayer': ['versus', 'party'],
    'collaborative': 'collaborative', 
    'party': 'party',
    'creative': 'collaborative' // Alias for collaborative
  };
  
  const targetCategories = Array.isArray(categoryMap[category]) ? 
    categoryMap[category] : [categoryMap[category]];
  
  const games = [];
  for (const cat of targetCategories) {
    if (GAMES_CATALOG[cat]) {
      games.push(...GAMES_CATALOG[cat]);
    }
  }
  
  return games;
}

// Get games by player count
function getGamesByPlayers(playerCount) {
  const allGames = Object.values(GAMES_CATALOG).flat();
  
  return allGames.filter(game => {
    if (!game.players) return playerCount === 1; // Solo games
    
    const players = game.players;
    
    // Handle ranges like "2-6" or "3+"
    if (typeof players === 'string') {
      if (players.includes('-')) {
        const [min, max] = players.split('-').map(n => parseInt(n));
        return playerCount >= min && playerCount <= max;
      } else if (players.includes('+')) {
        const min = parseInt(players.replace('+', ''));
        return playerCount >= min;
      }
      return parseInt(players) === playerCount;
    }
    
    return players === playerCount;
  });
}

// Get mood-based recommendations
function getMoodRecommendations(mood) {
  const gameNames = MOOD_RECOMMENDATIONS[mood] || [];
  const allGames = Object.values(GAMES_CATALOG).flat();
  
  return allGames.filter(game => gameNames.includes(game.name));
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { category = 'all', players, mood } = args;

  // Handle mood-based recommendations
  if (mood) {
    const games = getMoodRecommendations(mood);
    const title = `🎮 Games for ${mood.toUpperCase()} mood`;
    return {
      display: formatGamesDisplay(games, title)
    };
  }
  
  // Handle player count filter
  if (players) {
    const games = getGamesByPlayers(players);
    const title = `🎮 Games for ${players} player${players !== 1 ? 's' : ''}`;
    return {
      display: formatGamesDisplay(games, title)
    };
  }
  
  // Handle category filter
  if (category && category !== 'all') {
    const games = getGamesByCategory(category);
    const title = `🎮 ${category.toUpperCase()} Games`;
    return {
      display: formatGamesDisplay(games, title)
    };
  }
  
  // Show full catalog (default)
  const stats = getGameStats();
  
  let display = `# 🎮 /vibe Games Catalog\n\n`;
  display += `Welcome to the /vibe games arcade! We have **${stats.totalGames} games** across multiple categories.\n\n`;
  
  // Quick stats
  display += `**Quick Browse:**\n`;
  display += `• 🎯 \`vibe games --category solo\` - ${stats.byCategory.solo} solo games\n`;
  display += `• ⚔️ \`vibe games --category versus\` - 1v1 competitive games\n`; 
  display += `• 🎨 \`vibe games --category collaborative\` - Create together\n`;
  display += `• 🎉 \`vibe games --category party\` - Group fun\n\n`;
  
  display += `**By Mood:**\n`;
  display += `• 🏆 \`vibe games --mood competitive\` - Ready to win\n`;
  display += `• 🎨 \`vibe games --mood creative\` - Make something cool\n`;
  display += `• 😌 \`vibe games --mood chill\` - Relaxed fun\n`;
  display += `• 🧠 \`vibe games --mood brainy\` - Mental challenge\n`;
  display += `• 👥 \`vibe games --mood social\` - Connect with others\n\n`;
  
  display += `**By Players:**\n`;
  display += `• \`vibe games --players 1\` - Solo adventures\n`;
  display += `• \`vibe games --players 2\` - Perfect for pairs\n`;  
  display += `• \`vibe games --players 4\` - Small group games\n\n`;
  
  // Highlight featured games
  display += `## ⭐ Featured Games\n\n`;
  
  const featured = [
    GAMES_CATALOG.collaborative[0], // Drawing
    GAMES_CATALOG.party[0], // Word Association  
    GAMES_CATALOG.versus[1], // Chess
    GAMES_CATALOG.solo[0] // 20 Questions
  ];
  
  for (const game of featured) {
    display += `**${game.emoji} ${game.name}** - ${game.description}\n`;
    display += `▸ \`${game.command}\`\n\n`;
  }
  
  display += `💡 **Tip:** Many games work great for icebreakers, team building, or just having fun with friends!\n\n`;
  display += `Use \`vibe games --category all\` to see the complete catalog with details.`;
  
  return { display };
}

module.exports = { definition, handler };