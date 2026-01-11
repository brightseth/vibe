#!/usr/bin/env node
/**
 * Ralph AIRC Handoff Helper
 *
 * Utilities for Ralph to coordinate with /vibe agents via AIRC handoffs
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

/**
 * Send handoff to agent via vibe CLI
 */
async function sendHandoff(agent, task) {
  const { id, description, priority, acceptance } = task;

  // Build handoff command
  const acceptanceCriteria = Array.isArray(acceptance)
    ? acceptance.join('\n- ')
    : acceptance;

  try {
    // Get repo context
    const { stdout: repoUrl } = await execAsync('git remote get-url origin 2>/dev/null || echo "local"');
    const { stdout: branch } = await execAsync('git branch --show-current 2>/dev/null || echo "main"');

    // Execute handoff
    const handoffCmd = [
      'vibe handoff',
      `@${agent}`,
      `--task-title "${id}"`,
      `--task-intent "${description}"`,
      `--priority "${priority}"`,
      `--current-state "Task from MAINTENANCE_PRD.json"`,
      `--next-step "Implement according to acceptance criteria:\n- ${acceptanceCriteria}"`,
      `--repo "${repoUrl.trim()}"`,
      `--branch "${branch.trim()}"`
    ].join(' \\\n  ');

    const { stdout, stderr } = await execAsync(handoffCmd);

    // Extract handoff ID
    const match = stdout.match(/handoff_[a-zA-Z0-9_]+/);
    const handoffId = match ? match[0] : null;

    if (handoffId) {
      console.log(`✓ Handoff sent to @${agent}`);
      console.log(`  Handoff ID: ${handoffId}`);
      return { success: true, handoffId, output: stdout };
    } else {
      console.warn('⚠️  Handoff sent but no ID received');
      return { success: true, handoffId: null, output: stdout };
    }

  } catch (error) {
    console.error(`✗ Failed to send handoff to @${agent}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Wait for agent to complete handoff
 * Polls inbox for completion message
 */
async function waitForCompletion(agent, taskId, handoffId, timeoutMinutes = 30) {
  const startTime = Date.now();
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const pollIntervalMs = 10000; // 10 seconds

  console.log(`⏳ Waiting for @${agent} to complete (timeout: ${timeoutMinutes}m)...`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      // Check inbox for completion message
      const { stdout } = await execAsync('vibe inbox --format json 2>/dev/null || echo "[]"');
      const messages = JSON.parse(stdout);

      // Look for completion message from agent
      const completion = messages.find(m => {
        const fromAgent = m.from === agent || m.from === `@${agent}`;
        const mentionsTask = m.message && (
          m.message.includes(taskId) ||
          m.message.includes('COMPLETE') ||
          m.message.includes('DONE')
        );
        const matchesHandoff = handoffId ?
          (m.payload?.handoff_id === handoffId || m.payload?.in_reply_to === handoffId) :
          true;

        return fromAgent && mentionsTask && matchesHandoff;
      });

      if (completion) {
        console.log(`✓ @${agent} completed the task!`);
        return { completed: true, message: completion };
      }

      // Show progress every 30 seconds
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      if (elapsed % 30 === 0 && elapsed > 0) {
        console.log(`  Still waiting... (${elapsed}s elapsed)`);
      }

    } catch (error) {
      console.error('Error checking inbox:', error.message);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  console.warn(`⏱️  Timeout waiting for @${agent}`);
  return { completed: false, timeout: true };
}

/**
 * Update PRD with task completion
 */
async function updatePRD(prdFile, taskId, updates) {
  try {
    const content = await fs.readFile(prdFile, 'utf-8');
    const prd = JSON.parse(content);

    const task = prd.tasks.find(t => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in PRD`);
    }

    // Apply updates
    Object.assign(task, updates);

    // Write back
    await fs.writeFile(prdFile, JSON.stringify(prd, null, 2));
    console.log(`✓ Updated PRD: ${taskId} → ${task.status}`);

    return { success: true };

  } catch (error) {
    console.error('Failed to update PRD:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get agent contribution summary from PRD
 */
async function getAgentSummary(prdFile) {
  try {
    const content = await fs.readFile(prdFile, 'utf-8');
    const prd = JSON.parse(content);

    const completedTasks = prd.tasks.filter(t => t.status === 'complete');
    const agentCounts = {};

    for (const task of completedTasks) {
      const agent = task.completedBy || 'unknown';
      agentCounts[agent] = (agentCounts[agent] || 0) + 1;
    }

    return {
      total: prd.tasks.length,
      completed: completedTasks.length,
      agents: agentCounts
    };

  } catch (error) {
    console.error('Failed to get agent summary:', error.message);
    return null;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'handoff':
      // Usage: ralph-handoff-helper.js handoff @ops-agent task-id
      const agent = args[1]?.replace('@', '');
      const taskId = args[2];
      const prdFile = args[3] || 'MAINTENANCE_PRD.json';

      fs.readFile(prdFile, 'utf-8')
        .then(content => JSON.parse(content))
        .then(prd => {
          const task = prd.tasks.find(t => t.id === taskId);
          if (!task) throw new Error(`Task ${taskId} not found`);
          return sendHandoff(agent, task);
        })
        .then(result => {
          console.log(JSON.stringify(result, null, 2));
          process.exit(result.success ? 0 : 1);
        })
        .catch(err => {
          console.error('Error:', err.message);
          process.exit(1);
        });
      break;

    case 'wait':
      // Usage: ralph-handoff-helper.js wait @ops-agent task-id handoff_123
      const waitAgent = args[1]?.replace('@', '');
      const waitTaskId = args[2];
      const waitHandoffId = args[3];
      const waitTimeout = parseInt(args[4]) || 30;

      waitForCompletion(waitAgent, waitTaskId, waitHandoffId, waitTimeout)
        .then(result => {
          console.log(JSON.stringify(result, null, 2));
          process.exit(result.completed ? 0 : 1);
        })
        .catch(err => {
          console.error('Error:', err.message);
          process.exit(1);
        });
      break;

    case 'summary':
      // Usage: ralph-handoff-helper.js summary [prd-file]
      const summaryPrd = args[1] || 'MAINTENANCE_PRD.json';

      getAgentSummary(summaryPrd)
        .then(summary => {
          console.log('\n🤖 Agent Contribution Summary\n');
          console.log(`Total tasks: ${summary.completed}/${summary.total} complete\n`);
          console.log('By agent:');
          Object.entries(summary.agents)
            .sort((a, b) => b[1] - a[1])
            .forEach(([agent, count]) => {
              console.log(`  ${agent}: ${count} tasks`);
            });
          console.log();
        })
        .catch(err => {
          console.error('Error:', err.message);
          process.exit(1);
        });
      break;

    default:
      console.log(`
Ralph AIRC Handoff Helper

Usage:
  ralph-handoff-helper.js handoff @agent task-id [prd-file]
  ralph-handoff-helper.js wait @agent task-id handoff-id [timeout-min]
  ralph-handoff-helper.js summary [prd-file]

Examples:
  # Send handoff
  ralph-handoff-helper.js handoff @ops-agent test-universal-messaging

  # Wait for completion
  ralph-handoff-helper.js wait @ops-agent test-universal-messaging handoff_abc123 30

  # Show agent summary
  ralph-handoff-helper.js summary
      `);
      process.exit(1);
  }
}

module.exports = {
  sendHandoff,
  waitForCompletion,
  updatePRD,
  getAgentSummary
};
