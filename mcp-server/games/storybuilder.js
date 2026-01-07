/**
 * Story Builder game implementation for /vibe
 * A collaborative storytelling game where players take turns adding one sentence
 * Build creative stories together with friends!
 */

// Story prompts to help start interesting stories
const STORY_PROMPTS = [
  "It was a dark and stormy night when the mysterious package arrived...",
  "The old lighthouse keeper discovered something impossible in the basement...",
  "Sarah woke up to find that everyone in town had vanished except her...",
  "The time machine worked perfectly, except for one small problem...",
  "The AI assistant started behaving strangely after the update...",
  "In the year 2087, the last library on Earth received an unexpected visitor...",
  "The cat came home wearing a tiny suit and carrying a briefcase...",
  "When the elevator doors opened on floor 13, it wasn't floor 13 at all...",
  "The dragon apologized profusely for burning down the village...",
  "Every mirror in the house started showing a different reflection...",
  "The food truck only appeared at midnight, and only sold memories...",
  "After 20 years in space, the astronaut returned to find Earth very different...",
  "The magic spell worked, but not quite as intended...",
  "The robot barista made the perfect coffee, but refused to serve humans...",
  "Deep in the Amazon, the explorer found a city that didn't exist on any map..."
];

// Story genres and their characteristics
const GENRES = {
  mystery: {
    name: "Mystery",
    prompts: [
      "The detective found a clue that changed everything...",
      "The locked room had no windows, no secret passages, yet someone had escaped...",
      "The witness's story had one fatal flaw..."
    ],
    endings: ["Who was the real culprit?", "What was the missing piece?", "How did they solve the case?"]
  },
  scifi: {
    name: "Science Fiction", 
    prompts: [
      "The spacecraft's AI began questioning its own programming...",
      "The new planet looked perfect for colonization, until they discovered...",
      "Time travel was possible, but came with unexpected consequences..."
    ],
    endings: ["What did technology make possible?", "How did they adapt to the future?", "What was discovered in space?"]
  },
  fantasy: {
    name: "Fantasy",
    prompts: [
      "The ancient prophecy was coming true, but backwards...",
      "The wizard's apprentice accidentally unleashed something from the forbidden grimoire...",
      "The enchanted forest began whispering warnings to travelers..."
    ],
    endings: ["What magical power was revealed?", "How was the kingdom saved?", "What did the prophecy really mean?"]
  },
  comedy: {
    name: "Comedy",
    prompts: [
      "The superhero's greatest weakness turned out to be absolutely ridiculous...",
      "The cooking show went horribly wrong when the mystery ingredient was revealed...",
      "The world's worst spy somehow kept succeeding by accident..."
    ],
    endings: ["What was the hilarious misunderstanding?", "How did chaos lead to success?", "What was the ridiculous twist?"]
  }
};

// Create initial story builder state
function createInitialStoryBuilderState(genre = null, customPrompt = null) {
  let prompt;
  let selectedGenre = 'general';
  
  if (customPrompt) {
    prompt = customPrompt;
    selectedGenre = 'custom';
  } else if (genre && GENRES[genre]) {
    selectedGenre = genre;
    const genrePrompts = GENRES[genre].prompts;
    prompt = genrePrompts[Math.floor(Math.random() * genrePrompts.length)];
  } else {
    prompt = STORY_PROMPTS[Math.floor(Math.random() * STORY_PROMPTS.length)];
  }

  return {
    sentences: [prompt],
    players: [],
    currentPlayer: null,
    moves: 1, // Prompt counts as move 1
    gameOver: false,
    maxSentences: 20, // End after 20 sentences for now
    genre: selectedGenre,
    playerTurnIndex: 0,
    prompt: prompt,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    wordCount: prompt.split(' ').length
  };
}

// Add player to story
function addPlayer(gameState, playerHandle) {
  if (gameState.players.includes(playerHandle)) {
    return { error: 'Player already in the story!' };
  }

  if (gameState.players.length >= 8) {
    return { error: 'Story is full (max 8 storytellers)' };
  }

  const newPlayers = [...gameState.players, playerHandle];
  
  return {
    success: true,
    gameState: {
      ...gameState,
      players: newPlayers,
      currentPlayer: gameState.currentPlayer || playerHandle // First player starts
    }
  };
}

// Add a sentence to the story
function addSentence(gameState, sentence, playerHandle) {
  const { sentences, players, currentPlayer, moves, maxSentences } = gameState;
  
  // Clean and validate sentence
  const cleanSentence = sentence.trim();
  
  if (!cleanSentence) {
    return { error: 'Sentence cannot be empty!' };
  }
  
  if (cleanSentence.length > 500) {
    return { error: 'Sentence too long! Keep it under 500 characters.' };
  }
  
  // Check if it's the right player's turn (if multiplayer)
  if (players.length > 1 && currentPlayer !== playerHandle) {
    return { error: `Not your turn! Waiting for @${currentPlayer}` };
  }
  
  // Add proper punctuation if missing
  let finalSentence = cleanSentence;
  if (!/[.!?]$/.test(finalSentence)) {
    finalSentence += '.';
  }
  
  // Update story
  const newSentences = [...sentences, finalSentence];
  const newMoves = moves + 1;
  const newWordCount = gameState.wordCount + finalSentence.split(' ').length;
  
  // Determine next player
  let nextPlayerIndex = gameState.playerTurnIndex;
  let nextPlayer = currentPlayer;
  
  if (players.length > 1) {
    nextPlayerIndex = (gameState.playerTurnIndex + 1) % players.length;
    nextPlayer = players[nextPlayerIndex];
  }
  
  // Check if story should end
  const shouldEnd = newMoves >= maxSentences;
  
  const newGameState = {
    ...gameState,
    sentences: newSentences,
    currentPlayer: shouldEnd ? null : nextPlayer,
    playerTurnIndex: nextPlayerIndex,
    moves: newMoves,
    gameOver: shouldEnd,
    lastActivity: new Date().toISOString(),
    wordCount: newWordCount,
    lastContributor: playerHandle
  };
  
  return { success: true, gameState: newGameState };
}

