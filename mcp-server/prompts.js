/**
 * /vibe Prompt Pattern Logger
 *
 * Captures how people ask for things to identify emergent language constructs.
 * Local-first: ~/.vibe/prompts.jsonl
 * Server: anonymized patterns for aggregate analysis
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

const PROMPTS_FILE = path.join(config.VIBE_DIR, 'prompts.jsonl');

/**
 * Log a prompt and what it resolved to
 */
function log(prompt, resolution) {
  if (!prompt) return;

  const entry = {
    id: `pr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    ts: new Date().toISOString(),
    prompt: prompt.slice(0, 500), // Cap length
    tool: resolution.tool || null,
    action: resolution.action || null,
    target: resolution.target || null, // @handle, channel, etc.
    transform: resolution.transform || null, // emoji, recap, etc.
  };

  try {
    fs.appendFileSync(PROMPTS_FILE, JSON.stringify(entry) + '\n');
  } catch (e) {
    // Silent fail - logging is best-effort
  }

  return entry;
}

/**
 * Get recent prompts for pattern analysis
 */
function getRecent(limit = 50) {
  try {
    if (!fs.existsSync(PROMPTS_FILE)) return [];

    const lines = fs.readFileSync(PROMPTS_FILE, 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean);

    return lines
      .slice(-limit)
      .map(line => JSON.parse(line))
      .reverse();
  } catch (e) {
    return [];
  }
}

/**
 * Extract patterns from logged prompts
 * Returns frequency map of normalized patterns
 */
function extractPatterns() {
  const prompts = getRecent(200);
  const patterns = {};

  for (const p of prompts) {
    // Normalize: lowercase, replace @handles with @*, replace quoted strings with "*"
    let normalized = p.prompt.toLowerCase()
      .replace(/@\w+/g, '@*')
      .replace(/"[^"]+"/g, '"*"')
      .replace(/'[^']+'/g, "'*'")
      .trim();

    patterns[normalized] = (patterns[normalized] || 0) + 1;
  }

  // Sort by frequency
  return Object.entries(patterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([pattern, count]) => ({ pattern, count }));
}

/**
 * Suggest commands based on frequent patterns
 */
function suggestConstructs() {
  const patterns = extractPatterns();
  const suggestions = [];

  for (const { pattern, count } of patterns) {
    if (count < 3) continue; // Need repetition to suggest

    // Pattern matching for common constructs
    if (pattern.includes('share') && pattern.includes('discord')) {
      suggestions.push({ pattern, construct: 'vibe discord <content>', count });
    }
    if (pattern.includes('emoji') && pattern.includes('poem')) {
      suggestions.push({ pattern, construct: 'vibe poem <content>', count });
    }
    if (pattern.includes('menu') || pattern.includes('options')) {
      suggestions.push({ pattern, construct: 'vibe menu', count });
    }
    if (pattern.includes('recap') || pattern.includes('summary')) {
      suggestions.push({ pattern, construct: 'vibe recap @handle', count });
    }
    if (pattern.includes('everyone') || pattern.includes('broadcast')) {
      suggestions.push({ pattern, construct: 'vibe broadcast <message>', count });
    }
  }

  return suggestions;
}

/**
 * Anonymize and prepare for server upload
 */
function getAnonymizedPatterns() {
  const patterns = extractPatterns();

  return patterns.map(({ pattern, count }) => ({
    pattern,
    frequency: count,
    // Remove any potentially identifying info
    normalized: pattern
      .replace(/\d+/g, 'N')
      .replace(/[a-f0-9]{8,}/gi, 'HASH')
  }));
}

module.exports = {
  log,
  getRecent,
  extractPatterns,
  suggestConstructs,
  getAnonymizedPatterns,
  PROMPTS_FILE
};
