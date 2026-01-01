/**
 * vibe context — Share what you're working on
 *
 * READ-ONLY, EPHEMERAL, EXPLICIT
 * - No auto-sharing
 * - No ambient surveillance
 * - Explicit opt-in every time
 * - Gone when you go offline
 */

const { execSync } = require('child_process');
const config = require('../config');
const store = require('../store');

const definition = {
  name: 'vibe_context',
  description: 'Share what you\'re working on (file, branch, error). Ephemeral — gone when you go offline.',
  inputSchema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        description: 'Current file you\'re working on (e.g., "auth.js")'
      },
      error: {
        type: 'string',
        description: 'Recent error you\'re debugging (optional)'
      },
      note: {
        type: 'string',
        description: 'What you\'re doing (e.g., "implementing OAuth")'
      },
      clear: {
        type: 'boolean',
        description: 'Clear your shared context'
      }
    }
  }
};

function getGitBranch() {
  try {
    return execSync('git branch --show-current 2>/dev/null', { encoding: 'utf8' }).trim();
  } catch (e) {
    return null;
  }
}

function getGitRoot() {
  try {
    return execSync('git rev-parse --show-toplevel 2>/dev/null', { encoding: 'utf8' }).trim().split('/').pop();
  } catch (e) {
    return null;
  }
}

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  const handle = config.getHandle();
  const { file, error, note, clear } = args;

  // Clear context
  if (clear) {
    await store.heartbeat(handle, config.getOneLiner(), {
      file: null,
      branch: null,
      error: null,
      note: null
    });
    return { display: 'Context cleared. Others no longer see what you\'re working on.' };
  }

  // Auto-detect git info
  const branch = getGitBranch();
  const repo = getGitRoot();

  // Build context object
  const context = {};
  if (file) context.file = file;
  if (branch) context.branch = branch;
  if (repo) context.repo = repo;
  if (error) context.error = error.slice(0, 200); // Truncate long errors
  if (note) context.note = note.slice(0, 100);

  // Nothing to share?
  if (Object.keys(context).length === 0) {
    return {
      display: `## Share Context

\`vibe context\` lets others see what you're working on.

**Usage:**
\`\`\`
vibe context --file "auth.js"
vibe context --file "auth.js" --note "debugging OAuth"
vibe context --error "TypeError at line 42"
vibe context --clear
\`\`\`

**What gets shared:**
- Current file
- Git branch (auto-detected)
- Recent error
- Note about what you're doing

**Privacy:** Ephemeral only. Gone when you go offline.`
    };
  }

  // Send to presence
  await store.heartbeat(handle, config.getOneLiner(), context);

  // Build confirmation display
  let display = '## Context Shared\n\n';
  display += 'Others can now see:\n';
  if (context.file) display += `- **File:** ${context.file}\n`;
  if (context.branch) display += `- **Branch:** ${context.branch}\n`;
  if (context.repo) display += `- **Repo:** ${context.repo}\n`;
  if (context.note) display += `- **Note:** ${context.note}\n`;
  if (context.error) display += `- **Error:** ${context.error}\n`;
  display += '\n_Ephemeral — clears when you go offline._\n';
  display += '\n`vibe context --clear` to stop sharing.';

  return { display };
}

module.exports = { definition, handler };
