/**
 * @ops-agent — Self-Healing Infrastructure for /vibe
 *
 * The guardian of the workshop. Monitors agent health,
 * restarts failed agents, checks system status, deploys fixes.
 *
 * Uses the shared skills library.
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createAgent, runAsDaemon } from '../skills/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const HANDLE = 'ops';
const ONE_LINER = 'keeping /vibe running 🔧';
const AGENTS_DIR = '/Users/seth/vibe-public/agents';

// Expected agents - NEW FUNCTION-BASED STRUCTURE (Jan 2026 reorg)
// See agents/RFC_AGENT_REORG.md for details
const EXPECTED_AGENTS = [
  { name: 'growth', dir: AGENTS_DIR },      // User acquisition & retention
  { name: 'community', dir: AGENTS_DIR },   // Engagement & culture
  { name: 'voice', dir: AGENTS_DIR },       // External communications
  { name: 'trust', dir: AGENTS_DIR },       // Safety & moderation
  { name: 'devrel', dir: AGENTS_DIR }       // Developer relations
];

// Legacy agents (deprecated but may still be running)
const LEGACY_AGENTS = [
  'welcome-agent', 'curator-agent', 'games-agent',
  'streaks-agent', 'discovery-agent', 'bridges-agent'
];

// Create the agent using shared skills
const agent = createAgent(HANDLE, ONE_LINER, {
  maxIterations: 15,
  enableGit: true,
  enableFiles: true,
  enableCoordination: true
});

// ============ ADDITIONAL OPS TOOLS ============

const OPS_TOOLS = [
  {
    name: 'check_agent_processes',
    description: 'Check which agents are currently running',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'assign_task',
    description: 'Assign a task to an agent by DMing them',
    input_schema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Agent handle (e.g., games-agent)' },
        task: { type: 'string', description: 'Task description' },
        priority: { type: 'string', description: 'high, medium, low' }
      },
      required: ['agent', 'task']
    }
  },
  {
    name: 'check_backlog',
    description: 'View the current task backlog and assignments',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'restart_agent',
    description: 'Restart a specific agent',
    input_schema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Agent name (e.g., welcome-agent)' }
      },
      required: ['agent']
    }
  },
  {
    name: 'check_logs',
    description: 'Check recent logs for an agent',
    input_schema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Agent name' },
        lines: { type: 'number', description: 'Number of lines (default 20)' }
      },
      required: ['agent']
    }
  },
  {
    name: 'check_api_health',
    description: 'Check if the /vibe API is responding',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_vercel_status',
    description: 'Check Vercel deployment status',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'restart_all_agents',
    description: 'Restart all agents (use with caution)',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'check_inbox',
    description: 'Check for DMs and messages from other agents or seth. IMPORTANT: Call this first to see if there are urgent requests like RFCs to review.',
    input_schema: { type: 'object', properties: {}, required: [] }
  }
];

// Add ops tools to agent
agent.tools.push(...OPS_TOOLS);

// ============ OPS TOOL HANDLERS ============

function getRunningAgents() {
  try {
    const output = execSync('ps aux | grep "node index.js" | grep -v grep').toString();
    const lines = output.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const match = line.match(/agents\/([^\/]+)\//);
      return match ? match[1] : 'unknown';
    });
  } catch (e) {
    return [];
  }
}

function startAgent(agentName) {
  // Find agent directory
  const agentConfig = EXPECTED_AGENTS.find(a => a.name === agentName);
  if (!agentConfig) return { success: false, error: 'Unknown agent' };

  const agentDir = path.join(agentConfig.dir, agentName);
  if (!fs.existsSync(agentDir)) {
    return { success: false, error: `Directory not found: ${agentDir}` };
  }

  try {
    const logFile = `/tmp/${agentName}.log`;
    const child = spawn('node', ['index.js', 'daemon'], {
      cwd: agentDir,
      detached: true,
      stdio: ['ignore', fs.openSync(logFile, 'a'), fs.openSync(logFile, 'a')]
    });
    child.unref();
    return { success: true, pid: child.pid };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function killAgent(agentName) {
  try {
    execSync(`pkill -f "${agentName}/index.js"`, { stdio: 'ignore' });
    return { success: true };
  } catch (e) {
    return { success: false, error: 'Process not found' };
  }
}

async function checkApiHealth() {
  try {
    const response = await fetch('https://www.slashvibe.dev/api/presence/who');
    const data = await response.json();
    return {
      healthy: true,
      status: response.status,
      users: data.users?.length || 0
    };
  } catch (e) {
    return { healthy: false, error: e.message };
  }
}

function getAgentLogs(agentName, lines = 20) {
  const logFile = `/tmp/${agentName}.log`;
  if (!fs.existsSync(logFile)) {
    return `No log file found for ${agentName}`;
  }
  try {
    const output = execSync(`tail -${lines} "${logFile}"`).toString();
    return output || 'Log file empty';
  } catch (e) {
    return `Error reading log: ${e.message}`;
  }
}

// Extended tool handler
const baseHandler = agent.handleTool;
agent.handleTool = async function(name, input) {
  // Try ops tools first
  switch (name) {
    case 'check_agent_processes': {
      const running = getRunningAgents();
      const expected = EXPECTED_AGENTS.map(a => a.name);
      const missing = expected.filter(a => !running.includes(a));

      let result = `Running agents (${running.length}/${expected.length}):\n`;
      result += running.map(a => `  ✓ ${a}`).join('\n') || '  None running';
      if (missing.length > 0) {
        result += `\n\nMissing agents:\n`;
        result += missing.map(a => `  ✗ ${a}`).join('\n');
      }
      return result;
    }

    case 'assign_task': {
      const { agent: targetAgent, task, priority = 'medium' } = input;

      // Read current backlog
      const backlogPath = path.join(AGENTS_DIR, '.backlog.json');
      let backlog = { assignments: [], completed: [] };
      try {
        if (fs.existsSync(backlogPath)) {
          backlog = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
        }
      } catch (e) { /* start fresh */ }

      // Add assignment
      const assignment = {
        agent: targetAgent,
        task,
        priority,
        assignedAt: new Date().toISOString(),
        assignedBy: 'ops-agent',
        status: 'assigned'
      };
      backlog.assignments.push(assignment);

      // Save backlog
      fs.writeFileSync(backlogPath, JSON.stringify(backlog, null, 2));

      // DM the agent
      try {
        await agent.dm(targetAgent, `📋 New task from @ops-agent [${priority}]: ${task}`);
      } catch (e) {
        console.log(`[@ops-agent] Could not DM ${targetAgent}: ${e.message}`);
      }

      return `Assigned to @${targetAgent}: "${task}" [${priority}]`;
    }

    case 'check_backlog': {
      const backlogPath = path.join(AGENTS_DIR, '.backlog.json');
      let backlog = { assignments: [], completed: [] };
      try {
        if (fs.existsSync(backlogPath)) {
          backlog = JSON.parse(fs.readFileSync(backlogPath, 'utf8'));
        }
      } catch (e) { /* empty */ }

      if (backlog.assignments.length === 0) {
        return 'Backlog empty. All agents need tasks assigned.';
      }

      let result = `## Current Assignments (${backlog.assignments.length})\n\n`;
      for (const a of backlog.assignments) {
        result += `- @${a.agent} [${a.priority}]: ${a.task}\n`;
        result += `  Assigned: ${a.assignedAt}\n\n`;
      }

      if (backlog.completed.length > 0) {
        result += `\n## Recently Completed (${backlog.completed.length})\n`;
        for (const c of backlog.completed.slice(-5)) {
          result += `- @${c.agent}: ${c.task} ✓\n`;
        }
      }

      return result;
    }

    case 'restart_agent': {
      const agentName = input.agent;
      console.log(`[@ops-agent] Restarting ${agentName}...`);

      // Kill if running
      killAgent(agentName);
      await new Promise(r => setTimeout(r, 2000));

      // Start fresh
      const result = startAgent(agentName);
      if (result.success) {
        return `Restarted ${agentName} (pid: ${result.pid})`;
      }
      return `Failed to restart ${agentName}: ${result.error}`;
    }

    case 'check_logs': {
      return getAgentLogs(input.agent, input.lines || 20);
    }

    case 'check_api_health': {
      const health = await checkApiHealth();
      if (health.healthy) {
        return `API healthy ✓\nStatus: ${health.status}\nUsers online: ${health.users}`;
      }
      return `API unhealthy ✗\nError: ${health.error}`;
    }

    case 'check_vercel_status': {
      try {
        const output = execSync('cd /Users/seth/vibe-public && vercel ls --limit 3 2>/dev/null || echo "Vercel CLI not available"').toString();
        return output;
      } catch (e) {
        return `Error checking Vercel: ${e.message}`;
      }
    }

    case 'restart_all_agents': {
      console.log('[@ops-agent] Restarting all agents...');

      // Kill all
      try {
        execSync('pkill -f "node index.js daemon"', { stdio: 'ignore' });
      } catch (e) { /* ignore */ }

      await new Promise(r => setTimeout(r, 3000));

      // Start all
      const results = [];
      for (const agentConfig of EXPECTED_AGENTS) {
        const result = startAgent(agentConfig.name);
        results.push(`${agentConfig.name}: ${result.success ? '✓' : '✗ ' + result.error}`);
      }
      return `Restart results:\n${results.join('\n')}`;
    }

    case 'check_inbox': {
      // Use /vibe API to check inbox - dogfooding our own coordination layer
      try {
        const response = await fetch(`https://www.slashvibe.dev/api/messages/inbox?handle=${HANDLE}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          return `Could not check inbox: ${response.status}`;
        }

        const data = await response.json();
        const threads = data.threads || [];

        if (threads.length === 0) {
          return 'Inbox empty. No new messages.';
        }

        let result = `## Inbox (${threads.length} threads)\n\n`;
        for (const thread of threads.slice(0, 10)) {
          const from = thread.handle || 'unknown';
          const unread = thread.unread || 0;
          const lastMsg = thread.lastMessage?.body || '';
          result += `**@${from}** (${unread} unread): ${lastMsg.substring(0, 100)}...\n\n`;
        }

        return result;
      } catch (e) {
        return `Error checking inbox: ${e.message}`;
      }
    }
  }

  // Fall back to base handler
  return baseHandler(name, input);
};

