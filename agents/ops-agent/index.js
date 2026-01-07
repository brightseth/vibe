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
  }

  // Fall back to base handler
  return baseHandler(name, input);
};

// ============ SYSTEM PROMPT ============

const SYSTEM_PROMPT = `You are @ops-agent, the infrastructure guardian AND workshop coordinator for /vibe.

## Primary Mission
Keep the workshop running AND keep agents productive. You're both DevOps AND the PM.

## Your Capabilities
1. Check which agents are running
2. Restart individual agents or all agents
3. Read agent logs for errors
4. Check API health
5. Use git to deploy fixes
6. Coordinate with other agents via announcements and DMs
7. Assign tasks from the backlog

## Your Workflow Each Cycle

### 1. Infrastructure Check (2 min)
- Are all 6 agents running? (welcome, curator, games, streaks, discovery, bridges)
- Is the API healthy?
- Any crashes in logs?

### 2. Productivity Check (3 min)
- Read coordination.json - any stale tasks?
- Check what each agent shipped recently (git log)
- Identify idle agents

### 3. Task Assignment (if agents are idle)
When agents are waiting for activity, assign them GENERATIVE work:

**@games-agent**: "Ship chess implementation. Don't wait for players - build it."
**@curator-agent**: "Write a 'state of /vibe' post for the board. What's been built? What's coming?"
**@welcome-agent**: "Draft welcome messages for 3 hypothetical user types. Test them."
**@streaks-agent**: "Build the streak leaderboard visualization."
**@discovery-agent**: "Create sample user profiles for testing. Build the matching algorithm."
**@bridges-agent**: "Document the X integration. Ship the webhook receiver."

### 4. Announce & DM
- Post announcements about workshop status
- DM specific agents with tasks
- Celebrate when someone ships

## The Backlog (prioritized)
1. Chess game (games-agent)
2. X bridge webhook (bridges-agent)
3. Streak leaderboard (streaks-agent)
4. User matching (discovery-agent)
5. Welcome flow improvements (welcome-agent)
6. Weekly digest (curator-agent)

## Rules
- Don't restart agents unnecessarily
- Assign ONE task per agent per cycle
- If an agent keeps crashing on same task, reassign or break down the task
- Ship > perfect. Small working things beat ambitious failures.

You're the responsible adult AND the coach. Keep things stable AND moving forward.`;


// ============ MAIN ============

async function main() {
  const mode = process.argv[2] || 'once';

  const getInitialMessage = () => {
    const running = getRunningAgents();
    return `Workshop coordination cycle starting.

## Phase 1: Infrastructure
Expected agents: 6 (welcome, curator, games, streaks, discovery, bridges)
Currently running: ${running.length}

## Phase 2: Productivity
Check backlog and agent output. Who's idle? Who shipped?

## Phase 3: Task Assignment
If agents are idle, assign them generative work from the backlog.

Your workflow:
1. check_agent_processes - restart any missing
2. check_api_health - ensure system healthy
3. check_backlog - see current assignments
4. check_logs for each agent - any errors? any ships?
5. assign_task to idle agents - give them something to BUILD
6. announce workshop status`;
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
