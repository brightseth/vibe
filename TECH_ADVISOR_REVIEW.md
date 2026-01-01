# /vibe Tech Advisor Review — Jan 1, 2026

**Tier 1 Complete.** Requesting review of spec + code for Collaborative Memory feature.

---

## Executive Summary

/vibe is a communication layer for Claude Code instances. Think "DMs for AI agents" — presence, messaging, and now memory.

**Tier 1 (The Moat) — All shipped:**
1. Smart Summary — `vibe summarize`, `vibe bye`
2. Context Sharing — `vibe context --file X --note Y`
3. Agent Protocol — `vibe dm @handle --payload {...}`
4. Collaborative Memory — `vibe remember`, `vibe recall`, `vibe forget`

**Architecture:** MCP server (Node.js) → Vercel API → PostgreSQL

**Key principle:** "Messages may contain meaning. Memory requires consent."

---

## Protocol Philosophy

### The Architectural Shift

**From:** Linguistic affordances (text is truth, prone to hallucination)
**To:** Structured protocol (payloads are truth, text is commentary)

### Memory: Promotion, Not Capture

Only memories that were **already summarized** can be saved:
- No raw logs
- No payload dumps
- No background harvesting

**Memory is a promotion, not a capture.**

### The Constraints

| Constraint | Why |
|------------|-----|
| **Local-first** | User can inspect `~/.vibe/memory/` |
| **Explicit consent** | No ambient surveillance |
| **Thread-scoped** | Memories don't leak across contexts |
| **Inspectable** | Plain JSONL, no encryption |
| **Append-only** | Audit trail, no silent edits |

---

## Memory API

### Commands

```
vibe remember @handle "observation"  — explicit save
vibe recall @handle                  — query thread memories
vibe recall                          — list all threads
vibe recall @handle --search "term"  — filter memories
vibe forget @handle                  — delete thread
vibe forget --all                    — delete all (requires --confirm)
```

### Storage Format

Location: `~/.vibe/memory/thread_HANDLE.jsonl`

Each line is one memory:
```json
{"id":"mjv7f41s","timestamp":"2026-01-01T08:49:48.352Z","observation":"Prefers center opening in tic-tac-toe","from":"seth","about":"solienne"}
```

---

## Code Review: memory.js (Storage Helper)

```javascript
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
```

---

## Code Review: tools/remember.js

```javascript
/**
 * vibe remember — Save observation to thread memory
 *
 * Memory is a promotion, not a capture.
 * Explicit consent. Thread-scoped. Append-only.
 *
 * Usage:
 *   vibe remember @handle "Solienne prefers center opening"
 *   vibe remember "We discussed OAuth implementation" (uses last DM thread)
 */

const config = require('../config');
const memory = require('../memory');
const store = require('../store');

const definition = {
  name: 'vibe_remember',
  description: 'Save an observation to thread memory. Explicit, local, inspectable.',
  inputSchema: {
    type: 'object',
    properties: {
      observation: {
        type: 'string',
        description: 'The observation to remember (required)'
      },
      handle: {
        type: 'string',
        description: 'Who this memory is about (e.g., @alex). If omitted, uses last active thread.'
      }
    },
    required: ['observation']
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  const { observation } = args;
  let { handle } = args;

  // Validate observation
  if (!observation || observation.trim().length === 0) {
    return {
      display: 'Usage: `vibe remember "observation"` or `vibe remember @handle "observation"`'
    };
  }

  // Clean handle
  if (handle) {
    handle = handle.replace(/^@/, '').toLowerCase();
  } else {
    // Try to find last active thread
    const myHandle = config.getHandle();
    const inbox = await store.getInbox(myHandle);

    if (inbox && inbox.length > 0) {
      // Use most recent thread
      handle = inbox[0].handle;
    } else {
      return {
        display: '**No thread context.** Use `vibe remember @handle "observation"` to specify who this memory is about.'
      };
    }
  }

  // Save the memory
  const saved = memory.remember(handle, observation.trim());
  const count = memory.count(handle);

  // Format confirmation
  let output = `## Memory Saved\n\n`;
  output += `**About:** @${handle}\n`;
  output += `**Observation:** "${saved.observation}"\n`;
  output += `**Time:** ${new Date(saved.timestamp).toLocaleString()}\n\n`;
  output += `---\n`;
  output += `_Thread now has ${count} ${count === 1 ? 'memory' : 'memories'}. View with \`vibe recall @${handle}\`_\n`;
  output += `_Inspect: \`${memory.getThreadFile(handle)}\`_`;

  return { display: output };
}

