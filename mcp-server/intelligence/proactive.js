/**
 * Proactive Agent — Background social intelligence
 *
 * Generates unprompted social moments:
 * - "Ships in the night" — what happened while you were away
 * - Milestone detection — celebrate when someone ships
 * - Connection nudges — suggest connections based on overlap
 * - Break suggestions — nudge after long coding sessions
 * - Welcome wagon — greet newcomers
 */

const store = require('../store');
const config = require('../config');

// Thresholds — conservative, non-intrusive
const CONFIG = {
  BREAK_SUGGESTION_HOURS: 6,        // Only after 6h (gentle)
  AWAY_THRESHOLD_MINUTES: 60,       // Consider "away" after 1h
  RECENT_SHIP_MINUTES: 30,          // "Recent" ship within 30min
  WELCOME_WINDOW_HOURS: 4,          // Welcome only very new users
  MIN_SESSIONS_FOR_NUDGE: 5         // High bar for nudges
};

// Track state for proactive suggestions
let proactiveState = {
  lastBreakSuggestion: null,
  welcomedUsers: new Set(),
  celebratedShips: new Set(),
  lastSessionStart: null,
  wasAway: false,
  awayStartTime: null
};

/**
 * Generate proactive suggestions based on current state
 *
 * @param {Object} context - Current user context
 * @param {Array} activeUsers - All active users
 * @returns {Array} Array of proactive suggestions
 */
async function generateProactiveSuggestions(context = {}) {
  const suggestions = [];
  const myHandle = config.getHandle();
  if (!myHandle) return suggestions;

  try {
    const activeUsers = await store.getActiveUsers();
    const now = Date.now();

    // 1. Ships in the night (if returning from away)
    const shipsInTheNight = await getShipsInTheNight(myHandle, activeUsers);
    if (shipsInTheNight) {
      suggestions.push(shipsInTheNight);
    }

    // 2. Break suggestion (long session)
    const breakSuggestion = checkBreakSuggestion(context);
    if (breakSuggestion) {
      suggestions.push(breakSuggestion);
    }

    // 3. Welcome wagon (greet newcomers)
    const welcomes = getWelcomeWagon(myHandle, activeUsers);
    suggestions.push(...welcomes);

    // 4. Milestone celebration (someone shipped)
    const milestones = getMilestoneCelebrations(myHandle, activeUsers);
    suggestions.push(...milestones);

    // 5. Connection nudges (based on overlapping work)
    const nudges = getConnectionNudges(myHandle, activeUsers);
    suggestions.push(...nudges);

    return suggestions.filter(s => s !== null);
  } catch (e) {
    console.error('[proactive] Error generating suggestions:', e.message);
    return [];
  }
}

/**
 * "Ships in the Night" — What happened while you were away
 */
async function getShipsInTheNight(myHandle, activeUsers) {
  // Check if user was recently away
  const wasRecentlyAway = proactiveState.wasAway &&
    proactiveState.awayStartTime &&
    (Date.now() - proactiveState.awayStartTime) > CONFIG.AWAY_THRESHOLD_MINUTES * 60 * 1000;

  if (!wasRecentlyAway) return null;

  // Clear the away state
  proactiveState.wasAway = false;
  proactiveState.awayStartTime = null;

  // Get recent activity
  const recentEvents = [];

  for (const user of activeUsers) {
    if (user.handle === myHandle) continue;

    // Check for recent ships
    if (user.inferred_state === 'shipping' || user.builderMode === 'shipping') {
      recentEvents.push({
        type: 'shipped',
        handle: user.handle,
        context: user.note || user.file || 'something cool'
      });
    }

    // Check for new users who joined while away
    if (user.firstSeen) {
      const joinedAgo = (Date.now() - new Date(user.firstSeen).getTime()) / (1000 * 60);
      if (joinedAgo < CONFIG.AWAY_THRESHOLD_MINUTES * 2) {
        recentEvents.push({
          type: 'joined',
          handle: user.handle,
          context: user.one_liner || 'Building something'
        });
      }
    }
  }

  if (recentEvents.length === 0) return null;

  // Format the summary
  const shipped = recentEvents.filter(e => e.type === 'shipped');
  const joined = recentEvents.filter(e => e.type === 'joined');

  let text = '☕ **While you were away:**\n';
  if (shipped.length > 0) {
    text += shipped.map(s => `  • @${s.handle} shipped: ${s.context}`).join('\n') + '\n';
  }
  if (joined.length > 0) {
    text += joined.map(j => `  • @${j.handle} joined: ${j.context}`).join('\n');
  }

  return {
    type: 'ships_in_the_night',
    priority: 1,
    display: text,
    events: recentEvents
  };
}

/**
 * Break suggestion after long coding session
 */
function checkBreakSuggestion(context) {
  const sessionStart = context.sessionStart || proactiveState.lastSessionStart;
  if (!sessionStart) return null;

  const sessionHours = (Date.now() - sessionStart) / (1000 * 60 * 60);

  // Check if we've already suggested a break recently
  if (proactiveState.lastBreakSuggestion) {
    const hoursSinceLastSuggestion = (Date.now() - proactiveState.lastBreakSuggestion) / (1000 * 60 * 60);
    if (hoursSinceLastSuggestion < 2) return null; // Don't nag
  }

  if (sessionHours >= CONFIG.BREAK_SUGGESTION_HOURS) {
    proactiveState.lastBreakSuggestion = Date.now();

    return {
      type: 'break_suggestion',
      priority: 5,
      display: `_${Math.floor(sessionHours)}h session_`,
      sessionHours: Math.floor(sessionHours)
    };
  }

  return null;
}

