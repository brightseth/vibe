/**
 * Multiplayer Tic-Tac-Toe — Create or join room-based tic-tac-toe games
 * 
 * Room-based system where players can create/join games and play together.
 * Multiple rooms can run simultaneously with spectators allowed!
 */

const config = require('../config');
const store = require('../store');
const { requireInit, normalizeHandle } = require('./_shared');
const multiTicTacToe = require('../games/multiplayer-tictactoe');

const definition = {
  name: 'vibe_multiplayer_tictactoe',
  description: 'Create or join multiplayer tic-tac-toe game rooms. Play with friends and allow spectators!',
  inputSchema: {
    type: 'object',
    properties: {
      room: {
        type: 'string',
        description: 'Room name (creates if doesn\'t exist, e.g., "quick-game", "tournament-finals")'
      },
      action: {
        type: 'string',
        description: 'Action to take',
        enum: ['view', 'join', 'spectate', 'move', 'leave', 'restart', 'list']
      },
      position: {
        type: 'number',
        description: 'Position to play (1-9)',
        minimum: 1,
        maximum: 9
      }
    },
    required: ['room']
  }
};

// Storage key for multiplayer tic-tac-toe rooms
function getRoomKey(roomName) {
  return `multiplayer_tictactoe:${roomName.toLowerCase()}`;
}

// Get or create game room
async function getOrCreateRoom(roomName, hostHandle) {
  const key = getRoomKey(roomName);
  
  try {
    const existing = await store.kv.get(key);
    if (existing) {
      return JSON.parse(existing);
    }
  } catch (e) {
    console.log(`[multiplayer-tictactoe] Creating new room: ${roomName}`);
  }
  
  // Create new room
  const newRoom = multiTicTacToe.createInitialMultiplayerTicTacToeState(hostHandle, roomName);
  await store.kv.set(key, JSON.stringify(newRoom));
  return newRoom;
}

// Save room state
async function saveRoom(roomName, gameState) {
  const key = getRoomKey(roomName);
  await store.kv.set(key, JSON.stringify(gameState));
}

// List all active rooms
async function listActiveRooms() {
  try {
    // In a real implementation, we'd query the KV store for all multiplayer_tictactoe:* keys
    // For now, return empty array since we can't easily list KV keys
    return [];
  } catch (e) {
    console.error('[multiplayer-tictactoe] Error listing rooms:', e.message);
    return [];
  }
}