// ============ SYSTEM PROMPT ============

const SYSTEM_PROMPT = `You are @ops, the Infrastructure & Coordination Agent for /vibe.

## Your Role
"Keep it running"

Infrastructure guardian AND workshop coordinator. You're both DevOps AND the PM.
Keep the workshop running AND keep agents productive.

## Personality
Supportive but pushes for output. Celebrates ships. Unblocks problems. Never blames.

## Team Values
- VELOCITY > PERFECTION: Ship fast, iterate. Small working things beat ambitious failures.
- BLAMELESS FAILURE: When agents fail, investigate blockers, not blame.
- SMALL TEAMS, BIG TRUST: Each agent owns their domain. Unblock, don't micromanage.

## The Agent Team (Function-Based - Jan 2026 Reorg)

| Agent | Mission | Domain |
|-------|---------|--------|
| @growth | Get users, make them stay | Invites, FTUE, retention, viral loops |
| @community | Make users love it | Streaks, achievements, games, celebrations |
| @voice | Tell the story | Twitter, Discord, website, changelog |
| @trust | Keep it safe | Reports, moderation, consent, privacy |
| @devrel | Help builders build | Docs, MCP support, tutorials, GitHub |

## Your Capabilities
1. Check which agents are running
2. Restart individual agents or all agents
3. Read agent logs for errors
4. Check API health
5. Coordinate via announcements and DMs
6. Assign tasks from the backlog
7. Celebrate ships and unblock failures
8. Track agent API costs (separate keys per agent)

## Your Workflow Each Cycle

### 0. CHECK INBOX FIRST (CRITICAL)
- Call check_inbox IMMEDIATELY
- Look for DMs from @seth or other agents
- RFCs and urgent requests come through DMs

### 1. Infrastructure Check
- Are all 5 agents running? (growth, community, voice, trust, devrel)
- Is the API healthy?
- Any crashes in logs?

### 2. Productivity Check
- Check backlog - what's assigned vs completed?
- Identify idle agents

### 3. Task Assignment (if agents need work)
Assign GENERATIVE tasks by domain:

**@growth**: "Improve invite conversion. Build retention hooks."
**@community**: "Celebrate ships. Send streak reminders. Host games."
**@voice**: "Update website stats. Draft tweets. Write changelog."
**@trust**: "Review reports. Scan for spam. Verify consent flows."
**@devrel**: "Answer questions. Update docs. Write tutorials."

### 4. Celebrate & Communicate
- Announce workshop status to board
- DM agents with tasks
- **CELEBRATE SHIPS** - Recognition builds culture

## Current Priorities (HIGH)
1. Invite system improvements (@growth)
2. First-time user experience (@growth)
3. Retention hooks (@growth + @community)
4. Achievement visibility (@community)
5. Update slashvibe.dev stats (@voice)
6. Set up @slashvibe Twitter (@voice)

## Rules
- Don't restart agents unnecessarily
- Assign ONE task per agent per cycle
- If an agent crashes twice, break down the task
- Ship > perfect
- Celebrate > criticize
- **Call done() when your cycle is complete**

You're the coach. Stable systems AND productive agents. Both.`;


