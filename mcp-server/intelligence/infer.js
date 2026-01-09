/**
 * Smart Detection — Ambient Intelligence for /vibe
 *
 * Automatically infers user state from context signals:
 * - File activity (what they're editing)
 * - Branch names (fix-, feat-, debug-)
 * - Error patterns (debugging)
 * - Session length (deep focus)
 * - Message activity (social vs focused)
 *
 * Inferred states displayed in `vibe who` with (inferred) label
 */

// State definitions with detection rules
const STATES = {
  'deep-focus': {
    emoji: '🧠',
    label: 'deep focus',
    priority: 1,
    description: 'Long session, minimal messaging'
  },
  'shipping': {
    emoji: '🚀',
    label: 'shipping',
    priority: 2,
    description: 'Active commits, on main/master branch'
  },
  'debugging': {
    emoji: '🐛',
    label: 'debugging',
    priority: 3,
    description: 'Errors present or fix- branch'
  },
  'exploring': {
    emoji: '🔍',
    label: 'exploring',
    priority: 4,
    description: 'Many file switches, few edits'
  },
  'stuck': {
    emoji: '🤔',
    label: 'might be stuck',
    priority: 5,
    description: 'Same file for a while, no commits'
  },
  'pairing': {
    emoji: '👥',
    label: 'pairing',
    priority: 6,
    description: 'Active messaging with one person'
  },
  'late-night': {
    emoji: '🌙',
    label: 'late night',
    priority: 7,
    description: 'Coding after midnight local time'
  }
};

/**
 * Infer user state from context signals
 *
 * @param {Object} context - User's context from presence
 * @param {string} context.file - Current file being edited
 * @param {string} context.branch - Current git branch
 * @param {string} context.error - Recent error message
 * @param {string} context.note - User's note
 * @param {string} context.mood - Explicit mood (if set)
 * @param {number} context.sessionStart - Session start timestamp
 * @param {number} context.lastMessage - Last message timestamp
 * @param {number} context.messageCount - Messages in last hour
 * @param {number} context.fileChangeCount - File changes in last 30min
 * @param {string} context.lastCommit - Last commit timestamp
 * @returns {Object|null} Inferred state or null if no strong signal
 */
function inferState(context = {}) {
  // If user has explicit mood set, respect it (no inference)
  if (context.mood && !context.mood_inferred) {
    return null;
  }

  const signals = analyzeSignals(context);
  const candidates = [];

  // Rule: Deep Focus
  // Long session (2h+), minimal messaging in last hour
  if (signals.sessionHours >= 2 && signals.messageCount < 2) {
    candidates.push({
      state: 'deep-focus',
      confidence: Math.min(0.9, 0.5 + (signals.sessionHours - 2) * 0.1),
      reason: `${signals.sessionHours}h session, focused`
    });
  }

  // Rule: Debugging
  // Has error OR on a fix/debug/bug branch
  if (signals.hasError || signals.isDebugBranch) {
    const confidence = signals.hasError ? 0.85 : 0.7;
    const reason = signals.hasError
      ? 'working through an error'
      : `on ${context.branch}`;
    candidates.push({
      state: 'debugging',
      confidence,
      reason
    });
  }

  // Rule: Shipping
  // On main/master, recent commit activity
  if (signals.isMainBranch && signals.recentCommit) {
    candidates.push({
      state: 'shipping',
      confidence: 0.8,
      reason: 'deploying to main'
    });
  }

  // Rule: Stuck
  // Same file for 30+ min, no commits
  if (signals.sameFileDuration >= 30 && !signals.recentCommit) {
    candidates.push({
      state: 'stuck',
      confidence: Math.min(0.7, 0.4 + (signals.sameFileDuration - 30) * 0.01),
      reason: `${signals.sameFileDuration}min on same file`
    });
  }

  // Rule: Exploring
  // Many file changes, few edits (high switch rate)
  if (signals.fileChangeCount >= 5 && signals.sessionHours < 1) {
    candidates.push({
      state: 'exploring',
      confidence: 0.65,
      reason: 'browsing codebase'
    });
  }

  // Rule: Late Night
  // After midnight, before 5am
  if (signals.isLateNight) {
    candidates.push({
      state: 'late-night',
      confidence: 0.75,
      reason: 'burning midnight oil'
    });
  }

  // Return highest confidence state above threshold
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.confidence - a.confidence);
  const best = candidates[0];

  // Only return if confidence is high enough
  if (best.confidence < 0.6) return null;

  const stateInfo = STATES[best.state];
  return {
    state: best.state,
    emoji: stateInfo.emoji,
    label: stateInfo.label,
    confidence: best.confidence,
    reason: best.reason,
    inferred: true
  };
}

