/**
 * vibe party-game — Social ice breaker and party games
 *
 * Supports: twotruths, werewolf
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Import game implementations
const twotruths = require('../games/twotruths');
const werewolf = require('../games/werewolf');

// Post game results to board
async function postPartyGameResult(game, message) {
  const API_URL = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';

  try {
    await fetch(`${API_URL}/api/board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'games-agent',
        content: `🎉 ${game}: ${message}`,
        category: 'games'
      })
    });
  } catch (e) {
    console.error('[party-game] Failed to post to board:', e.message);
  }
}

const definition = {
  name: 'vibe_party_game',
  description: 'Social ice breaker and party games. Supports: twotruths (Two Truths and a Lie), werewolf (social deduction)',
  inputSchema: {
    type: 'object',
    properties: {
      game: {
        type: 'string',
        description: 'Game to play',
        enum: ['twotruths', 'werewolf']
      },
      action: {
        type: 'string',
        description: 'Action to take',
        enum: [
          'new', 'status', 'join',
          // Two Truths actions
          'statements', 'guess', 'reveal', 'newround',
          // Werewolf actions
          'start', 'kill', 'investigate', 'startvote', 'vote', 'advance'
        ]
      },
      // Two Truths specific
      statements: {
        type: 'array',
        items: { type: 'string' },
        description: 'Three statements for Two Truths (2 truths, 1 lie)'
      },
      lie: {
        type: 'number',
        description: 'Which statement is the lie (0, 1, or 2)'
      },
      guess: {
        type: 'number',
        description: 'Guess which statement is the lie (0, 1, or 2)'
      },
      newhost: {
        type: 'string',
        description: 'Handle of next round host'
      },
      // Werewolf specific
      target: {
        type: 'string',
        description: 'Target player handle'
      },
      // Room management
      room: {
        type: 'string',
        description: 'Game room ID (optional, defaults to your active game)'
      }
    },
    required: ['game']
  }
};

// Store active party games in memory (would be KV in production)
const activeGames = {};

function getGameKey(game, room) {
  return `party:${game}:${room || 'default'}`;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { game, action = 'status', room } = args;
  const myHandle = config.getHandle();
  const gameKey = getGameKey(game, room || myHandle);

  // Get or create game state
  let gameState = activeGames[gameKey];

  if (game === 'twotruths') {
    return handleTwoTruths(args, myHandle, gameKey, gameState);
  } else if (game === 'werewolf') {
    return handleWerewolf(args, myHandle, gameKey, gameState);
  }

  return { display: `Unknown game: ${game}. Use twotruths or werewolf.` };
}

// Two Truths and a Lie handler
function handleTwoTruths(args, myHandle, gameKey, gameState) {
  const { action, statements, lie, guess, newhost } = args;

  // New game
  if (action === 'new' || !gameState) {
    gameState = twotruths.createInitialState(myHandle);
    activeGames[gameKey] = gameState;
    return {
      display: twotruths.formatDisplay(gameState, myHandle) +
        `\n\n📍 Game room: \`${gameKey}\``
    };
  }

  // Submit statements
  if (action === 'statements') {
    if (!statements || statements.length !== 3) {
      return { display: 'Provide exactly 3 statements: `--statements "truth1" "truth2" "lie" --lie 2`' };
    }
    if (lie === undefined || lie < 0 || lie > 2) {
      return { display: 'Specify which is the lie (0, 1, or 2): `--lie 1`' };
    }

    const result = twotruths.submitStatements(gameState, statements, lie);
    if (result.error) return { display: `Error: ${result.error}` };

    activeGames[gameKey] = result.gameState;
    return { display: twotruths.formatDisplay(result.gameState, myHandle) };
  }

  // Make a guess
  if (action === 'guess') {
    if (guess === undefined || guess < 0 || guess > 2) {
      return { display: 'Specify your guess (0, 1, or 2): `--guess 1`' };
    }

    const result = twotruths.makeGuess(gameState, myHandle, guess);
    if (result.error) return { display: `Error: ${result.error}` };

    activeGames[gameKey] = result.gameState;
    return { display: twotruths.formatDisplay(result.gameState, myHandle) };
  }

  // Reveal the answer
  if (action === 'reveal') {
    const result = twotruths.reveal(gameState);
    if (result.error) return { display: `Error: ${result.error}` };

    activeGames[gameKey] = result.gameState;

    // Post to board
    const { correctGuessers, fooledPlayers } = result.results;
    if (fooledPlayers.length > 0) {
      postPartyGameResult('Two Truths', `@${gameState.host} fooled ${fooledPlayers.length} player(s)!`);
    }

    return { display: twotruths.formatDisplay(result.gameState, myHandle) };
  }

  // New round
  if (action === 'newround') {
    const nextHost = newhost ? normalizeHandle(newhost) : myHandle;
    const result = twotruths.newRound(gameState, nextHost);
    if (result.error) return { display: `Error: ${result.error}` };

    activeGames[gameKey] = result.gameState;
    return { display: twotruths.formatDisplay(result.gameState, myHandle) };
  }

  // Default: show status
  return { display: twotruths.formatDisplay(gameState, myHandle) };
}

// Werewolf handler
function handleWerewolf(args, myHandle, gameKey, gameState) {
  const { action, target } = args;

  // New game
  if (action === 'new' || !gameState) {
    gameState = werewolf.createInitialState(myHandle);
    activeGames[gameKey] = gameState;
    return {
      display: werewolf.formatDisplay(gameState, myHandle) +
        `\n\n📍 Game room: \`${gameKey}\`\nShare this to invite others!`
    };
  }

  // Join game
  if (action === 'join') {
    const result = werewolf.joinGame(gameState, myHandle);
    if (result.error) return { display: `Error: ${result.error}` };

    activeGames[gameKey] = result.gameState;
    return { display: werewolf.formatDisplay(result.gameState, myHandle) };
  }

  // Start game
  if (action === 'start') {
    const result = werewolf.startGame(gameState, myHandle);
    if (result.error) return { display: `Error: ${result.error}` };

    activeGames[gameKey] = result.gameState;

    // Send role DMs to each player
    const roles = result.gameState.roles;
    let roleMessage = werewolf.formatDisplay(result.gameState, myHandle);
    roleMessage += `\n\n🎭 Roles have been assigned! Check your secret role above.`;

    return { display: roleMessage };
  }

  // Werewolf kill
  if (action === 'kill') {
    if (!target) return { display: 'Specify a target: `--target @player`' };
    const targetHandle = normalizeHandle(target);

    const result = werewolf.werewolfKill(gameState, myHandle, targetHandle);
    if (result.error) return { display: `Error: ${result.error}` };

    activeGames[gameKey] = result.gameState;
    return { display: `🐺 Target set: @${targetHandle}\n\nWaiting for other night actions...` };
  }

  // Seer investigate
  if (action === 'investigate') {
    if (!target) return { display: 'Specify who to investigate: `--target @player`' };
    const targetHandle = normalizeHandle(target);

    const result = werewolf.seerInvestigate(gameState, myHandle, targetHandle);
    if (result.error) return { display: `Error: ${result.error}` };

    activeGames[gameKey] = result.gameState;
    return {
      display: `🔮 Investigation result:\n@${result.reveal.target} is... ${result.reveal.result}\n\n` +
        werewolf.formatDisplay(result.gameState, myHandle)
    };
  }

  // Advance to day (after night actions)
  if (action === 'advance') {
    if (gameState.phase === werewolf.PHASES.NIGHT) {
      const result = werewolf.advanceToDay(gameState);
      if (result.error) return { display: `Error: ${result.error}` };

      activeGames[gameKey] = result.gameState;

      // Post death to board
      if (result.gameState.phase === werewolf.PHASES.ENDED) {
        postPartyGameResult('Werewolf', `The ${result.gameState.winner} win!`);
      }

      return { display: werewolf.formatDisplay(result.gameState, myHandle) };
    }
  }

  // Start voting
  if (action === 'startvote') {
    const result = werewolf.startVoting(gameState, myHandle);
    if (result.error) return { display: `Error: ${result.error}` };

    activeGames[gameKey] = result.gameState;
    return { display: werewolf.formatDisplay(result.gameState, myHandle) };
  }

  // Cast vote
  if (action === 'vote') {
    if (!target) return { display: 'Specify who to vote for: `--target @player` or `--target skip`' };
    const targetHandle = target === 'skip' ? 'skip' : normalizeHandle(target);

    const result = werewolf.castVote(gameState, myHandle, targetHandle);
    if (result.error) return { display: `Error: ${result.error}` };

    activeGames[gameKey] = result.gameState;

    // Check if all votes are in
    const { alive, votes } = result.gameState;
    if (Object.keys(votes).length >= alive.length) {
      // Tally votes automatically
      const tallyResult = werewolf.tallyVotes(result.gameState);
      if (tallyResult.success) {
        activeGames[gameKey] = tallyResult.gameState;

        if (tallyResult.gameState.phase === werewolf.PHASES.ENDED) {
          postPartyGameResult('Werewolf', `The ${tallyResult.gameState.winner} win!`);
        }

        return { display: werewolf.formatDisplay(tallyResult.gameState, myHandle) };
      }
    }

    return { display: `✓ Vote cast for @${targetHandle}\n\n` + werewolf.formatDisplay(result.gameState, myHandle) };
  }

  // Default: show status
  return { display: werewolf.formatDisplay(gameState, myHandle) };
}

module.exports = { definition, handler };
