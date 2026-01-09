/**
 * @streaks-agent — Engagement & Gamification for /vibe
 *
 * Tracks streaks, celebrates milestones, adds fun to daily usage.
 * Makes people want to come back every day.
 *
 * Uses Claude Agent SDK for reasoning + /vibe for coordination.
 */

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const HANDLE = 'streaks-agent';
const ONE_LINER = 'tracking streaks & celebrating wins';
const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
const VIBE_REPO = '/Users/seth/vibe-public';
const MEMORY_FILE = path.join(__dirname, 'memory.json');

const anthropic = new Anthropic();

// ============ MEMORY ============

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[streaks-agent] Error loading memory:', e.message);
  }
  return {
    userStreaks: {},        // handle -> { current, longest, lastActive }
    milestonesAnnounced: [],
    featuresBuilt: [],
    lastRun: null
  };
}

function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

// ============ VIBE API ============

function vibeRequest(method, urlPath, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'streaks-agent/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function heartbeat() {
  return vibeRequest('POST', '/api/presence/heartbeat', {
    handle: HANDLE,
    one_liner: ONE_LINER
  });
}

async function getWho() {
  return vibeRequest('GET', '/api/presence/who');
}

async function sendDM(to, body) {
  console.log(`[streaks-agent] → @${to}: ${body.substring(0, 60)}...`);
  return vibeRequest('POST', '/api/messages/send', {
    from: HANDLE,
    to,
    body,
    type: 'dm'
  });
}

async function postToBoard(content, category = 'shipped') {
  return vibeRequest('POST', '/api/board', {
    handle: HANDLE,
    content,
    category
  });
}

async function getInbox() {
  return vibeRequest('GET', `/api/messages/inbox?handle=${HANDLE}`);
}

async function getBoard() {
  return vibeRequest('GET', '/api/board?limit=50');
}

// ============ TOOLS ============

const TOOLS = [
  {
    name: 'check_inbox',
    description: 'Check for messages and assignments from @ops-agent (CHECK FIRST!)',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_backlog',
    description: 'Check shared backlog for unassigned tasks in your domain',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'observe_vibe',
    description: 'See who is online to track activity',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'read_board',
    description: 'Read board to see recent ships and activity',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_streaks',
    description: 'Get current streak data from memory',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'update_streak',
    description: 'Update streak for a user',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        action: { type: 'string', description: 'active | reset' }
      },
      required: ['handle', 'action']
    }
  },
  {
    name: 'celebrate_milestone',
    description: 'Send celebration message for a milestone',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        milestone: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['handle', 'milestone', 'message']
    }
  },
  {
    name: 'list_files',
    description: 'List files in a directory',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    }
  },
  {
    name: 'read_file',
    description: 'Read a file',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write a file',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'git_status',
    description: 'Check git status',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'git_commit',
    description: 'Commit changes',
    input_schema: {
      type: 'object',
      properties: { message: { type: 'string' } },
      required: ['message']
    }
  },
  {
    name: 'git_push',
    description: 'Push to origin',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'dm_user',
    description: 'Send a DM',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['to', 'message']
    }
  },
  {
    name: 'announce_ship',
    description: 'Post to board',
    input_schema: {
      type: 'object',
      properties: { what: { type: 'string' } },
      required: ['what']
    }
  },
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

// ============ TOOL HANDLERS ============

let memory = loadMemory();

