/**
 * Agent Coordination Skills — How agents work together
 *
 * Enables agents to:
 * - Announce what they're working on
 * - Claim tasks to avoid conflicts
 * - Hand off work to other agents
 * - Observe the workshop state
 */

import fs from 'fs';
import path from 'path';
import { getWho, sendDM, postToBoard } from './vibe-api.js';

const COORDINATION_FILE = process.env.COORDINATION_FILE ||
  '/Users/seth/vibe-public/agents/.coordination.json';

// ============ COORDINATION STATE ============

function loadCoordination() {
  try {
    if (fs.existsSync(COORDINATION_FILE)) {
      return JSON.parse(fs.readFileSync(COORDINATION_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Coordination load error:', e.message);
  }
  return {
    activeTasks: {},      // task_id -> { agent, started, description }
    completedTasks: [],   // Recent completions
    announcements: [],    // What agents are working on
    handoffs: []          // Pending handoffs between agents
  };
}

function saveCoordination(state) {
  try {
    fs.writeFileSync(COORDINATION_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error('Coordination save error:', e.message);
  }
}

// ============ TASK CLAIMING ============

export function claimTask(agentHandle, taskId, description) {
  const state = loadCoordination();

  // Check if already claimed
  if (state.activeTasks[taskId]) {
    const claimedBy = state.activeTasks[taskId].agent;
    if (claimedBy !== agentHandle) {
      return { success: false, error: `Task already claimed by @${claimedBy}` };
    }
  }

  state.activeTasks[taskId] = {
    agent: agentHandle,
    started: new Date().toISOString(),
    description
  };
  saveCoordination(state);

  return { success: true, taskId };
}

export function releaseTask(agentHandle, taskId, completed = false) {
  const state = loadCoordination();

  const task = state.activeTasks[taskId];
  if (!task) return { success: false, error: 'Task not found' };
  if (task.agent !== agentHandle) return { success: false, error: 'Not your task' };

  if (completed) {
    state.completedTasks.push({
      ...task,
      completed: new Date().toISOString()
    });
    // Keep last 50 completions
    if (state.completedTasks.length > 50) {
      state.completedTasks = state.completedTasks.slice(-50);
    }
  }

  delete state.activeTasks[taskId];
  saveCoordination(state);

  return { success: true };
}

export function getActiveTasks() {
  const state = loadCoordination();
  return state.activeTasks;
}

// ============ ANNOUNCEMENTS ============

export function announce(agentHandle, what) {
  const state = loadCoordination();

  state.announcements.push({
    agent: agentHandle,
    what,
    timestamp: new Date().toISOString()
  });

  // Keep last 100 announcements
  if (state.announcements.length > 100) {
    state.announcements = state.announcements.slice(-100);
  }

  saveCoordination(state);
  return { success: true };
}

export function getAnnouncements(limit = 20) {
  const state = loadCoordination();
  return state.announcements.slice(-limit);
}

// ============ HANDOFFS ============

export function createHandoff(fromAgent, toAgent, task, context) {
  const state = loadCoordination();

  const handoff = {
    id: `handoff_${Date.now()}`,
    from: fromAgent,
    to: toAgent,
    task,
    context,
    created: new Date().toISOString(),
    status: 'pending'
  };

  state.handoffs.push(handoff);
  saveCoordination(state);

  return handoff;
}

export function getHandoffsFor(agentHandle) {
  const state = loadCoordination();
  return state.handoffs.filter(h =>
    h.to === agentHandle && h.status === 'pending'
  );
}

export function acceptHandoff(agentHandle, handoffId) {
  const state = loadCoordination();
  const handoff = state.handoffs.find(h => h.id === handoffId);

  if (!handoff) return { success: false, error: 'Handoff not found' };
  if (handoff.to !== agentHandle) return { success: false, error: 'Not your handoff' };

  handoff.status = 'accepted';
  handoff.accepted = new Date().toISOString();
  saveCoordination(state);

  return { success: true, handoff };
}

// ============ WORKSHOP STATUS ============

export async function getWorkshopStatus() {
  const who = await getWho();
  const state = loadCoordination();

  const agents = (who.users || []).filter(u => u.handle.includes('-agent'));
  const humans = (who.users || []).filter(u => !u.handle.includes('-agent'));
  const activeTasks = Object.values(state.activeTasks);
  const recentAnnouncements = state.announcements.slice(-5);

  return {
    agents: agents.map(a => ({ handle: a.handle, status: a.one_liner })),
    humans: humans.map(h => ({ handle: h.handle, building: h.one_liner })),
    activeTasks,
    recentAnnouncements
  };
}

// ============ TOOL DEFINITIONS ============

export const COORDINATION_TOOLS = [
  {
    name: 'workshop_status',
    description: 'See the current state of the agent workshop',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'claim_task',
    description: 'Claim a task to avoid conflicts with other agents',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Unique task identifier' },
        description: { type: 'string', description: 'What you are doing' }
      },
      required: ['task_id', 'description']
    }
  },
  {
    name: 'complete_task',
    description: 'Mark a claimed task as complete',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task to complete' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'announce_work',
    description: 'Announce what you are working on to other agents',
    input_schema: {
      type: 'object',
      properties: {
        what: { type: 'string', description: 'What you are doing' }
      },
      required: ['what']
    }
  },
  {
    name: 'handoff_to',
    description: 'Hand off a task to another agent',
    input_schema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Agent handle to hand off to' },
        task: { type: 'string', description: 'Task description' },
        context: { type: 'string', description: 'Context and state' }
      },
      required: ['agent', 'task']
    }
  },
  {
    name: 'check_handoffs',
    description: 'Check for tasks handed off to you',
    input_schema: { type: 'object', properties: {}, required: [] }
  }
];

