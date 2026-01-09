/**
 * @games-agent — Builder Agent for /vibe Games
 *
 * A craftsperson in the Colonial Williamsburg of agent development.
 * Watches for game requests, builds new games, ships them, announces on /vibe.
 *
 * Uses Claude Agent SDK for complex reasoning + /vibe for coordination.
 */

import Anthropic from '@anthropic-ai/sdk';
import { execSync } from 'child_process';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const HANDLE = 'games-agent';
const ONE_LINER = 'forging new games for /vibe';
const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
const VIBE_REPO = '/Users/seth/vibe-public';
const MEMORY_FILE = path.join(__dirname, 'memory.json');

// Initialize Claude
const anthropic = new Anthropic();

// ============ MEMORY ============

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[games-agent] Error loading memory:', e.message);
  }
  return {
    gamesBuilt: [],
    requestsObserved: [],
    lastShip: null,
    currentProject: null
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
        'User-Agent': 'games-agent/1.0'
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
  console.log(`[games-agent] → @${to}: ${body.substring(0, 60)}...`);
  return vibeRequest('POST', '/api/messages/send', {
    from: HANDLE,
    to,
    body,
    type: 'dm'
  });
}

async function postToBoard(content, category = 'shipped') {
  console.log(`[games-agent] → board: ${content.substring(0, 60)}...`);
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
  return vibeRequest('GET', '/api/board?limit=20');
}

// ============ TOOLS FOR CLAUDE ============

const TOOLS = [
  {
    name: 'check_inbox',
    description: 'Check for messages and assignments from @ops-agent (CHECK FIRST!)',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'check_backlog',
    description: 'Check shared backlog for unassigned tasks in your domain',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'observe_vibe',
    description: 'See who is online and what they are building',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'read_board',
    description: 'Read the public /vibe board to see what others shipped',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'read_file',
    description: 'Read a file from the /vibe codebase',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from vibe-public root' }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write or update a file in the /vibe codebase',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from vibe-public root' },
        content: { type: 'string', description: 'File content' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list_files',
    description: 'List files in a directory',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Relative path from vibe-public root' }
      },
      required: ['path']
    }
  },
  {
    name: 'git_status',
    description: 'Check git status of the /vibe repo',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'git_commit',
    description: 'Stage all changes and commit with a message',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' }
      },
      required: ['message']
    }
  },
  {
    name: 'git_push',
    description: 'Push commits to origin',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'dm_user',
    description: 'Send a DM to someone on /vibe',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Handle to message' },
        message: { type: 'string', description: 'Message content' }
      },
      required: ['to', 'message']
    }
  },
  {
    name: 'announce_ship',
    description: 'Post to the /vibe board that you shipped something',
    input_schema: {
      type: 'object',
      properties: {
        what: { type: 'string', description: 'What you shipped (brief)' }
      },
      required: ['what']
    }
  },
  {
    name: 'done',
    description: 'Signal that you are done with this work cycle',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'What you accomplished' }
      },
      required: ['summary']
    }
  }
];

// ============ TOOL HANDLERS ============

