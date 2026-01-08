/**
 * Quick Duel game implementation for /vibe
 * Fast-paced luck & strategy mini-game where players choose actions
 * Perfect for quick competitive fun!
 */

// Available actions with different risk/reward profiles
const ACTIONS = {
  attack: {
    emoji: '⚔️',
    name: 'Attack',
    damage: 3,
    accuracy: 0.7,
    description: 'High damage, moderate accuracy'
  },
  defend: {
    emoji: '🛡️',
    name: 'Defend', 
    damage: 1,
    accuracy: 0.9,
    counterBonus: 2, // Extra damage if opponent attacks
    description: 'Low damage, high accuracy, counters attacks'
  },
  magic: {
    emoji: '✨',
    name: 'Magic',
    damage: 4,
    accuracy: 0.5,
    description: 'Very high damage, low accuracy'
  },
  dodge: {
    emoji: '💨',
    name: 'Dodge',
    damage: 2,
    accuracy: 0.6,
    evasion: 0.8, // Chance to avoid incoming damage
    description: 'Moderate damage, chance to avoid damage'
  }
};

// Fun combat messages
const COMBAT_MESSAGES = {
  hit: [
    'lands a solid hit!', 'connects beautifully!', 'strikes true!', 
    'finds their mark!', 'delivers a crushing blow!'
  ],
  miss: [
    'swings and misses!', 'attacks thin air!', 'fumbles the attempt!', 
    'stumbles and misses!', 'fails to connect!'
  ],
  counter: [
    'perfectly counters!', 'turns defense into offense!', 'strikes back!',
    'reverses the attack!', 'capitalizes on the opening!'
  ],
  dodge: [
    'narrowly avoids the blow!', 'slips away at the last second!', 
    'dances out of danger!', 'evades with style!', 'dodges gracefully!'
  ]
};

// Create initial duel state
function createInitialDuelState() {
  return {
    player1: null,
    player2: null,
    player1Health: 10,
    player2Health: 10,
    player1Action: null,
    player2Action: null,
    round: 1,
    gameOver: false,
    winner: null,
    combatLog: [],
    waitingForActions: true,
    gameType: 'quickduel'
  };
}

// Join the duel as a player
function joinDuel(gameState, playerHandle) {
  if (gameState.player1 === playerHandle || gameState.player2 === playerHandle) {
    return { error: 'You\'re already in this duel!' };
  }

  if (!gameState.player1) {
    return {
      success: true,
      gameState: {
        ...gameState,
        player1: playerHandle
      }
    };
  } else if (!gameState.player2) {
    return {
      success: true,
      gameState: {
        ...gameState,
        player2: playerHandle,
        waitingForActions: true // Both players ready, can start
      }
    };
  } else {
    return { error: 'Duel is full! Only 2 players can fight.' };
  }
}

// Choose action for current round
function chooseAction(gameState, playerHandle, actionName) {
  if (gameState.gameOver) {
    return { error: 'Duel is over! Start a new one to fight again.' };
  }

  if (gameState.player1 !== playerHandle && gameState.player2 !== playerHandle) {
    return { error: 'You\'re not in this duel!' };
  }

  const normalizedAction = actionName.toLowerCase().trim();
  if (!ACTIONS[normalizedAction]) {
    const validActions = Object.keys(ACTIONS).join(', ');
    return { error: `Invalid action! Choose: ${validActions}` };
  }

  const newGameState = { ...gameState };

  if (playerHandle === gameState.player1) {
    if (newGameState.player1Action) {
      return { error: 'You already chose your action this round!' };
    }
    newGameState.player1Action = normalizedAction;
  } else {
    if (newGameState.player2Action) {
      return { error: 'You already chose your action this round!' };
    }
    newGameState.player2Action = normalizedAction;
  }

  // If both players have acted, resolve the round
  if (newGameState.player1Action && newGameState.player2Action) {
    return resolveRound(newGameState);
  }

  return { success: true, gameState: newGameState };
}