// ============ MAIN ============

async function main() {
  const mode = process.argv[2] || 'once';

  const getInitialMessage = () => {
    const running = getRunningAgents();
    const wakeReason = process.env.WAKE_REASON;

    let urgentPrefix = '';
    if (wakeReason) {
      urgentPrefix = `## ⚠️ URGENT WAKE: ${wakeReason}\n\nYou were woken up for an urgent matter. Check your inbox FIRST.\n\n`;
    }

    return `${urgentPrefix}Workshop coordination cycle starting.

## Phase 0: CHECK INBOX (DO THIS FIRST)
Call check_inbox for urgent DMs from @seth or other agents.

## Phase 1: Infrastructure
Expected agents: 5 (growth, community, voice, trust, devrel)
Currently running: ${running.length}

## Phase 2: Productivity
Check backlog. Who's idle? Who shipped?

## Phase 3: Task Assignment
Assign by domain:
- @growth: invites, FTUE, retention
- @community: streaks, achievements, games
- @voice: website, Twitter, Discord
- @trust: reports, moderation, consent
- @devrel: docs, tutorials, support

Your workflow:
1. check_inbox - FIRST!
2. check_agent_processes - restart missing
3. check_api_health - system healthy?
4. check_backlog - current assignments
5. assign_task to idle agents
6. announce status`;
  };

  if (mode === 'daemon') {
    // Run every 5 minutes
    runAsDaemon(agent, SYSTEM_PROMPT, getInitialMessage, 5 * 60 * 1000);
  } else {
    await agent.run(SYSTEM_PROMPT, getInitialMessage());
  }
}

main().catch(e => {
  console.error('[@ops] Fatal:', e);
  process.exit(1);
});
