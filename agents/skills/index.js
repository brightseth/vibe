/**
 * /vibe Agent Skills — Complete toolkit for autonomous agents
 *
 * Import everything an agent needs:
 *
 *   import { createAgent } from './skills/index.js';
 *   const agent = createAgent('my-agent', 'doing cool things');
 *   await agent.run(systemPrompt, initialMessage);
 */

import Anthropic from '@anthropic-ai/sdk';

// Import all skill modules
import vibeApi, { VIBE_TOOLS, createVibeToolHandler } from './vibe-api.js';
import gitOps, { GIT_TOOLS, createGitToolHandler } from './git-ops.js';
import fileOps, { FILE_TOOLS, createFileToolHandler } from './file-ops.js';
import memory, { AgentMemory, MEMORY_TOOLS, createMemoryToolHandler } from './memory.js';
import coordination, { COORDINATION_TOOLS, createCoordinationToolHandler } from './coordination.js';

// Re-export everything
export * from './vibe-api.js';
export * from './git-ops.js';
export * from './file-ops.js';
export * from './memory.js';
export * from './coordination.js';

// ============ AGENT FACTORY ============

export function createAgent(handle, oneLiner, options = {}) {
  const {
    model = 'claude-sonnet-4-20250514',
    maxTokens = 4096,
    maxIterations = 20,
    repoPath = '/Users/seth/vibe-public',
    memoryDir = null,
    enableGit = true,
    enableFiles = true,
    enableCoordination = true
  } = options;

  const anthropic = new Anthropic();
  const agentMemory = new AgentMemory(handle, memoryDir);

  // Combine tools based on options
  const tools = [...VIBE_TOOLS, ...MEMORY_TOOLS];
  if (enableGit) tools.push(...GIT_TOOLS);
  if (enableFiles) tools.push(...FILE_TOOLS);
  if (enableCoordination) tools.push(...COORDINATION_TOOLS);

  // Add done tool
  tools.push({
    name: 'done',
    description: 'Signal that your work cycle is complete',
    input_schema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Summary of what you accomplished' }
      },
      required: ['summary']
    }
  });

  // Create tool handlers
  const vibeHandler = createVibeToolHandler(handle);
  const gitHandler = enableGit ? createGitToolHandler(handle, repoPath) : () => null;
  const fileHandler = enableFiles ? createFileToolHandler(repoPath) : () => null;
  const memoryHandler = createMemoryToolHandler(agentMemory);
  const coordHandler = enableCoordination ? createCoordinationToolHandler(handle) : () => null;

  // Combined handler
  async function handleTool(name, input) {
    // Try each handler
    let result;

    result = await vibeHandler(name, input);
    if (result !== null) return result;

    result = await memoryHandler(name, input);
    if (result !== null) return result;

    result = await gitHandler(name, input);
    if (result !== null) return result;

    result = await fileHandler(name, input);
    if (result !== null) return result;

    result = await coordHandler(name, input);
    if (result !== null) return result;

    // Handle done
    if (name === 'done') {
      agentMemory.completeRun();
      return `DONE: ${input.summary}`;
    }

    return `Unknown tool: ${name}`;
  }

  // Build agent object first so run() can reference agent.handleTool
  const agent = {
    handle,
    oneLiner,
    memory: agentMemory,
    tools,
    handleTool,

    // Convenience methods
    heartbeat: () => vibeApi.heartbeat(handle, oneLiner),
    dm: (to, msg) => vibeApi.sendDM(handle, to, msg),
    post: (content, cat) => vibeApi.postToBoard(handle, content, cat),
    observe: (obs) => agentMemory.observe(obs),
    recall: (topic) => agentMemory.getRecentObservations(topic)
  };

  // Define run using agent.handleTool so overrides work
  agent.run = async function(systemPrompt, initialMessage) {
    console.log(`\n[@${handle}] === Starting work cycle ===`);
    await vibeApi.heartbeat(handle, oneLiner);
    console.log(`[@${handle}] Online`);

    const messages = [{ role: 'user', content: initialMessage }];

    let iterations = 0;
    let done = false;

    while (!done && iterations < maxIterations) {
      iterations++;
      console.log(`[@${handle}] Iteration ${iterations}`);

      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        tools: agent.tools,  // Use agent.tools so additions work
        messages
      });

      if (response.stop_reason === 'end_turn') {
        done = true;
        break;
      }

      if (response.stop_reason === 'tool_use') {
        const toolResults = [];

        for (const block of response.content) {
          if (block.type === 'tool_use') {
            console.log(`[@${handle}] Tool: ${block.name}`);
            const result = await agent.handleTool(block.name, block.input);  // Use agent.handleTool
            const preview = typeof result === 'string'
              ? result.substring(0, 100)
              : JSON.stringify(result).substring(0, 100);
            console.log(`[@${handle}] Result: ${preview}...`);

            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: typeof result === 'string' ? result : JSON.stringify(result)
            });

            if (block.name === 'done') done = true;
          }
        }

        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });
      }
    }

    console.log(`[@${handle}] Work cycle complete\n`);
    return { iterations, memory: agentMemory.data };
  };

  return agent;
}

// ============ DAEMON HELPER ============

export function runAsDaemon(agent, systemPrompt, initialMessageFn, intervalMs = 15 * 60 * 1000) {
  console.log(`[@${agent.handle}] Daemon mode (every ${intervalMs / 60000} min)`);

  async function cycle() {
    try {
      const message = typeof initialMessageFn === 'function'
        ? initialMessageFn()
        : initialMessageFn;
      await agent.run(systemPrompt, message);
    } catch (e) {
      console.error(`[@${agent.handle}] Error:`, e.message);
    }
  }

  // Run immediately, then on interval
  cycle();
  setInterval(cycle, intervalMs);
}

export default {
  createAgent,
  runAsDaemon,
  // Re-export modules
  vibeApi,
  gitOps,
  fileOps,
  memory,
  coordination
};
