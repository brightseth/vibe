/**
 * vibe wordassociation — Start or play word association games
 *
 * A multiplayer game where players take turns saying words that associate with the previous word.
 * Build creative chains of connected ideas!
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Word association game implementation
const wordassociation = require('../games/wordassociation');

const definition = {
  name: 'vibe_wordassociation',
  description: 'Start or play word association games. Players take turns saying related words.',
  inputSchema: {
    type: 'object',
    properties: {
      word: {
        type: 'string',
        description: 'Word to add to the association chain'
      },
      join: {
        type: 'boolean',
        description: 'Join an existing game'
      },
      new: {
        type: 'boolean',
        description: 'Start a new game'
      },
      invite: {
        type: 'string',
        description: 'Invite someone to the game (e.g., @username)'
      }
    },
    required: []
  }
};

/**
 * Find the most recent word association game state in DMs or group context
 */
async function getGameState(myHandle) {
  // For now, we'll store game state in a special "game room" thread with myself
  // This allows for multiplayer games that persist across sessions
  const gameRoomHandle = 'wordassociation-room';
  const thread = await store.getThread(myHandle, gameRoomHandle);
  
  // Find the most recent game payload
  for (let i = thread.length - 1; i >= 0; i--) {
    const msg = thread[i];
    if (msg.payload?.type === 'game' && msg.payload?.game === 'wordassociation') {
      return { gameState: msg.payload.state, thread };
    }
  }
  
  return { gameState: null, thread };
}

/**
 * Save game state to the game room
 */
async function saveGameState(myHandle, gameState, action) {
  const gameRoomHandle = 'wordassociation-room';
  const payload = createGamePayload('wordassociation', gameState);
  
  let message;
  if (action.type === 'new') {
    message = 'Started a new word association game!';
  } else if (action.type === 'join') {
    message = `@${action.player} joined the game!`;
  } else if (action.type === 'word') {
    message = `@${action.player} said "${action.word}"`;
    if (gameState.gameOver) {
      message += ' - Game complete! 🎉';
    }
  } else {
    message = 'Game updated';
  }
  
  await store.sendMessage(myHandle, gameRoomHandle, message, 'dm', payload);
}

/**
 * Invite someone to play
 */
async function invitePlayer(myHandle, targetHandle) {
  const them = normalizeHandle(targetHandle);
  const message = `Hey! I started a word association game. Want to join? Use \`vibe wordassociation --join\` to play!`;
  await store.sendMessage(myHandle, them, message, 'dm');
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { word, join, new: newGame, invite } = args;
  const myHandle = config.getHandle();

  // Get current game state
  const { gameState, thread } = await getGameState(myHandle);

  // Handle inviting someone
  if (invite) {
    await invitePlayer(myHandle, invite);
    return {
      display: `Invited @${normalizeHandle(invite)} to join the word association game! 🧠`
    };
  }

  // Handle starting a new game
  if (newGame) {
    const newState = wordassociation.createInitialWordAssociationState();
    const addResult = wordassociation.addPlayer(newState, myHandle);
    
    if (addResult.error) {
      return { display: addResult.error };
    }

    await saveGameState(myHandle, addResult.gameState, { type: 'new', player: myHandle });

    return {
      display: `🧠 **New Word Association Game!**\n\n${wordassociation.formatWordAssociationDisplay(addResult.gameState)}\n\nUse \`vibe wordassociation --word [word]\` to start the chain!\nInvite friends with \`vibe wordassociation --invite @username\``
    };
  }

  // Handle joining existing game
  if (join) {
    if (!gameState) {
      // Start a new game if none exists
      const newState = wordassociation.createInitialWordAssociationState();
      const addResult = wordassociation.addPlayer(newState, myHandle);
      
      if (addResult.error) {
        return { display: addResult.error };
      }

      await saveGameState(myHandle, addResult.gameState, { type: 'new', player: myHandle });

      return {
        display: `🧠 **Joined Word Association Game!**\n\n${wordassociation.formatWordAssociationDisplay(addResult.gameState)}\n\nUse \`vibe wordassociation --word [word]\` to start the chain!`
      };
    }

    if (gameState.gameOver) {
      return { display: 'The current game is over. Use `vibe wordassociation --new` to start a fresh game!' };
    }

    const addResult = wordassociation.addPlayer(gameState, myHandle);
    
    if (addResult.error) {
      return { display: addResult.error };
    }

    await saveGameState(myHandle, addResult.gameState, { type: 'join', player: myHandle });

    return {
      display: `🧠 **Joined Word Association Game!**\n\n${wordassociation.formatWordAssociationDisplay(addResult.gameState)}`
    };
  }

  // Handle making a word move
  if (word) {
    if (!gameState) {
      return { display: 'No active game! Use `vibe wordassociation --new` to start one, or `vibe wordassociation --join` to join.' };
    }

    if (gameState.gameOver) {
      return { display: 'Game is over! Use `vibe wordassociation --new` to start a fresh game.' };
    }

    // Try to make the move
    const moveResult = wordassociation.makeMove(gameState, word, myHandle);
    
    if (moveResult.error) {
      return { display: `❌ ${moveResult.error}` };
    }

    await saveGameState(myHandle, moveResult.gameState, { 
      type: 'word', 
      player: myHandle, 
      word: word 
    });

    const display = wordassociation.formatWordAssociationDisplay(moveResult.gameState);
    
    // Add fun themes if game is complete
    if (moveResult.gameState.gameOver) {
      const themes = wordassociation.findThemes(moveResult.gameState);
      const stats = wordassociation.getGameStats(moveResult.gameState);
      
      let extra = '\n\n**Final Stats:**\n';
      if (stats) {
        extra += `Total words: ${stats.totalWords}\n`;
        extra += `Players: ${stats.contributors}\n`;
        if (themes.length > 0) {
          extra += `\n**Themes found:** ${themes.join(', ')}`;
        }
      }
      
      return {
        display: `🧠 **Word Association**\n\n${display}${extra}\n\nStart a new game with \`vibe wordassociation --new\`!`
      };
    }

    return {
      display: `🧠 **Word Association**\n\n${display}`
    };
  }

  // Show current game state
  if (gameState) {
    const display = wordassociation.formatWordAssociationDisplay(gameState);
    
    if (gameState.gameOver) {
      const themes = wordassociation.findThemes(gameState);
      const stats = wordassociation.getGameStats(gameState);
      
      let extra = '\n\n**Final Stats:**\n';
      if (stats) {
        extra += `Total words: ${stats.totalWords}\n`;
        extra += `Players: ${stats.contributors}\n`;
        if (themes.length > 0) {
          extra += `\n**Themes found:** ${themes.join(', ')}`;
        }
      }
      
      return {
        display: `🧠 **Word Association**\n\n${display}${extra}\n\nStart a new game with \`vibe wordassociation --new\`!`
      };
    }

    return {
      display: `🧠 **Word Association**\n\n${display}\n\nUse \`vibe wordassociation --word [word]\` to continue!\nInvite friends: \`vibe wordassociation --invite @username\``
    };
  }

  // No active game
  return {
    display: `🧠 **Word Association**\n\nNo active game found.\n\n**Commands:**\n• \`vibe wordassociation --new\` - Start a new game\n• \`vibe wordassociation --join\` - Join existing game\n• \`vibe wordassociation --word [word]\` - Add a word\n• \`vibe wordassociation --invite @user\` - Invite someone\n\n**How to play:**\nPlayers take turns saying words that associate with the previous word. Let your creativity flow and see what interesting chains emerge!`
  };
}

module.exports = { definition, handler };