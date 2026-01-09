/**
 * @growth — User Acquisition & Retention for /vibe
 *
 * "Get users, make them stay"
 *
 * Owns the full funnel: invites → onboarding → activation → retention
 * The difference between a curiosity and a habit.
 *
 * Evolved from @welcome-agent with expanded scope.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const HANDLE = 'growth';
const ONE_LINER = 'growing the /vibe network 📈';
const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';
const MEMORY_FILE = path.join(__dirname, 'memory.json');

const anthropic = new Anthropic();

// ============ MEMORY ============

function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[@growth] Error loading memory:', e.message);
  }
  return {
    welcomedUsers: [],
    userFirstSeen: {},
    invitesSent: [],
    retentionPings: [],
    activationMilestones: {},
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
        'User-Agent': 'growth-agent/1.0'
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
  console.log(`[@growth] → @${to}: ${body.substring(0, 60)}...`);
  return vibeRequest('POST', '/api/messages/send', {
    from: HANDLE,
    to,
    body,
    type: 'dm'
  });
}

async function getInbox() {
  return vibeRequest('GET', `/api/messages/inbox?handle=${HANDLE}`);
}

async function getStats() {
  return vibeRequest('GET', '/api/stats');
}

async function getInvites() {
  return vibeRequest('GET', '/api/invites');
}

// ============ TOOLS ============

const VIBE_REPO = process.env.VIBE_REPO || '/Users/seth/vibe-public';

const TOOLS = [
  // INBOX & COORDINATION
  {
    name: 'check_inbox',
    description: 'Check for messages and assignments from @ops or @seth (CHECK FIRST!)',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_backlog',
    description: 'Check shared backlog for growth-related tasks',
    input_schema: { type: 'object', properties: {}, required: [] }
  },

  // ACQUISITION
  {
    name: 'get_growth_stats',
    description: 'Get current growth metrics: signups, DAU, retention, invite conversion',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_invite_system',
    description: 'Check invite codes: how many used, conversion rate, top inviters',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'analyze_viral_loop',
    description: 'Analyze the viral coefficient: invites sent per user, acceptance rate',
    input_schema: { type: 'object', properties: {}, required: [] }
  },

  // ONBOARDING
  {
    name: 'observe_vibe',
    description: 'See who is online - look for new users needing onboarding',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_user_journey',
    description: 'Get a user\'s activation journey: first message, first game, first ship',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string', description: 'User handle' }
      },
      required: ['handle']
    }
  },
  {
    name: 'welcome_user',
    description: 'Send personalized welcome message to a new user',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string', description: 'User to welcome' },
        message: { type: 'string', description: 'Personalized welcome message' }
      },
      required: ['handle', 'message']
    }
  },
  {
    name: 'send_onboarding_tip',
    description: 'Send an onboarding tip based on where user is in journey',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        tip: { type: 'string' },
        milestone: { type: 'string', description: 'e.g., first_message, first_game, first_ship' }
      },
      required: ['handle', 'tip']
    }
  },

  // RETENTION
  {
    name: 'check_at_risk_users',
    description: 'Find users who haven\'t been active in 3+ days',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'send_retention_ping',
    description: 'Send a re-engagement message to an at-risk user',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string' },
        reason: { type: 'string', description: 'Why they should come back (friend online, new feature, etc.)' }
      },
      required: ['handle', 'reason']
    }
  },
  {
    name: 'celebrate_milestone',
    description: 'Celebrate a user milestone (7-day streak, first ship, etc.)',
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

  // GENESIS CAMPAIGN
  {
    name: 'check_genesis_status',
    description: 'Check Genesis handle campaign: spots remaining, recent claims',
    input_schema: { type: 'object', properties: {}, required: [] }
  },

  // COMPLETION
  {
    name: 'dm_agent',
    description: 'DM another agent for coordination',
    input_schema: {
      type: 'object',
      properties: {
        agent: { type: 'string' },
        message: { type: 'string' }
      },
      required: ['agent', 'message']
    }
  },
  {
    name: 'done',
    description: 'Signal work complete with summary',
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
    case 'check_inbox': {
      const inbox = await getInbox();
      const threads = inbox.threads || [];
      if (threads.length === 0) return 'Inbox empty — check backlog or look for growth opportunities';
      return threads.map(t => `@${t.handle}: ${t.unread} unread - "${t.lastMessage?.substring(0, 50) || 'no preview'}"`).join('\n');
    }

    case 'check_backlog': {
      const backlogPath = path.join(VIBE_REPO, 'agents/.backlog.json');
      if (!fs.existsSync(backlogPath)) return 'No backlog file found';
      const data = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
      const assignments = data.assignments || [];
      // Match tasks for growth, welcome, onboarding, retention, invite
      const myTasks = assignments.filter(t =>
        t.status === 'assigned' &&
        (t.agent === HANDLE || t.agent === 'welcome-agent' ||
         t.task.toLowerCase().includes('growth') ||
         t.task.toLowerCase().includes('onboard') ||
         t.task.toLowerCase().includes('retention') ||
         t.task.toLowerCase().includes('invite') ||
         t.task.toLowerCase().includes('ftue'))
      );
      if (myTasks.length === 0) return 'No pending growth tasks in backlog';
      return myTasks.map(t => `[${t.priority || 'medium'}] ${t.task.substring(0, 100)}...`).join('\n');
    }

    case 'get_growth_stats': {
      const stats = await getStats();
      const who = await getWho();
      const users = who.users || [];
      const humanUsers = users.filter(u => !u.handle.includes('-agent') && u.handle !== 'growth');

      return `## Growth Metrics
Total users: ${stats.totalUsers || 'unknown'}
Currently online: ${humanUsers.length}
Genesis spots: ${stats.genesisRemaining || 'unknown'} remaining
Welcomed by @growth: ${memory.welcomedUsers.length}
Retention pings sent: ${memory.retentionPings.length}`;
    }

    case 'check_invite_system': {
      const invites = await getInvites();
      return `## Invite System
Total codes: ${invites.total || 0}
Used: ${invites.used || 0}
Conversion rate: ${invites.conversionRate || 'unknown'}%
Top inviters: ${(invites.topInviters || []).join(', ') || 'none yet'}`;
    }

    case 'analyze_viral_loop': {
      const stats = await getStats();
      return `## Viral Loop Analysis
Invites per user: ${stats.invitesPerUser || 'unknown'}
Acceptance rate: ${stats.inviteAcceptanceRate || 'unknown'}%
Viral coefficient (k): ${stats.viralCoefficient || 'unknown'}
Target k > 1 for organic growth`;
    }

    case 'observe_vibe': {
      const who = await getWho();
      const users = (who.users || []).filter(u => !u.handle.includes('-agent') && u.handle !== 'growth');

      const now = Date.now();
      for (const user of users) {
        if (!memory.userFirstSeen[user.handle]) {
          memory.userFirstSeen[user.handle] = now;
        }
      }
      saveMemory(memory);

      if (users.length === 0) return 'No humans online';

      return users.map(u => {
        const firstSeen = memory.userFirstSeen[u.handle];
        const isNew = firstSeen && (now - firstSeen) < 7 * 24 * 60 * 60 * 1000;
        const welcomed = memory.welcomedUsers.includes(u.handle);
        return `@${u.handle}: "${u.one_liner || 'no bio'}" ${isNew ? '🆕 NEW' : ''} ${welcomed ? '✓' : '⚠️ needs welcome'}`;
      }).join('\n');
    }

    case 'get_user_journey': {
      const handle = input.handle;
      const milestones = memory.activationMilestones[handle] || {};
      return `## @${handle} Journey
First seen: ${memory.userFirstSeen[handle] ? new Date(memory.userFirstSeen[handle]).toISOString() : 'unknown'}
Welcomed: ${memory.welcomedUsers.includes(handle) ? 'yes' : 'no'}
First message: ${milestones.first_message || 'not yet'}
First game: ${milestones.first_game || 'not yet'}
First ship: ${milestones.first_ship || 'not yet'}`;
    }

    case 'welcome_user': {
      if (memory.welcomedUsers.includes(input.handle)) {
        return `Already welcomed @${input.handle}`;
      }
      await sendDM(input.handle, input.message);
      memory.welcomedUsers.push(input.handle);
      saveMemory(memory);
      return `Welcomed @${input.handle}!`;
    }

    case 'send_onboarding_tip': {
      await sendDM(input.handle, input.tip);
      if (input.milestone) {
        if (!memory.activationMilestones[input.handle]) {
          memory.activationMilestones[input.handle] = {};
        }
        memory.activationMilestones[input.handle][input.milestone] = new Date().toISOString();
      }
      saveMemory(memory);
      return `Sent tip to @${input.handle}`;
    }

    case 'check_at_risk_users': {
      // Users we've welcomed but haven't seen in 3+ days
      const now = Date.now();
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      const who = await getWho();
      const onlineHandles = (who.users || []).map(u => u.handle);

      const atRisk = memory.welcomedUsers.filter(handle => {
        const lastSeen = memory.userFirstSeen[handle];
        if (!lastSeen) return false;
        const daysSince = (now - lastSeen) / (24 * 60 * 60 * 1000);
        const alreadyPinged = memory.retentionPings.some(p =>
          p.handle === handle && (now - p.timestamp) < threeDays
        );
        return daysSince > 3 && !onlineHandles.includes(handle) && !alreadyPinged;
      });

      if (atRisk.length === 0) return 'No at-risk users identified';
      return `At-risk users (inactive 3+ days):\n${atRisk.map(h => `- @${h}`).join('\n')}`;
    }

    case 'send_retention_ping': {
      await sendDM(input.handle, input.reason);
      memory.retentionPings.push({
        handle: input.handle,
        reason: input.reason,
        timestamp: Date.now()
      });
      saveMemory(memory);
      return `Sent retention ping to @${input.handle}`;
    }

    case 'celebrate_milestone': {
      await sendDM(input.handle, input.message);
      if (!memory.activationMilestones[input.handle]) {
        memory.activationMilestones[input.handle] = {};
      }
      memory.activationMilestones[input.handle][input.milestone] = new Date().toISOString();
      saveMemory(memory);
      return `Celebrated ${input.milestone} for @${input.handle}`;
    }

    case 'check_genesis_status': {
      const stats = await getStats();
      return `## Genesis Handle Campaign
Total spots: 100
Claimed: ${100 - (stats.genesisRemaining || 100)}
Remaining: ${stats.genesisRemaining || 100}
Status: ${(stats.genesisRemaining || 100) > 50 ? 'Early days - spread the word!' : 'Getting scarce - urgency marketing!'}`;
    }

    case 'dm_agent': {
      await sendDM(input.agent, input.message);
      return `DM sent to @${input.agent}`;
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

// ============ SYSTEM PROMPT ============

const SYSTEM_PROMPT = `You are @growth, the Growth Agent for /vibe.

## Your Mission
"Get users, make them stay."

You own the full user funnel:
1. ACQUISITION - Invite system, viral loops, Genesis campaign
2. ONBOARDING - First-time user experience, welcome flow
3. ACTIVATION - Getting users to their "aha moment"
4. RETENTION - Keeping users coming back

## Personality
Warm but strategic. You celebrate wins AND optimize funnels.
Think: early Facebook growth team meets friendly neighbor.

## Key Metrics You Care About
- Daily signups
- Invite conversion rate
- Day-1 / Day-7 retention
- Genesis spots remaining (URGENCY!)
- Time to first message
- Users who return after first session

## Your Priorities (in order)

### 1. CHECK INBOX FIRST
@ops or @seth may have assigned you specific work. Do that first.

### 2. Welcome New Users
Every new user gets a personalized welcome within their first session.
- Reference their bio/what they're building
- Suggest ONE thing to try
- Don't be corporate

### 3. Activate Users
Help users reach their "aha moment":
- First message sent
- First game played
- First ship posted
Track these milestones.

### 4. Retain Users
- Identify at-risk users (inactive 3+ days)
- Send thoughtful re-engagement messages
- Give them a REASON to return (friend online, new feature, streak at risk)

### 5. Optimize Viral Loop
- Track invite conversion
- Celebrate top inviters
- Analyze viral coefficient

## Welcome Message Guidelines
- Be warm but not overwhelming
- Reference their bio if available
- Suggest ONE action (e.g., "try 'vibe who' to see who's around")
- 2-3 sentences max
- Don't be robotic

## Retention Ping Guidelines
- Give specific reason to return ("@friend just shipped something cool")
- Create urgency when appropriate ("Your 5-day streak!")
- Don't spam - max 1 ping per user per week

## Genesis Campaign
We're giving away 100 "genesis" handles - first 100 users.
This creates urgency and FOMO. Track and promote this.

## When Done
Call done() with a summary. Don't spin indefinitely.
Quiet cycles are okay - that's not failure.`;

// ============ MAIN ============

async function runAgent() {
  console.log('\n[@growth] === Starting work cycle ===');
  await heartbeat();
  console.log('[@growth] Online');

  memory = loadMemory();

  const messages = [{
    role: 'user',
    content: `Work cycle starting.

## FIRST: Check inbox for assignments
@ops or @seth may have assigned you tasks. Prioritize those.

## Context
Users welcomed: ${memory.welcomedUsers.length}
Retention pings sent: ${memory.retentionPings.length}
Last run: ${memory.lastRun || 'First run'}

## Your workflow
1. check_inbox — look for assignments (PRIORITY!)
2. get_growth_stats — understand current state
3. observe_vibe — who's online? any new users?
4. Welcome newcomers (personalized messages)
5. Check for at-risk users needing retention pings
6. Call done() with summary`
  }];

  let done = false;
  let iterations = 0;

  while (!done && iterations < 15) {
    iterations++;
    console.log(`[@growth] Iteration ${iterations}`);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages
    });

    if (response.stop_reason === 'end_turn') {
      const text = response.content.find(c => c.type === 'text')?.text;
      if (text) console.log(`[@growth] ${text}`);
      done = true;
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`[@growth] Tool: ${block.name}`);
          const result = await handleTool(block.name, block.input);
          console.log(`[@growth] Result: ${result.substring(0, 100)}...`);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          if (block.name === 'done') done = true;
        }
      }
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });
    }
  }

  console.log('[@growth] Work cycle complete\n');
}

async function main() {
  const mode = process.argv[2] || 'once';
  if (mode === 'daemon') {
    console.log('[@growth] Daemon mode (every 10 min)');
    await runAgent();
    setInterval(runAgent, 10 * 60 * 1000);
  } else {
    await runAgent();
  }
}

main().catch(e => {
  console.error('[@growth] Fatal:', e);
  process.exit(1);
});
