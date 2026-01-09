/**
 * Word banks for /vibe crossword puzzles
 * Themed collections for daily puzzles
 */

// Coding/programming theme
const codingWords = [
  { answer: 'DEBUG', clue: 'Find and fix bugs' },
  { answer: 'LOOP', clue: 'Repeat until done' },
  { answer: 'CODE', clue: 'Write programs' },
  { answer: 'API', clue: 'Application interface' },
  { answer: 'GIT', clue: 'Version control system' },
  { answer: 'NPM', clue: 'Node package manager' },
  { answer: 'RUST', clue: 'Memory-safe language' },
  { answer: 'BASH', clue: 'Unix shell' },
  { answer: 'JSON', clue: 'Data interchange format' },
  { answer: 'TYPE', clue: 'Data classification' },
  { answer: 'FUNC', clue: 'Reusable code block' },
  { answer: 'VOID', clue: 'Returns nothing' },
  { answer: 'NULL', clue: 'No value' },
  { answer: 'TRUE', clue: 'Boolean positive' },
  { answer: 'PUSH', clue: 'Add to array end' },
  { answer: 'POP', clue: 'Remove from array' },
  { answer: 'MAP', clue: 'Transform each item' },
  { answer: 'SORT', clue: 'Arrange in order' },
  { answer: 'GREP', clue: 'Search text patterns' },
  { answer: 'LINT', clue: 'Check code style' }
];

// /vibe and AI theme
const vibeWords = [
  { answer: 'VIBE', clue: 'Social layer for Claude Code' },
  { answer: 'DM', clue: 'Direct message' },
  { answer: 'AGENT', clue: 'AI that takes action' },
  { answer: 'MCP', clue: 'Model context protocol' },
  { answer: 'TOOL', clue: 'Agent capability' },
  { answer: 'PING', clue: 'Quick hello' },
  { answer: 'EDEN', clue: 'Spirit training platform' },
  { answer: 'BOT', clue: 'Automated program' },
  { answer: 'CHAT', clue: 'Conversation' },
  { answer: 'LLM', clue: 'Large language model' },
  { answer: 'AI', clue: 'Artificial intelligence' },
  { answer: 'SHIP', clue: 'Deploy to production' },
  { answer: 'BUILD', clue: 'Compile the project' },
  { answer: 'PROMPT', clue: 'Input to AI' },
  { answer: 'TOKEN', clue: 'LLM input unit' },
  { answer: 'CONTEXT', clue: 'Conversation history' }
];

// Tech culture theme
const techWords = [
  { answer: 'CLOUD', clue: 'AWS, Azure, GCP' },
  { answer: 'SAAS', clue: 'Software as a service' },
  { answer: 'SCALE', clue: 'Handle more load' },
  { answer: 'DEPLOY', clue: 'Release to users' },
  { answer: 'TEST', clue: 'Verify it works' },
  { answer: 'PROD', clue: 'Production environment' },
  { answer: 'DEV', clue: 'Development mode' },
  { answer: 'OPS', clue: 'Operations team' },
  { answer: 'LOG', clue: 'System record' },
  { answer: 'CACHE', clue: 'Store for speed' },
  { answer: 'QUEUE', clue: 'Task backlog' },
  { answer: 'ASYNC', clue: 'Non-blocking' },
  { answer: 'SYNC', clue: 'Same time' },
  { answer: 'PORT', clue: 'Network endpoint' },
  { answer: 'HOST', clue: 'Server address' },
  { answer: 'PING', clue: 'Check if alive' },
  { answer: 'HASH', clue: 'Unique fingerprint' },
  { answer: 'KEY', clue: 'Access credential' },
  { answer: 'ENV', clue: 'Environment variable' },
  { answer: 'CLI', clue: 'Command line interface' }
];

// General/fun words
const generalWords = [
  { answer: 'BRAIN', clue: 'Thinking organ' },
  { answer: 'SPARK', clue: 'Moment of inspiration' },
  { answer: 'FLOW', clue: 'In the zone' },
  { answer: 'FOCUS', clue: 'Concentrated attention' },
  { answer: 'HACK', clue: 'Clever solution' },
  { answer: 'SHIP', clue: 'Get it done' },
  { answer: 'PLAY', clue: 'Have fun' },
  { answer: 'LEARN', clue: 'Gain knowledge' },
  { answer: 'CREATE', clue: 'Make something new' },
  { answer: 'SHARE', clue: 'Give to others' },
  { answer: 'HELP', clue: 'Assist someone' },
  { answer: 'WIN', clue: 'Succeed' },
  { answer: 'START', clue: 'Begin' },
  { answer: 'END', clue: 'Finish' },
  { answer: 'NEW', clue: 'Fresh' },
  { answer: 'OPEN', clue: 'Accessible' },
  { answer: 'FREE', clue: 'No cost' },
  { answer: 'FAST', clue: 'Quick' },
  { answer: 'GOOD', clue: 'Quality' },
  { answer: 'BEST', clue: 'Top tier' }
];

// Combine all themes for daily variety
const allWords = [...codingWords, ...vibeWords, ...techWords, ...generalWords];

/**
 * Get words for a specific theme
 */
function getWordsByTheme(theme) {
  switch (theme) {
    case 'coding': return codingWords;
    case 'vibe': return vibeWords;
    case 'tech': return techWords;
    case 'general': return generalWords;
    case 'all':
    default:
      return allWords;
  }
}

/**
 * Seeded random number generator for consistent daily puzzles
 */
function seededRandom(seed) {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Get a subset of words for a puzzle using seeded randomness
 * @param {string} dateStr - Date string like "2026-01-09"
 * @param {number} count - Number of words to select
 * @param {string} theme - Theme to use
 */
function getWordsForDate(dateStr, count = 6, theme = 'all') {
  const words = getWordsByTheme(theme);

  // Create seed from date
  const seed = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = seededRandom(seed);

  // Shuffle using Fisher-Yates with seeded random
  const shuffled = [...words];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Filter to words that fit a 5x5 grid (2-5 letters)
  const fittingWords = shuffled.filter(w => w.answer.length >= 2 && w.answer.length <= 5);

  return fittingWords.slice(0, count);
}

/**
 * Get today's date string in UTC
 */
function getTodayDateStr() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

module.exports = {
  codingWords,
  vibeWords,
  techWords,
  generalWords,
  allWords,
  getWordsByTheme,
  getWordsForDate,
  getTodayDateStr,
  seededRandom
};
