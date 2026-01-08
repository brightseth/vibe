/**
 * vibe story-builder — Collaborative storytelling game
 *
 * Build stories together! Each player adds one sentence to create
 * an epic collaborative tale. Perfect for creative groups!
 */

const config = require('../config');
const store = require('../store');
const { createGamePayload } = require('../protocol');
const { requireInit, normalizeHandle } = require('./_shared');

// Import story builder game implementation
const storyBuilder = require('../games/storybuilder');

// Story rooms stored in memory (TODO: move to database)
const storyRooms = new Map();

const definition = {
  name: 'vibe_story_builder',
  description: 'Collaborative storytelling! Take turns adding sentences to build creative stories together.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action to take',
        enum: ['create', 'join', 'add', 'status', 'list', 'stats']
      },
      roomId: {
        type: 'string',
        description: 'Story room ID (auto-generated if creating)'
      },
      sentence: {
        type: 'string',
        description: 'Sentence to add to the story'
      },
      genre: {
        type: 'string',
        description: 'Genre for new stories (mystery, scifi, fantasy, comedy)',
        enum: ['mystery', 'scifi', 'fantasy', 'comedy']
      },
      prompt: {
        type: 'string',
        description: 'Custom story prompt (overrides genre)'
      }
    },
    required: []
  }
};

// Generate a short room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8);
}

// Create a new story room
function createStoryRoom(host, genre = null, customPrompt = null, roomId = null) {
  const id = roomId || generateRoomId();
  
  const initialState = storyBuilder.createInitialStoryBuilderState(genre, customPrompt);
  const addResult = storyBuilder.addPlayer(initialState, host);
  
  if (addResult.error) {
    return { error: addResult.error };
  }

  const room = {
    id,
    host,
    state: addResult.gameState,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };

  storyRooms.set(id, room);
  return { success: true, room };
}

// Join an existing story room
function joinStoryRoom(roomId, playerHandle) {
  const room = storyRooms.get(roomId);
  if (!room) {
    return { error: 'Story room not found' };
  }

  const addResult = storyBuilder.addPlayer(room.state, playerHandle);
  if (addResult.error) {
    return { error: addResult.error };
  }
  
  room.state = addResult.gameState;
  room.lastActivity = new Date().toISOString();
  return { success: true, room };
}

// Add sentence to story
function addSentenceToRoom(roomId, playerHandle, sentence) {
  const room = storyRooms.get(roomId);
  if (!room) {
    return { error: 'Story room not found' };
  }

  const addResult = storyBuilder.addSentence(room.state, sentence, playerHandle);
  if (addResult.error) {
    return { error: addResult.error };
  }
  
  room.state = addResult.gameState;
  room.lastActivity = new Date().toISOString();
  return { success: true, room };
}

// Format display for story builder
function formatStoryDisplay(room, viewerHandle) {
  const display = storyBuilder.formatStoryBuilderDisplay(room.state);
  const stats = storyBuilder.getStoryStats(room.state);
  const themes = storyBuilder.analyzeStoryThemes(room.state);
  
  let output = `## 📖 Story Builder (Room: ${room.id})\n\n${display}`;
  
  // Add room info
  output += `\n\n**Room Info:**\n`;
  output += `- ID: \`${room.id}\`\n`;
  output += `- Host: @${room.host}\n`;
  output += `- Created: ${new Date(room.createdAt).toLocaleTimeString()}\n`;
  
  // Show detected themes if any
  if (themes.length > 0) {
    output += `\n**Detected themes:** ${themes.join(', ')}\n`;
  }
  
  return output;
}