// Resolve a combat round
function resolveRound(gameState) {
  const { player1, player2, player1Action, player2Action, player1Health, player2Health, round, combatLog } = gameState;

  const action1 = ACTIONS[player1Action];
  const action2 = ACTIONS[player2Action];

  let newPlayer1Health = player1Health;
  let newPlayer2Health = player2Health;
  let newCombatLog = [...combatLog];

  // Calculate damage for each player
  let player1Damage = 0;
  let player2Damage = 0;

  // Player 1's attack on Player 2
  let p1Hit = Math.random() < action1.accuracy;
  let p1Dodged = action2.evasion && Math.random() < action2.evasion;

  if (p1Hit && !p1Dodged) {
    player2Damage = action1.damage;
    
    // Check for defend counter
    if (player2Action === 'defend' && player1Action === 'attack') {
      player1Damage += action2.counterBonus;
      newCombatLog.push(`${player1} ${ACTIONS[player1Action].emoji} attacks, but ${player2} ${ACTIONS[player2Action].emoji} ${getRandomMessage(COMBAT_MESSAGES.counter)}`);
    } else {
      newCombatLog.push(`${player1} ${ACTIONS[player1Action].emoji} ${getRandomMessage(COMBAT_MESSAGES.hit)}`);
    }
  } else if (p1Dodged) {
    newCombatLog.push(`${player1} ${ACTIONS[player1Action].emoji} attacks, but ${player2} ${ACTIONS[player2Action].emoji} ${getRandomMessage(COMBAT_MESSAGES.dodge)}`);
  } else {
    newCombatLog.push(`${player1} ${ACTIONS[player1Action].emoji} ${getRandomMessage(COMBAT_MESSAGES.miss)}`);
  }

  // Player 2's attack on Player 1
  let p2Hit = Math.random() < action2.accuracy;
  let p2Dodged = action1.evasion && Math.random() < action1.evasion;

  if (p2Hit && !p2Dodged) {
    player1Damage += action2.damage;
    
    // Check for defend counter
    if (player1Action === 'defend' && player2Action === 'attack') {
      player2Damage += action1.counterBonus;
      newCombatLog.push(`${player2} ${ACTIONS[player2Action].emoji} attacks, but ${player1} ${ACTIONS[player1Action].emoji} ${getRandomMessage(COMBAT_MESSAGES.counter)}`);
    } else {
      newCombatLog.push(`${player2} ${ACTIONS[player2Action].emoji} ${getRandomMessage(COMBAT_MESSAGES.hit)}`);
    }
  } else if (p2Dodged) {
    newCombatLog.push(`${player2} ${ACTIONS[player2Action].emoji} attacks, but ${player1} ${ACTIONS[player1Action].emoji} ${getRandomMessage(COMBAT_MESSAGES.dodge)}`);
  } else {
    newCombatLog.push(`${player2} ${ACTIONS[player2Action].emoji} ${getRandomMessage(COMBAT_MESSAGES.miss)}`);
  }

  // Apply damage
  newPlayer1Health = Math.max(0, player1Health - player1Damage);
  newPlayer2Health = Math.max(0, player2Health - player2Damage);

  // Add damage summary if any damage was dealt
  if (player1Damage > 0 || player2Damage > 0) {
    let damageText = '';
    if (player1Damage > 0 && player2Damage > 0) {
      damageText = `Both fighters take damage! ${player1} -${player1Damage}HP, ${player2} -${player2Damage}HP`;
    } else if (player1Damage > 0) {
      damageText = `${player1} takes ${player1Damage} damage!`;
    } else if (player2Damage > 0) {
      damageText = `${player2} takes ${player2Damage} damage!`;
    }
    newCombatLog.push(damageText);
  }

  // Check for winner
  let winner = null;
  let gameOver = false;

  if (newPlayer1Health <= 0 && newPlayer2Health <= 0) {
    winner = 'draw';
    gameOver = true;
    newCombatLog.push('🤝 Both fighters collapse! It\'s a draw!');
  } else if (newPlayer1Health <= 0) {
    winner = player2;
    gameOver = true;
    newCombatLog.push(`🏆 ${player2} emerges victorious!`);
  } else if (newPlayer2Health <= 0) {
    winner = player1;
    gameOver = true;
    newCombatLog.push(`🏆 ${player1} emerges victorious!`);
  }

  return {
    success: true,
    gameState: {
      ...gameState,
      player1Health: newPlayer1Health,
      player2Health: newPlayer2Health,
      round: round + 1,
      player1Action: null,
      player2Action: null,
      combatLog: newCombatLog,
      winner: winner,
      gameOver: gameOver,
      waitingForActions: !gameOver
    }
  };
}

