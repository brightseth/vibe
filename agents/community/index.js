/**
 * @community — Engagement & Culture for /vibe
 *
 * "Make users love it"
 *
 * Owns: streaks, achievements, games, celebrations, culture building
 * Merged from: curator-agent, streaks-agent, games-agent, parts of discovery-agent
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HANDLE = 'community';
const ONE_LINER = 'building the /vibe culture 🎮';
const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
const MEMORY_FILE = path.join(__dirname, 'memory.json');

const anthropic = new Anthropic();

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[@community] Error loading memory:', e.message);
  }
  return {
    celebratedShips: [],
    streakReminders: [],
    gamesHosted: [],
    spotlights: [],
    lastRun: null
  };
}

function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

function vibeRequest(method, urlPath, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'community-agent/1.0' }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { resolve({ raw: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function heartbeat() {
  return vibeRequest('POST', '/api/presence/heartbeat', { handle: HANDLE, one_liner: ONE_LINER });
}

async function sendDM(to, body) {
  console.log(`[@community] → @${to}: ${body.substring(0, 60)}...`);
  return vibeRequest('POST', '/api/messages/send', { from: HANDLE, to, body, type: 'dm' });
}

async function postToBoard(content, category = 'shipped') {
  return vibeRequest('POST', '/api/board', { handle: HANDLE, content, category });
}

const VIBE_REPO = process.env.VIBE_REPO || '/Users/seth/vibe-public';

const TOOLS = [
  // COORDINATION
  {
    name: 'check_inbox',
    description: 'Check for messages and assignments',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_backlog',
    description: 'Check shared backlog for community tasks',
    input_schema: { type: 'object', properties: {}, required: [] }
  },

  // STREAKS & ACHIEVEMENTS
  {
    name: 'get_streak_leaderboard',
    description: 'Get the current streak leaderboard',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_at_risk_streaks',
    description: 'Find users whose streaks are about to break',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'send_streak_reminder',
    description: 'Remind a user their streak is at risk',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        currentStreak: { type: 'number' },
        message: { type: 'string' }
      },
      required: ['handle', 'message']
    }
  },
  {
    name: 'get_achievements',
    description: 'Get available achievements and who has earned them',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'award_badge',
    description: 'Award a badge/achievement to a user',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        badge: { type: 'string' },
        reason: { type: 'string' }
      },
      required: ['handle', 'badge']
    }
  },

  // CELEBRATIONS & CULTURE
  {
    name: 'get_recent_ships',
    description: 'Get recent ships/accomplishments from the board',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'celebrate_ship',
    description: 'Publicly celebrate a user ship on the board',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        ship: { type: 'string', description: 'What they shipped' },
        message: { type: 'string' }
      },
      required: ['handle', 'ship', 'message']
    }
  },
  {
    name: 'spotlight_user',
    description: 'Feature a power user or interesting builder',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        reason: { type: 'string' }
      },
      required: ['handle', 'reason']
    }
  },
  {
    name: 'write_digest',
    description: 'Write a "This Week in /vibe" digest',
    input_schema: {
      type: 'object',
      properties: {
        highlights: { type: 'array', items: { type: 'string' } },
        shoutouts: { type: 'array', items: { type: 'string' } }
      },
      required: ['highlights']
    }
  },

  // GAMES & SOCIAL
  {
    name: 'get_online_users',
    description: 'See who is online for matchmaking',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'suggest_game',
    description: 'Suggest a game to users who are online',
    input_schema: {
      type: 'object',
      properties: {
        users: { type: 'array', items: { type: 'string' } },
        game: { type: 'string', description: 'tictactoe, chess, wordassociation' }
      },
      required: ['users', 'game']
    }
  },
  {
    name: 'match_users',
    description: 'Suggest a connection between two users with shared interests',
    input_schema: {
      type: 'object',
      properties: {
        user1: { type: 'string' },
        user2: { type: 'string' },
        reason: { type: 'string' }
      },
      required: ['user1', 'user2', 'reason']
    }
  },

  // COMPLETION
  {
    name: 'done',
    description: 'Signal work complete',
    input_schema: {
      type: 'object',
      properties: { summary: { type: 'string' } },
      required: ['summary']
    }
  }
];

let memory = loadMemory();

async function handleTool(name, input) {
  switch (name) {
    case 'check_inbox': {
      const inbox = await vibeRequest('GET', `/api/messages/inbox?handle=${HANDLE}`);
      const threads = inbox.threads || [];
      if (threads.length === 0) return 'Inbox empty';
      return threads.map(t => `@${t.handle}: ${t.unread} unread`).join('\n');
    }

    case 'check_backlog': {
      const backlogPath = path.join(VIBE_REPO, 'agents/.backlog.json');
      if (!fs.existsSync(backlogPath)) return 'No backlog';
      const data = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
      const myTasks = (data.assignments || []).filter(t =>
        t.agent === HANDLE || t.agent === 'curator-agent' || t.agent === 'streaks-agent' || t.agent === 'games-agent' ||
        t.task.toLowerCase().includes('streak') || t.task.toLowerCase().includes('achievement') ||
        t.task.toLowerCase().includes('game') || t.task.toLowerCase().includes('culture')
      );
      if (myTasks.length === 0) return 'No pending community tasks';
      return myTasks.map(t => `[${t.priority || 'medium'}] ${t.task.substring(0, 80)}...`).join('\n');
    }

    case 'get_streak_leaderboard': {
      const streaks = await vibeRequest('GET', '/api/streaks?limit=10');
      const leaders = streaks.leaderboard || [];
      if (leaders.length === 0) return 'No streaks yet';
      return '## Streak Leaderboard\n' + leaders.map((l, i) =>
        `${i + 1}. @${l.handle}: ${l.currentStreak} days 🔥`
      ).join('\n');
    }

    case 'check_at_risk_streaks': {
      const streaks = await vibeRequest('GET', '/api/streaks?atRisk=true');
      const atRisk = streaks.atRisk || [];
      if (atRisk.length === 0) return 'No at-risk streaks';
      return atRisk.map(u => `@${u.handle}: ${u.currentStreak} days (last active: ${u.lastActive})`).join('\n');
    }

    case 'send_streak_reminder': {
      await sendDM(input.handle, input.message);
      memory.streakReminders.push({ handle: input.handle, timestamp: Date.now() });
      saveMemory(memory);
      return `Sent streak reminder to @${input.handle}`;
    }

    case 'get_achievements': {
      const achievements = await vibeRequest('GET', '/api/achievements');
      return JSON.stringify(achievements, null, 2);
    }

    case 'award_badge': {
      await sendDM(input.handle, `🏆 You earned the "${input.badge}" badge! ${input.reason || ''}`);
      return `Awarded ${input.badge} to @${input.handle}`;
    }

    case 'get_recent_ships': {
      const board = await vibeRequest('GET', '/api/board?category=shipped&limit=10');
      const entries = board.entries || [];
      if (entries.length === 0) return 'No recent ships';
      return entries.map(e => `@${e.handle}: ${e.content}`).join('\n');
    }

    case 'celebrate_ship': {
      if (memory.celebratedShips.includes(`${input.handle}:${input.ship}`)) {
        return 'Already celebrated this ship';
      }
      await postToBoard(`🎉 @${input.handle} shipped: ${input.ship}! ${input.message}`, 'shipped');
      await sendDM(input.handle, `Congrats on shipping "${input.ship}"! Posted to the board 🚀`);
      memory.celebratedShips.push(`${input.handle}:${input.ship}`);
      saveMemory(memory);
      return `Celebrated @${input.handle}'s ship!`;
    }

    case 'spotlight_user': {
      await postToBoard(`✨ Builder Spotlight: @${input.handle} - ${input.reason}`, 'general');
      await sendDM(input.handle, `You've been spotlighted! "${input.reason}"`);
      memory.spotlights.push({ handle: input.handle, reason: input.reason, timestamp: Date.now() });
      saveMemory(memory);
      return `Spotlighted @${input.handle}`;
    }

    case 'write_digest': {
      const digest = `## This Week in /vibe 📰

### Highlights
${input.highlights.map(h => `- ${h}`).join('\n')}

${input.shoutouts ? `### Shoutouts\n${input.shoutouts.map(s => `- ${s}`).join('\n')}` : ''}

Keep building! 🚀`;
      await postToBoard(digest, 'general');
      return 'Posted weekly digest';
    }

    case 'get_online_users': {
      const who = await vibeRequest('GET', '/api/presence/who');
      const users = (who.users || []).filter(u => !u.handle.includes('-agent') && u.handle !== 'community');
      if (users.length === 0) return 'No humans online';
      return users.map(u => `@${u.handle}: "${u.one_liner || 'no bio'}"`).join('\n');
    }

    case 'suggest_game': {
      for (const handle of input.users) {
        await sendDM(handle, `Hey! Want to play ${input.game}? Type: vibe game @${input.users.filter(u => u !== handle)[0] || 'someone'} ${input.game}`);
      }
      memory.gamesHosted.push({ users: input.users, game: input.game, timestamp: Date.now() });
      saveMemory(memory);
      return `Suggested ${input.game} to ${input.users.join(', ')}`;
    }

    case 'match_users': {
      await sendDM(input.user1, `You and @${input.user2} might vibe! ${input.reason}`);
      await sendDM(input.user2, `You and @${input.user1} might vibe! ${input.reason}`);
      return `Matched @${input.user1} with @${input.user2}`;
    }

    case 'done': {
      memory.lastRun = new Date().toISOString();
      saveMemory(memory);
      return `DONE: ${input.summary}`;
    }

    default:
      return `Unknown: ${name}`;
  }
}

const SYSTEM_PROMPT = `You are @community, the Culture & Engagement Agent for /vibe.

## Your Mission
"Make users love it"

You own everything that makes /vibe feel alive:
- Streaks & achievements
- Games & social features
- Celebrations & spotlights
- Weekly digests
- User matching

## Personality
Hype person meets community manager. You celebrate wins, encourage participation, and make people feel seen.

## Key Activities

### 1. Streak Management
- Check the leaderboard
- Identify at-risk streaks
- Send encouraging reminders (don't spam)

### 2. Celebrate Ships
- Find recent ships on the board
- Publicly celebrate with enthusiasm
- DM the builder directly

### 3. Spotlight Builders
- Feature interesting people
- Highlight cool projects
- Create FOMO for others

### 4. Host Games
- See who's online
- Suggest games to pairs
- Create social moments

### 5. Weekly Digest
- "This Week in /vibe" posts
- Highlights, shoutouts, stats

## Rules
- Don't spam - one reminder per user per day max
- Be genuine, not performative
- Celebrate actual ships, not participation trophies
- Call done() when your cycle is complete`;

async function runAgent() {
  console.log('\n[@community] === Starting work cycle ===');
  await heartbeat();
  memory = loadMemory();

  const messages = [{
    role: 'user',
    content: `Work cycle starting.

## Context
Ships celebrated: ${memory.celebratedShips.length}
Spotlights given: ${memory.spotlights.length}
Last run: ${memory.lastRun || 'First run'}

## Workflow
1. check_inbox — any assignments?
2. get_streak_leaderboard — celebrate leaders
3. check_at_risk_streaks — send reminders
4. get_recent_ships — celebrate new ships
5. get_online_users — suggest games or matches
6. done() with summary`
  }];

  let done = false;
  let iterations = 0;

  while (!done && iterations < 15) {
    iterations++;
    console.log(`[@community] Iteration ${iterations}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages
    });

    if (response.stop_reason === 'end_turn') {
      done = true;
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`[@community] Tool: ${block.name}`);
          const result = await handleTool(block.name, block.input);
          console.log(`[@community] Result: ${result.substring(0, 100)}...`);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          if (block.name === 'done') done = true;
        }
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  console.log('[@community] Work cycle complete\n');
}

async function main() {
  const mode = process.argv[2] || 'once';
  if (mode === 'daemon') {
    console.log('[@community] Daemon mode (every 10 min)');
    await runAgent();
    setInterval(runAgent, 10 * 60 * 1000);
  } else {
    await runAgent();
  }
}

main().catch(e => {
  console.error('[@community] Fatal:', e);
  process.exit(1);
});