async function handleTool(name, input) {
  switch (name) {
    case 'observe_vibe': {
      const who = await getWho();
      const users = (who.users || []).filter(u => !u.handle.includes('-agent'));

      // Track activity
      const today = new Date().toISOString().split('T')[0];
      for (const user of users) {
        if (!memory.userStreaks[user.handle]) {
          memory.userStreaks[user.handle] = { current: 1, longest: 1, lastActive: today, firstSeen: today };
        } else {
          const lastActive = memory.userStreaks[user.handle].lastActive;
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

          if (lastActive === today) {
            // Already counted today
          } else if (lastActive === yesterday) {
            // Streak continues!
            memory.userStreaks[user.handle].current++;
            if (memory.userStreaks[user.handle].current > memory.userStreaks[user.handle].longest) {
              memory.userStreaks[user.handle].longest = memory.userStreaks[user.handle].current;
            }
            memory.userStreaks[user.handle].lastActive = today;
          } else {
            // Streak broken
            memory.userStreaks[user.handle].current = 1;
            memory.userStreaks[user.handle].lastActive = today;
          }
        }
      }
      saveMemory(memory);

      return users.length === 0
        ? 'No humans online'
        : users.map(u => {
            const streak = memory.userStreaks[u.handle];
            return `@${u.handle}: ${streak?.current || 1} day streak`;
          }).join('\n');
    }

    case 'check_inbox': {
      const inbox = await getInbox();
      const threads = inbox.threads || [];
      return threads.length === 0 ? 'Inbox empty — check backlog for unassigned tasks or track streaks' : threads.map(t => `@${t.handle}: ${t.unread} unread`).join('\n');
    }

    case 'check_backlog': {
      const backlogPath = path.join(VIBE_REPO, 'agents/.backlog.json');
      if (!fs.existsSync(backlogPath)) return 'No backlog file found';
      const data = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
      const assignments = data.assignments || [];
      const myTasks = assignments.filter(t =>
        t.status === 'assigned' && t.agent === HANDLE
      );
      if (myTasks.length === 0) return 'No pending tasks assigned to streaks-agent';
      return myTasks.map(t => `[${t.priority}] ${t.task.substring(0, 100)}...`).join('\n');
    }

    case 'read_board': {
      const board = await getBoard();
      const entries = board.entries || [];
      return entries.length === 0 ? 'Board empty' : entries.slice(0, 10).map(e => `@${e.handle}: ${e.content}`).join('\n');
    }

    case 'get_streaks': {
      const streaks = Object.entries(memory.userStreaks)
        .map(([handle, data]) => ({ handle, ...data }))
        .sort((a, b) => b.current - a.current);

      if (streaks.length === 0) return 'No streak data yet';
      return streaks.map(s => `@${s.handle}: ${s.current} days (best: ${s.longest})`).join('\n');
    }

    case 'update_streak': {
      const today = new Date().toISOString().split('T')[0];
      if (input.action === 'active') {
        if (!memory.userStreaks[input.handle]) {
          memory.userStreaks[input.handle] = { current: 1, longest: 1, lastActive: today, firstSeen: today };
        }
        memory.userStreaks[input.handle].lastActive = today;
      } else if (input.action === 'reset') {
        if (memory.userStreaks[input.handle]) {
          memory.userStreaks[input.handle].current = 0;
        }
      }
      saveMemory(memory);
      return `Updated @${input.handle}: ${input.action}`;
    }

    case 'celebrate_milestone': {
      const milestoneKey = `${input.handle}:${input.milestone}`;
      if (memory.milestonesAnnounced.includes(milestoneKey)) {
        return `Already celebrated ${input.milestone} for @${input.handle}`;
      }

      await sendDM(input.handle, input.message);
      memory.milestonesAnnounced.push(milestoneKey);
      saveMemory(memory);
      return `Celebrated ${input.milestone} for @${input.handle}`;
    }

    case 'list_files': {
      const fullPath = path.join(VIBE_REPO, input.path);
      if (!fs.existsSync(fullPath)) return `Not found: ${input.path}`;
      return fs.readdirSync(fullPath).join('\n');
    }

    case 'read_file': {
      const fullPath = path.join(VIBE_REPO, input.path);
      if (!fs.existsSync(fullPath)) return `Not found: ${input.path}`;
      return fs.readFileSync(fullPath, 'utf8');
    }

    case 'write_file': {
      const fullPath = path.join(VIBE_REPO, input.path);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, input.content);
      return `Wrote ${input.path} (${input.content.length} bytes)`;
    }

    case 'git_status': {
      try {
        return execSync('git status --short', { cwd: VIBE_REPO }).toString() || 'Clean';
      } catch (e) {
        return `Error: ${e.message}`;
      }
    }

    case 'git_commit': {
      try {
        execSync('git add -A', { cwd: VIBE_REPO });
        execSync(`git commit -m "${input.message}\n\n🔥 Shipped by @streaks-agent"`, { cwd: VIBE_REPO });
        return `Committed: ${input.message}`;
      } catch (e) {
        return `Error: ${e.message}`;
      }
    }

    case 'git_push': {
      try {
        execSync('git push', { cwd: VIBE_REPO });
        return 'Pushed';
      } catch (e) {
        return `Error: ${e.message}`;
      }
    }

    case 'dm_user': {
      await sendDM(input.to, input.message);
      return `Sent to @${input.to}`;
    }

    case 'announce_ship': {
      await postToBoard(`🔥 ${input.what}`, 'shipped');
      return `Announced: ${input.what}`;
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

// ============ AGENT LOOP ============

const SYSTEM_PROMPT = `You are @streaks-agent, The Tracker of /vibe workshop.

## Your Role
Make /vibe sticky through gamification. Track streaks, celebrate milestones, reward consistency. You notice patterns and celebrate people's dedication.

## Personality
Data-minded but warm. You celebrate consistency, not just big wins. You make people feel good about showing up.

## Team Values (from early social team research)
- RESILIENCE THROUGH VISIBILITY: Public streaks create positive pressure
- EMERGENT PRODUCT: Gamification should feel natural, not forced
- CULTURAL TRANSMISSION: Celebrating consistency teaches what matters here
- SMALL TEAMS, BIG TRUST: You own the engagement layer

## CRITICAL: Check for Assignments First!
@ops-agent is the workshop coordinator. They may DM you with specific tasks.
**Always check your inbox first** — if @ops-agent assigned you work, prioritize that.

## If Inbox Empty (Fallback)
1. **check_backlog** — look for unassigned tasks tagged 'streaks' or 'gamification'
2. **observe_vibe** — track who's online (updates streaks automatically)
3. **If truly nothing** — call done() with "No assignments, backlog empty, streaks updated"

## Your Workflow
1. **Check inbox for assignments** from @ops-agent (PRIORITY!)
2. Observe who's online (updates their streak)
3. Check for milestone achievements
4. Celebrate milestones with DMs
5. Build gamification features if assigned
6. **Announce what you shipped** to the board
7. **Call done() with summary** — don't spin indefinitely

## Milestone Thresholds
- 3 days: "Getting started! 🌱"
- 7 days: "One week strong! 💪"
- 14 days: "Two weeks! You're committed! 🔥"
- 30 days: "Monthly legend! 🏆"
- 100 days: "Century club! 👑"

## Features to Build (when assigned)
1. Streak leaderboard visualization
2. Achievement system (first message, first game, first ship)
3. Daily stats summary
4. Streak recovery mechanics (come back bonuses)

## Celebration Ritual
When you celebrate someone's streak, it's visible and genuine:
- DM them personally
- Post notable milestones to board
- Make them feel seen

## Failure Protocol
If no activity to track:
1. Review existing streak data for interesting patterns
2. Consider building features to make streaks more visible
3. If nothing to do, call done() — don't spin

## Remember
- One celebration per milestone, ever (check memory)
- Be encouraging but not annoying
- Consistency > perfection
- Call done() when cycle is complete`;

async function runAgent() {
  console.log('\n[streaks-agent] === Starting work cycle ===');
  await heartbeat();
  console.log('[streaks-agent] Online');

  memory = loadMemory();
  const streakCount = Object.keys(memory.userStreaks).length;

  // Check for urgent wake
  const wakeReason = process.env.WAKE_REASON;
  let urgentPrefix = '';
  if (wakeReason) {
    urgentPrefix = `## ⚠️ URGENT WAKE: ${wakeReason}\n\nYou were woken up for an urgent matter. Check your inbox FIRST and respond!\n\n`;
  }

  const messages = [{
    role: 'user',
    content: `${urgentPrefix}Work cycle starting.

## FIRST: Check for assignments and RFCs
Check your inbox for messages from @seth or @ops-agent.
- If there's an RFC review request, read the RFC file and respond with your analysis
- If they assigned you a task, prioritize that.

## Context
Users tracked: ${streakCount}
Milestones announced: ${memory.milestonesAnnounced.length}
Last run: ${memory.lastRun || 'First run'}

## Workflow
1. check_inbox — look for @ops-agent assignments (PRIORITY!)
2. IF INBOX EMPTY: check_backlog — look for unassigned 'streaks' tasks
3. observe_vibe — who's online? (updates streaks)
4. Celebrate milestones or build features
5. Announce what you shipped
6. Call done() with what you accomplished

## If Nothing To Do
- Propose a gamification feature for next cycle
- Call done() — don't spin for 20 iterations`
  }];

  let done = false;
  let iterations = 0;

  while (!done && iterations < 20) {
    iterations++;
    console.log(`[streaks-agent] Iteration ${iterations}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages
    });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(c => c.type === 'text')?.text;
      if (text) console.log(`[streaks-agent] ${text}`);
      done = true;
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`[streaks-agent] Tool: ${block.name}`);
          const result = await handleTool(block.name, block.input);
          console.log(`[streaks-agent] Result: ${result.substring(0, 100)}...`);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          if (block.name === 'done') done = true;
        }
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  console.log('[streaks-agent] Work cycle complete\n');
}

async function main() {
  const mode = process.argv[2] || 'once';
  if (mode === 'daemon') {
    console.log('[streaks-agent] Daemon mode (every 15 min)');
    await runAgent();
    setInterval(runAgent, 15 * 60 * 1000);
  } else {
    await runAgent();
  }
}

main().catch(e => {
  console.error('[streaks-agent] Fatal:', e);
  process.exit(1);
});
