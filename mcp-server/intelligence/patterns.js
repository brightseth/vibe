/**
 * Work Patterns — Ambient behavioral memory
 *
 * Quietly observes and remembers:
 * - Session timing (when you work, how long)
 * - State patterns (how often in each state)
 * - Module affinity (where you spend time)
 *
 * Stored locally in ~/.vibe/work-patterns.json
 * Never transmitted. Private by default.
 */

const fs = require('fs');
const path = require('path');

const PATTERNS_FILE = path.join(process.env.HOME, '.vibe', 'work-patterns.json');

// Ensure directory exists
function ensureDir() {
  const dir = path.dirname(PATTERNS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Load patterns from disk
function load() {
  try {
    if (fs.existsSync(PATTERNS_FILE)) {
      return JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[patterns] Load error:', e.message);
  }
  return createEmpty();
}

// Save patterns to disk
function save(patterns) {
  ensureDir();
  try {
    fs.writeFileSync(PATTERNS_FILE, JSON.stringify(patterns, null, 2));
  } catch (e) {
    console.error('[patterns] Save error:', e.message);
  }
}

// Create empty patterns structure
function createEmpty() {
  return {
    version: 2,
    firstSeen: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),

    // === WORK PATTERNS ===
    sessions: {
      total: 0,
      totalMinutes: 0,
      byHour: Array(24).fill(0),      // Activity by hour of day
      byDay: Array(7).fill(0),         // Activity by day of week (0=Sun)
      longestMinutes: 0,
      averageMinutes: 0
    },

    states: {
      // state -> { count, totalMinutes }
    },

    modules: {
      // module -> { visits, totalMinutes }
    },

    recentSessions: [],

    // === SOCIAL PATTERNS ===
    social: {
      // handle -> { messages, lastContact, topics: [] }
      connections: {},
      // Total interaction counts
      messagesSent: 0,
      messagesReceived: 0,
      reactionsGiven: 0,
      reactionsReceived: 0,
      // Who they interact with most
      topConnections: []
    },

    // === CREATIVE PATTERNS ===
    creative: {
      // What they've shipped
      ships: [],
      // Ideas they've posted
      ideas: [],
      // Ideas they've riffed on
      riffs: [],
      // Domains they explore
      domains: {},
      // Attribution given/received
      inspired: [],      // who inspired them
      inspiredOthers: [] // who they've inspired
    }
  };
}

// ============ EVENT LOGGING ============

/**
 * Log session start
 */
function logSessionStart(handle) {
  const patterns = load();
  const now = new Date();

  patterns.sessions.total++;
  patterns.sessions.byHour[now.getHours()]++;
  patterns.sessions.byDay[now.getDay()]++;

  // Track current session
  patterns._currentSession = {
    start: now.toISOString(),
    handle,
    states: [],
    modules: []
  };

  patterns.lastUpdated = now.toISOString();
  save(patterns);
}

/**
 * Log session end
 */
function logSessionEnd() {
  const patterns = load();
  if (!patterns._currentSession) return;

  const now = new Date();
  const start = new Date(patterns._currentSession.start);
  const durationMinutes = Math.round((now - start) / 60000);

  // Update totals
  patterns.sessions.totalMinutes += durationMinutes;
  patterns.sessions.averageMinutes = Math.round(
    patterns.sessions.totalMinutes / patterns.sessions.total
  );
  if (durationMinutes > patterns.sessions.longestMinutes) {
    patterns.sessions.longestMinutes = durationMinutes;
  }

  // Add to recent sessions
  patterns.recentSessions.unshift({
    date: patterns._currentSession.start,
    durationMinutes,
    states: patterns._currentSession.states,
    modules: patterns._currentSession.modules
  });

  // Keep only last 20 sessions
  if (patterns.recentSessions.length > 20) {
    patterns.recentSessions = patterns.recentSessions.slice(0, 20);
  }

  delete patterns._currentSession;
  patterns.lastUpdated = now.toISOString();
  save(patterns);
}

/**
 * Log state observation
 */
function logState(state, durationMinutes = 5) {
  if (!state) return;

  const patterns = load();

  // Initialize state if new
  if (!patterns.states[state]) {
    patterns.states[state] = { count: 0, totalMinutes: 0 };
  }

  patterns.states[state].count++;
  patterns.states[state].totalMinutes += durationMinutes;

  // Track in current session
  if (patterns._currentSession) {
    if (!patterns._currentSession.states.includes(state)) {
      patterns._currentSession.states.push(state);
    }
  }

  patterns.lastUpdated = new Date().toISOString();
  save(patterns);
}

/**
 * Log module/file observation
 */
function logModule(filePath) {
  if (!filePath) return;

  const patterns = load();

  // Extract module from path
  const module = extractModule(filePath);
  if (!module) return;

  // Initialize module if new
  if (!patterns.modules[module]) {
    patterns.modules[module] = { visits: 0, totalMinutes: 0 };
  }

  patterns.modules[module].visits++;
  patterns.modules[module].totalMinutes += 5; // Assume 5min per observation

  // Track in current session
  if (patterns._currentSession) {
    if (!patterns._currentSession.modules.includes(module)) {
      patterns._currentSession.modules.push(module);
    }
  }

  patterns.lastUpdated = new Date().toISOString();
  save(patterns);
}

// ============ SOCIAL LOGGING ============

/**
 * Log a message sent to someone
 */
function logMessageSent(toHandle, topic = null) {
  if (!toHandle) return;

  const patterns = load();
  const handle = toHandle.replace('@', '').toLowerCase();

  // Initialize connection if new
  if (!patterns.social.connections[handle]) {
    patterns.social.connections[handle] = {
      messages: 0,
      received: 0,
      lastContact: null,
      topics: []
    };
  }

  patterns.social.connections[handle].messages++;
  patterns.social.connections[handle].lastContact = new Date().toISOString();
  patterns.social.messagesSent++;

  // Track topic if provided
  if (topic && !patterns.social.connections[handle].topics.includes(topic)) {
    patterns.social.connections[handle].topics.push(topic);
    // Keep topics list reasonable
    if (patterns.social.connections[handle].topics.length > 10) {
      patterns.social.connections[handle].topics.shift();
    }
  }

  updateTopConnections(patterns);
  patterns.lastUpdated = new Date().toISOString();
  save(patterns);
}

/**
 * Log a message received from someone
 */
function logMessageReceived(fromHandle) {
  if (!fromHandle) return;

  const patterns = load();
  const handle = fromHandle.replace('@', '').toLowerCase();

  if (!patterns.social.connections[handle]) {
    patterns.social.connections[handle] = {
      messages: 0,
      received: 0,
      lastContact: null,
      topics: []
    };
  }

  patterns.social.connections[handle].received++;
  patterns.social.connections[handle].lastContact = new Date().toISOString();
  patterns.social.messagesReceived++;

  updateTopConnections(patterns);
  patterns.lastUpdated = new Date().toISOString();
  save(patterns);
}

/**
 * Log a reaction given
 */
function logReaction(toHandle, reaction) {
  if (!toHandle) return;

  const patterns = load();
  patterns.social.reactionsGiven++;
  patterns.lastUpdated = new Date().toISOString();
  save(patterns);
}

/**
 * Update top connections list (internal)
 */
function updateTopConnections(patterns) {
  const connections = Object.entries(patterns.social.connections);
  connections.sort((a, b) => {
    const aTotal = a[1].messages + a[1].received;
    const bTotal = b[1].messages + b[1].received;
    return bTotal - aTotal;
  });

  patterns.social.topConnections = connections
    .slice(0, 5)
    .map(([handle, data]) => ({
      handle,
      total: data.messages + data.received,
      lastContact: data.lastContact
    }));
}

// ============ CREATIVE LOGGING ============

/**
 * Log something shipped
 */
function logShip(what, url = null, tags = []) {
  const patterns = load();

  patterns.creative.ships.unshift({
    what,
    url,
    tags,
    timestamp: new Date().toISOString()
  });

  // Keep last 20 ships
  if (patterns.creative.ships.length > 20) {
    patterns.creative.ships = patterns.creative.ships.slice(0, 20);
  }

  // Track domains from tags
  tags.forEach(tag => {
    if (!patterns.creative.domains[tag]) {
      patterns.creative.domains[tag] = 0;
    }
    patterns.creative.domains[tag]++;
  });

  patterns.lastUpdated = new Date().toISOString();
  save(patterns);
}

/**
 * Log an idea posted
 */
function logIdea(content, tags = []) {
  const patterns = load();

  patterns.creative.ideas.unshift({
    content: content.substring(0, 100),
    tags,
    timestamp: new Date().toISOString()
  });

  // Keep last 20
  if (patterns.creative.ideas.length > 20) {
    patterns.creative.ideas = patterns.creative.ideas.slice(0, 20);
  }

  patterns.lastUpdated = new Date().toISOString();
  save(patterns);
}

/**
 * Log a riff on someone's idea
 */
function logRiff(originalAuthor, content) {
  const patterns = load();

  patterns.creative.riffs.unshift({
    on: originalAuthor.replace('@', '').toLowerCase(),
    content: content.substring(0, 100),
    timestamp: new Date().toISOString()
  });

  // Keep last 20
  if (patterns.creative.riffs.length > 20) {
    patterns.creative.riffs = patterns.creative.riffs.slice(0, 20);
  }

  patterns.lastUpdated = new Date().toISOString();
  save(patterns);
}

/**
 * Log attribution (inspired by someone)
 */
function logInspiredBy(handle) {
  if (!handle) return;

  const patterns = load();
  const clean = handle.replace('@', '').toLowerCase();

  // Track who inspires them
  const existing = patterns.creative.inspired.find(i => i.handle === clean);
  if (existing) {
    existing.count++;
    existing.lastTime = new Date().toISOString();
  } else {
    patterns.creative.inspired.push({
      handle: clean,
      count: 1,
      lastTime: new Date().toISOString()
    });
  }

  patterns.lastUpdated = new Date().toISOString();
  save(patterns);
}

// ============ PATTERN QUERIES ============

/**
 * Get peak hours (when user is most active)
 */
function getPeakHours() {
  const patterns = load();
  const hours = patterns.sessions.byHour;

  // Find top 3 hours
  const indexed = hours.map((count, hour) => ({ hour, count }));
  indexed.sort((a, b) => b.count - a.count);

  return indexed.slice(0, 3).filter(h => h.count > 0);
}

/**
 * Get dominant state (most common)
 */
function getDominantState() {
  const patterns = load();
  const states = Object.entries(patterns.states);

  if (states.length === 0) return null;

  states.sort((a, b) => b[1].totalMinutes - a[1].totalMinutes);
  return {
    state: states[0][0],
    minutes: states[0][1].totalMinutes,
    percentage: Math.round(
      (states[0][1].totalMinutes / patterns.sessions.totalMinutes) * 100
    )
  };
}

/**
 * Get top modules (where user spends most time)
 */
function getTopModules(limit = 3) {
  const patterns = load();
  const modules = Object.entries(patterns.modules);

  if (modules.length === 0) return [];

  modules.sort((a, b) => b[1].totalMinutes - a[1].totalMinutes);
  return modules.slice(0, limit).map(([name, data]) => ({
    name,
    minutes: data.totalMinutes,
    visits: data.visits
  }));
}

/**
 * Get session rhythm (typical session length, frequency)
 */
function getSessionRhythm() {
  const patterns = load();

  return {
    totalSessions: patterns.sessions.total,
    averageMinutes: patterns.sessions.averageMinutes,
    longestMinutes: patterns.sessions.longestMinutes,
    totalHours: Math.round(patterns.sessions.totalMinutes / 60)
  };
}

/**
 * Get full patterns summary (for debugging/display)
 */
function getSummary() {
  const patterns = load();

  return {
    since: patterns.firstSeen,
    sessions: getSessionRhythm(),
    peakHours: getPeakHours(),
    dominantState: getDominantState(),
    topModules: getTopModules(),
    recentSessions: patterns.recentSessions.slice(0, 5)
  };
}

/**
 * Check if we have enough data for insights
 */
function hasEnoughData() {
  const patterns = load();
  return patterns.sessions.total >= 3;
}

// ============ SOCIAL QUERIES ============

/**
 * Get top connections (people they interact with most)
 */
function getTopConnections(limit = 5) {
  const patterns = load();
  return patterns.social.topConnections.slice(0, limit);
}

/**
 * Get connection details for a specific handle
 */
function getConnection(handle) {
  const patterns = load();
  const clean = handle.replace('@', '').toLowerCase();
  return patterns.social.connections[clean] || null;
}

/**
 * Get social summary
 */
function getSocialSummary() {
  const patterns = load();
  return {
    messagesSent: patterns.social.messagesSent,
    messagesReceived: patterns.social.messagesReceived,
    reactionsGiven: patterns.social.reactionsGiven,
    uniqueConnections: Object.keys(patterns.social.connections).length,
    topConnections: patterns.social.topConnections
  };
}

// ============ CREATIVE QUERIES ============

/**
 * Get recent ships
 */
function getRecentShips(limit = 5) {
  const patterns = load();
  return patterns.creative.ships.slice(0, limit);
}

/**
 * Get top creative domains (what they build)
 */
function getTopDomains(limit = 5) {
  const patterns = load();
  const domains = Object.entries(patterns.creative.domains);
  domains.sort((a, b) => b[1] - a[1]);
  return domains.slice(0, limit).map(([domain, count]) => ({ domain, count }));
}

/**
 * Get creative inspirations (who inspires them)
 */
function getInspirations(limit = 5) {
  const patterns = load();
  const inspired = [...patterns.creative.inspired];
  inspired.sort((a, b) => b.count - a.count);
  return inspired.slice(0, limit);
}

/**
 * Get creative summary
 */
function getCreativeSummary() {
  const patterns = load();
  return {
    totalShips: patterns.creative.ships.length,
    totalIdeas: patterns.creative.ideas.length,
    totalRiffs: patterns.creative.riffs.length,
    topDomains: getTopDomains(3),
    inspirations: getInspirations(3),
    recentShips: patterns.creative.ships.slice(0, 3)
  };
}

// ============ HELPERS ============

function extractModule(filePath) {
  if (!filePath) return null;

  const parts = filePath.split('/');
  const meaningful = ['src', 'lib', 'app', 'components', 'pages', 'api',
                      'services', 'utils', 'hooks', 'store', 'models'];

  for (let i = 0; i < parts.length - 1; i++) {
    if (meaningful.includes(parts[i])) {
      return parts[i + 1] || parts[i];
    }
  }

  // Default to parent directory
  return parts.length >= 2 ? parts[parts.length - 2] : null;
}

module.exports = {
  // Work logging
  logSessionStart,
  logSessionEnd,
  logState,
  logModule,

  // Social logging
  logMessageSent,
  logMessageReceived,
  logReaction,

  // Creative logging
  logShip,
  logIdea,
  logRiff,
  logInspiredBy,

  // Work queries
  getPeakHours,
  getDominantState,
  getTopModules,
  getSessionRhythm,
  getSummary,
  hasEnoughData,

  // Social queries
  getTopConnections,
  getConnection,
  getSocialSummary,

  // Creative queries
  getRecentShips,
  getTopDomains,
  getInspirations,
  getCreativeSummary,

  // Direct access
  load,
  save
};
