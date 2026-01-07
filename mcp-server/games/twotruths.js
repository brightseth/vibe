/**
 * Two Truths and a Lie - Social ice breaker game for /vibe
 *
 * How it works:
 * 1. One player shares 3 statements about themselves
 * 2. Other players guess which one is the lie
 * 3. Points for correct guesses, points for fooling others
 */

// Create initial game state
function createInitialState(host) {
  return {
    host,
    phase: 'setup', // setup, guessing, reveal
    statements: [], // Array of 3 statements
    lieIndex: null, // Which statement is the lie (0, 1, or 2)
    guesses: {}, // { playerHandle: guessIndex }
    scores: {}, // { playerHandle: score }
    round: 1,
    createdAt: new Date().toISOString()
  };
}

// Host submits their 3 statements
function submitStatements(gameState, statements, lieIndex) {
  if (gameState.phase !== 'setup') {
    return { error: 'Statements already submitted' };
  }

  if (!Array.isArray(statements) || statements.length !== 3) {
    return { error: 'Must provide exactly 3 statements' };
  }

  if (lieIndex < 0 || lieIndex > 2) {
    return { error: 'Lie index must be 0, 1, or 2' };
  }

  return {
    success: true,
    gameState: {
      ...gameState,
      statements,
      lieIndex,
      phase: 'guessing'
    }
  };
}

// Player makes a guess
function makeGuess(gameState, player, guessIndex) {
  if (gameState.phase !== 'guessing') {
    return { error: 'Not in guessing phase' };
  }

  if (player === gameState.host) {
    return { error: 'Host cannot guess their own statements' };
  }

  if (guessIndex < 0 || guessIndex > 2) {
    return { error: 'Guess must be 0, 1, or 2 (which statement is the lie)' };
  }

  const newGuesses = { ...gameState.guesses, [player]: guessIndex };

  return {
    success: true,
    gameState: {
      ...gameState,
      guesses: newGuesses
    }
  };
}

// Reveal the answer and calculate scores
function reveal(gameState) {
  if (gameState.phase !== 'guessing') {
    return { error: 'Not in guessing phase' };
  }

  const { lieIndex, guesses, host } = gameState;
  const newScores = { ...gameState.scores };

  // Initialize host score if needed
  if (!newScores[host]) newScores[host] = 0;

  let correctGuessers = [];
  let fooledPlayers = [];

  for (const [player, guess] of Object.entries(guesses)) {
    if (!newScores[player]) newScores[player] = 0;

    if (guess === lieIndex) {
      // Correct guess: +1 point to guesser
      newScores[player] += 1;
      correctGuessers.push(player);
    } else {
      // Wrong guess: +1 point to host for fooling them
      newScores[host] += 1;
      fooledPlayers.push(player);
    }
  }

  return {
    success: true,
    gameState: {
      ...gameState,
      phase: 'reveal',
      scores: newScores
    },
    results: {
      lieIndex,
      lieStatement: gameState.statements[lieIndex],
      correctGuessers,
      fooledPlayers,
      scores: newScores
    }
  };
}

// Start a new round with a new host
function newRound(gameState, newHost) {
  return {
    success: true,
    gameState: {
      ...gameState,
      host: newHost,
      phase: 'setup',
      statements: [],
      lieIndex: null,
      guesses: {},
      round: gameState.round + 1
    }
  };
}

// Format game display
function formatDisplay(gameState, viewerHandle) {
  const { host, phase, statements, guesses, scores, round, lieIndex } = gameState;
  const isHost = viewerHandle === host;

  let display = `🎭 **Two Truths and a Lie** (Round ${round})\n`;
  display += `Host: @${host}\n\n`;

  if (phase === 'setup') {
    if (isHost) {
      display += `**Your turn!** Share 3 statements about yourself.\n`;
      display += `Use: \`vibe twotruths --statements "truth1" "truth2" "lie" --lie 2\`\n`;
      display += `(--lie indicates which statement number is the lie: 0, 1, or 2)\n`;
    } else {
      display += `Waiting for @${host} to share their statements...\n`;
    }
  } else if (phase === 'guessing') {
    display += `**Which one is the lie?**\n\n`;
    statements.forEach((stmt, i) => {
      const marker = isHost ? (i === lieIndex ? '🤫' : '✓') : `${i + 1}.`;
      display += `${marker} ${stmt}\n`;
    });
    display += '\n';

    if (isHost) {
      const guessCount = Object.keys(guesses).length;
      display += `${guessCount} player(s) have guessed.\n`;
      display += `Use \`vibe twotruths --reveal\` when ready to reveal!\n`;
    } else {
      if (guesses[viewerHandle] !== undefined) {
        display += `✓ You guessed statement #${guesses[viewerHandle] + 1}\n`;
      } else {
        display += `Use \`vibe twotruths --guess 1\` (or 2 or 3) to guess the lie!\n`;
      }
    }
  } else if (phase === 'reveal') {
    display += `**The lie was:**\n`;
    statements.forEach((stmt, i) => {
      const marker = i === lieIndex ? '❌ LIE:' : '✓ TRUE:';
      display += `${marker} ${stmt}\n`;
    });
    display += '\n';

    // Show who guessed what
    display += `**Guesses:**\n`;
    for (const [player, guess] of Object.entries(guesses)) {
      const correct = guess === lieIndex;
      display += `@${player}: #${guess + 1} ${correct ? '✓' : '✗'}\n`;
    }
    display += '\n';

    // Show scores
    display += `**Scores:**\n`;
    const sortedScores = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    sortedScores.forEach(([player, score]) => {
      display += `@${player}: ${score} pts\n`;
    });

    display += `\nUse \`vibe twotruths --newround @someone\` to start next round!\n`;
  }

  return display;
}

module.exports = {
  createInitialState,
  submitStatements,
  makeGuess,
  reveal,
  newRound,
  formatDisplay
};
