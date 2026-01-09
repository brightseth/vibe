/**
 * Multiplayer Crossword game for /vibe
 * Daily 5x5 mini puzzles with collaborative and competitive modes
 */

const clg = require('crossword-layout-generator');
const { getWordsForDate, getTodayDateStr } = require('./crossword-words');

/**
 * Create a crossword puzzle from a word list
 */
function generatePuzzle(wordList) {
  const layout = clg.generateLayout(wordList);

  // Build clues map from layout (filter out unplaced words with orientation "none")
  const clues = { across: {}, down: {} };
  const answers = {};

  let clueNum = 1;
  layout.result.forEach((item) => {
    // Skip words that couldn't be placed (orientation: "none")
    if (item.orientation !== 'across' && item.orientation !== 'down') {
      return;
    }

    if (item.orientation === 'across') {
      clues.across[clueNum] = {
        clue: item.clue,
        length: item.answer.length,
        startX: item.startx,
        startY: item.starty
      };
    } else {
      clues.down[clueNum] = {
        clue: item.clue,
        length: item.answer.length,
        startX: item.startx,
        startY: item.starty
      };
    }
    answers[`${clueNum}-${item.orientation}`] = item.answer.toUpperCase();
    clueNum++;
  });

  return {
    grid: layout.table,
    rows: layout.rows,
    cols: layout.cols,
    clues,
    answers,
    totalClues: Object.keys(answers).length
  };
}

/**
 * Create a daily puzzle based on date
 */
function createDailyPuzzle(dateStr = null) {
  const date = dateStr || getTodayDateStr();
  const words = getWordsForDate(date, 6, 'all');
  return {
    ...generatePuzzle(words),
    date,
    isDaily: true
  };
}

/**
 * Create initial crossword game state
 */
function createInitialCrosswordState(mode = 'collaborative', dateStr = null) {
  const puzzle = createDailyPuzzle(dateStr);

  // Create player grid (what they've filled in)
  const playerGrid = puzzle.grid.map(row =>
    row.map(cell => (cell === '-' ? '-' : ''))
  );

  return {
    puzzle,
    playerGrid,
    players: [],
    currentPlayer: null,
    mode, // 'collaborative' or 'competitive'
    placed: {}, // { '1-across': { answer: 'VIBE', by: '@seth', at: ISO } }
    hints: {}, // { '1-across': ['V', null, null, null] }
    moves: 0,
    gameOver: false,
    winner: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    solveTimesMs: {} // For competitive mode
  };
}

/**
 * Add player to game
 */
function addPlayer(gameState, playerHandle) {
  if (gameState.players.includes(playerHandle)) {
    return { error: 'Already in this game' };
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
      currentPlayer: gameState.currentPlayer || playerHandle,
      solveTimesMs: {
        ...gameState.solveTimesMs,
        [playerHandle]: null // Will be set when they start
      }
    }
  };
}

/**
 * Submit an answer for a clue
 */