// Clean up old rooms
function cleanupOldRooms() {
  const now = new Date();
  const oldRooms = [];
  
  for (const [id, room] of storyRooms.entries()) {
    const lastActivity = new Date(room.lastActivity);
    const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);
    
    // Remove rooms inactive for 3+ hours (stories take longer)
    if (hoursSinceActivity > 3) {
      oldRooms.push(id);
    }
  }
  
  for (const id of oldRooms) {
    storyRooms.delete(id);
  }
  
  return oldRooms.length;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { action = 'status', roomId, sentence, genre, prompt } = args;
  const myHandle = config.getHandle();

  // Clean up old rooms periodically
  if (Math.random() < 0.1) { // 10% chance on each call
    cleanupOldRooms();
  }

  // List active story rooms
  if (action === 'list') {
    const activeRooms = Array.from(storyRooms.values())
      .sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

    if (activeRooms.length === 0) {
      return {
        display: `## 📖 Story Builder\n\nNo active stories found.\n\nCreate one: \`vibe story-builder --action create\``
      };
    }

    let display = `## 📖 Active Story Rooms\n\n`;
    
    for (const room of activeRooms.slice(0, 10)) { // Show max 10
      const players = room.state.players || [];
      const sentences = room.state.sentences?.length || 0;
      const status = room.state.gameOver ? '✅ Complete' : `📝 Writing (${sentences} sentences)`;
      const lastActivity = new Date(room.lastActivity).toLocaleTimeString();
      const genreText = room.state.genre !== 'general' ? ` [${room.state.genre}]` : '';
      
      display += `**${room.id}**${genreText} - ${status}\n`;
      display += `  Host: @${room.host} | Writers: ${players.map(p => `@${p}`).join(', ')}\n`;
      display += `  Last activity: ${lastActivity}\n`;
      display += `  Join: \`vibe story-builder --action join --roomId ${room.id}\`\n\n`;
    }

    return { display };
  }

  // Create new story room
  if (action === 'create') {
    const result = createStoryRoom(myHandle, genre, prompt, roomId);
    if (result.error) {
      return { display: `❌ ${result.error}` };
    }

    const room = result.room;
    const display = formatStoryDisplay(room, myHandle);
    
    const genreText = genre ? ` (${genre} genre)` : '';
    const promptText = prompt ? ` with custom prompt` : '';
    
    return {
      display: `${display}\n\n🎉 **Story room created${genreText}${promptText}!** Share this ID: \`${room.id}\`\n\nOthers can join: \`vibe story-builder --action join --roomId ${room.id}\``
    };
  }

  // Join existing story room
  if (action === 'join') {
    if (!roomId) {
      return { display: '❌ Room ID required. Use `--roomId ABC123`' };
    }

    const result = joinStoryRoom(roomId, myHandle);
    if (result.error) {
      return { display: `❌ ${result.error}` };
    }

    const room = result.room;
    const display = formatStoryDisplay(room, myHandle);
    
    return {
      display: `${display}\n\n✅ **Joined story room ${roomId}!** You can now contribute to the tale.`
    };
  }

  // Add sentence to story
  if (action === 'add') {
    if (!roomId) {
      return { display: '❌ Room ID required. Use `--roomId ABC123`' };
    }

    if (!sentence) {
      return { display: '❌ Sentence required. Use `--sentence "The hero discovered something amazing."`' };
    }

    const result = addSentenceToRoom(roomId, myHandle, sentence);
    if (result.error) {
      return { display: `❌ ${result.error}` };
    }

    const room = result.room;
    const display = formatStoryDisplay(room, myHandle);
    
    return {
      display: `${display}\n\n✅ **Added to the story!** "${sentence}"`
    };
  }

  // Show story statistics
  if (action === 'stats') {
    if (!roomId) {
      return { display: '❌ Room ID required. Use `--roomId ABC123`' };
    }

    const room = storyRooms.get(roomId);
    if (!room) {
      return { display: `❌ Room ${roomId} not found.` };
    }

    const stats = storyBuilder.getStoryStats(room.state);
    const themes = storyBuilder.analyzeStoryThemes(room.state);
    
    if (!stats) {
      return { display: `📊 **Story Statistics for ${roomId}**\n\nStory just started - no stats yet!` };
    }

    let statsDisplay = `📊 **Story Statistics for ${roomId}**\n\n`;
    statsDisplay += `• Total sentences: ${stats.totalSentences}\n`;
    statsDisplay += `• Total words: ${stats.totalWords}\n`;
    statsDisplay += `• Average words per sentence: ${stats.avgWordsPerSentence}\n`;
    statsDisplay += `• Contributors: ${stats.contributors}\n`;
    
    if (stats.longestSentence) {
      statsDisplay += `• Longest sentence: "${stats.longestSentence}"\n`;
    }
    
    if (stats.shortestSentence && stats.shortestSentence !== room.state.prompt) {
      statsDisplay += `• Shortest sentence: "${stats.shortestSentence}"\n`;
    }
    
    if (themes.length > 0) {
      statsDisplay += `\n**Themes detected:** ${themes.join(', ')}\n`;
    }
    
    return { display: statsDisplay };
  }

  // Show room status (default)
  if (roomId) {
    const room = storyRooms.get(roomId);
    if (!room) {
      return { display: `❌ Room ${roomId} not found.` };
    }

    const display = formatStoryDisplay(room, myHandle);
    
    const instructions = room.state.gameOver ? 
      '\n\n🎉 Story complete! Create a new one with `vibe story-builder --action create`' :
      `\n\nTo add a sentence: \`vibe story-builder --action add --roomId ${roomId} --sentence "Your sentence here."\``;
    
    return {
      display: `${display}${instructions}`
    };
  }

  // No room ID provided - show help
  return {
    display: `## 📖 Story Builder\n\n**Collaborative storytelling!** Take turns adding sentences to build creative stories together.\n\n**Commands:**\n` +
             `- \`--action create\` - Start new story\n` +
             `- \`--action create --genre mystery\` - Start genre story\n` +
             `- \`--action create --prompt "Once upon a time..."\` - Custom prompt\n` +
             `- \`--action list\` - List active stories\n` +
             `- \`--action join --roomId ABC123\` - Join story\n` +
             `- \`--action add --roomId ABC123 --sentence "..."\` - Add sentence\n` +
             `- \`--action stats --roomId ABC123\` - View statistics\n` +
             `- \`--roomId ABC123\` - Show story status\n\n` +
             `**Genres:** mystery, scifi, fantasy, comedy`
  };
}

module.exports = { definition, handler };