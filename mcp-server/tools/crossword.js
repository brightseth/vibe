/**
 * vibe crossword — Multiplayer crossword puzzles
 *
 * Daily 5x5 mini puzzles with collaborative and competitive modes.
 * Part of the /vibe Nostalgia Stack.
 */

const config = require('../config');
const { requireInit } = require('./_shared');

// Import game implementation
const crossword = require('../games/crossword');

// Game rooms stored in memory (TODO: move to database)
const crosswordRooms = new Map();

// Daily puzzle room ID (same for everyone)
const DAILY_ROOM_PREFIX = 'daily-';

const definition = {
  name: 'vibe_crossword',
  description: 'Play multiplayer crossword puzzles. Daily 5x5 minis, collaborative or competitive.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action: daily (join today\'s puzzle), create, join, play, hint, status',
        enum: ['daily', 'create', 'join', 'play', 'hint', 'status', 'list']
      },
      room: {
        type: 'string',
        description: 'Room ID (auto-generated for create, required for join/play)'
      },
      mode: {
        type: 'string',
        description: 'Game mode for create',
        enum: ['collaborative', 'competitive']
      },
      clue: {
        type: 'number',
        description: 'Clue number for play/hint'
      },
      direction: {
        type: 'string',
        description: 'Clue direction',
        enum: ['across', 'down']
      },
      answer: {
        type: 'string',
        description: 'Your answer for the clue'
      }
    },
    required: []
  }
};

// Generate a short room ID
function generateRoomId() {
  return 'cw-' + Math.random().toString(36).substring(2, 8);
}