function makeMove(gameState, playerHandle, clueNum, direction, answer) {
  const { puzzle, placed, mode, players } = gameState;

  // Validate direction
  if (!['across', 'down'].includes(direction)) {
    return { error: 'Direction must be "across" or "down"' };
  }

  // Find the clue
  const clueKey = `${clueNum}-${direction}`;
  const correctAnswer = puzzle.answers[clueKey];

  if (!correctAnswer) {
    return { error: `No clue ${clueNum} ${direction}` };
  }

  // Normalize answer
  const normalizedAnswer = answer.toUpperCase().trim();

  // Check if already solved
  if (placed[clueKey]) {
    return { error: `Clue ${clueNum} ${direction} already solved by @${placed[clueKey].by}` };
  }

  // Check answer
  if (normalizedAnswer !== correctAnswer) {
    return {
      success: false,
      error: 'Incorrect answer',
      gameState
    };
  }

  // Correct answer - update state
  const newPlaced = {
    ...placed,
    [clueKey]: {
      answer: normalizedAnswer,
      by: playerHandle,
      at: new Date().toISOString()
    }
  };

  // Update player grid
  // Note: startX and startY from crossword-layout-generator are 1-indexed
  const clueData = puzzle.clues[direction][clueNum];
  const newPlayerGrid = gameState.playerGrid.map(row => [...row]);
  const baseX = clueData.startX - 1; // Convert to 0-indexed
  const baseY = clueData.startY - 1; // Convert to 0-indexed

  for (let i = 0; i < normalizedAnswer.length; i++) {
    const x = direction === 'across' ? baseX + i : baseX;
    const y = direction === 'across' ? baseY : baseY + i;
    if (y < newPlayerGrid.length && x < newPlayerGrid[y].length) {
      newPlayerGrid[y][x] = normalizedAnswer[i];
    }
  }

  // Check if puzzle is complete
  const totalSolved = Object.keys(newPlaced).length;
  const isComplete = totalSolved === puzzle.totalClues;

  // Calculate player stats
  const playerStats = {};
  Object.values(newPlaced).forEach(p => {
    playerStats[p.by] = (playerStats[p.by] || 0) + 1;
  });

  const newState = {
    ...gameState,
    playerGrid: newPlayerGrid,
    placed: newPlaced,
    moves: gameState.moves + 1,
    gameOver: isComplete,
    completedAt: isComplete ? new Date().toISOString() : null
  };

  // In competitive mode, record solve time for first to complete
  if (isComplete && mode === 'competitive') {
    const startTime = new Date(gameState.startedAt).getTime();
    const endTime = new Date().getTime();
    newState.winner = playerHandle;
    newState.solveTimesMs = {
      ...gameState.solveTimesMs,
      [playerHandle]: endTime - startTime
    };
  } else if (isComplete) {
    newState.winner = 'everyone'; // Collaborative win
  }

  return {
    success: true,
    gameState: newState,
    message: isComplete ? 'Puzzle complete!' : `Correct! ${totalSolved}/${puzzle.totalClues} clues solved.`
  };
}

/**
 * Get a hint for a clue (reveals first unrevealed letter)
 */
function getHint(gameState, clueNum, direction) {
  const { puzzle, hints, placed } = gameState;
  const clueKey = `${clueNum}-${direction}`;

  // Check if clue exists
  const correctAnswer = puzzle.answers[clueKey];
  if (!correctAnswer) {
    return { error: `No clue ${clueNum} ${direction}` };
  }

  // Check if already solved
  if (placed[clueKey]) {
    return { error: 'Clue already solved!' };
  }

  // Get existing hints for this clue
  const existingHints = hints[clueKey] || Array(correctAnswer.length).fill(null);

  // Find first unrevealed position
  const nextHintIndex = existingHints.findIndex(h => h === null);

  if (nextHintIndex === -1) {
    return { error: 'All letters already revealed!' };
  }

  // Reveal the letter
  const newHints = [...existingHints];
  newHints[nextHintIndex] = correctAnswer[nextHintIndex];

  return {
    success: true,
    hint: correctAnswer[nextHintIndex],
    position: nextHintIndex + 1,
    gameState: {
      ...gameState,
      hints: {
        ...hints,
        [clueKey]: newHints
      }
    }
  };
}

/**
 * Format crossword for terminal display
 */
