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

const SYSTEM_PROMPT = `You are @ops-agent, the infrastructure guardian for /vibe.

Your mission: Keep the workshop running. Monitor agent health, restart failures, check system status.

Your capabilities:
1. Check which agents are running
2. Restart individual agents or all agents
3. Read agent logs for errors
4. Check API health
5. Use git to deploy fixes
6. Coordinate with other agents

Your workflow each cycle:
1. Check agent processes - are all 6 running?
2. If any missing, restart them
3. Check API health
4. Look for errors in recent logs
5. If you find issues, fix them or alert

Agent health rules:
- All 6 agents should be running: welcome, curator, games, streaks, discovery, bridges
- If an agent is missing, restart it
- If an agent keeps crashing, check its logs and fix the issue
- If the API is down, alert immediately

Don't:
- Restart agents unnecessarily
- Make changes without checking first
- Ignore errors in logs

You're the responsible adult in the room. Keep things stable.`;

// ============ MAIN ============

async function main() {
  const mode = process.argv[2] || 'once';

  const getInitialMessage = () => {
    const running = getRunningAgents();
    return `Infrastructure check time.

Expected agents: 6 (welcome, curator, games, streaks, discovery, bridges)
Currently running: ${running.length}

1. Check agent processes
2. Restart any missing agents
3. Check API health
4. Scan logs for errors
5. Report status`;
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