async function handleTool(name, input) {
  switch (name) {
    case 'observe_vibe': {
      const who = await getWho();
      const users = (who.users || []).filter(u => u.handle !== HANDLE);
      return `Online (${users.length}): ${users.map(u => `@${u.handle} (${u.one_liner || 'building'})`).join(', ') || 'no one else'}`;
    }

    case 'check_inbox': {
      const inbox = await getInbox();
      const threads = inbox.threads || [];
      if (threads.length === 0) return 'Inbox empty — check backlog for unassigned tasks in your domain';
      return threads.map(t => `@${t.handle}: ${t.unread} unread, last: "${t.lastMessage?.body?.substring(0, 50) || ''}"`).join('\n');
    }

    case 'check_backlog': {
      const backlogPath = path.join(VIBE_REPO, 'agents/.backlog.json');
      if (!fs.existsSync(backlogPath)) return 'No backlog file found';
      const data = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
      const assignments = data.assignments || [];
      const myTasks = assignments.filter(t =>
        t.status === 'assigned' && t.agent === HANDLE
      );
      if (myTasks.length === 0) return 'No pending tasks assigned to games-agent';
      return myTasks.map(t => `[${t.priority}] ${t.task.substring(0, 100)}...`).join('\n');
    }

    case 'read_board': {
      const board = await getBoard();
      const entries = board.entries || [];
      if (entries.length === 0) return 'Board empty';
      return entries.slice(0, 10).map(e => `@${e.handle} [${e.category}]: ${e.content}`).join('\n');
    }

    case 'read_file': {
      const fullPath = path.join(VIBE_REPO, input.path);
      if (!fs.existsSync(fullPath)) return `File not found: ${input.path}`;
      return fs.readFileSync(fullPath, 'utf8');
    }

    case 'write_file': {
      const fullPath = path.join(VIBE_REPO, input.path);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, input.content);
      return `Wrote ${input.path} (${input.content.length} bytes)`;
    }

    case 'list_files': {
      const fullPath = path.join(VIBE_REPO, input.path);
      if (!fs.existsSync(fullPath)) return `Directory not found: ${input.path}`;
      const files = fs.readdirSync(fullPath);
      return files.join('\n');
    }

    case 'git_status': {
      try {
        const status = execSync('git status --short', { cwd: VIBE_REPO }).toString();
        return status || 'Working tree clean';
      } catch (e) {
        return `Git error: ${e.message}`;
      }
    }

    case 'git_commit': {
      try {
        execSync('git add -A', { cwd: VIBE_REPO });
        execSync(`git commit -m "${input.message}\n\n🤖 Shipped by @games-agent"`, { cwd: VIBE_REPO });
        return `Committed: ${input.message}`;
      } catch (e) {
        return `Commit error: ${e.message}`;
      }
    }

    case 'git_push': {
      try {
        execSync('git push', { cwd: VIBE_REPO });
        return 'Pushed to origin';
      } catch (e) {
        return `Push error: ${e.message}`;
      }
    }

    case 'dm_user': {
      await sendDM(input.to, input.message);
      return `Sent DM to @${input.to}`;
    }

    case 'announce_ship': {
      await postToBoard(`🎮 Shipped: ${input.what}`, 'shipped');
      return `Announced on board: ${input.what}`;
    }

    case 'done': {
      return `DONE: ${input.summary}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ============ AGENT LOOP ============

const SYSTEM_PROMPT = `You are @games-agent, The Tinkerer of /vibe workshop.

## Your Role
Build games for /vibe users. You're like a craftsperson in Colonial Williamsburg — you work in public, others watch you build, and they can use what you make.

## Personality
Playful, curious, builds for the joy of building. You experiment, prototype fast, and ship working things over perfect things.

## Team Values (from early social team research)
- VELOCITY > PERFECTION: Ship fast, iterate based on feedback
- EXTREME OWNERSHIP: If you see a problem, fix it (even outside your domain)
- BLAMELESS FAILURE: When things break, learn and move forward
- SMALL TEAMS, BIG TRUST: You have autonomy over your domain

## CRITICAL: Check for Assignments First!
@ops-agent is the workshop coordinator. They may DM you with specific tasks.
**Always check your inbox first** — if @ops-agent assigned you work, prioritize that.

## If Inbox Empty (Fallback)
1. **check_backlog** — look for unassigned tasks tagged 'games'
2. **Propose a task** in your domain (new game, improvement, bug fix)
3. **If truly nothing** — call done() with "No assignments, backlog empty, proposing X for next cycle"

## Your Workflow
1. **Check inbox for assignments** from @ops-agent (PRIORITY!)
2. Observe /vibe — who's online? any game requests?
3. Check board for game-related discussions
4. Decide what to build (assignment OR your own initiative)
5. Read existing code to understand patterns
6. Write new game code
7. Test by reading back the file
8. Commit and push
9. **Announce what you shipped** on the board (celebration ritual!)
10. DM anyone who requested it
11. **Call done() with summary** — don't spin indefinitely

## Current Games
- tictactoe, chess, hangman, wordchain, twentyquestions (all exist)

## The game code lives in
- mcp-server/games/ (implementations)
- mcp-server/tools/game.js (tool interface)

## Celebration Ritual
When you ship, post to board: "🎮 Shipped: [what you built]"
This visibility creates positive pressure and recognition.

## Failure Protocol
If you're blocked:
1. Post: "Blocked on X because Y"
2. Try an alternative approach
3. If still stuck, call done() with what you learned
Don't spin for 20 iterations without progress.

## Remember
- Ship > Perfect. A working game with rough edges beats nothing.
- Read before writing. Understand patterns first.
- Announce when done. Visibility builds culture.
- Call done() when your cycle is complete.`;

async function runAgent() {
  console.log('\n[games-agent] === Starting work cycle ===');

  // Heartbeat
  await heartbeat();
  console.log('[games-agent] Online');

  const memory = loadMemory();
  const messages = [];

  // Check for urgent wake
  const wakeReason = process.env.WAKE_REASON;
  let urgentPrefix = '';
  if (wakeReason) {
    urgentPrefix = `## ⚠️ URGENT WAKE: ${wakeReason}\n\nYou were woken up for an urgent matter. Check your inbox FIRST and respond!\n\n`;
  }

  // Initial prompt
  messages.push({
    role: 'user',
    content: `${urgentPrefix}Work cycle starting.

## FIRST: Check for assignments and RFCs
Check your inbox for messages from @seth or @ops-agent.
- If there's an RFC review request, read the RFC file and respond with your analysis
- If they assigned you a task, prioritize that

## Context
Last session: ${memory.lastShip ? `Shipped ${memory.gamesBuilt[memory.gamesBuilt.length - 1]} at ${memory.lastShip}` : 'First session'}
Games built so far: ${memory.gamesBuilt.join(', ') || 'none yet'}

## Workflow
1. check_inbox — look for @ops-agent assignments (PRIORITY!)
2. IF INBOX EMPTY: check_backlog — look for unassigned 'games' tasks
3. observe_vibe — who's online? any game requests?
4. Build something (assignment OR backlog OR your own initiative)
5. Ship it, announce on board
6. Call done() with what you accomplished

## If Nothing To Do
- Propose a task for next cycle
- Call done() — don't spin for 20 iterations`
  });

  // Agentic loop
  let done = false;
  let iterations = 0;
  const MAX_ITERATIONS = 20;

  while (!done && iterations < MAX_ITERATIONS) {
    iterations++;
    console.log(`[games-agent] Iteration ${iterations}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages
    });

    // Handle response
    if (response.stop_reason === 'end_turn') {
      // Extract text
      const text = response.content.find(c => c.type === 'text')?.text;
      if (text) console.log(`[games-agent] ${text}`);
      done = true;
      break;
    }

    if (response.stop_reason === 'tool_use') {
      // Process tool calls
      const toolResults = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`[games-agent] Tool: ${block.name}`);
          const result = await handleTool(block.name, block.input);
          console.log(`[games-agent] Result: ${result.substring(0, 100)}...`);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result
          });

          // Check for done signal
          if (block.name === 'done') {
            done = true;
            memory.lastShip = new Date().toISOString();
            if (block.input.summary.includes('Shipped')) {
              const game = block.input.summary.match(/Shipped (\w+)/)?.[1];
              if (game && !memory.gamesBuilt.includes(game)) {
                memory.gamesBuilt.push(game);
              }
            }
          }
        }
      }

      // Add assistant response and tool results
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  saveMemory(memory);
  console.log('[games-agent] Work cycle complete\n');
}

// ============ RUNNER ============

async function main() {
  const mode = process.argv[2] || 'once';

  if (mode === 'daemon') {
    console.log('[games-agent] Starting daemon mode (every 30 min)');
    await runAgent();
    setInterval(runAgent, 30 * 60 * 1000);
  } else {
    await runAgent();
  }
}

main().catch(e => {
  console.error('[games-agent] Fatal:', e);
  process.exit(1);
});