function formatCrosswordDisplay(gameState) {
  const { puzzle, playerGrid, players, placed, hints, mode, gameOver, winner, startedAt } = gameState;

  let display = `## Daily Crossword (${puzzle.date})\n\n`;

  if (gameOver) {
    display += '**PUZZLE COMPLETE!**\n';
    if (mode === 'competitive' && winner !== 'everyone') {
      display += `Winner: @${winner}\n`;
    }
    display += '\n';
  }

  // Build ASCII grid
  const gridRows = [];

  // Header row with column numbers
  let header = '    ';
  for (let x = 0; x < puzzle.cols; x++) {
    header += ` ${x + 1}  `;
  }
  gridRows.push(header);

  // Separator
  const separator = '  +' + '---+'.repeat(puzzle.cols);
  gridRows.push(separator);

  // Grid rows
  const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let y = 0; y < puzzle.rows; y++) {
    let row = `${rowLabels[y]} |`;
    for (let x = 0; x < puzzle.cols; x++) {
      const solutionCell = puzzle.grid[y][x];
      const playerCell = playerGrid[y][x];

      if (solutionCell === '-') {
        row += ' ■ |'; // Empty/black cell
      } else if (playerCell) {
        row += ` ${playerCell} |`; // Filled by player
      } else {
        row += '   |'; // Unfilled
      }
    }
    gridRows.push(row);
    gridRows.push(separator);
  }

  display += '```\n' + gridRows.join('\n') + '\n```\n\n';

  // Clues
  display += '**ACROSS:**\n';
  Object.entries(puzzle.clues.across).forEach(([num, data]) => {
    const key = `${num}-across`;
    const solved = placed[key];
    const hintLetters = hints[key] || [];
    const hintStr = hintLetters.some(h => h) ? ` [${hintLetters.map(h => h || '_').join('')}]` : '';

    if (solved) {
      display += `${num}. ~~${data.clue}~~ (${data.length}) **${solved.answer}** @${solved.by}\n`;
    } else {
      display += `${num}. ${data.clue} (${data.length})${hintStr}\n`;
    }
  });

  display += '\n**DOWN:**\n';
  Object.entries(puzzle.clues.down).forEach(([num, data]) => {
    const key = `${num}-down`;
    const solved = placed[key];
    const hintLetters = hints[key] || [];
    const hintStr = hintLetters.some(h => h) ? ` [${hintLetters.map(h => h || '_').join('')}]` : '';

    if (solved) {
      display += `${num}. ~~${data.clue}~~ (${data.length}) **${solved.answer}** @${solved.by}\n`;
    } else {
      display += `${num}. ${data.clue} (${data.length})${hintStr}\n`;
    }
  });

  // Stats
  const totalSolved = Object.keys(placed).length;
  const progress = Math.round((totalSolved / puzzle.totalClues) * 100);
  display += `\n**Progress:** ${totalSolved}/${puzzle.totalClues} (${progress}%)\n`;

  // Player contributions
  if (players.length > 0) {
    const contributions = {};
    Object.values(placed).forEach(p => {
      contributions[p.by] = (contributions[p.by] || 0) + 1;
    });

    const playerList = players.map(p => {
      const count = contributions[p] || 0;
      return `@${p} (${count})`;
    }).join(', ');

    display += `**Players:** ${playerList}\n`;
  }

  // Mode indicator
  display += `**Mode:** ${mode === 'competitive' ? 'Competitive' : 'Collaborative'}\n`;

  // Instructions
  if (!gameOver) {
    display += '\n**Commands:**\n';
    display += '- `crossword play --clue 1 --direction across --answer WORD`\n';
    display += '- `crossword hint --clue 1 --direction across`\n';
  }

  return display;
}

/**
 * Get game stats
 */
function getGameStats(gameState) {
  const { puzzle, placed, players, startedAt, completedAt, mode, solveTimesMs } = gameState;

  const contributions = {};
  Object.values(placed).forEach(p => {
    contributions[p.by] = (contributions[p.by] || 0) + 1;
  });

  const duration = completedAt
    ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
    : new Date().getTime() - new Date(startedAt).getTime();

  return {
    totalClues: puzzle.totalClues,
    solvedClues: Object.keys(placed).length,
    progress: Math.round((Object.keys(placed).length / puzzle.totalClues) * 100),
    players: players.length,
    contributions,
    durationMs: duration,
    durationFormatted: formatDuration(duration),
    mode,
    isComplete: gameState.gameOver
  };
}

/**
 * Format milliseconds as human-readable duration
 */
function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

module.exports = {
  createInitialCrosswordState,
  createDailyPuzzle,
  generatePuzzle,
  addPlayer,
  makeMove,
  getHint,
  formatCrosswordDisplay,
  getGameStats
};