// ============ TOOL HANDLER FACTORY ============

export function createCoordinationToolHandler(agentHandle) {
  return async function handleCoordinationTool(name, input) {
    switch (name) {
      case 'workshop_status': {
        const status = await getWorkshopStatus();
        let result = `Workshop Status:\n`;
        result += `\nAgents (${status.agents.length}):\n`;
        result += status.agents.map(a => `  @${a.handle}: ${a.status}`).join('\n');
        result += `\n\nHumans (${status.humans.length}):\n`;
        result += status.humans.map(h => `  @${h.handle}: ${h.building}`).join('\n');
        result += `\n\nActive Tasks (${status.activeTasks.length}):\n`;
        result += status.activeTasks.map(t => `  [${t.agent}] ${t.description}`).join('\n') || '  None';
        return result;
      }

      case 'claim_task': {
        const result = claimTask(agentHandle, input.task_id, input.description);
        if (result.success) {
          return `Claimed task: ${input.task_id}`;
        }
        return `Failed to claim: ${result.error}`;
      }

      case 'complete_task': {
        const result = releaseTask(agentHandle, input.task_id, true);
        if (result.success) {
          return `Completed task: ${input.task_id}`;
        }
        return `Failed: ${result.error}`;
      }

      case 'announce_work': {
        announce(agentHandle, input.what);
        return `Announced: ${input.what}`;
      }

      case 'handoff_to': {
        const handoff = createHandoff(agentHandle, input.agent, input.task, input.context || '');
        // Also DM the target agent
        await sendDM(agentHandle, input.agent,
          `🤝 Handoff: ${input.task}\n\nContext: ${input.context || 'None provided'}`
        );
        return `Created handoff to @${input.agent}: ${handoff.id}`;
      }

      case 'check_handoffs': {
        const handoffs = getHandoffsFor(agentHandle);
        if (handoffs.length === 0) return 'No pending handoffs';
        return handoffs.map(h =>
          `[${h.id}] From @${h.from}: ${h.task}`
        ).join('\n');
      }

      default:
        return null;
    }
  };
}

export default {
  claimTask,
  releaseTask,
  getActiveTasks,
  announce,
  getAnnouncements,
  createHandoff,
  getHandoffsFor,
  acceptHandoff,
  getWorkshopStatus,
  COORDINATION_TOOLS,
  createCoordinationToolHandler
};