// Get a random message from an array
function getRandomMessage(messageArray) {
  return messageArray[Math.floor(Math.random() * messageArray.length)];
}

// Format duel for display
function formatDuelDisplay(gameState, viewerHandle = null) {
  const { 
    player1, player2, player1Health, player2Health, round, gameOver, 
    winner, combatLog, waitingForActions, player1Action, player2Action 
  } = gameState;

  let display = `⚔️ **Quick Duel** - Round ${round}\n\n`;

  // Show player status
  if (!player1) {
    display += '**Waiting for fighters...** 🥊\n';
    display += 'Join the duel to fight!\n';
    return display;
  } else if (!player2) {
    display += `**${player1}** is looking for an opponent! 👊\n`;
    display += 'Someone join the duel to start the fight!\n';
    return display;
  }

  // Health bars
  const p1HealthBar = '❤️'.repeat(Math.max(0, player1Health)) + '💔'.repeat(Math.max(0, 10 - player1Health));
  const p2HealthBar = '❤️'.repeat(Math.max(0, player2Health)) + '💔'.repeat(Math.max(0, 10 - player2Health));

  display += `**${player1}:** ${p1HealthBar} (${player1Health}/10 HP)\n`;
  display += `**${player2}:** ${p2HealthBar} (${player2Health}/10 HP)\n\n`;

  // Show winner or waiting status
  if (gameOver) {
    if (winner === 'draw') {
      display += '🤝 **DRAW!** Both fighters fought valiantly!\n\n';
    } else {
      display += `🏆 **${winner} WINS!** 🏆\n\n`;
    }
  } else {
    // Show action status
    const p1Ready = player1Action ? '✅' : '⏳';
    const p2Ready = player2Action ? '✅' : '⏳';
    
    display += `**Action Status:**\n`;
    display += `${player1}: ${p1Ready} ${player1Action ? `(${ACTIONS[player1Action].emoji} ${ACTIONS[player1Action].name})` : 'choosing...'}\n`;
    display += `${player2}: ${p2Ready} ${player2Action ? `(${ACTIONS[player2Action].emoji} ${ACTIONS[player2Action].name})` : 'choosing...'}\n\n`;
  }

  // Show recent combat log (last 4 entries)
  if (combatLog.length > 0) {
    display += '**Combat Log:**\n';
    const recentLog = combatLog.slice(-4);
    for (const entry of recentLog) {
      display += `• ${entry}\n`;
    }
    display += '\n';
  }

  // Show available actions if viewer is a player and game isn't over
  if (!gameOver && (viewerHandle === player1 || viewerHandle === player2)) {
    const hasChosen = (viewerHandle === player1 && player1Action) || 
                     (viewerHandle === player2 && player2Action);
    
    if (!hasChosen) {
      display += '**Choose your action:**\n';
      for (const [actionKey, action] of Object.entries(ACTIONS)) {
        display += `• **${action.emoji} ${action.name}** - ${action.description}\n`;
      }
      display += '\nUse: `/game quickduel --action attack/defend/magic/dodge`\n';
    } else {
      display += '✅ **Waiting for opponent...**\n';
    }
  } else if (!gameOver) {
    display += '**Spectating** - Watch the battle unfold! 👀\n';
  } else {
    display += 'Start a new duel to fight again!\n';
  }

  return display;
}

// Get game statistics
function getDuelStats(gameState) {
  const { round, combatLog, player1Health, player2Health } = gameState;
  
  return {
    round: round,
    totalActions: combatLog.length,
    player1Health,
    player2Health,
    totalDamageDealt: (10 - player1Health) + (10 - player2Health)
  };
}

module.exports = {
  createInitialDuelState,
  joinDuel,
  chooseAction,
  formatDuelDisplay,
  getDuelStats,
  ACTIONS
};