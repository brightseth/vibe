/**
 * Werewolf - Social deduction game for /vibe
 *
 * A party game where villagers try to identify the werewolves
 * before they're all eliminated.
 *
 * Roles:
 * - Villager: Vote to eliminate werewolves during the day
 * - Werewolf: Kill villagers at night, blend in during day
 * - Seer: Can reveal one player's role each night
 *
 * Win conditions:
 * - Villagers win: All werewolves eliminated
 * - Werewolves win: Werewolves equal or outnumber villagers
 */

const ROLES = {
  VILLAGER: 'villager',
  WEREWOLF: 'werewolf',
  SEER: 'seer'
};

const PHASES = {
  LOBBY: 'lobby',       // Waiting for players
  NIGHT: 'night',       // Werewolves choose victim, seer investigates
  DAY: 'day',           // Discussion
  VOTING: 'voting',     // Vote to eliminate
  ENDED: 'ended'        // Game over
};

// Role distribution based on player count
function getRoleDistribution(playerCount) {
  if (playerCount < 4) return null;

  // 4-5 players: 1 werewolf, 1 seer, rest villagers
  // 6-7 players: 2 werewolves, 1 seer, rest villagers
  // 8+ players: 2 werewolves, 1 seer, rest villagers

  const werewolfCount = playerCount >= 6 ? 2 : 1;
  const seerCount = 1;
  const villagerCount = playerCount - werewolfCount - seerCount;

  return {
    [ROLES.WEREWOLF]: werewolfCount,
    [ROLES.SEER]: seerCount,
    [ROLES.VILLAGER]: villagerCount
  };
}

// Shuffle array (Fisher-Yates)
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Create initial game state
function createInitialState(host) {
  return {
    host,
    phase: PHASES.LOBBY,
    players: [host],
    roles: {},           // { handle: role }
    alive: [],           // handles of living players
    dead: [],            // { handle, role, eliminatedBy: 'werewolf'|'vote' }
    round: 0,

    // Night actions
    werewolfTarget: null,
    seerTarget: null,
    seerReveals: {},     // { handle: role } - what seer has learned

    // Voting
    votes: {},           // { voter: target }

    // History
    events: [],

    createdAt: new Date().toISOString()
  };
}

// Join the game
function joinGame(gameState, player) {
  if (gameState.phase !== PHASES.LOBBY) {
    return { error: 'Game already started' };
  }

  if (gameState.players.includes(player)) {
    return { error: 'Already in the game' };
  }

  if (gameState.players.length >= 10) {
    return { error: 'Game is full (max 10 players)' };
  }

  return {
    success: true,
    gameState: {
      ...gameState,
      players: [...gameState.players, player]
    }
  };
}

// Start the game
function startGame(gameState, player) {
  if (player !== gameState.host) {
    return { error: 'Only host can start the game' };
  }

  if (gameState.phase !== PHASES.LOBBY) {
    return { error: 'Game already started' };
  }

  const playerCount = gameState.players.length;
  if (playerCount < 4) {
    return { error: 'Need at least 4 players to start' };
  }

  const distribution = getRoleDistribution(playerCount);

  // Create role pool
  const rolePool = [];
  for (const [role, count] of Object.entries(distribution)) {
    for (let i = 0; i < count; i++) {
      rolePool.push(role);
    }
  }

  // Shuffle and assign roles
  const shuffledRoles = shuffle(rolePool);
  const roles = {};
  gameState.players.forEach((p, i) => {
    roles[p] = shuffledRoles[i];
  });

  return {
    success: true,
    gameState: {
      ...gameState,
      phase: PHASES.NIGHT,
      roles,
      alive: [...gameState.players],
      round: 1,
      events: [`🌙 Night 1 begins. The village sleeps...`]
    }
  };
}

// Werewolf chooses target
function werewolfKill(gameState, werewolf, target) {
  if (gameState.phase !== PHASES.NIGHT) {
    return { error: 'Can only kill at night' };
  }

  if (gameState.roles[werewolf] !== ROLES.WEREWOLF) {
    return { error: 'Only werewolves can kill' };
  }

  if (!gameState.alive.includes(target)) {
    return { error: 'Target is not alive' };
  }

  if (gameState.roles[target] === ROLES.WEREWOLF) {
    return { error: 'Cannot target fellow werewolf' };
  }

  return {
    success: true,
    gameState: {
      ...gameState,
      werewolfTarget: target
    }
  };
}