// Format story builder display
function formatStoryBuilderDisplay(gameState) {
  const { sentences, players, currentPlayer, moves, gameOver, maxSentences, genre, wordCount, prompt } = gameState;
  
  let display = `📖 **Collaborative Story** (${moves}/${maxSentences} sentences)\n\n`;
  
  if (genre !== 'general' && genre !== 'custom') {
    display += `**Genre:** ${GENRES[genre]?.name || genre}\n\n`;
  }
  
  if (gameOver) {
    display += '🎉 **Story Complete!** What an adventure!\n\n';
  }
  
  // Show the story
  display += '**The Story So Far:**\n';
  display += '```\n';
  
  // Show all sentences with paragraph breaks every 3-4 sentences
  let storyText = '';
  for (let i = 0; i < sentences.length; i++) {
    storyText += sentences[i];
    
    // Add paragraph break every 3-4 sentences for readability
    if ((i + 1) % 3 === 0 && i < sentences.length - 1) {
      storyText += '\n\n';
    } else if (i < sentences.length - 1) {
      storyText += ' ';
    }
  }
  
  display += storyText + '\n```\n\n';
  
  // Show stats
  display += `**Stats:** ${sentences.length} sentences, ${wordCount} words\n\n`;
  
  // Show players if multiplayer
  if (players.length > 1) {
    display += `**Storytellers (${players.length}):** ${players.map(p => `@${p}`).join(', ')}\n\n`;
  }
  
  if (!gameOver) {
    if (players.length > 1) {
      display += `**@${currentPlayer}, continue the story!**\n`;
    } else if (players.length === 1) {
      display += '**Your turn! Add the next sentence.**\n';
    } else {
      display += '**Join the story and add the next sentence!**\n';
    }
    
    // Show helpful prompts based on story length
    if (sentences.length < 5) {
      display += 'Building the scene...';
    } else if (sentences.length < 10) {
      display += 'Developing the plot...';
    } else if (sentences.length < 15) {
      display += 'Heading toward the climax...';
    } else {
      display += 'Time to wrap up the story!';
    }
  } else {
    // Show completion message with genre-specific ending questions
    if (genre && GENRES[genre] && GENRES[genre].endings) {
      const endings = GENRES[genre].endings;
      const randomEnding = endings[Math.floor(Math.random() * endings.length)];
      display += `**Reflection:** ${randomEnding}`;
    } else {
      display += '**What a creative journey! Thanks to all the storytellers!**';
    }
  }
  
  return display;
}

// Get story statistics
function getStoryStats(gameState) {
  const { sentences, players } = gameState;
  
  if (sentences.length <= 1) return null; // Just the prompt
  
  // Calculate statistics
  const totalWords = gameState.wordCount;
  const avgWordsPerSentence = Math.round(totalWords / sentences.length);
  
  // Find longest and shortest sentences
  let longest = '';
  let shortest = sentences[0];
  
  for (const sentence of sentences) {
    if (sentence.length > longest.length) {
      longest = sentence;
    }
    if (sentence.length < shortest.length && sentence !== gameState.prompt) {
      shortest = sentence;
    }
  }
  
  return {
    totalSentences: sentences.length,
    totalWords: totalWords,
    avgWordsPerSentence,
    longestSentence: longest.substring(0, 50) + (longest.length > 50 ? '...' : ''),
    shortestSentence: shortest.substring(0, 50) + (shortest.length > 50 ? '...' : ''),
    contributors: players.length
  };
}

// Suggest story themes based on content
function analyzeStoryThemes(gameState) {
  const { sentences } = gameState;
  const storyText = sentences.join(' ').toLowerCase();
  
  const themes = [];
  
  // Look for common themes
  if (/(magic|wizard|spell|dragon|knight|castle|potion)/.test(storyText)) {
    themes.push('🏰 Fantasy Adventure');
  }
  
  if (/(space|robot|future|technology|alien|planet|laser)/.test(storyText)) {
    themes.push('🚀 Science Fiction');
  }
  
  if (/(detective|mystery|clue|suspect|murder|crime)/.test(storyText)) {
    themes.push('🔍 Mystery & Crime');
  }
  
  if (/(funny|hilarious|ridiculous|silly|comedy|laugh)/.test(storyText)) {
    themes.push('😂 Comedy');
  }
  
  if (/(love|romance|heart|kiss|wedding|date)/.test(storyText)) {
    themes.push('💕 Romance');
  }
  
  if (/(ghost|spirit|haunted|scary|supernatural|witch)/.test(storyText)) {
    themes.push('👻 Supernatural');
  }
  
  if (/(adventure|journey|travel|explore|quest|treasure)/.test(storyText)) {
    themes.push('🗺️ Adventure');
  }
  
  return themes;
}

// Get random prompt by genre
function getRandomPrompt(genre = null) {
  if (genre && GENRES[genre]) {
    const prompts = GENRES[genre].prompts;
    return prompts[Math.floor(Math.random() * prompts.length)];
  }
  return STORY_PROMPTS[Math.floor(Math.random() * STORY_PROMPTS.length)];
}

module.exports = {
  createInitialStoryBuilderState,
  addPlayer,
  addSentence,
  formatStoryBuilderDisplay,
  getStoryStats,
  analyzeStoryThemes,
  getRandomPrompt,
  STORY_PROMPTS,
  GENRES
};