/**
 * Welcome wagon — greet newcomers
 */
function getWelcomeWagon(myHandle, activeUsers) {
  const welcomes = [];

  for (const user of activeUsers) {
    if (user.handle === myHandle) continue;
    if (proactiveState.welcomedUsers.has(user.handle)) continue;

    // Check if user is new (within welcome window)
    if (user.firstSeen) {
      const hoursAgo = (Date.now() - new Date(user.firstSeen).getTime()) / (1000 * 60 * 60);
      if (hoursAgo < CONFIG.WELCOME_WINDOW_HOURS && hoursAgo > 0) {
        proactiveState.welcomedUsers.add(user.handle);

        welcomes.push({
          type: 'welcome',
          priority: 2,
          handle: user.handle,
          display: `_@${user.handle} is new_`,
          building: user.one_liner
        });
      }
    }
  }

  return welcomes.slice(0, 1); // Only one welcome at a time
}

/**
 * Milestone celebrations — someone shipped!
 */
function getMilestoneCelebrations(myHandle, activeUsers) {
  const milestones = [];

  for (const user of activeUsers) {
    if (user.handle === myHandle) continue;

    // Check for shipping indicators
    const isShipping = user.inferred_state === 'shipping' ||
                       user.mood === '🚀' ||
                       user.builderMode === 'shipping';

    if (isShipping) {
      const shipKey = `${user.handle}:${Date.now() / (1000 * 60 * 60) | 0}`; // Hourly key
      if (proactiveState.celebratedShips.has(shipKey)) continue;

      proactiveState.celebratedShips.add(shipKey);

      // Limit cached ships to prevent memory growth
      if (proactiveState.celebratedShips.size > 100) {
        const oldest = [...proactiveState.celebratedShips][0];
        proactiveState.celebratedShips.delete(oldest);
      }

      milestones.push({
        type: 'milestone',
        priority: 3,
        handle: user.handle,
        display: `_@${user.handle} shipping_`,
        context: user.note || user.file
      });
    }
  }

  return milestones.slice(0, 1); // One celebration at a time
}

/**
 * Connection nudges based on overlapping interests
 */
function getConnectionNudges(myHandle, activeUsers) {
  // This would ideally use stored interaction history
  // For now, just suggest based on similar work patterns
  const nudges = [];
  const myUser = activeUsers.find(u => u.handle === myHandle);
  if (!myUser) return nudges;

  for (const user of activeUsers) {
    if (user.handle === myHandle) continue;

    // Both in same inferred state
    if (myUser.inferred_state && user.inferred_state &&
        myUser.inferred_state === user.inferred_state &&
        ['debugging', 'deep-focus', 'shipping'].includes(myUser.inferred_state)) {

      nudges.push({
        type: 'connection_nudge',
        priority: 4,
        handle: user.handle,
        display: `\n💫 You and @${user.handle} are both in ${myUser.inferred_state.replace('-', ' ')} mode`,
        reason: 'same_state'
      });
    }
  }

  return nudges.slice(0, 1); // One nudge at a time
}

/**
 * Mark user as away (for ships in the night tracking)
 */
function markAway() {
  proactiveState.wasAway = true;
  proactiveState.awayStartTime = Date.now();
}

/**
 * Mark user as back
 */
function markBack() {
  // Don't clear immediately - let getShipsInTheNight process it first
}

/**
 * Set session start time
 */
function setSessionStart(timestamp = Date.now()) {
  proactiveState.lastSessionStart = timestamp;
}

/**
 * Get proactive summary for display
 * Returns formatted string of all relevant suggestions
 */
async function getProactiveSummary(context = {}) {
  const suggestions = await generateProactiveSuggestions(context);

  if (suggestions.length === 0) return '';

  // Sort by priority and format
  suggestions.sort((a, b) => a.priority - b.priority);

  // Only show top 2 suggestions to avoid overwhelm
  return suggestions
    .slice(0, 2)
    .map(s => s.display)
    .join('\n');
}

/**
 * Check for proactive opportunities on tool calls
 * Called from main index.js to inject proactive elements
 */
async function checkProactiveOpportunities(toolName, args = {}) {
  // Track away/back transitions
  if (toolName === 'vibe_away') {
    markAway();
  } else if (toolName === 'vibe_back') {
    // Don't mark back yet - let ships_in_the_night process
  } else if (toolName === 'vibe_init' || toolName === 'vibe_start') {
    setSessionStart();
  }

  // Only generate suggestions for certain tools
  const socialTools = ['vibe_who', 'vibe_inbox', 'vibe_start'];
  if (!socialTools.includes(toolName)) {
    return null;
  }

  return await getProactiveSummary(args);
}

module.exports = {
  generateProactiveSuggestions,
  getProactiveSummary,
  checkProactiveOpportunities,
  markAway,
  markBack,
  setSessionStart,
  // Export state for testing
  _getState: () => proactiveState,
  _resetState: () => {
    proactiveState = {
      lastBreakSuggestion: null,
      welcomedUsers: new Set(),
      celebratedShips: new Set(),
      lastSessionStart: null,
      wasAway: false,
      awayStartTime: null
    };
  }
};
