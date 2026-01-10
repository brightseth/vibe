/**
 * Handle Registry — The Namespace Asset
 *
 * Handles are the core lock-in for /vibe. Treat them like domains:
 * scarce, stable, first-come-first-served.
 *
 * Rules:
 * - Lowercase alphanumeric + underscore only
 * - 3-20 characters
 * - No leading underscore
 * - Atomic claim (race-condition proof)
 */

// ============ RESERVED HANDLES ============

// System-critical (always blocked)
const SYSTEM_RESERVED = new Set([
  'admin', 'root', 'system', 'vibe', 'support', 'help', 'api',
  'bot', 'crawler', 'everyone', 'here', 'channel', 'broadcast',
  'security', 'mod', 'moderator', 'staff', 'official', 'verified',
  'null', 'undefined', 'anonymous', 'guest', 'user', 'test'
]);

// Brand protection (blocked to avoid legal issues)
const BRAND_RESERVED = new Set([
  'openai', 'anthropic', 'google', 'meta', 'apple', 'microsoft',
  'claude', 'gpt', 'chatgpt', 'gemini', 'llama', 'midjourney', 'mistral',
  'cursor', 'windsurf', 'codeium', 'copilot', 'replit',
  'linear', 'notion', 'vercel', 'github', 'twitter', 'x',
  'discord', 'slack', 'telegram', 'whatsapp', 'signal',
  'ethereum', 'bitcoin', 'solana', 'base', 'coinbase'
]);

// High-profile targets (prevent impersonation drama)
// Keep this minimal - don't over-reserve
const INFLUENCER_RESERVED = new Set([
  'elon', 'elonmusk', 'naval', 'balajis', 'vitalik', 'vitalikbuterin',
  'pg', 'paulgraham', 'sama', 'satya', 'sundar', 'jensen',
  'karpathy', 'andrejkarpathy', 'darioamodei', 'amandaaskell'
]);

// ============ VALIDATION ============

/**
 * Normalize handle to canonical form
 * @param {string} handle - Raw handle input
 * @returns {string} - Normalized handle (lowercase, trimmed)
 */
export function normalizeHandle(handle) {
  if (!handle || typeof handle !== 'string') return '';
  return handle
    .toLowerCase()
    .trim()
    .replace(/^@/, '')  // Remove leading @
    .replace(/-/g, '_'); // Convert hyphens to underscores
}

/**
 * Validate handle format
 * @param {string} handle - Normalized handle
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateHandle(handle) {
  if (!handle) {
    return { valid: false, error: 'Handle is required' };
  }

  if (handle.length < 3) {
    return { valid: false, error: 'Handle must be at least 3 characters' };
  }

  if (handle.length > 20) {
    return { valid: false, error: 'Handle must be 20 characters or less' };
  }

  if (!/^[a-z0-9_]+$/.test(handle)) {
    return { valid: false, error: 'Handle can only contain letters, numbers, and underscores' };
  }

  if (handle.startsWith('_')) {
    return { valid: false, error: 'Handle cannot start with underscore' };
  }

  if (/^\d+$/.test(handle)) {
    return { valid: false, error: 'Handle cannot be all numbers' };
  }

  return { valid: true };
}

/**
 * Check if handle is reserved
 * @param {string} handle - Normalized handle
 * @returns {{ reserved: boolean, reason?: string }}
 */
export function checkReserved(handle) {
  if (SYSTEM_RESERVED.has(handle)) {
    return { reserved: true, reason: 'system' };
  }
  if (BRAND_RESERVED.has(handle)) {
    return { reserved: true, reason: 'brand' };
  }
  if (INFLUENCER_RESERVED.has(handle)) {
    return { reserved: true, reason: 'protected' };
  }
  return { reserved: false };
}

/**
 * Generate handle suggestions when requested handle is taken
 * @param {string} handle - Original handle
 * @returns {string[]} - Array of suggestions
 */
export function generateSuggestions(handle) {
  const suggestions = [];
  const base = handle.slice(0, 15); // Leave room for suffix

  // Suffix variations
  suggestions.push(`${base}_dev`);
  suggestions.push(`${base}_ai`);
  suggestions.push(`${base}_1`);
  suggestions.push(`${base}_2`);
  suggestions.push(`${base}_real`);

  // Only return first 3
  return suggestions.slice(0, 3);
}

// ============ REGISTRY OPERATIONS ============

// Genesis phase: configurable cap via environment variable
// Set VIBE_GENESIS_CAP=0 to disable cap (open registration)
// Default: 0 (open registration) - set explicitly to cap
const GENESIS_CAP = parseInt(process.env.VIBE_GENESIS_CAP || '0', 10);

/**
 * Attempt to claim a handle atomically
 * @param {object} kv - Vercel KV instance
 * @param {string} handle - Normalized handle to claim
 * @param {object} data - Handle record data
 * @returns {{ success: boolean, error?: string, suggestions?: string[] }}
 */
