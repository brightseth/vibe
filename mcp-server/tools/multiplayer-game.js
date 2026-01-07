/**
 * Multiplayer Games Tool for /vibe
 *
 * Handles party/group games that support multiple players:
 * - Word Association (2-6 players)
 * - Future: Werewolf, Party games, etc.
 *
 * Unlike the main game tool (1v1 DMs), this creates shared game rooms
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload, formatPayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Import game implementations
const wordAssociation = require('../games/wordassociation');

// Game rooms stored in memory (TODO: move to database during migration)
const gameRooms = new Map();

const definition = {
  name: 'vibe_multiplayer_game',
  description: 'Start or join multiplayer games. Supports: wordassociation',
  inputSchema: {
    type: 'object',
    properties: {
      game: {
        type: 'string',
        description: 'Game type',
        enum: ['wordassociation', 'words']
      },
      action: {
        type: 'string',
        description: 'Action to take',
        enum: ['create', 'join', 'play', 'status', 'list']
      },
      roomId: {
        type: 'string',
        description: 'Game room ID (auto-generated if creating)'
      },
      word: {
        type: 'string',
        description: 'Word to play (for word association)'
      }
    },
    required: ['game']
  }
};

// Generate a short room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8);
}

// Create a new game room
function createGameRoom(game, host, roomId = null) {
  const id = roomId || generateRoomId();
  
  let initialState;
  if (game === 'wordassociation' || game === 'words') {
    initialState = wordAssociation.createInitialWordAssociationState();
    const addResult = wordAssociation.addPlayer(initialState, host);
    if (addResult.error) {
      return { error: addResult.error };
    }
    initialState = addResult.gameState;
  } else {
    return { error: `Unsupported game: ${game}` };
  }

  const room = {
    id,
    game,
    host,
    state: initialState,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };

  gameRooms.set(id, room);
  return { success: true, room };
}

// Join an existing game room
function joinGameRoom(roomId, playerHandle) {
  const room = gameRooms.get(roomId);
  if (!room) {
    return { error: 'Game room not found' };
  }

  if (room.game === 'wordassociation' || room.game === 'words') {
    const addResult = wordAssociation.addPlayer(room.state, playerHandle);
    if (addResult.error) {
      return { error: addResult.error };
    }
    
    room.state = addResult.gameState;
    room.lastActivity = new Date().toISOString();
    return { success: true, room };
  }

  return { error: `Unsupported game: ${room.game}` };
}

// Make a move in a game room
function makeMove(roomId, playerHandle, move) {
  const room = gameRooms.get(roomId);
  if (!room) {
    return { error: 'Game room not found' };
  }

  if (room.game === 'wordassociation' || room.game === 'words') {
    const moveResult = wordAssociation.makeMove(room.state, move, playerHandle);
    if (moveResult.error) {
      return { error: moveResult.error };
    }
    
    room.state = moveResult.gameState;
    room.lastActivity = new Date().toISOString();
    return { success: true, room, move };
  }

  return { error: `Unsupported game: ${room.game}` };
}

// Format display for multiplayer games
function formatGameDisplay(room, viewerHandle) {
  if (room.game === 'wordassociation' || room.game === 'words') {
    const display = wordAssociation.formatWordAssociationDisplay(room.state);
    const stats = wordAssociation.getGameStats(room.state);
    const themes = wordAssociation.findThemes(room.state);
    
    let output = `## 🎮 Word Association (Room: ${room.id})\n\n${display}`;
    
    // Add room info
    output += `\n\n**Room Info:**\n`;
    output += `- ID: \`${room.id}\`\n`;
    output += `- Host: @${room.host}\n`;
    output += `- Created: ${new Date(room.createdAt).toLocaleTimeString()}\n`;
    
    // Show stats if game is interesting
    if (stats && stats.totalWords > 5) {
      output += `\n**Stats:**\n`;
      output += `- Words played: ${stats.totalWords}\n`;
      output += `- Contributors: ${stats.contributors}\n`;
      if (stats.longestWord) {
        output += `- Longest word: ${stats.longestWord} letters\n`;
      }
    }
    
    // Show discovered themes
    if (themes.length > 0) {
      output += `\n**Themes discovered:** ${themes.join(', ')}\n`;
    }
    
    return output;
  }
  
  return `Game type ${room.game} not implemented yet.`;
}

// Clean up old rooms (called periodically)
function cleanupOldRooms() {
  const now = new Date();
  const oldRooms = [];
  
  for (const [id, room] of gameRooms.entries()) {
    const lastActivity = new Date(room.lastActivity);
    const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);
    
    // Remove rooms inactive for 2+ hours
    if (hoursSinceActivity > 2) {
      oldRooms.push(id);
    }
  }
  
  for (const id of oldRooms) {
    gameRooms.delete(id);
  }
  
  return oldRooms.length;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { game, action = 'status', roomId, word } = args;
  const myHandle = config.getHandle();

  // Normalize game type
  const gameType = game === 'words' ? 'wordassociation' : game;

  // Clean up old rooms periodically
  if (Math.random() < 0.1) { // 10% chance on each call
    cleanupOldRooms();
  }

  // List active rooms
  if (action === 'list') {
    const activeRooms = Array.from(gameRooms.values())
      .filter(room => room.game === gameType)
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    if (activeRooms.length === 0) {
      return {
        display: `## 🎮 ${gameType} Games\n\nNo active rooms found.\n\nCreate one: \`vibe multiplayer-game ${gameType} --action create\``
      };
    }

    let display = `## 🎮 Active ${gameType} Rooms\n\n`;
    
    for (const room of activeRooms.slice(0, 10)) { // Show max 10
      const players = room.state.players || [];
      const status = room.state.gameOver ? '✅ Complete' : `🎲 Active (${players.length} players)`;
      const lastActivity = new Date(room.lastActivity).toLocaleTimeString();
      
      display += `**${room.id}** - ${status}\n`;
      display += `  Host: @${room.host} | Players: ${players.map(p => `@${p}`).join(', ')}\n`;
      display += `  Last activity: ${lastActivity}\n`;
      display += `  Join: \`vibe multiplayer-game ${gameType} --action join --roomId ${room.id}\`\n\n`;
    }

    return { display };
  }

  // Create new room
  if (action === 'create') {
    const result = createGameRoom(gameType, myHandle, roomId);
    if (result.error) {
      return { display: `❌ ${result.error}` };
    }

    const room = result.room;
    const display = formatGameDisplay(room, myHandle);
    
    return {
      display: `${display}\n\n🎉 **Room created!** Share this ID with friends: \`${room.id}\`\n\nOthers can join: \`vibe multiplayer-game ${gameType} --action join --roomId ${room.id}\``
    };
  }

  // Join existing room
  if (action === 'join') {
    if (!roomId) {
      return { display: '❌ Room ID required. Use `--roomId ABC123`' };
    }

    const result = joinGameRoom(roomId, myHandle);
    if (result.error) {
      return { display: `❌ ${result.error}` };
    }

    const room = result.room;
    const display = formatGameDisplay(room, myHandle);
    
    return {
      display: `${display}\n\n✅ **Joined room ${roomId}!**`
    };
  }

  // Make a move/play
  if (action === 'play') {
    if (!roomId) {
      return { display: '❌ Room ID required. Use `--roomId ABC123`' };
    }

    if (gameType === 'wordassociation' && !word) {
      return { display: '❌ Word required for word association. Use `--word cats`' };
    }

    const result = makeMove(roomId, myHandle, word);
    if (result.error) {
      return { display: `❌ ${result.error}` };
    }

    const room = result.room;
    const display = formatGameDisplay(room, myHandle);
    
    return {
      display: `${display}\n\n✅ **Played "${word}"!**`
    };
  }

  // Show room status (default)
  if (roomId) {
    const room = gameRooms.get(roomId);
    if (!room) {
      return { display: `❌ Room ${roomId} not found.` };
    }

    if (room.game !== gameType) {
      return { display: `❌ Room ${roomId} is for ${room.game}, not ${gameType}.` };
    }

    const display = formatGameDisplay(room, myHandle);
    
    let instructions = '';
    if (gameType === 'wordassociation') {
      instructions = `\n\nTo play: \`vibe multiplayer-game words --action play --roomId ${roomId} --word [your_word]\``;
    }
    
    return {
      display: `${display}${instructions}`
    };
  }

  // No room ID provided - show help
  return {
    display: `## 🎮 Multiplayer ${gameType}\n\n**Commands:**\n` +
             `- \`--action create\` - Create new room\n` +
             `- \`--action list\` - List active rooms\n` +
             `- \`--action join --roomId ABC123\` - Join room\n` +
             (gameType === 'wordassociation' 
               ? `- \`--action play --roomId ABC123 --word cats\` - Play word\n`
               : '') +
             `- \`--roomId ABC123\` - Show room status`
  };
}

module.exports = { definition, handler };