/**
 * Color Guessing Game implementation for /vibe
 * One player thinks of a color, others try to guess it with helpful hints!
 * Simple, social, and fun for quick breaks.
 */

// Predefined color list with emojis for fun display
const COLORS = {
  // Basic colors
  'red': '🔴',
  'blue': '🔵', 
  'green': '🟢',
  'yellow': '🟡',
  'purple': '🟣',
  'orange': '🟠',
  'black': '⚫',
  'white': '⚪',
  'brown': '🟤',
  'pink': '🩷',
  'gray': '⚫', // Using black circle for gray
  'grey': '⚫',
  
  // Fun colors
  'lime': '🟢',
  'cyan': '🔵',
  'magenta': '🟣',
  'navy': '🔵',
  'maroon': '🔴',
  'olive': '🟢',
  'teal': '🔵',
  'silver': '⚪',
  'gold': '🟡',
  'coral': '🟠',
  'salmon': '🟠',
  'turquoise': '🔵',
  'indigo': '🟣',
  'violet': '🟣',
  'crimson': '🔴',
  'azure': '🔵',
  'beige': '🟤',
  'ivory': '⚪',
  'khaki': '🟤',
  'lavender': '🟣',
  'mint': '🟢',
  'peach': '🟠',
  'rose': '🩷',
  'rust': '🟠',
  'sage': '🟢',
  'tan': '🟤'
};

// Get list of all valid color names
function getValidColors() {
  return Object.keys(COLORS);
}

// Get emoji for a color
function getColorEmoji(color) {
  return COLORS[color.toLowerCase()] || '🎨';
}

