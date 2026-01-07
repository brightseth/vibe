/**
 * Hangman game implementation for /vibe
 * Classic word guessing game with ASCII art
 */

// Word lists organized by difficulty
const WORD_LISTS = {
  easy: [
    'cat', 'dog', 'sun', 'car', 'run', 'big', 'fun', 'red', 'yes', 'top',
    'old', 'new', 'hot', 'cold', 'good', 'fast', 'slow', 'book', 'tree', 'blue'
  ],
  medium: [
    'apple', 'house', 'water', 'happy', 'music', 'phone', 'sleep', 'magic',
    'friend', 'school', 'garden', 'yellow', 'rainbow', 'castle', 'dragon',
    'planet', 'forest', 'ocean', 'mountain', 'butterfly'
  ],
  hard: [
    'javascript', 'computer', 'elephant', 'adventure', 'chocolate', 'umbrella',
    'fantastic', 'mysterious', 'programming', 'butterfly', 'technology',
    'dinosaur', 'encyclopedia', 'extraordinary', 'magnificent', 'revolutionary',
    'philosopher', 'kaleidoscope', 'whimsical', 'serendipity'
  ]
};

// Hangman ASCII art stages
const HANGMAN_STAGES = [
  // 0 wrong guesses
  `
   +---+
   |   |
       |
       |
       |
       |
=========`,
  
  // 1 wrong guess
  `
   +---+
   |   |
   O   |
       |
       |
       |
=========`,
  
  // 2 wrong guesses
  `
   +---+
   |   |
   O   |
   |   |
       |
       |
=========`,
  
  // 3 wrong guesses
  `
   +---+
   |   |
   O   |
  /|   |
       |
       |
=========`,
  
  // 4 wrong guesses
  `
   +---+
   |   |
   O   |
  /|\\  |
       |
       |
=========`,
  
  // 5 wrong guesses
  `
   +---+
   |   |
   O   |
  /|\\  |
  /    |
       |
=========`,
  
  // 6 wrong guesses (game over)
  `
   +---+
   |   |
   O   |
  /|\\  |
  / \\  |
       |
=========`
];

// Get random word from difficulty level
function getRandomWord(difficulty = 'medium') {
  const words = WORD_LISTS[difficulty] || WORD_LISTS.medium;
  return words[Math.floor(Math.random() * words.length)].toLowerCase();
}

// Create initial hangman state
function createInitialHangmanState(difficulty = 'medium') {
  const word = getRandomWord(difficulty);
  
  return {
    word: word,
    guessedLetters: [],
    wrongGuesses: [],
    correctGuesses: [],
    wrongCount: 0,
    maxWrongs: 6,
    gameOver: false,
    won: false,
    difficulty: difficulty,
    moves: 0
  };
}

// Check if letter has been guessed before
function hasBeenGuessed(gameState, letter) {
  return gameState.guessedLetters.includes(letter.toLowerCase());
}

// Check if letter is in the word
function isLetterInWord(word, letter) {
  return word.includes(letter.toLowerCase());
}

// Get current word display (with underscores for unguessed letters)
function getWordDisplay(word, correctGuesses) {
  return word
    .split('')
    .map(letter => correctGuesses.includes(letter) ? letter.toUpperCase() : '_')
    .join(' ');
}