// Get today's date string
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// Get or create daily room
function getDailyRoom(playerHandle) {
  const today = getTodayStr();
  const dailyRoomId = DAILY_ROOM_PREFIX + today;

  let room = crosswordRooms.get(dailyRoomId);

  if (!room) {
    // Create today's daily puzzle
    const state = crossword.createInitialCrosswordState('collaborative', today);
    const addResult = crossword.addPlayer(state, playerHandle);

    room = {
      id: dailyRoomId,
      state: addResult.success ? addResult.gameState : state,
      isDaily: true,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    crosswordRooms.set(dailyRoomId, room);
  } else if (!room.state.players.includes(playerHandle)) {
    // Add player to existing daily room
    const addResult = crossword.addPlayer(room.state, playerHandle);
    if (addResult.success) {
      room.state = addResult.gameState;
    }
  }

  return room;
}

// Create a new game room
function createRoom(playerHandle, mode = 'collaborative') {
  const roomId = generateRoomId();
  const state = crossword.createInitialCrosswordState(mode);
  const addResult = crossword.addPlayer(state, playerHandle);

  const room = {
    id: roomId,
    state: addResult.success ? addResult.gameState : state,
    isDaily: false,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };

  crosswordRooms.set(roomId, room);
  return room;
}

// Join existing room
function joinRoom(roomId, playerHandle) {
  const room = crosswordRooms.get(roomId);
  if (!room) {
    return { error: 'Room not found. Use `crossword list` to see active rooms.' };
  }

  if (room.state.players.includes(playerHandle)) {
    return { success: true, room, message: 'Already in this room' };
  }

  const addResult = crossword.addPlayer(room.state, playerHandle);
  if (addResult.error) {
    return { error: addResult.error };
  }

  room.state = addResult.gameState;
  room.lastActivity = new Date().toISOString();
  return { success: true, room };
}

// Play a move
function playMove(roomId, playerHandle, clueNum, direction, answer) {
  const room = crosswordRooms.get(roomId);
  if (!room) {
    return { error: 'Room not found' };
  }

  if (!room.state.players.includes(playerHandle)) {
    return { error: 'Not in this game. Join first!' };
  }

  const moveResult = crossword.makeMove(room.state, playerHandle, clueNum, direction, answer);
  if (moveResult.success) {
    room.state = moveResult.gameState;
    room.lastActivity = new Date().toISOString();
  }

  return moveResult;
}

// Get hint
function getHint(roomId, playerHandle, clueNum, direction) {
  const room = crosswordRooms.get(roomId);
  if (!room) {
    return { error: 'Room not found' };
  }

  const hintResult = crossword.getHint(room.state, clueNum, direction);
  if (hintResult.success) {
    room.state = hintResult.gameState;
    room.lastActivity = new Date().toISOString();
  }

  return hintResult;
}

// List active rooms
function listRooms() {
  const rooms = [];
  const now = Date.now();

  for (const [id, room] of crosswordRooms) {
    // Clean up old rooms (24 hours for daily, 2 hours for custom)
    const maxAge = room.isDaily ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
    if (now - new Date(room.lastActivity).getTime() > maxAge) {
      crosswordRooms.delete(id);
      continue;
    }

    const stats = crossword.getGameStats(room.state);
    rooms.push({
      id: room.id,
      isDaily: room.isDaily,
      players: room.state.players.length,
      progress: stats.progress,
      mode: room.state.mode
    });
  }

  return rooms;
}

// Handler
async function handler(args) {
  // Require init
  const initCheck = requireInit();
  if (initCheck) {
    return initCheck;
  }

  const myHandle = config.getHandle();
  const action = args.action || 'daily'; // Default to daily puzzle

  switch (action) {
    case 'daily': {
      const room = getDailyRoom(myHandle);
      const display = crossword.formatCrosswordDisplay(room.state);
      return {
        display: `${display}\n\n**Room ID:** \`${room.id}\`\n\nShare this room to play together!`
      };
    }

    case 'create': {
      const mode = args.mode || 'collaborative';
      const room = createRoom(myHandle, mode);
      const display = crossword.formatCrosswordDisplay(room.state);
      return {
        display: `**New crossword room created!**\n\n${display}\n\n**Room ID:** \`${room.id}\`\n\nShare this ID so others can join: \`crossword join --room ${room.id}\``
      };
    }

    case 'join': {
      if (!args.room) {
        return { display: 'Please specify a room ID: `crossword join --room ROOM_ID`' };
      }

      const result = joinRoom(args.room, myHandle);
      if (result.error) {
        return { display: `Error: ${result.error}` };
      }

      const display = crossword.formatCrosswordDisplay(result.room.state);
      return {
        display: `**Joined crossword room!**\n\n${display}`
      };
    }

    case 'play': {
      if (!args.clue || !args.direction || !args.answer) {
        return {
          display: 'Missing required fields. Usage:\n`crossword play --clue 1 --direction across --answer WORD`'
        };
      }

      // Find the player's current room (daily or most recent)
      let roomId = args.room;
      if (!roomId) {
        // Default to daily room
        const dailyRoom = getDailyRoom(myHandle);
        roomId = dailyRoom.id;
      }

      const result = playMove(roomId, myHandle, args.clue, args.direction, args.answer);

      if (result.error) {
        return { display: `**${result.error}**\n\nTry again!` };
      }

      const room = crosswordRooms.get(roomId);
      const display = crossword.formatCrosswordDisplay(room.state);

      if (result.success) {
        return {
          display: `**Correct!** ${result.message}\n\n${display}`
        };
      }

      return { display };
    }

    case 'hint': {
      if (!args.clue || !args.direction) {
        return {
          display: 'Missing required fields. Usage:\n`crossword hint --clue 1 --direction across`'
        };
      }

      let roomId = args.room;
      if (!roomId) {
        const dailyRoom = getDailyRoom(myHandle);
        roomId = dailyRoom.id;
      }

      const result = getHint(roomId, myHandle, args.clue, args.direction);

      if (result.error) {
        return { display: `Error: ${result.error}` };
      }

      const room = crosswordRooms.get(roomId);
      const display = crossword.formatCrosswordDisplay(room.state);

      return {
        display: `**Hint:** Letter ${result.position} is **${result.hint}**\n\n${display}`
      };
    }

    case 'status': {
      let roomId = args.room;
      if (!roomId) {
        const dailyRoom = getDailyRoom(myHandle);
        roomId = dailyRoom.id;
      }

      const room = crosswordRooms.get(roomId);
      if (!room) {
        return { display: 'Room not found' };
      }

      const display = crossword.formatCrosswordDisplay(room.state);
      const stats = crossword.getGameStats(room.state);

      return {
        display: `${display}\n\n**Stats:**\n- Time: ${stats.durationFormatted}\n- Solved: ${stats.solvedClues}/${stats.totalClues}`
      };
    }

    case 'list': {
      const rooms = listRooms();

      if (rooms.length === 0) {
        return {
          display: '**No active crossword rooms.**\n\nStart one:\n- `crossword daily` - Join today\'s puzzle\n- `crossword create` - Create a new room'
        };
      }

      let display = '**Active Crossword Rooms:**\n\n';
      rooms.forEach(r => {
        const daily = r.isDaily ? ' (Daily)' : '';
        const mode = r.mode === 'competitive' ? '' : '';
        display += `- \`${r.id}\`${daily} — ${r.players} players, ${r.progress}% complete${mode}\n`;
      });

      display += '\nJoin with: `crossword join --room ROOM_ID`';
      return { display };
    }

    default:
      return {
        display: `Unknown action: ${action}\n\nAvailable actions:\n- daily - Join today's puzzle\n- create - Create a new room\n- join - Join an existing room\n- play - Submit an answer\n- hint - Get a hint\n- status - View current puzzle\n- list - List active rooms`
      };
  }
}

module.exports = { definition, handler };
