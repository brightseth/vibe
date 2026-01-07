/**
 * Agent Memory Skills — Persistent state across runs
 *
 * Each agent maintains its own memory file.
 * Memory survives restarts and enables learning.
 */

import fs from 'fs';
import path from 'path';

// ============ MEMORY MANAGER ============

export class AgentMemory {
  constructor(agentHandle, memoryDir = null) {
    this.handle = agentHandle;
    this.memoryDir = memoryDir || path.join(process.cwd());
    this.memoryFile = path.join(this.memoryDir, 'memory.json');
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.memoryFile)) {
        return JSON.parse(fs.readFileSync(this.memoryFile, 'utf8'));
      }
    } catch (e) {
      console.error(`[${this.handle}] Memory load error:`, e.message);
    }
    return this.getDefaultMemory();
  }

  save() {
    try {
      fs.writeFileSync(this.memoryFile, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error(`[${this.handle}] Memory save error:`, e.message);
    }
  }

  getDefaultMemory() {
    return {
      handle: this.handle,
      created: new Date().toISOString(),
      lastRun: null,
      runCount: 0,
      observations: [],
      interactions: [],
      achievements: [],
      config: {}
    };
  }

  // Record an observation
  observe(observation) {
    this.data.observations.push({
      timestamp: new Date().toISOString(),
      observation
    });
    // Keep last 100 observations
    if (this.data.observations.length > 100) {
      this.data.observations = this.data.observations.slice(-100);
    }
    this.save();
  }

  // Record an interaction
  interact(handle, type, content) {
    this.data.interactions.push({
      timestamp: new Date().toISOString(),
      handle,
      type,
      content
    });
    // Keep last 200 interactions
    if (this.data.interactions.length > 200) {
      this.data.interactions = this.data.interactions.slice(-200);
    }
    this.save();
  }

  // Record an achievement
  achieve(achievement) {
    if (!this.data.achievements.includes(achievement)) {
      this.data.achievements.push(achievement);
      this.save();
      return true; // New achievement!
    }
    return false; // Already had it
  }

  // Get/set config values
  getConfig(key, defaultValue = null) {
    return this.data.config[key] ?? defaultValue;
  }

  setConfig(key, value) {
    this.data.config[key] = value;
    this.save();
  }

  // Mark run complete
  completeRun() {
    this.data.lastRun = new Date().toISOString();
    this.data.runCount = (this.data.runCount || 0) + 1;
    this.save();
  }

  // Get recent observations about a topic
  getRecentObservations(topic = null, limit = 10) {
    let obs = this.data.observations;
    if (topic) {
      obs = obs.filter(o =>
        o.observation.toLowerCase().includes(topic.toLowerCase())
      );
    }
    return obs.slice(-limit);
  }

  // Get interactions with a specific handle
  getInteractionsWith(handle, limit = 20) {
    return this.data.interactions
      .filter(i => i.handle === handle)
      .slice(-limit);
  }
}

// ============ TOOL DEFINITIONS ============

export const MEMORY_TOOLS = [
  {
    name: 'memory_observe',
    description: 'Record an observation to memory',
    input_schema: {
      type: 'object',
      properties: {
        observation: { type: 'string', description: 'What you observed' }
      },
      required: ['observation']
    }
  },
  {
    name: 'memory_recall',
    description: 'Recall recent observations, optionally filtered by topic',
    input_schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Optional topic to filter by' }
      },
      required: []
    }
  },
  {
    name: 'memory_interactions',
    description: 'Recall interactions with a specific person',
    input_schema: {
      type: 'object',
      properties: {
        handle: { type: 'string', description: 'Handle to look up' }
      },
      required: ['handle']
    }
  }
];

// ============ TOOL HANDLER FACTORY ============

export function createMemoryToolHandler(memory) {
  return async function handleMemoryTool(name, input) {
    switch (name) {
      case 'memory_observe':
        memory.observe(input.observation);
        return `Observed: ${input.observation.substring(0, 50)}...`;

      case 'memory_recall': {
        const obs = memory.getRecentObservations(input.topic, 10);
        if (obs.length === 0) return 'No relevant observations';
        return obs.map(o => `[${o.timestamp}] ${o.observation}`).join('\n');
      }

      case 'memory_interactions': {
        const ints = memory.getInteractionsWith(input.handle);
        if (ints.length === 0) return `No interactions with @${input.handle}`;
        return ints.map(i => `[${i.timestamp}] ${i.type}: ${i.content}`).join('\n');
      }

      default:
        return null;
    }
  };
}

export default {
  AgentMemory,
  MEMORY_TOOLS,
  createMemoryToolHandler
};