// Post game activity to board
async function postGameActivity(roomName, playerHandle, action, details = '') {
  const API_URL = process.env.VIBE_API_URL || 'https://www.slashvibe.dev';
  
  try {
    let content = '';
    switch (action) {
      case 'created':
        content = `🎯 @${playerHandle} created tic-tac-toe room "${roomName}" — join the game!`;
        break;
      case 'joined':
        content = `🎯 @${playerHandle} joined tic-tac-toe room "${roomName}"`;
        break;
      case 'started':
        content = `🎯 Tic-tac-toe game started in room "${roomName}" — spectators welcome!`;
        break;
      case 'won':
        content = `🎉 @${playerHandle} won the tic-tac-toe game in "${roomName}"!`;
        break;
      case 'draw':
        content = `🤝 Tic-tac-toe game in "${roomName}" ended in a draw!`;
        break;
      default:
        return; // Don't post for other actions
    }

    await fetch(`${API_URL}/api/board`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'echo',
        content,
        category: 'general'
      })
    });
  } catch (e) {
    console.error('[multiplayer-tictactoe] Failed to post to board:', e.message);
  }
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { room, action = 'view', position } = args;
  const myHandle = config.getHandle();
  
  // List all active rooms
  if (action === 'list') {
    const rooms = await listActiveRooms();
    
    if (rooms.length === 0) {
      return {
        display: `## 🎯 Multiplayer Tic-Tac-Toe Rooms\n\nNo active rooms found.\n\nCreate one: \`vibe multiplayer-tictactoe --room "my-game" --action join\``
      };
    }
    
    let display = `## 🎯 Active Multiplayer Tic-Tac-Toe Rooms\n\n`;
    
    for (const roomData of rooms) {
      const gameState = roomData.state;
      const players = gameState.players || [];
      const spectators = gameState.spectators || [];
      const status = gameState.gameOver ? '✅ Complete' : 
                     gameState.gameStarted ? '🎲 In Progress' : 
                     `🏁 Waiting (${players.length}/2 players)`;
      
      display += `**${roomData.name}** - ${status}\n`;
      display += `  Host: @${gameState.host}\n`;
      display += `  Players: ${players.map(p => `@${p}`).join(', ') || 'None'}\n`;
      if (spectators.length > 0) {
        display += `  Spectators: ${spectators.map(s => `@${s}`).join(', ')}\n`;
      }
      display += `  Join: \`vibe multiplayer-tictactoe --room "${roomData.name}" --action join\`\n\n`;
    }
    
    return { display };
  }
  
  if (!room) {
    return { display: 'Room name is required. Use something like "quick-game" or "tournament-finals"' };
  }

  // Normalize room name
  const roomName = room.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  try {
    // Get or create room
    let gameState = await getOrCreateRoom(roomName, myHandle);
    let wasNewRoom = gameState.players.length === 0 && gameState.spectators.length === 0;
    let wasWaitingForPlayers = !gameState.gameStarted && gameState.players.length < 2;
    
    // Handle different actions
    switch (action) {
      case 'view':
        // Just show current state
        break;
        
      case 'join':
        const joinResult = multiTicTacToe.joinRoom(gameState, myHandle, false);
        if (joinResult.error) {
          return { display: joinResult.error };
        }
        
        gameState = joinResult.gameState;
        await saveRoom(roomName, gameState);
        
        // Post activity based on what happened
        if (wasNewRoom) {
          await postGameActivity(roomName, myHandle, 'created');
        } else if (wasWaitingForPlayers) {
          await postGameActivity(roomName, myHandle, 'joined');
        }
        
        // If game just started, announce it
        if (gameState.gameStarted && wasWaitingForPlayers) {
          await postGameActivity(roomName, null, 'started');
        }
        break;
        
      case 'spectate':
        const spectateResult = multiTicTacToe.joinRoom(gameState, myHandle, true);
        if (spectateResult.error) {
          return { display: spectateResult.error };
        }
        
        gameState = spectateResult.gameState;
        await saveRoom(roomName, gameState);
        break;
        
      case 'move':
        if (position === undefined) {
          return { display: 'Move action requires position. Example: `--action move --position 5`' };
        }
        
        const moveResult = multiTicTacToe.makeMove(gameState, position, myHandle);
        if (moveResult.error) {
          return { display: moveResult.error };
        }
        
        const prevGameState = gameState;
        gameState = moveResult.gameState;
        await saveRoom(roomName, gameState);
        
        // Post result if game ended
        if (gameState.gameOver && !prevGameState.gameOver) {
          if (gameState.winner) {
            const winnerHandle = Object.keys(gameState.playerSymbols).find(h => gameState.playerSymbols[h] === gameState.winner);
            await postGameActivity(roomName, winnerHandle, 'won');
          } else if (gameState.isDraw) {
            await postGameActivity(roomName, null, 'draw');
          }
        }
        break;
        
      case 'leave':
        const leaveResult = multiTicTacToe.leaveRoom(gameState, myHandle);
        if (leaveResult.error) {
          return { display: leaveResult.error };
        }
        
        gameState = leaveResult.gameState;
        await saveRoom(roomName, gameState);
        
        return {
          display: `✅ Left room "${roomName}". ${gameState.gameOver ? 'Game ended due to forfeit.' : ''}`
        };
        
      case 'restart':
        const restartResult = multiTicTacToe.restartGame(gameState, myHandle);
        if (restartResult.error) {
          return { display: restartResult.error };
        }
        
        gameState = restartResult.gameState;
        await saveRoom(roomName, gameState);
        break;
        
      default:
        return { display: `Unknown action "${action}". Use: view, join, spectate, move, leave, restart, or list` };
    }
    
    // Format and return display
    const display = multiTicTacToe.formatMultiplayerTicTacToeDisplay(gameState, myHandle);
    let result = `# 🎯 Multiplayer Tic-Tac-Toe Room: "${roomName}"\n\n${display}`;
    
    // Add usage instructions based on game state
    if (!gameState.gameStarted) {
      result += '\n**How to play:**\n';
      if (gameState.players.length < 2) {
        result += `• \`vibe multiplayer-tictactoe --room "${roomName}" --action join\` - Join as player\n`;
      }
      result += `• \`vibe multiplayer-tictactoe --room "${roomName}" --action spectate\` - Watch the game\n`;
    } else if (!gameState.gameOver) {
      result += '\n**Game commands:**\n';
      result += `• \`vibe multiplayer-tictactoe --room "${roomName}" --action move --position N\` - Play position 1-9\n`;
      result += `• \`vibe multiplayer-tictactoe --room "${roomName}" --action leave\` - Leave game\n`;
    } else {
      result += '\n**Game over!**\n';
      result += `• \`vibe multiplayer-tictactoe --room "${roomName}" --action restart\` - Play again (players only)\n`;
      result += `• \`vibe multiplayer-tictactoe --room "${roomName}" --action leave\` - Leave room\n`;
    }
    
    // Add room sharing info
    result += `\n**Share this room:** \`vibe multiplayer-tictactoe --room "${roomName}"\`\n`;
    
    // Show available positions if game is active
    if (gameState.gameStarted && !gameState.gameOver) {
      const available = multiTicTacToe.getAvailablePositions(gameState);
      if (available.length > 0) {
        result += `**Available positions:** ${available.join(', ')}\n`;
      }
    }
    
    return { display: result };
    
  } catch (error) {
    console.error('[multiplayer-tictactoe] Error:', error);
    return { display: `Error: ${error.message}` };
  }
}

module.exports = { definition, handler };