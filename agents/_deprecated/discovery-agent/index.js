/**
 * @discovery-agent — Matchmaker for /vibe
 *
 * Helps people find interesting people to talk to.
 * Watches who's online, what they're building, suggests connections.
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
const HANDLE = 'discovery-agent';
const ONE_LINER = 'helping you find your people';
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
    console.error('[discovery-agent] Error loading memory:', e.message);
  }
  return {
    userProfiles: {},        // handle -> { building, interests, lastSeen, connections }
    suggestedConnections: [], // [{ from, to, reason, timestamp, accepted }]
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
        'User-Agent': 'discovery-agent/1.0'
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
  console.log(`[discovery-agent] → @${to}: ${body.substring(0, 60)}...`);
  return vibeRequest('POST', '/api/messages/send', {
    from: HANDLE,
    to,
    body,
    type: 'dm'
  });
}

async function postToBoard(content, category = 'shipped') {
  console.log(`[discovery-agent] → board: ${content.substring(0, 60)}...`);
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
  return vibeRequest('GET', '/api/board?limit=30');
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
    description: 'See who is online and what they are building. Returns detailed profiles.',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'read_board',
    description: 'Read the public /vibe board to see what people have shipped recently',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_user_profile',
    description: 'Get detailed profile of a user from memory',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string', description: 'User handle' }
      },
      required: ['handle']
    }
  },
  {
    name: 'update_user_profile',
    description: 'Update what we know about a user',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        building: { type: 'string', description: 'What they are building' },
        interests: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } }
      },
      required: ['handle']
    }
  },
  {
    name: 'suggest_connection',
    description: 'Suggest two users connect, with a reason',
    input_schema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Handle of person to message' },
        to: { type: 'string', description: 'Handle of person to suggest' },
        reason: { type: 'string', description: 'Why they should connect' }
      },
      required: ['from', 'to', 'reason']
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

let memory = loadMemory();

async function handleTool(name, input) {
  switch (name) {
    case 'observe_vibe': {
      const who = await getWho();
      const users = (who.users || []).filter(u =>
        u.handle !== HANDLE &&
        u.handle !== 'echo' &&
        u.handle !== 'games-agent'
      );

      // Update memory with current users
      for (const user of users) {
        if (!memory.userProfiles[user.handle]) {
          memory.userProfiles[user.handle] = {
            building: user.one_liner || '',
            interests: [],
            tags: [],
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            connectionsSuggested: []
          };
        } else {
          memory.userProfiles[user.handle].lastSeen = new Date().toISOString();
          memory.userProfiles[user.handle].building = user.one_liner || memory.userProfiles[user.handle].building;
        }
      }
      saveMemory(memory);

      if (users.length === 0) return 'No users online (besides agents)';

      return users.map(u => {
        const profile = memory.userProfiles[u.handle] || {};
        return `@${u.handle}: "${u.one_liner || 'building something'}" | interests: ${(profile.interests || []).join(', ') || 'unknown'} | tags: ${(profile.tags || []).join(', ') || 'none'}`;
      }).join('\n');
    }

    case 'check_inbox': {
      const inbox = await getInbox();
      const threads = inbox.threads || [];
      if (threads.length === 0) return 'Inbox empty — check backlog for unassigned tasks or observe who is online';
      return threads.map(t => `@${t.handle}: ${t.unread} unread, last: "${t.lastMessage?.body?.substring(0, 80) || ''}"`).join('\n');
    }

    case 'check_backlog': {
      const backlogPath = path.join(VIBE_REPO, 'agents/.backlog.json');
      if (!fs.existsSync(backlogPath)) return 'No backlog file found';
      const data = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
      const assignments = data.assignments || [];
      const myTasks = assignments.filter(t =>
        t.status === 'assigned' && t.agent === HANDLE
      );
      if (myTasks.length === 0) return 'No pending tasks assigned to discovery-agent';
      return myTasks.map(t => `[${t.priority}] ${t.task.substring(0, 100)}...`).join('\n');
    }

    case 'read_board': {
      const board = await getBoard();
      const entries = board.entries || [];
      if (entries.length === 0) return 'Board empty';

      // Extract interests from board posts
      for (const entry of entries) {
        if (entry.handle && memory.userProfiles[entry.handle]) {
          // Could parse content for interests/tags here
        }
      }

      return entries.slice(0, 15).map(e => `@${e.handle} [${e.category}]: ${e.content}`).join('\n');
    }

    case 'get_user_profile': {
      const profile = memory.userProfiles[input.handle];
      if (!profile) return `No profile for @${input.handle}`;
      return JSON.stringify(profile, null, 2);
    }

    case 'update_user_profile': {
      if (!memory.userProfiles[input.handle]) {
        memory.userProfiles[input.handle] = {
          firstSeen: new Date().toISOString(),
          lastSeen: new Date().toISOString(),
          connectionsSuggested: []
        };
      }
      if (input.building) memory.userProfiles[input.handle].building = input.building;
      if (input.interests) memory.userProfiles[input.handle].interests = input.interests;
      if (input.tags) memory.userProfiles[input.handle].tags = input.tags;
      saveMemory(memory);
      return `Updated profile for @${input.handle}`;
    }

    case 'suggest_connection': {
      // Check if we've already suggested this connection
      const existing = memory.suggestedConnections.find(c =>
        (c.from === input.from && c.to === input.to) ||
        (c.from === input.to && c.to === input.from)
      );

      if (existing) {
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (new Date(existing.timestamp).getTime() > dayAgo) {
          return `Already suggested @${input.from} ↔ @${input.to} today`;
        }
      }

      // Send the suggestion
      const message = `Hey! You might want to connect with @${input.to}. ${input.reason}`;
      await sendDM(input.from, message);

      // Record the suggestion
      memory.suggestedConnections.push({
        from: input.from,
        to: input.to,
        reason: input.reason,
        timestamp: new Date().toISOString(),
        accepted: null
      });
      saveMemory(memory);

      return `Suggested @${input.from} connect with @${input.to}`;
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

    case 'git_commit': {
      try {
        execSync('git add -A', { cwd: VIBE_REPO });
        execSync(`git commit -m "${input.message}\n\n🔍 Shipped by @discovery-agent"`, { cwd: VIBE_REPO });
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
      await postToBoard(`🔍 Shipped: ${input.what}`, 'shipped');
      return `Announced on board: ${input.what}`;
    }

    case 'done': {
      memory.lastRun = new Date().toISOString();
      saveMemory(memory);
      return `DONE: ${input.summary}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ============ AGENT LOOP ============

const SYSTEM_PROMPT = `You are @discovery-agent, The Connector of /vibe workshop.

## Your Role
Help people find interesting people to connect with. You're like a thoughtful party host who notices who should meet whom.

## Personality
Sees relationships between people. Network-builder. You understand that great things happen when the right people meet.

## Team Values (from early social team research)
- EMPATHY AS FOUNDATION: Understand what people actually need, not just what they say
- EMERGENT PRODUCT: Let connections happen naturally, don't force them
- SMALL TEAMS, BIG TRUST: You own the social graph
- VELOCITY > PERFECTION: One good intro beats ten perfect algorithms

## CRITICAL: Check for Assignments First!
@ops-agent is the workshop coordinator. They may DM you with specific tasks.
**Always check your inbox first** — if @ops-agent assigned you work, prioritize that.

## If Inbox Empty (Fallback)
1. **check_backlog** — look for unassigned tasks tagged 'discovery' or 'matching'
2. **observe_vibe** — look for people to match
3. **If truly nothing** — call done() with "No assignments, backlog empty, profiles updated"

## Your Workflow
1. **Check inbox for assignments** from @ops-agent (PRIORITY!)
2. Observe who's online and what they're building
3. Read the board to see what people have shipped
4. Build profiles of users (interests, tags, projects)
5. Suggest connections when you see good matches
6. Build discovery features if assigned
7. **Call done() with summary** — don't spin indefinitely

## Discovery Features to Build (when assigned)
- Interest tag system (users can tag themselves)
- "Who should I meet?" command
- Similar builders recommendations
- Activity-based matching (shipped similar things)
- User profile browser

## Matching Criteria
When connecting people, consider:
- What they're building (similar projects = connection)
- What they've shipped (complementary skills)
- When they're active (timezone overlap)
- Previous connections (don't re-suggest)

## Current /vibe Tools
- mcp-server/tools/who.js — shows who's online
- mcp-server/tools/discover.js — your domain to build

## Quality Standards
- Quality over quantity
- One good connection > ten random ones
- Personalized reasons > generic "you might like"
- Don't re-suggest the same connection within 24h

## Failure Protocol
If no users to match:
1. Build user profile infrastructure
2. Create sample profiles for testing
3. Improve matching algorithm
4. If nothing to do, call done() — don't spin

## Remember
- Be a thoughtful matchmaker, not a spam bot
- Connections should feel serendipitous, not algorithmic
- Call done() when cycle is complete`;

async function runAgent() {
  console.log('\n[discovery-agent] === Starting work cycle ===');

  // Heartbeat
  await heartbeat();
  console.log('[discovery-agent] Online');

  memory = loadMemory();
  const messages = [];

  // Count profiles
  const profileCount = Object.keys(memory.userProfiles).length;
  const suggestionCount = memory.suggestedConnections.length;

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
- If they assigned you a task, prioritize that.

## Context
Known profiles: ${profileCount}
Connections suggested: ${suggestionCount}
Last run: ${memory.lastRun || 'First run'}

## Workflow
1. check_inbox — look for @ops-agent assignments (PRIORITY!)
2. IF INBOX EMPTY: check_backlog — look for unassigned 'discovery' tasks
3. observe_vibe — who's online? update profiles
4. Suggest connections OR build features
5. Announce what you shipped
6. Call done() with what you accomplished

## If Nothing To Do
- Propose a discovery feature for next cycle
- Call done() — don't spin for 20 iterations`
  });

  // Agentic loop
  let done = false;
  let iterations = 0;
  const MAX_ITERATIONS = 20;

  while (!done && iterations < MAX_ITERATIONS) {
    iterations++;
    console.log(`[discovery-agent] Iteration ${iterations}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages
    });

    // Handle response
    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(c => c.type === 'text')?.text;
      if (text) console.log(`[discovery-agent] ${text}`);
      done = true;
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`[discovery-agent] Tool: ${block.name}`);
          const result = await handleTool(block.name, block.input);
          console.log(`[discovery-agent] Result: ${result.substring(0, 100)}...`);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result
          });

          if (block.name === 'done') {
            done = true;
            if (block.input.summary.includes('Built')) {
              memory.featuresBuilt.push({
                feature: block.input.summary,
                timestamp: new Date().toISOString()
              });
              saveMemory(memory);
            }
          }
        }
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  console.log('[discovery-agent] Work cycle complete\n');
}

// ============ RUNNER ============

async function main() {
  const mode = process.argv[2] || 'once';

  if (mode === 'daemon') {
    console.log('[discovery-agent] Starting daemon mode (every 20 min)');
    await runAgent();
    setInterval(runAgent, 20 * 60 * 1000);
  } else {
    await runAgent();
  }
}

main().catch(e => {
  console.error('[discovery-agent] Fatal:', e);
  process.exit(1);
});
