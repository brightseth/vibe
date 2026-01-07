/**
 * Reservations Store — Local-first file reservations
 *
 * Advisory locks to signal edit intent and reduce conflicts.
 * Stored locally in ~/.vibe/reservations/
 *
 * Key behaviors:
 * - Scope auto-detected from git remote, fallback to cwd
 * - Paths are relative to scope
 * - TTL is client-enforced (check expires_ts on read)
 * - Warn on conflict (overlapping exclusive paths), don't block
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const RESERVATIONS_DIR = path.join(process.env.HOME, '.vibe', 'reservations');
const ACTIVE_FILE = path.join(RESERVATIONS_DIR, 'active.jsonl');
const HISTORY_FILE = path.join(RESERVATIONS_DIR, 'history.jsonl');
const INDEX_FILE = path.join(RESERVATIONS_DIR, 'index.json');

// Ensure directories exist
function ensureDir() {
  if (!fs.existsSync(RESERVATIONS_DIR)) {
    fs.mkdirSync(RESERVATIONS_DIR, { recursive: true });
  }
}

// Generate reservation ID: rsv-{nanoid}
function generateId() {
  return 'rsv-' + crypto.randomBytes(4).toString('hex');
}

// Get git remote URL for scope
function getGitRemote() {
  try {
    const remote = execSync('git remote get-url origin 2>/dev/null', { encoding: 'utf8' }).trim();
    // Normalize: git@github.com:user/repo.git → github.com/user/repo
    if (remote.startsWith('git@')) {
      return remote.replace('git@', '').replace(':', '/').replace('.git', '');
    }
    // https://github.com/user/repo.git → github.com/user/repo
    if (remote.startsWith('https://')) {
      return remote.replace('https://', '').replace('.git', '');
    }
    return remote;
  } catch (e) {
    return null;
  }
}

// Get current working directory name as fallback scope
function getLocalScope() {
  try {
    const root = execSync('git rev-parse --show-toplevel 2>/dev/null', { encoding: 'utf8' }).trim();
    return `local:${path.basename(root)}`;
  } catch (e) {
    return `local:${path.basename(process.cwd())}`;
  }
}

// Get scope for reservations
function getScope() {
  const remote = getGitRemote();
  if (remote) {
    return `repo:${remote}`;
  }
  return getLocalScope();
}

// Read all active reservations
function readActive() {
  ensureDir();
  if (!fs.existsSync(ACTIVE_FILE)) {
    return [];
  }
  const content = fs.readFileSync(ACTIVE_FILE, 'utf8');
  const reservations = content
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    })
    .filter(r => r !== null);

  // Filter out expired
  const now = new Date().toISOString();
  return reservations.filter(r => r.expires_ts > now && r.status === 'active');
}

// Write active reservations (rewrite entire file)
function writeActive(reservations) {
  ensureDir();
  const content = reservations.map(r => JSON.stringify(r)).join('\n') + (reservations.length ? '\n' : '');
  fs.writeFileSync(ACTIVE_FILE, content);
}

// Append to history
function appendHistory(reservation) {
  ensureDir();
  fs.appendFileSync(HISTORY_FILE, JSON.stringify(reservation) + '\n');
}

// Update index (for quick lookups)
function updateIndex(reservations) {
  ensureDir();
  const index = {
    count: reservations.length,
    byPath: {},
    byId: {},
    updatedAt: new Date().toISOString()
  };

  for (const r of reservations) {
    index.byId[r.reservation_id] = r;
    for (const p of r.paths) {
      if (!index.byPath[p]) {
        index.byPath[p] = [];
      }
      index.byPath[p].push(r.reservation_id);
    }
  }

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

// Check for conflicts with existing reservations
function checkConflicts(paths, exclusive = true, scope = null) {
  const active = readActive();
  const targetScope = scope || getScope();
  const conflicts = [];

  for (const reservation of active) {
    // Only check same scope
    if (reservation.scope !== targetScope) continue;
    // Only check exclusive reservations
    if (!reservation.exclusive) continue;

    // Check path overlap
    for (const newPath of paths) {
      for (const existingPath of reservation.paths) {
        // Exact match
        if (newPath === existingPath) {
          conflicts.push({
            path: newPath,
            reservation_id: reservation.reservation_id,
            owner: reservation.owner,
            reason: reservation.reason,
            expires_ts: reservation.expires_ts
          });
        }
        // Check if new path is under existing (existing: src/, new: src/auth.ts)
        else if (newPath.startsWith(existingPath + '/')) {
          conflicts.push({
            path: newPath,
            conflictsWith: existingPath,
            reservation_id: reservation.reservation_id,
            owner: reservation.owner,
            reason: reservation.reason,
            expires_ts: reservation.expires_ts
          });
        }
        // Check if existing path is under new (existing: src/auth.ts, new: src/)
        else if (existingPath.startsWith(newPath + '/')) {
          conflicts.push({
            path: existingPath,
            conflictsWith: newPath,
            reservation_id: reservation.reservation_id,
            owner: reservation.owner,
            reason: reservation.reason,
            expires_ts: reservation.expires_ts
          });
        }
      }
    }
  }

  return conflicts;
}

// Create a new reservation
function create(owner, paths, options = {}) {
  const {
    ttl_seconds = 3600,
    exclusive = true,
    reason = null,
    thread_id = null
  } = options;

  const scope = getScope();
  const now = new Date();
  const expires = new Date(now.getTime() + ttl_seconds * 1000);

  // Check for conflicts
  const conflicts = checkConflicts(paths, exclusive, scope);

  const reservation = {
    reservation_id: generateId(),
    scope,
    paths,
    exclusive,
    reason,
    thread_id,
    owner,
    status: 'active',
    ttl_seconds,
    issued_ts: now.toISOString(),
    expires_ts: expires.toISOString()
  };

  // Add to active
  const active = readActive();
  active.push(reservation);
  writeActive(active);
  updateIndex(active);

  return {
    reservation,
    conflicts: conflicts.length > 0 ? conflicts : null,
    warning: conflicts.length > 0 ? `${conflicts.length} conflicting reservation(s) found` : null
  };
}

// Release a reservation
function release(reservation_id, owner = null) {
  const active = readActive();
  const index = active.findIndex(r => r.reservation_id === reservation_id);

  if (index === -1) {
    return { success: false, error: 'not_found', message: 'Reservation not found or already expired' };
  }

  const reservation = active[index];

  // Optional owner check
  if (owner && reservation.owner !== owner) {
    return { success: false, error: 'not_owner', message: 'You are not the owner of this reservation' };
  }

  // Mark as released and move to history
  reservation.status = 'released';
  reservation.released_ts = new Date().toISOString();
  appendHistory(reservation);

  // Remove from active
  active.splice(index, 1);
  writeActive(active);
  updateIndex(active);

  return { success: true, reservation };
}

// List reservations
function list(options = {}) {
  const { active_only = true, path_filter = null, scope_filter = null } = options;

  let reservations = readActive();

  // Filter by scope
  if (scope_filter) {
    reservations = reservations.filter(r => r.scope === scope_filter);
  } else {
    // Default: only show current scope
    const currentScope = getScope();
    reservations = reservations.filter(r => r.scope === currentScope);
  }

  // Filter by path
  if (path_filter) {
    reservations = reservations.filter(r =>
      r.paths.some(p => p.includes(path_filter) || path_filter.includes(p))
    );
  }

  return reservations;
}

// Get a single reservation by ID
function get(reservation_id) {
  const active = readActive();
  return active.find(r => r.reservation_id === reservation_id) || null;
}

// Cleanup expired reservations (called periodically)
function cleanup() {
  const active = readActive();
  const now = new Date().toISOString();
  const expired = active.filter(r => r.expires_ts <= now);
  const remaining = active.filter(r => r.expires_ts > now);

  // Move expired to history
  for (const r of expired) {
    r.status = 'expired';
    r.expired_ts = now;
    appendHistory(r);
  }

  if (expired.length > 0) {
    writeActive(remaining);
    updateIndex(remaining);
  }

  return { expired: expired.length, remaining: remaining.length };
}

module.exports = {
  create,
  release,
  list,
  get,
  getScope,
  checkConflicts,
  cleanup,
  generateId
};