// Seer investigates
function seerInvestigate(gameState, seer, target) {
  if (gameState.phase !== PHASES.NIGHT) {
    return { error: 'Can only investigate at night' };
  }

  if (gameState.roles[seer] !== ROLES.SEER) {
    return { error: 'Only the seer can investigate' };
  }

  if (!gameState.alive.includes(seer)) {
    return { error: 'You are dead' };
  }

  if (!gameState.alive.includes(target)) {
    return { error: 'Target is not alive' };
  }

  const targetRole = gameState.roles[target];
  const isWerewolf = targetRole === ROLES.WEREWOLF;

  return {
    success: true,
    gameState: {
      ...gameState,
      seerTarget: target,
      seerReveals: {
        ...gameState.seerReveals,
        [target]: isWerewolf ? 'werewolf' : 'not werewolf'
      }
    },
    reveal: {
      target,
      result: isWerewolf ? '🐺 WEREWOLF' : '👤 Not a werewolf'
    }
  };
}

// Advance from night to day
function advanceToDay(gameState) {
  if (gameState.phase !== PHASES.NIGHT) {
    return { error: 'Not night phase' };
  }

  const newState = { ...gameState };
  const events = [...gameState.events];

  // Process werewolf kill
  if (gameState.werewolfTarget) {
    const victim = gameState.werewolfTarget;
    const victimRole = gameState.roles[victim];

    newState.alive = gameState.alive.filter(p => p !== victim);
    newState.dead = [
      ...gameState.dead,
      { handle: victim, role: victimRole, eliminatedBy: 'werewolf' }
    ];

    events.push(`☀️ Day ${gameState.round} begins.`);
    events.push(`💀 @${victim} was found dead! They were a ${victimRole}.`);
  } else {
    events.push(`☀️ Day ${gameState.round} begins. No one died last night.`);
  }

  // Check win condition
  const winCheck = checkWinCondition(newState);
  if (winCheck.gameOver) {
    return {
      success: true,
      gameState: {
        ...newState,
        phase: PHASES.ENDED,
        winner: winCheck.winner,
        events: [...events, winCheck.message]
      }
    };
  }

  return {
    success: true,
    gameState: {
      ...newState,
      phase: PHASES.DAY,
      werewolfTarget: null,
      seerTarget: null,
      events
    }
  };
}

// Start voting phase
function startVoting(gameState, player) {
  if (gameState.phase !== PHASES.DAY) {
    return { error: 'Can only start voting during the day' };
  }

  return {
    success: true,
    gameState: {
      ...gameState,
      phase: PHASES.VOTING,
      votes: {},
      events: [...gameState.events, `🗳️ Voting has begun! Vote to eliminate a suspect.`]
    }
  };
}

// Cast vote
function castVote(gameState, voter, target) {
  if (gameState.phase !== PHASES.VOTING) {
    return { error: 'Not in voting phase' };
  }

  if (!gameState.alive.includes(voter)) {
    return { error: 'Dead players cannot vote' };
  }

  if (!gameState.alive.includes(target) && target !== 'skip') {
    return { error: 'Target is not alive (use "skip" to skip vote)' };
  }

  return {
    success: true,
    gameState: {
      ...gameState,
      votes: { ...gameState.votes, [voter]: target }
    }
  };
}

// Tally votes and execute
function tallyVotes(gameState) {
  if (gameState.phase !== PHASES.VOTING) {
    return { error: 'Not in voting phase' };
  }

  const { votes, alive } = gameState;
  const voteCounts = {};

  for (const target of Object.values(votes)) {
    voteCounts[target] = (voteCounts[target] || 0) + 1;
  }

  // Find player with most votes
  let maxVotes = 0;
  let eliminated = null;
  let tie = false;

  for (const [target, count] of Object.entries(voteCounts)) {
    if (target === 'skip') continue;
    if (count > maxVotes) {
      maxVotes = count;
      eliminated = target;
      tie = false;
    } else if (count === maxVotes) {
      tie = true;
    }
  }

  const newState = { ...gameState };
  const events = [...gameState.events];

  // Show vote breakdown
  events.push(`📊 Votes: ${Object.entries(voteCounts).map(([t, c]) => `@${t}: ${c}`).join(', ')}`);

  if (tie || !eliminated || maxVotes < 2) {
    events.push(`🤷 No majority reached. No one is eliminated.`);
  } else {
    const role = gameState.roles[eliminated];
    newState.alive = alive.filter(p => p !== eliminated);
    newState.dead = [
      ...gameState.dead,
      { handle: eliminated, role, eliminatedBy: 'vote' }
    ];
    events.push(`⚰️ @${eliminated} has been eliminated! They were a ${role}.`);
  }

  // Check win condition
  const winCheck = checkWinCondition(newState);
  if (winCheck.gameOver) {
    return {
      success: true,
      gameState: {
        ...newState,
        phase: PHASES.ENDED,
        winner: winCheck.winner,
        events: [...events, winCheck.message]
      }
    };
  }

  // Advance to next night
  return {
    success: true,
    gameState: {
      ...newState,
      phase: PHASES.NIGHT,
      round: gameState.round + 1,
      votes: {},
      events: [...events, `🌙 Night ${gameState.round + 1} falls...`]
    }
  };
}