// Make a guess
function makeGuess(gameState, guess) {
  const { word, guessedLetters, wrongGuesses, correctGuesses, wrongCount, maxWrongs } = gameState;
  
  // Normalize guess
  const letter = guess.toLowerCase().trim();
  
  // Validate guess
  if (!/^[a-z]$/.test(letter)) {
    return { error: 'Please guess a single letter (a-z)' };
  }
  
  // Check if already guessed
  if (hasBeenGuessed(gameState, letter)) {
    return { error: `You already guessed "${letter.toUpperCase()}". Try a different letter!` };
  }
  
  // Check if game is already over
  if (gameState.gameOver) {
    return { error: 'Game is over! Start a new game to play again.' };
  }
  
  // Process the guess
  const newGuessedLetters = [...guessedLetters, letter];
  let newWrongGuesses = [...wrongGuesses];
  let newCorrectGuesses = [...correctGuesses];
  let newWrongCount = wrongCount;
  
  if (isLetterInWord(word, letter)) {
    // Correct guess
    newCorrectGuesses.push(letter);
  } else {
    // Wrong guess
    newWrongGuesses.push(letter);
    newWrongCount++;
  }
  
  // Check win condition (all letters guessed)
  const uniqueLetters = [...new Set(word.split(''))];
  const won = uniqueLetters.every(letter => newCorrectGuesses.includes(letter));
  
  // Check lose condition
  const gameOver = won || newWrongCount >= maxWrongs;
  
  const newGameState = {
    ...gameState,
    guessedLetters: newGuessedLetters,
    wrongGuesses: newWrongGuesses,
    correctGuesses: newCorrectGuesses,
    wrongCount: newWrongCount,
    gameOver: gameOver,
    won: won,
    moves: gameState.moves + 1,
    lastGuess: letter
  };
  
  return { success: true, gameState: newGameState };
}

// Format hangman display
function formatHangmanDisplay(gameState) {
  const { word, wrongGuesses, correctGuesses, wrongCount, gameOver, won, difficulty, moves, lastGuess } = gameState;
  
  let display = `🎯 **Hangman** (${difficulty}) - Move ${moves}\n\n`;
  
  // Show hangman drawing
  display += '```\n' + HANGMAN_STAGES[wrongCount] + '\n```\n\n';
  
  // Show current word progress
  const wordDisplay = getWordDisplay(word, correctGuesses);
  display += `**Word:** ${wordDisplay}\n\n`;
  
  // Show wrong guesses
  if (wrongGuesses.length > 0) {
    display += `**Wrong guesses:** ${wrongGuesses.map(l => l.toUpperCase()).join(', ')}\n`;
  }
  
  // Show remaining guesses
  const remaining = 6 - wrongCount;
  display += `**Remaining guesses:** ${remaining}\n\n`;
  
  // Show game status
  if (gameOver) {
    if (won) {
      display += `🎉 **You won!** The word was "${word.toUpperCase()}"\n`;
      display += `Solved in ${moves} guesses!`;
    } else {
      display += `💀 **Game Over!** The word was "${word.toUpperCase()}"\n`;
      display += 'Better luck next time!';
    }
  } else {
    if (lastGuess) {
      if (correctGuesses.includes(lastGuess)) {
        display += `✅ Good guess! "${lastGuess.toUpperCase()}" is in the word.\n\n`;
      } else {
        display += `❌ Sorry, "${lastGuess.toUpperCase()}" is not in the word.\n\n`;
      }
    }
    display += '**Guess a letter to continue!**';
  }
  
  return display;
}

// Get hint for the current word
function getHint(word, difficulty) {
  const hints = {
    // Easy words
    'cat': 'A furry pet that says meow',
    'dog': 'Man\'s best friend that barks',
    'sun': 'Bright star in our sky',
    'car': 'Vehicle with four wheels',
    'run': 'Move quickly on foot',
    
    // Medium words
    'apple': 'Red or green fruit that grows on trees',
    'house': 'Building where people live',
    'water': 'Clear liquid we drink',
    'music': 'Sounds arranged in harmony',
    'phone': 'Device for making calls',
    
    // Hard words
    'javascript': 'Popular programming language',
    'computer': 'Electronic device for processing data',
    'elephant': 'Large gray animal with a trunk',
    'adventure': 'Exciting or unusual experience',
    'programming': 'Writing code for computers'
  };
  
  return hints[word] || `A ${difficulty} word with ${word.length} letters`;
}

module.exports = {
  createInitialHangmanState,
  makeGuess,
  formatHangmanDisplay,
  getRandomWord,
  getHint,
  WORD_LISTS
};