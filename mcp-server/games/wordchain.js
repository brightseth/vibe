/**
 * Word Chain game implementation for /vibe
 * Players take turns saying words that start with the last letter of the previous word
 */

// Simple word validation - checks if it's a reasonable English word
// In a full implementation, this could use a proper dictionary API
function isValidWord(word) {
  // Basic checks: alphabetic, reasonable length, not too short
  if (!/^[a-zA-Z]+$/.test(word)) return false;
  if (word.length < 2) return false;
  if (word.length > 20) return false;
  
  // Some very basic filtering of common valid words vs nonsense
  // This is a simplified check - a real game would use a dictionary
  const commonPrefixes = ['th', 'he', 'in', 'er', 'an', 're', 'ed', 'nd', 'ou', 'ea', 'ti', 'to', 'it', 'st', 'io', 'le', 'is', 'on', 'ur', 'ar', 'nt', 'al'];
  const commonSuffixes = ['ed', 'er', 'ing', 'ly', 'est', 'ion', 'tion', 'sion', 'ness', 'ment', 'able', 'ible'];
  
  const lowerWord = word.toLowerCase();
  
  // Allow single letters for now (like 'a', 'i')
  if (word.length === 1) {
    return ['a', 'i'].includes(lowerWord);
  }
  
  // Check for common patterns that suggest it's a real word
  const hasCommonPrefix = commonPrefixes.some(prefix => lowerWord.startsWith(prefix));
  const hasCommonSuffix = commonSuffixes.some(suffix => lowerWord.endsWith(suffix));
  
  // Very permissive check - if it looks word-like, allow it
  // Real implementation would check against dictionary
  return hasCommonPrefix || hasCommonSuffix || lowerWord.length >= 3;
}

// Create initial word chain state
function createInitialWordChainState() {
  return {
    words: [],
    currentPlayer: 'player1', // player1 starts (the person who initiated the game)
    moves: 0,
    gameOver: false,
    winner: null,
    lastLetter: null,
    usedWords: new Set() // Track words to prevent repeats
  };
}

// Make a word chain move
function makeMove(gameState, word, isPlayer1Move) {
  const { words, currentPlayer, moves, usedWords, lastLetter } = gameState;
  
  // Normalize word
  const normalizedWord = word.toLowerCase().trim();
  
  // Validate basic word format
  if (!isValidWord(normalizedWord)) {
    return { error: 'Invalid word format. Use only letters, 2-20 characters.' };
  }
  
  // Check if it's the right player's turn
  const expectedPlayer = currentPlayer === 'player1' ? true : false;
  if (isPlayer1Move !== expectedPlayer) {
    return { error: 'Not your turn!' };
  }
  
  // Check if word was already used
  if (usedWords.has(normalizedWord)) {
    return { error: 'Word already used! Try a different word.' };
  }
  
  // Check if word starts with the required letter
  if (lastLetter && normalizedWord[0] !== lastLetter) {
    return { error: `Word must start with "${lastLetter.toUpperCase()}"` };
  }
  
  // Valid move - update game state
  const newWords = [...words, normalizedWord];
  const newUsedWords = new Set([...usedWords, normalizedWord]);
  const newLastLetter = normalizedWord[normalizedWord.length - 1];
  const newCurrentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
  
  const newGameState = {
    words: newWords,
    currentPlayer: newCurrentPlayer,
    moves: moves + 1,
    gameOver: false,
    winner: null,
    lastLetter: newLastLetter,
    usedWords: newUsedWords,
    lastWord: normalizedWord
  };
  
  return { success: true, gameState: newGameState };
}

// Format word chain for display
function formatWordChainDisplay(gameState) {
  const { words, currentPlayer, moves, lastLetter, lastWord } = gameState;
  
  let display = `🔗 **Word Chain** (${moves} words)\n\n`;
  
  if (words.length === 0) {
    display += '**Start the chain with any word!**\n\n';
    display += 'Next: **Player 1**';
  } else {
    // Show the chain
    display += '**Chain:** ' + words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' → ') + '\n\n';
    
    if (lastLetter) {
      display += `**Next word must start with: "${lastLetter.toUpperCase()}"**\n\n`;
    }
    
    display += `Turn: **${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}**`;
    
    if (lastWord) {
      display += `\nLast word: "${lastWord.charAt(0).toUpperCase() + lastWord.slice(1)}"`;
    }
  }
  
  return display;
}

// Check if a letter is considered "difficult" (fewer common words start with it)
function isDifficultLetter(letter) {
  const difficultLetters = ['x', 'z', 'q', 'j', 'v'];
  return difficultLetters.includes(letter.toLowerCase());
}

module.exports = {
  createInitialWordChainState,
  makeMove,
  formatWordChainDisplay,
  isValidWord,
  isDifficultLetter
};