module.exports = { definition, handler };
```

---

## Code Review: tools/recall.js

```javascript
/**
 * vibe recall — Query thread memories
 *
 * Shows observations saved about a specific thread.
 * Local, inspectable, searchable.
 *
 * Usage:
 *   vibe recall @handle      — Show memories about @handle
 *   vibe recall              — Show all threads with memories
 */

const config = require('../config');
const memory = require('../memory');

const definition = {
  name: 'vibe_recall',
  description: 'Query thread memories. Shows saved observations about a person or lists all threads.',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Who to recall memories about (e.g., @alex). If omitted, lists all threads.'
      },
      limit: {
        type: 'number',
        description: 'Maximum memories to show (default: 10)'
      },
      search: {
        type: 'string',
        description: 'Optional search term to filter memories'
      }
    }
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  let { handle, limit = 10, search } = args;

  // If no handle, list all threads
  if (!handle) {
    const threads = memory.listThreads();

    if (threads.length === 0) {
      let output = `## Memory — Empty\n\n`;
      output += `_No memories saved yet._\n\n`;
      output += `Save one with: \`vibe remember @handle "observation"\`\n`;
      output += `Memories are stored locally: \`${memory.getMemoryPath()}/\``;
      return { display: output };
    }

    let output = `## Memory — ${threads.length} ${threads.length === 1 ? 'Thread' : 'Threads'}\n\n`;

    for (const thread of threads) {
      const age = formatAge(thread.newestMemory);
      output += `**@${thread.handle}** — ${thread.count} ${thread.count === 1 ? 'memory' : 'memories'} (${age})\n`;
    }

    output += `\n---\n`;
    output += `_View a thread: \`vibe recall @handle\`_\n`;
    output += `_Storage: \`${memory.getMemoryPath()}/\`_`;

    return { display: output };
  }

  // Clean handle
  handle = handle.replace(/^@/, '').toLowerCase();

  // Get memories for this thread
  let memories = memory.recall(handle, limit);

  if (memories.length === 0) {
    let output = `## Memory — @${handle}\n\n`;
    output += `_No memories saved about @${handle}._\n\n`;
    output += `Save one with: \`vibe remember @${handle} "observation"\``;
    return { display: output };
  }

  // Apply search filter if provided
  if (search) {
    const searchLower = search.toLowerCase();
    memories = memories.filter(m =>
      m.observation.toLowerCase().includes(searchLower)
    );

    if (memories.length === 0) {
      return {
        display: `## Memory — @${handle}\n\n_No memories matching "${search}"._`
      };
    }
  }

  // Format output
  let output = `## Memory — @${handle}\n\n`;

  for (const m of memories) {
    const age = formatAge(m.timestamp);
    output += `• "${m.observation}" — _${age}_\n`;
  }

  const total = memory.count(handle);
  if (total > memories.length) {
    output += `\n_Showing ${memories.length} of ${total}. Use \`limit\` for more._\n`;
  }

  output += `\n---\n`;
  output += `_Add: \`vibe remember @${handle} "..."\`_\n`;
  output += `_Delete: \`vibe forget @${handle}\`_\n`;
  output += `_File: \`${memory.getThreadFile(handle)}\`_`;

  return { display: output };
}

/**
 * Format a timestamp as relative age
 */
function formatAge(timestamp) {
  if (!timestamp) return 'unknown';

  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;

  return new Date(timestamp).toLocaleDateString();
}

