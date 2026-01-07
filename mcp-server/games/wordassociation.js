/**
 * Word Association game implementation for /vibe
 * Players take turns saying words that associate with the previous word
 * Build creative chains of connected ideas!
 */

// Simple word validation
function isValidWord(word) {
  // Basic checks: alphabetic, reasonable length, not too short
  if (!/^[a-zA-Z\-']+$/.test(word)) return false; // Allow hyphens and apostrophes
  if (word.length < 2) return false;
  if (word.length > 30) return false;
  
  // Allow single meaningful words
  if (word.length === 1) {
    return ['a', 'i'].includes(word.toLowerCase());
  }
  
  return true;
}

// Create initial word association state
function createInitialWordAssociationState() {
  return {
    words: [],
    players: [],
    currentPlayer: null,
    moves: 0,
    gameOver: false,
    winner: null,
    lastWord: null,
    usedWords: new Set(), // Track words to prevent exact repeats
    playerTurnIndex: 0,
    maxWords: 30, // End game after 30 words for now
    associations: [], // Store word -> word pairs for fun stats
    startedAt: new Date().toISOString()
  };
}

// Add player to game
function addPlayer(gameState, playerHandle) {
  if (gameState.players.includes(playerHandle)) {
    return { error: 'Player already in the game' };
  }

  if (gameState.players.length >= 6) {
    return { error: 'Game is full (max 6 players)' };
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

// Make a word association move
function makeMove(gameState, word, playerHandle) {
  const { words, players, currentPlayer, moves, usedWords, lastWord, maxWords } = gameState;
  
  // Normalize word
  const normalizedWord = word.toLowerCase().trim().replace(/['"]/g, '');
  
  // Validate basic word format
  if (!isValidWord(normalizedWord)) {
    return { error: 'Invalid word format. Use only letters (2-30 characters).' };
  }
  
  // Check if it's the right player's turn (if multiplayer)
  if (players.length > 1 && currentPlayer !== playerHandle) {
    return { error: `Not your turn! Waiting for @${currentPlayer}` };
  }
  
  // Check if word was already used (allow some flexibility)
  if (usedWords.has(normalizedWord)) {
    return { error: 'Word already used! Try a different word.' };
  }
  
  // Check if it's the same word as last word
  if (lastWord && normalizedWord === lastWord.toLowerCase()) {
    return { error: 'Cannot repeat the same word immediately!' };
  }
  
  // Valid move - update game state
  const newWords = [...words, { word: normalizedWord, player: playerHandle, timestamp: new Date().toISOString() }];
  const newUsedWords = new Set([...usedWords, normalizedWord]);
  const newAssociations = lastWord ? [...gameState.associations, `${lastWord} → ${normalizedWord}`] : gameState.associations;
  
  // Determine next player
  let nextPlayerIndex = gameState.playerTurnIndex;
  let nextPlayer = currentPlayer;
  
  if (players.length > 1) {
    nextPlayerIndex = (gameState.playerTurnIndex + 1) % players.length;
    nextPlayer = players[nextPlayerIndex];
  }
  
  // Check if game should end
  const shouldEnd = moves + 1 >= maxWords;
  
  const newGameState = {
    ...gameState,
    words: newWords,
    currentPlayer: shouldEnd ? null : nextPlayer,
    playerTurnIndex: nextPlayerIndex,
    moves: moves + 1,
    gameOver: shouldEnd,
    winner: shouldEnd ? 'everyone' : null,
    lastWord: normalizedWord,
    usedWords: newUsedWords,
    associations: newAssociations
  };
  
  return { success: true, gameState: newGameState };
}

// Format word association for display
function formatWordAssociationDisplay(gameState) {
  const { words, players, currentPlayer, moves, gameOver, maxWords, associations } = gameState;
  
  let display = `🧠 **Word Association** (${moves}/${maxWords} words)\n\n`;
  
  if (gameOver) {
    display += '🎉 **Game Complete!** What a creative journey!\n\n';
  }
  
  if (words.length === 0) {
    if (players.length === 0) {
      display += '**Start with any word!**\n\n';
      display += 'Word association is about connecting ideas. Each new word should relate to the previous one.\n';
    } else {
      display += `**@${currentPlayer}, start us off with any word!**\n\n`;
    }
  } else {
    // Show the association chain (last 8 words to keep it readable)
    const recentWords = words.slice(-8);
    const wordChain = recentWords.map(w => {
      const capitalizedWord = w.word.charAt(0).toUpperCase() + w.word.slice(1);
      return `**${capitalizedWord}** (@${w.player})`;
    }).join(' → ');
    
    display += '**Chain:** ' + wordChain;
    
    if (words.length > 8) {
      display += ` (showing last 8 of ${words.length})`;
    }
    
    display += '\n\n';
    
    if (!gameOver) {
      const lastWordEntry = words[words.length - 1];
      const lastWord = lastWordEntry.word;
      display += `**"${lastWord.charAt(0).toUpperCase() + lastWord.slice(1)}" makes you think of...**\n\n`;
      
      if (players.length > 1) {
        display += `Turn: **@${currentPlayer}**`;
      } else {
        display += '**Your turn!** What word comes to mind?';
      }
    }
  }
  
  // Show players if multiplayer
  if (players.length > 1) {
    display += `\n\n**Players (${players.length}):** ${players.map(p => `@${p}`).join(', ')}`;
  }
  
  // Show some fun stats at the end
  if (gameOver && associations.length > 0) {
    display += '\n\n**Creative Journey:**\n';
    // Show the full chain condensed
    const fullChain = words.map(w => w.word.charAt(0).toUpperCase() + w.word.slice(1)).join(' → ');
    display += fullChain;
  }
  
  return display;
}

// Get game stats for fun
function getGameStats(gameState) {
  const { words, players, associations } = gameState;
  
  if (words.length === 0) return null;
  
  // Player contribution stats
  const contributions = {};
  words.forEach(w => {
    contributions[w.player] = (contributions[w.player] || 0) + 1;
  });
  
  return {
    totalWords: words.length,
    contributors: Object.keys(contributions).length,
    contributions,
    longestWord: Math.max(...words.map(w => w.word.length)),
    shortestWord: Math.min(...words.map(w => w.word.length)),
    uniqueWords: new Set(words.map(w => w.word)).size
  };
}

// Check for interesting patterns or themes
function findThemes(gameState) {
  const { words } = gameState;
  
  if (words.length < 3) return [];
  
  const themes = [];
  const wordList = words.map(w => w.word.toLowerCase());
  
  // Look for color words
  const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black', 'white', 'brown', 'gray', 'grey'];
  const colorWords = wordList.filter(w => colors.includes(w));
  if (colorWords.length >= 2) {
    themes.push(`🌈 Colors: ${colorWords.join(', ')}`);
  }
  
  // Look for animal words
  const animals = ['cat', 'dog', 'bird', 'fish', 'mouse', 'lion', 'tiger', 'bear', 'wolf', 'fox', 'rabbit', 'horse', 'cow', 'pig', 'sheep'];
  const animalWords = wordList.filter(w => animals.some(animal => w.includes(animal) || animal.includes(w)));
  if (animalWords.length >= 2) {
    themes.push(`🐾 Animals: ${animalWords.join(', ')}`);
  }
  
  // Look for nature words
  const nature = ['tree', 'flower', 'water', 'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'mountain', 'ocean', 'forest'];
  const natureWords = wordList.filter(w => nature.some(n => w.includes(n) || n.includes(w)));
  if (natureWords.length >= 2) {
    themes.push(`🌿 Nature: ${natureWords.join(', ')}`);
  }
  
  return themes;
}

module.exports = {
  createInitialWordAssociationState,
  addPlayer,
  makeMove,
  formatWordAssociationDisplay,
  isValidWord,
  getGameStats,
  findThemes
};