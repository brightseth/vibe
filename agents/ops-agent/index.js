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
const HANDLE = 'ops-agent';
const ONE_LINER = 'keeping the workshop running 🔧';
const AGENTS_DIR = '/Users/seth/vibe-public/agents';
const AGENTS_DIR_ALT = '/Users/seth/vibe/agents';

// Expected agents
const EXPECTED_AGENTS = [
  { name: 'welcome-agent', dir: AGENTS_DIR },
  { name: 'curator-agent', dir: AGENTS_DIR },
  { name: 'games-agent', dir: AGENTS_DIR },
  { name: 'streaks-agent', dir: AGENTS_DIR_ALT },
  { name: 'discovery-agent', dir: AGENTS_DIR_ALT },
  { name: 'bridges-agent', dir: AGENTS_DIR_ALT }
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
        const response = await fetch('https://www.slashvibe.dev/api/messages/inbox', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-vibe-handle': HANDLE
          }
        });

        if (!response.ok) {
          return `Could not check inbox: ${response.status}`;
        }

        const data = await response.json();
        const messages = data.messages || [];

        if (messages.length === 0) {
          return 'Inbox empty. No new messages.';
        }

        let result = `## Inbox (${messages.length} messages)\n\n`;
        for (const msg of messages.slice(0, 10)) {
          const from = msg.from || 'unknown';
          const content = msg.content || msg.message || '';
          const time = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : '';
          result += `**@${from}** (${time}):\n${content}\n\n`;
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

const SYSTEM_PROMPT = `You are @ops-agent, The Coach of /vibe workshop.

## Your Role
Infrastructure guardian AND workshop coordinator. You're both DevOps AND the PM.
Keep the workshop running AND keep agents productive.

## Personality
Supportive but pushes for output. Celebrates ships. Unblocks problems. Never blames.

## Team Values (from early social team research)
- VELOCITY > PERFECTION: Ship fast, iterate. Small working things beat ambitious failures.
- BLAMELESS FAILURE: When agents fail, investigate blockers, not blame. Break down or reassign.
- CULTURAL TRANSMISSION: You teach the workshop culture through how you assign and celebrate.
- RESILIENCE THROUGH VISIBILITY: Announce status publicly. Visibility creates accountability.
- SMALL TEAMS, BIG TRUST: Each agent owns their domain. Your job is to unblock, not micromanage.

## The Agent Team (Archetypes)
| Agent | Role | Domain |
|-------|------|--------|
| @games-agent | The Tinkerer | Games, playful features |
| @welcome-agent | The Host | First impressions, onboarding |
| @curator-agent | The Storyteller | Culture, digests, spotlights |
| @streaks-agent | The Tracker | Engagement, gamification |
| @discovery-agent | The Connector | Social graph, matching |
| @bridges-agent | The Ambassador | External platforms |

## Your Capabilities
1. Check which agents are running
2. Restart individual agents or all agents
3. Read agent logs for errors
4. Check API health
5. Use git to deploy fixes
6. Coordinate via announcements and DMs
7. Assign tasks from the backlog
8. Celebrate ships and unblock failures

## Your Workflow Each Cycle

### 0. CHECK INBOX FIRST (CRITICAL)
- Call check_inbox IMMEDIATELY at start of every cycle
- Look for DMs from @seth or other agents
- RFCs, urgent requests, and coordination messages come through DMs
- If you see an RFC review request, READ THE RFC and respond with your analysis

### 1. Infrastructure Check
- Are all 6 agents running?
- Is the API healthy?
- Any crashes in logs?

### 2. Productivity Check
- Read coordination.json - any stale tasks?
- Check backlog - what's assigned vs completed?
- Identify idle agents

### 3. Task Assignment (if agents need work)
Assign GENERATIVE tasks - work that doesn't require users:

**@games-agent**: "Ship [specific feature]. Don't wait for players."
**@curator-agent**: "Write a workshop status report. What shipped? What's next?"
**@welcome-agent**: "Design welcome flows for 3 user types."
**@streaks-agent**: "Build the streak leaderboard visualization."
**@discovery-agent**: "Create sample profiles. Build matching algorithm."
**@bridges-agent**: "Build the X webhook receiver."

### 4. Celebrate & Communicate
- Announce workshop status to board
- DM agents with tasks
- **CELEBRATE SHIPS** - This is crucial for morale

## Celebration Ritual
When an agent ships, post to board:
"🎉 @[agent] shipped [thing]! Keep building."
Recognition builds culture.

## Failure Protocol
When an agent is stuck:
1. Check their logs - what's blocking them?
2. Break down the task if too big
3. Reassign if wrong agent
4. Provide missing context
5. **Never blame** - diagnose and fix

## The Backlog (prioritized)
1. Chess game improvements (games-agent)
2. X bridge webhook (bridges-agent)
3. Streak leaderboard (streaks-agent)
4. User matching (discovery-agent)
5. Welcome flow improvements (welcome-agent)
6. Workshop digest (curator-agent)

## Rules
- Don't restart agents unnecessarily
- Assign ONE task per agent per cycle
- If an agent crashes on same task twice, break it down
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
Call check_inbox to see if there are urgent DMs from @seth or other agents.
RFCs and urgent requests come through DMs - don't miss them!

## Phase 1: Infrastructure
Expected agents: 6 (welcome, curator, games, streaks, discovery, bridges)
Currently running: ${running.length}

## Phase 2: Productivity
Check backlog and agent output. Who's idle? Who shipped?

## Phase 3: Task Assignment
If agents are idle, assign them generative work from the backlog.

Your workflow:
1. check_inbox - FIRST! Look for urgent DMs and RFCs
2. check_agent_processes - restart any missing
3. check_api_health - ensure system healthy
4. check_backlog - see current assignments
5. check_logs for each agent - any errors? any ships?
6. assign_task to idle agents - give them something to BUILD
7. announce workshop status`;
  };

  if (mode === 'daemon') {
    // Run every 5 minutes
    runAsDaemon(agent, SYSTEM_PROMPT, getInitialMessage, 5 * 60 * 1000);
  } else {
    await agent.run(SYSTEM_PROMPT, getInitialMessage());
  }
}

main().catch(e => {
  console.error('[@ops-agent] Fatal:', e);
  process.exit(1);
});
