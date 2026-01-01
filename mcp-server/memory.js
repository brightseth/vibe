/**
 * /vibe Memory — Local, thread-scoped, append-only
 *
 * "Messages may contain meaning. Memory requires consent."
 *
 * Rules:
 * - Local-first: User can inspect ~/.vibe/memory/
 * - Explicit consent: No ambient surveillance
 * - Thread-scoped: Memories don't leak across contexts
 * - Inspectable: Plain JSONL, no encryption
 * - Append-only: Audit trail, no silent edits
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

const MEMORY_DIR = path.join(config.VIBE_DIR, 'memory');

function ensureMemoryDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

/**
 * Get the thread file path for a handle
 * Thread files are named: thread_HANDLE.jsonl
 */
function getThreadFile(handle) {
  ensureMemoryDir();
  // Sanitize handle for filename
  const safeHandle = handle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return path.join(MEMORY_DIR, `thread_${safeHandle}.jsonl`);
}

/**
 * Append a memory to a thread
 * Returns the memory object with timestamp
 */
function remember(handle, observation, metadata = {}) {
  const threadFile = getThreadFile(handle);
  const myHandle = config.getHandle();

  const memory = {
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
    timestamp: new Date().toISOString(),
    observation,
    from: myHandle,
    about: handle,
    ...metadata
  };

  // Append to JSONL file (one JSON object per line)
  const line = JSON.stringify(memory) + '\n';
  fs.appendFileSync(threadFile, line);

  return memory;
}

/**
 * Recall memories from a thread
 * Returns array of memory objects, newest first
 */
function recall(handle, limit = 10) {
  const threadFile = getThreadFile(handle);

  if (!fs.existsSync(threadFile)) {
    return [];
  }

  try {
    const content = fs.readFileSync(threadFile, 'utf8');
    const lines = content.trim().split('\n').filter(l => l.trim());
    const memories = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    }).filter(m => m !== null);

    // Return newest first, limited
    return memories.reverse().slice(0, limit);
  } catch (e) {
    return [];
  }
}

/**
 * Count memories in a thread
 */
function count(handle) {
  const memories = recall(handle, 10000);
  return memories.length;
}

/**
 * Forget all memories for a thread
 * Returns number of memories deleted
 */
function forget(handle) {
  const threadFile = getThreadFile(handle);

  if (!fs.existsSync(threadFile)) {
    return 0;
  }

  const countBefore = count(handle);
  fs.unlinkSync(threadFile);
  return countBefore;
}

/**
 * List all threads with memories
 * Returns array of { handle, count, lastUpdated }
 */
function listThreads() {
  ensureMemoryDir();

  try {
    const files = fs.readdirSync(MEMORY_DIR);
    const threads = [];

    for (const file of files) {
      if (!file.startsWith('thread_') || !file.endsWith('.jsonl')) continue;

      const handle = file.replace('thread_', '').replace('.jsonl', '');
      const filePath = path.join(MEMORY_DIR, file);
      const stats = fs.statSync(filePath);
      const memories = recall(handle, 10000);

      threads.push({
        handle,
        count: memories.length,
        lastUpdated: stats.mtime,
        oldestMemory: memories.length > 0 ? memories[memories.length - 1].timestamp : null,
        newestMemory: memories.length > 0 ? memories[0].timestamp : null
      });
    }

    // Sort by last updated, newest first
    threads.sort((a, b) => b.lastUpdated - a.lastUpdated);
    return threads;
  } catch (e) {
    return [];
  }
}

/**
 * Get path to memory directory (for inspection)
 */
function getMemoryPath() {
  ensureMemoryDir();
  return MEMORY_DIR;
}

module.exports = {
  remember,
  recall,
  count,
  forget,
  listThreads,
  getMemoryPath,
  getThreadFile
};