/**
 * Analyze raw context into normalized signals
 */
function analyzeSignals(context) {
  const now = Date.now();

  // Session duration in hours
  const sessionStart = context.sessionStart || context.firstSeen || now;
  const sessionHours = (now - sessionStart) / (1000 * 60 * 60);

  // Branch analysis
  const branch = (context.branch || '').toLowerCase();
  const isDebugBranch = /^(fix|debug|bug|hotfix)[-_\/]/.test(branch);
  const isMainBranch = ['main', 'master', 'production', 'prod'].includes(branch);

  // Error present
  const hasError = Boolean(context.error && context.error.length > 0);

  // Time since last commit (in minutes)
  const lastCommitTime = context.lastCommit ? new Date(context.lastCommit).getTime() : 0;
  const minutesSinceCommit = lastCommitTime ? (now - lastCommitTime) / (1000 * 60) : Infinity;
  const recentCommit = minutesSinceCommit < 30;

  // File stickiness (how long on same file)
  const sameFileDuration = context.sameFileSince
    ? (now - context.sameFileSince) / (1000 * 60)
    : 0;

  // Message activity
  const messageCount = context.messageCount || 0;

  // File change frequency
  const fileChangeCount = context.fileChangeCount || 0;

  // Time of day check (local time)
  const hour = new Date().getHours();
  const isLateNight = hour >= 0 && hour < 5;

  return {
    sessionHours: Math.round(sessionHours * 10) / 10,
    isDebugBranch,
    isMainBranch,
    hasError,
    recentCommit,
    sameFileDuration: Math.round(sameFileDuration),
    messageCount,
    fileChangeCount,
    isLateNight
  };
}

/**
 * Get display text for inferred state
 */
function formatInferredState(inference) {
  if (!inference) return null;
  return {
    display: `${inference.emoji} ${inference.label} _(inferred)_`,
    short: `${inference.emoji} ${inference.label}`,
    reason: inference.reason
  };
}

/**
 * Enhance user data with inferred state
 * Called when building presence list
 */
function enhanceUserWithInference(user) {
  // Build context from user data
  const context = {
    file: user.file,
    branch: user.branch,
    error: user.error,
    note: user.note,
    mood: user.mood,
    mood_inferred: user.mood_inferred,
    firstSeen: user.firstSeen,
    sessionStart: user.firstSeen,
    messageCount: user.messageCount || 0,
    fileChangeCount: user.fileChangeCount || 0,
    sameFileSince: user.sameFileSince,
    lastCommit: user.lastCommit
  };

  const inference = inferState(context);

  if (inference) {
    return {
      ...user,
      mood: inference.emoji,
      mood_inferred: true,
      mood_reason: inference.reason,
      inferred_state: inference.state
    };
  }

  return user;
}

/**
 * Batch enhance multiple users
 */
function enhanceUsersWithInference(users) {
  return users.map(enhanceUserWithInference);
}

module.exports = {
  STATES,
  inferState,
  analyzeSignals,
  formatInferredState,
  enhanceUserWithInference,
  enhanceUsersWithInference
};