// Check win condition
function checkWinCondition(gameState) {
  const { alive, roles } = gameState;

  const aliveWerewolves = alive.filter(p => roles[p] === ROLES.WEREWOLF);
  const aliveVillagers = alive.filter(p => roles[p] !== ROLES.WEREWOLF);

  if (aliveWerewolves.length === 0) {
    return {
      gameOver: true,
      winner: 'villagers',
      message: `🎉 The villagers win! All werewolves have been eliminated.`
    };
  }

  if (aliveWerewolves.length >= aliveVillagers.length) {
    return {
      gameOver: true,
      winner: 'werewolves',
      message: `🐺 The werewolves win! They now outnumber the villagers.`
    };
  }

  return { gameOver: false };
}

// Format game display
function formatDisplay(gameState, viewerHandle) {
  const { phase, players, roles, alive, dead, round, votes, events, host, winner } = gameState;
  const viewerRole = roles[viewerHandle];
  const isAlive = alive.includes(viewerHandle);

  let display = `🐺 **Werewolf** `;

  if (phase === PHASES.LOBBY) {
    display += `(Lobby)\n\n`;
    display += `Host: @${host}\n`;
    display += `Players (${players.length}/10): ${players.map(p => `@${p}`).join(', ')}\n\n`;
    display += `Need ${Math.max(0, 4 - players.length)} more players to start.\n`;
    if (viewerHandle === host && players.length >= 4) {
      display += `Use \`vibe werewolf --start\` to begin!\n`;
    } else {
      display += `Use \`vibe werewolf --join\` to join!\n`;
    }
    return display;
  }

  display += `(Round ${round} - ${phase.toUpperCase()})\n\n`;

  // Show viewer's role (secret)
  if (viewerRole && isAlive) {
    const roleEmoji = viewerRole === ROLES.WEREWOLF ? '🐺' : viewerRole === ROLES.SEER ? '🔮' : '👤';
    display += `**Your role:** ${roleEmoji} ${viewerRole.toUpperCase()}\n`;

    // Show fellow werewolves
    if (viewerRole === ROLES.WEREWOLF) {
      const fellowWolves = alive.filter(p => roles[p] === ROLES.WEREWOLF && p !== viewerHandle);
      if (fellowWolves.length > 0) {
        display += `Fellow werewolves: ${fellowWolves.map(p => `@${p}`).join(', ')}\n`;
      }
    }
    display += '\n';
  }

  // Show alive players
  display += `**Alive (${alive.length}):** ${alive.map(p => `@${p}`).join(', ')}\n`;
  if (dead.length > 0) {
    display += `**Dead:** ${dead.map(d => `@${d.handle} (${d.role})`).join(', ')}\n`;
  }
  display += '\n';

  // Phase-specific info
  if (phase === PHASES.NIGHT) {
    if (viewerRole === ROLES.WEREWOLF && isAlive) {
      display += `🌙 Choose your victim: \`vibe werewolf --kill @player\`\n`;
    } else if (viewerRole === ROLES.SEER && isAlive) {
      display += `🔮 Investigate someone: \`vibe werewolf --investigate @player\`\n`;
    } else {
      display += `🌙 The village sleeps...\n`;
    }
  } else if (phase === PHASES.DAY) {
    display += `☀️ Discuss who might be a werewolf!\n`;
    display += `When ready: \`vibe werewolf --startvote\`\n`;
  } else if (phase === PHASES.VOTING) {
    display += `🗳️ Vote to eliminate: \`vibe werewolf --vote @player\`\n`;
    display += `Or skip: \`vibe werewolf --vote skip\`\n\n`;
    const voteCount = Object.keys(votes).length;
    display += `Votes cast: ${voteCount}/${alive.length}\n`;
  } else if (phase === PHASES.ENDED) {
    display += `🎮 **GAME OVER**\n`;
    display += `Winner: **${winner.toUpperCase()}**\n\n`;
    display += `**Roles were:**\n`;
    for (const [player, role] of Object.entries(roles)) {
      const emoji = role === ROLES.WEREWOLF ? '🐺' : role === ROLES.SEER ? '🔮' : '👤';
      display += `${emoji} @${player}: ${role}\n`;
    }
  }

  // Recent events
  if (events.length > 0) {
    display += `\n**Recent:**\n`;
    events.slice(-3).forEach(e => {
      display += `${e}\n`;
    });
  }

  return display;
}

module.exports = {
  ROLES,
  PHASES,
  createInitialState,
  joinGame,
  startGame,
  werewolfKill,
  seerInvestigate,
  advanceToDay,
  startVoting,
  castVote,
  tallyVotes,
  checkWinCondition,
  formatDisplay
};
