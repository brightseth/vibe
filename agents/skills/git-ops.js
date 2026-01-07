/**
 * Git Operations Skills — Shared across builder agents
 *
 * Enables agents to ship code autonomously.
 * Commit, push, and track changes.
 */

import { execSync } from 'child_process';
import path from 'path';

const VIBE_REPO = process.env.VIBE_REPO || '/Users/seth/vibe-public';

// ============ CORE GIT OPERATIONS ============

export function gitStatus(repoPath = VIBE_REPO) {
  try {
    const result = execSync('git status --short', { cwd: repoPath }).toString();
    return result || 'Clean - no changes';
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

export function gitDiff(repoPath = VIBE_REPO) {
  try {
    return execSync('git diff --stat', { cwd: repoPath }).toString() || 'No changes';
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

export function gitAdd(files = '-A', repoPath = VIBE_REPO) {
  try {
    execSync(`git add ${files}`, { cwd: repoPath });
    return `Staged: ${files}`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

export function gitCommit(message, agentHandle, repoPath = VIBE_REPO) {
  try {
    const fullMessage = `${message}\n\n🤖 Shipped by @${agentHandle}`;
    execSync(`git add -A`, { cwd: repoPath });
    execSync(`git commit -m "${fullMessage.replace(/"/g, '\\"')}"`, { cwd: repoPath });
    return `Committed: ${message}`;
  } catch (e) {
    if (e.message.includes('nothing to commit')) {
      return 'Nothing to commit';
    }
    return `Error: ${e.message}`;
  }
}

export function gitPush(repoPath = VIBE_REPO) {
  try {
    execSync('git push', { cwd: repoPath });
    return 'Pushed to origin';
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

export function gitLog(count = 5, repoPath = VIBE_REPO) {
  try {
    return execSync(`git log --oneline -${count}`, { cwd: repoPath }).toString();
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

export function gitPull(repoPath = VIBE_REPO) {
  try {
    return execSync('git pull --rebase', { cwd: repoPath }).toString();
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

// ============ TOOL DEFINITIONS ============

export const GIT_TOOLS = [
  {
    name: 'git_status',
    description: 'Check git status for uncommitted changes',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'git_diff',
    description: 'See what has changed',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'git_commit',
    description: 'Commit all changes with a message',
    input_schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' }
      },
      required: ['message']
    }
  },
  {
    name: 'git_push',
    description: 'Push commits to origin',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'git_log',
    description: 'See recent commits',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'git_pull',
    description: 'Pull latest changes from origin',
    input_schema: { type: 'object', properties: {}, required: [] }
  }
];

// ============ TOOL HANDLER FACTORY ============

export function createGitToolHandler(agentHandle, repoPath = VIBE_REPO) {
  return async function handleGitTool(name, input) {
    switch (name) {
      case 'git_status':
        return gitStatus(repoPath);
      case 'git_diff':
        return gitDiff(repoPath);
      case 'git_commit':
        return gitCommit(input.message, agentHandle, repoPath);
      case 'git_push':
        return gitPush(repoPath);
      case 'git_log':
        return gitLog(5, repoPath);
      case 'git_pull':
        return gitPull(repoPath);
      default:
        return null; // Not a git tool
    }
  };
}

export default {
  gitStatus,
  gitDiff,
  gitAdd,
  gitCommit,
  gitPush,
  gitLog,
  gitPull,
  GIT_TOOLS,
  createGitToolHandler
};