// Create initial color guessing game state
function createInitialColorGuessState() {
  return {
    gameId: Date.now().toString(),
    phase: 'setup', // 'setup', 'guessing', 'complete'
    host: null, // Player who chose the color
    secretColor: null,
    players: [],
    guesses: [],
    hints: [],
    maxPlayers: 6,
    maxGuesses: 10,
    gameOver: false,
    winner: null,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
}

// Add player to the game
function addPlayer(gameState, playerHandle) {
  const { players, maxPlayers, phase } = gameState;
  
  if (players.includes(playerHandle)) {
    return { error: 'You are already in this game!' };
  }
  
  if (players.length >= maxPlayers) {
    return { error: `Game is full (max ${maxPlayers} players)` };
  }
  
  if (phase !== 'setup') {
    return { error: 'Game is already in progress! Wait for the next round.' };
  }
  
  const newPlayers = [...players, playerHandle];
  
  return {
    success: true,
    gameState: {
      ...gameState,
      players: newPlayers,
      lastActivity: new Date().toISOString()
    }
  };
}

// Set the secret color (only host can do this)
function setSecretColor(gameState, color, playerHandle) {
  const { phase, players } = gameState;
  
  if (players.length === 0 || players[0] !== playerHandle) {
    return { error: 'Only the host can set the secret color!' };
  }
  
  if (phase !== 'setup') {
    return { error: 'Game has already started!' };
  }
  
  const normalizedColor = color.toLowerCase().trim();
  if (!COLORS[normalizedColor]) {
    const validColors = getValidColors();
    const suggestions = validColors.filter(c => c.startsWith(normalizedColor.slice(0, 2))).slice(0, 3);
    return { 
      error: `"${color}" is not a valid color. Try: ${suggestions.length > 0 ? suggestions.join(', ') : 'red, blue, green, yellow, purple, orange, pink, etc.'}`
    };
  }
  
  return {
    success: true,
    gameState: {
      ...gameState,
      secretColor: normalizedColor,
      host: playerHandle,
      phase: 'guessing',
      lastActivity: new Date().toISOString()
    }
  };
}

// Make a guess
function makeGuess(gameState, guess, playerHandle) {
  const { phase, players, host, secretColor, guesses, maxGuesses, gameOver } = gameState;
  
  if (!players.includes(playerHandle)) {
    return { error: 'You need to join the game first!' };
  }
  
  if (playerHandle === host) {
    return { error: 'The host cannot guess their own color!' };
  }
  
  if (phase !== 'guessing') {
    return { error: 'Game is not in guessing phase!' };
  }
  
  if (gameOver) {
    return { error: 'Game is already over!' };
  }
  
  if (guesses.length >= maxGuesses) {
    return { error: 'Maximum guesses reached!' };
  }
  
  const normalizedGuess = guess.toLowerCase().trim();
  
  // Check if already guessed
  if (guesses.some(g => g.color === normalizedGuess)) {
    return { error: `"${guess}" has already been guessed!` };
  }
  
  if (!COLORS[normalizedGuess]) {
    return { error: `"${guess}" is not a valid color. Try common colors like red, blue, green, etc.` };
  }
  
  const isCorrect = normalizedGuess === secretColor;
  const newGuess = {
    player: playerHandle,
    color: normalizedGuess,
    correct: isCorrect,
    timestamp: new Date().toISOString(),
    guessNumber: guesses.length + 1
  };
  
  const newGuesses = [...guesses, newGuess];
  const isGameOver = isCorrect || newGuesses.length >= maxGuesses;
  
  return {
    success: true,
    gameState: {
      ...gameState,
      guesses: newGuesses,
      gameOver: isGameOver,
      winner: isCorrect ? playerHandle : null,
      phase: isGameOver ? 'complete' : 'guessing',
      lastActivity: new Date().toISOString()
    }
  };
}

// Add a hint (only host can do this)
function addHint(gameState, hint, playerHandle) {
  const { host, phase, hints, gameOver } = gameState;
  
  if (playerHandle !== host) {
    return { error: 'Only the host can give hints!' };
  }
  
  if (phase !== 'guessing' || gameOver) {
    return { error: 'Cannot give hints right now!' };
  }
  
  if (hint.trim().length === 0) {
    return { error: 'Hint cannot be empty!' };
  }
  
  // Don't allow hints that contain the color name
  const secretColor = gameState.secretColor.toLowerCase();
  if (hint.toLowerCase().includes(secretColor)) {
    return { error: 'Hint cannot contain the color name!' };
  }
  
  const newHint = {
    text: hint.trim(),
    timestamp: new Date().toISOString(),
    hintNumber: hints.length + 1
  };
  
  return {
    success: true,
    gameState: {
      ...gameState,
      hints: [...hints, newHint],
      lastActivity: new Date().toISOString()
    }
  };
}

// Format the game display
function formatColorGuessDisplay(gameState) {
  const { phase, host, players, guesses, hints, secretColor, winner, gameOver, maxGuesses } = gameState;
  
  let display = `🎨 **Color Guessing Game**\n\n`;
  
  if (phase === 'setup') {
    display += '**Setting up...**\n\n';
    
    if (players.length === 0) {
      display += 'Waiting for players to join!\n';
    } else {
      display += `**Host:** @${host || players[0]}\n`;
      display += `**Players:** ${players.map(p => `@${p}`).join(', ')}\n\n`;
      
      if (!secretColor) {
        display += `Waiting for @${players[0]} to choose a secret color...\n`;
      }
    }
    
  } else if (phase === 'guessing') {
    display += `**Host:** @${host} ${getColorEmoji('rainbow')}\n`;
    display += `**Guessers:** ${players.filter(p => p !== host).map(p => `@${p}`).join(', ')}\n\n`;
    
    // Show hints
    if (hints.length > 0) {
      display += '**Hints:**\n';
      hints.forEach((hint, i) => {
        display += `${i + 1}. ${hint.text}\n`;
      });
      display += '\n';
    }
    
    // Show previous guesses
    if (guesses.length > 0) {
      display += '**Previous guesses:**\n';
      guesses.forEach(guess => {
        display += `${getColorEmoji(guess.color)} ${guess.color} by @${guess.player}${guess.correct ? ' ✅' : ' ❌'}\n`;
      });
      display += '\n';
    }
    
    display += `**Guesses remaining:** ${maxGuesses - guesses.length}\n`;
    
  } else if (phase === 'complete') {
    display += '**Game Complete!**\n\n';
    display += `**Secret color was:** ${getColorEmoji(secretColor)} ${secretColor}\n\n`;
    
    if (winner) {
      display += `🎉 **Winner:** @${winner}!\n\n`;
    } else {
      display += `😅 **No one guessed it!** Better luck next time.\n\n`;
    }
    
    // Show all guesses
    if (guesses.length > 0) {
      display += '**All guesses:**\n';
      guesses.forEach(guess => {
        display += `${getColorEmoji(guess.color)} ${guess.color} by @${guess.player}${guess.correct ? ' ✅' : ' ❌'}\n`;
      });
    }
  }
  
  return display;
}

// Get game statistics
function getGameStats(gameState) {
  const { guesses, hints, players, host } = gameState;
  
  const playerGuesses = {};
  guesses.forEach(guess => {
    playerGuesses[guess.player] = (playerGuesses[guess.player] || 0) + 1;
  });
  
  return {
    totalGuesses: guesses.length,
    totalHints: hints.length,
    totalPlayers: players.length,
    playerGuesses,
    mostActiveGuesser: Object.entries(playerGuesses).sort(([,a], [,b]) => b - a)[0]
  };
}

// Get color suggestions based on partial input
function getSuggestions(partial) {
  const colors = getValidColors();
  const matches = colors.filter(color => color.startsWith(partial.toLowerCase()));
  return matches.slice(0, 5); // Return top 5 matches
}

module.exports = {
  createInitialColorGuessState,
  addPlayer,
  setSecretColor,
  makeGuess,
  addHint,
  formatColorGuessDisplay,
  getGameStats,
  getSuggestions,
  getValidColors,
  getColorEmoji,
  COLORS
};