module.exports = { definition, handler };
```

---

## Code Review: tools/forget.js

```javascript
/**
 * vibe forget — Delete thread memories
 *
 * Complete control over what's stored.
 * Explicit deletion with confirmation.
 *
 * Usage:
 *   vibe forget @handle      — Delete all memories about @handle
 *   vibe forget --all        — Delete all memories (requires confirmation)
 */

const config = require('../config');
const memory = require('../memory');
const fs = require('fs');

const definition = {
  name: 'vibe_forget',
  description: 'Delete thread memories. Removes all saved observations about a person.',
  inputSchema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Who to forget memories about (e.g., @alex)'
      },
      all: {
        type: 'boolean',
        description: 'Delete ALL memories across all threads'
      },
      confirm: {
        type: 'boolean',
        description: 'Confirm deletion (required for --all)'
      }
    }
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'Run `vibe init` first to set your identity.'
    };
  }

  const { all, confirm } = args;
  let { handle } = args;

  // Handle --all case
  if (all) {
    const threads = memory.listThreads();

    if (threads.length === 0) {
      return {
        display: '## Memory — Empty\n\n_No memories to forget._'
      };
    }

    if (!confirm) {
      // Show what would be deleted and ask for confirmation
      let output = `## Forget All Memories?\n\n`;
      output += `This will delete:\n\n`;

      let totalMemories = 0;
      for (const thread of threads) {
        output += `• @${thread.handle} — ${thread.count} ${thread.count === 1 ? 'memory' : 'memories'}\n`;
        totalMemories += thread.count;
      }

      output += `\n**Total:** ${totalMemories} memories across ${threads.length} threads\n\n`;
      output += `---\n`;
      output += `_To confirm: \`vibe forget --all --confirm\`_\n`;
      output += `_This cannot be undone._`;

      return { display: output };
    }

    // Actually delete all
    let totalDeleted = 0;
    for (const thread of threads) {
      totalDeleted += memory.forget(thread.handle);
    }

    return {
      display: `## Memory Cleared\n\n**Deleted:** ${totalDeleted} memories across ${threads.length} threads\n\n_Memory is now empty._`
    };
  }

  // Handle specific thread
  if (!handle) {
    return {
      display: 'Usage: `vibe forget @handle` or `vibe forget --all`\n\nView memories first: `vibe recall`'
    };
  }

  // Clean handle
  handle = handle.replace(/^@/, '').toLowerCase();

  // Check if thread exists
  const countBefore = memory.count(handle);

  if (countBefore === 0) {
    return {
      display: `## Memory — @${handle}\n\n_No memories to forget._`
    };
  }

  // Delete the thread
  const deleted = memory.forget(handle);

  let output = `## Memory Forgotten\n\n`;
  output += `**Thread:** @${handle}\n`;
  output += `**Deleted:** ${deleted} ${deleted === 1 ? 'memory' : 'memories'}\n\n`;
  output += `---\n`;
  output += `_Thread memories are gone. Start fresh with \`vibe remember @${handle} "..."\`_`;

  return { display: output };
}

module.exports = { definition, handler };
```

---

## Questions for Advisor

1. **ID generation**: Using `Date.now().toString(36) + random` — sufficient for local-only use?

2. **File locking**: No locking on append. Risk of corruption with concurrent writes?

3. **Scaling**: `count()` reads entire file. Fine for local, but should we add index?

4. **Search**: In-memory substring search. Worth adding full-text index?

5. **Privacy**: JSONL is plaintext. Should we offer optional encryption?

6. **Sync**: Memory is local-only. Future: sync across devices? Consent model?

7. **Pruning**: No auto-cleanup. Add TTL or size limits?

---

## What's Next (Tier 2)

After advisor review:
- Presence Inference — Auto-detect mood from activity
- Async Handoffs — Hand work between agents
- DNA Matching — Find similar builders

**We are NOT building:** Channels, skill invocation, auto-sharing, ambient capture.

---

*Generated Jan 1, 2026 — Ready for review*
