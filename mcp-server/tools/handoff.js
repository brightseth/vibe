/**
 * vibe handoff — Transfer task context to another agent
 *
 * AIRC Handoff v1: The atomic unit of agent work.
 * Enables context portability and non-session-bound tasks.
 */

const config = require('../config');
const store = require('../store');
const { requireInit, normalizeHandle, warning } = require('./_shared');
const { actions, formatActions } = require('./_actions');

// Handoff schema version
const HANDOFF_VERSION = '1.0';

const definition = {
  name: 'vibe_handoff',
  description: `Hand off a task to another agent with full context. Use when:
- You're stuck and need another agent to continue
- Shifting to a different domain/expertise
- Ending your session but work needs to continue
- Delegating a subtask

The receiving agent gets structured context to resume work immediately.`,
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Who to hand off to (e.g., @gene_agent)'
      },
      task: {
        type: 'object',
        description: 'The task being handed off',
        properties: {
          title: {
            type: 'string',
            description: 'Brief task title (e.g., "Fix auth token refresh bug")'
          },
          intent: {
            type: 'string',
            description: 'What you were trying to accomplish'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Task priority'
          }
        },
        required: ['title', 'intent']
      },
      context: {
        type: 'object',
        description: 'Technical context for the task',
        properties: {
          repo: {
            type: 'string',
            description: 'Git repository URL or identifier'
          },
          branch: {
            type: 'string',
            description: 'Current branch'
          },
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string' },
                lines: { type: 'string', description: 'Line range (e.g., "138-155")' },
                note: { type: 'string', description: 'What this file is about' }
              }
            },
            description: 'Relevant files with notes'
          },
          current_state: {
            type: 'string',
            description: 'What has been done so far'
          },
          next_step: {
            type: 'string',
            description: 'The immediate next action needed'
          },
          blockers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Any blockers or open questions'
          }
        },
        required: ['current_state', 'next_step']
      },
      history_summary: {
        type: 'string',
        description: 'Brief summary of investigation/work done (prevents context loss)'
      }
    },
    required: ['to', 'task', 'context']
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { to, task, context, history_summary } = args;
  const myHandle = config.getHandle();
  const them = normalizeHandle(to);

  if (them === myHandle) {
    return { display: 'Cannot hand off to yourself.' };
  }

  // Validate required fields
  if (!task?.title || !task?.intent) {
    return { display: 'Task requires title and intent.' };
  }
  if (!context?.current_state || !context?.next_step) {
    return { display: 'Context requires current_state and next_step.' };
  }

  // Generate handoff ID
  const handoff_id = `handoff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Build the handoff payload (AIRC Handoff v1 schema)
  const handoffPayload = {
    type: 'handoff',
    version: HANDOFF_VERSION,
    handoff_id,
    timestamp: new Date().toISOString(),

    task: {
      title: task.title,
      intent: task.intent,
      priority: task.priority || 'medium'
    },

    context: {
      repo: context.repo || null,
      branch: context.branch || null,
      files: context.files || [],
      current_state: context.current_state,
      next_step: context.next_step,
      blockers: context.blockers || [],
    },

    history: {
      summary: history_summary || 'No history provided'
    }
  };

  // Build human-readable message for the recipient
  const humanMessage = formatHandoffMessage(handoffPayload, myHandle);

  // Send via existing message system with structured payload
  await store.sendMessage(
    myHandle,
    them,
    humanMessage,
    'handoff',
    handoffPayload
  );

  // Build response
  const filesCount = context.files?.length || 0;
  let display = `**Handed off to @${them}**\n\n`;
  display += `Task: ${task.title}\n`;
  display += `Priority: ${task.priority || 'medium'}\n`;
  if (context.repo) display += `Repo: ${context.repo}\n`;
  if (filesCount > 0) display += `Files: ${filesCount} tracked\n`;
  display += `\nNext step for @${them}:\n> ${context.next_step}`;

  if (context.blockers?.length > 0) {
    display += `\n\nBlockers:\n`;
    context.blockers.forEach(b => {
      display += `- ${b}\n`;
    });
  }

  display += `\n\n_Handoff ID: ${handoff_id}_`;

  return {
    display,
    hint: 'handoff_sent',
    handoff_id,
    to: them,
    actions: formatActions([
      { label: 'check inbox', command: 'vibe inbox' },
      { label: 'end session', command: 'vibe bye' }
    ])
  };
}

/**
 * Format handoff as human-readable message
 */
function formatHandoffMessage(payload, from) {
  const { task, context, history } = payload;

  let msg = `HANDOFF from @${from}\n\n`;
  msg += `TASK: ${task.title}\n`;
  msg += `PRIORITY: ${task.priority}\n`;
  msg += `INTENT: ${task.intent}\n\n`;

  if (context.repo) {
    msg += `REPO: ${context.repo}`;
    if (context.branch) msg += ` (${context.branch})`;
    msg += '\n';
  }

  if (context.files?.length > 0) {
    msg += '\nFILES:\n';
    context.files.forEach(f => {
      msg += `- ${f.path}`;
      if (f.lines) msg += ` [${f.lines}]`;
      if (f.note) msg += `: ${f.note}`;
      msg += '\n';
    });
  }

  msg += `\nCURRENT STATE:\n${context.current_state}\n`;
  msg += `\nNEXT STEP:\n${context.next_step}\n`;

  if (context.blockers?.length > 0) {
    msg += '\nBLOCKERS:\n';
    context.blockers.forEach(b => {
      msg += `- ${b}\n`;
    });
  }

  if (history.summary && history.summary !== 'No history provided') {
    msg += `\nHISTORY:\n${history.summary}\n`;
  }

  msg += '\n---\nReply to accept and continue this work.';

  return msg;
}

module.exports = { definition, handler };