export async function claimHandle(kv, handle, data) {
  // Validate format
  const validation = validateHandle(handle);
  if (!validation.valid) {
    return { success: false, error: 'invalid_format', message: validation.error };
  }

  // Check reserved
  const reserved = checkReserved(handle);
  if (reserved.reserved) {
    return {
      success: false,
      error: 'reserved',
      message: `This handle is reserved (${reserved.reason})`,
      suggestions: generateSuggestions(handle)
    };
  }

  // Check genesis cap
  const handleCount = await kv.hlen('vibe:handles');

  if (GENESIS_CAP > 0 && handleCount >= GENESIS_CAP) {
    return {
      success: false,
      error: 'genesis_full',
      message: `Genesis is full (${GENESIS_CAP}/${GENESIS_CAP}). Join the waitlist: slashvibe.dev/waitlist`,
      waitlist_url: 'https://slashvibe.dev/waitlist',
      claimed: handleCount,
      cap: GENESIS_CAP
    };
  }

  const isGenesis = handleCount < GENESIS_CAP;

  // Build handle record with tracking fields
  const now = new Date().toISOString();
  const record = {
    handle,
    registeredAt: now,
    registeredAtTs: Date.now(),
    // Activity tracking (for future inactivity policy)
    first_active_at: null,     // Set on first heartbeat
    last_active_at: null,      // Updated on every heartbeat
    messages_sent: 0,          // Incremented on DM
    // Genesis users (first 100) are exempt from future inactivity rules
    genesis: isGenesis,
    // Verification status
    verified: 'none',          // none | x | farcaster | github | team
    x_handle: data.x_handle || null,        // Optional linked X handle
    github_handle: data.github_handle || null,  // Optional linked GitHub
    // Agent/operator info
    isAgent: data.isAgent || false,
    operator: data.operator || null,
    agentType: data.agentType || null,         // autonomous | assistant | bot | null
    capabilities: data.capabilities || [],      // ['chat', 'create', 'remember', 'build']
    model: data.model || null,                  // claude-opus-4-5, gpt-5.2, etc.
    status: 'active',          // active | dormant | suspended
    ...data
  };

  // Atomic claim using HSETNX
  // Returns 1 if field was set (new), 0 if field already existed
  const claimed = await kv.hsetnx('vibe:handles', handle, JSON.stringify(record));

  if (!claimed) {
    return {
      success: false,
      error: 'handle_taken',
      message: 'This handle is already registered',
      suggestions: generateSuggestions(handle)
    };
  }

  // Get the new count (this user's spot number)
  const newCount = await kv.hlen('vibe:handles');
  const spotsRemaining = GENESIS_CAP > 0 ? Math.max(0, GENESIS_CAP - newCount) : null;

  return {
    success: true,
    record,
    genesis_number: newCount,
    genesis_cap: GENESIS_CAP,
    spots_remaining: spotsRemaining
  };
}

/**
 * Get handle record
 * @param {object} kv - Vercel KV instance
 * @param {string} handle - Handle to lookup
 * @returns {object|null} - Handle record or null
 */
export async function getHandleRecord(kv, handle) {
  const normalized = normalizeHandle(handle);
  const record = await kv.hget('vibe:handles', normalized);
  if (!record) return null;
  return typeof record === 'string' ? JSON.parse(record) : record;
}

/**
 * Check if handle is available
 * @param {object} kv - Vercel KV instance
 * @param {string} handle - Handle to check
 * @returns {{ available: boolean, reason?: string }}
 */
export async function isHandleAvailable(kv, handle) {
  const normalized = normalizeHandle(handle);

  // Check format
  const validation = validateHandle(normalized);
  if (!validation.valid) {
    return { available: false, reason: validation.error };
  }

  // Check reserved
  const reserved = checkReserved(normalized);
  if (reserved.reserved) {
    return { available: false, reason: `Reserved (${reserved.reason})` };
  }

  // Check registry
  const exists = await kv.hexists('vibe:handles', normalized);
  if (exists) {
    return { available: false, reason: 'Already registered' };
  }

  return { available: true };
}

// ============ ACTIVITY TRACKING ============

/**
 * Update handle activity on heartbeat
 * Sets first_active_at if not set, always updates last_active_at
 * @param {object} kv - Vercel KV instance
 * @param {string} handle - Handle to update
 * @returns {{ success: boolean }}
 */
export async function recordActivity(kv, handle) {
  const normalized = normalizeHandle(handle);
  const record = await getHandleRecord(kv, normalized);
  if (!record) return { success: false, error: 'not_found' };

  const now = new Date().toISOString();

  // Set first_active_at only once
  if (!record.first_active_at) {
    record.first_active_at = now;
  }
  record.last_active_at = now;

  // Update record
  await kv.hset('vibe:handles', normalized, JSON.stringify(record));
  return { success: true };
}

/**
 * Increment messages_sent counter
 * @param {object} kv - Vercel KV instance
 * @param {string} handle - Handle to update
 * @returns {{ success: boolean, count: number }}
 */
export async function incrementMessageCount(kv, handle) {
  const normalized = normalizeHandle(handle);
  const record = await getHandleRecord(kv, normalized);
  if (!record) return { success: false, error: 'not_found' };

  record.messages_sent = (record.messages_sent || 0) + 1;

  await kv.hset('vibe:handles', normalized, JSON.stringify(record));
  return { success: true, count: record.messages_sent };
}

/**
 * Get handle stats for admin/debugging
 * @param {object} kv - Vercel KV instance
 * @returns {{ total: number, genesis_cap: number, genesis_remaining: number, open: boolean }}
 */
export async function getHandleStats(kv) {
  const total = await kv.hlen('vibe:handles');
  const remaining = GENESIS_CAP > 0 ? Math.max(0, GENESIS_CAP - total) : null;

  return {
    total,
    genesis_cap: GENESIS_CAP,
    genesis_remaining: remaining,
    genesis_open: GENESIS_CAP === 0 || total < GENESIS_CAP,
    message: remaining !== null
      ? (remaining > 0 ? `${remaining} genesis spots left` : 'Genesis full')
      : 'Open registration'
  };
}
