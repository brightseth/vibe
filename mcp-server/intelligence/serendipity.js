/**
 * Serendipity Engine — Surface meaningful coincidences
 *
 * Detects when users are working on related things:
 * - Same file or module
 * - Similar branch names (both working on auth)
 * - Same/similar errors
 * - Related packages/dependencies
 *
 * Returns "serendipity moments" that can be surfaced to users
 */

/**
 * Find serendipity matches between current user and all others
 *
 * @param {Object} currentUser - The user to find matches for
 * @param {Array} allUsers - All active users
 * @returns {Array} Serendipity moments sorted by relevance
 */
function findSerendipity(currentUser, allUsers) {
  const matches = [];
  const myHandle = currentUser.handle;

  for (const other of allUsers) {
    if (other.handle === myHandle) continue;

    // 1. Same file or module
    if (currentUser.file && other.file) {
      const myModule = getModule(currentUser.file);
      const theirModule = getModule(other.file);

      if (currentUser.file === other.file) {
        // Exact same file - high signal!
        matches.push({
          type: 'same_file',
          with: other.handle,
          context: `both editing ${currentUser.file}`,
          relevance: 0.95,
          suggestion: `You're both in ${currentUser.file} right now!`,
          action: 'pair'
        });
      } else if (myModule && theirModule && myModule === theirModule) {
        // Same module/directory
        matches.push({
          type: 'same_module',
          with: other.handle,
          context: `both working in ${myModule}/`,
          relevance: 0.75,
          suggestion: `You're both in the ${myModule} module`,
          action: 'connect'
        });
      }
    }

    // 2. Similar branch names
    if (currentUser.branch && other.branch) {
      const myTopic = extractBranchTopic(currentUser.branch);
      const theirTopic = extractBranchTopic(other.branch);

      if (myTopic && theirTopic && myTopic === theirTopic) {
        matches.push({
          type: 'same_topic',
          with: other.handle,
          context: `both working on ${myTopic}`,
          relevance: 0.8,
          suggestion: `You're both working on ${myTopic}-related code`,
          action: 'connect'
        });
      }
    }

    // 3. Similar errors
    if (currentUser.error && other.error) {
      const similarity = errorSimilarity(currentUser.error, other.error);
      if (similarity > 0.6) {
        matches.push({
          type: 'same_struggle',
          with: other.handle,
          context: `both hitting similar errors`,
          relevance: 0.85,
          suggestion: `@${other.handle} is seeing a similar error`,
          action: 'help',
          detail: other.error.slice(0, 50)
        });
      }
    }

    // 4. Complementary work (one debugging, one shipping same area)
    if (currentUser.branch && other.branch) {
      const myBranchType = getBranchType(currentUser.branch);
      const theirBranchType = getBranchType(other.branch);
      const myTopic = extractBranchTopic(currentUser.branch);
      const theirTopic = extractBranchTopic(other.branch);

      // You're fixing something they're building (or vice versa)
      if (myTopic === theirTopic && myBranchType !== theirBranchType) {
        if (myBranchType === 'fix' && theirBranchType === 'feature') {
          matches.push({
            type: 'complementary',
            with: other.handle,
            context: `you're fixing ${myTopic}, they're building it`,
            relevance: 0.7,
            suggestion: `Heads up: @${other.handle} is building ${myTopic} features`,
            action: 'inform'
          });
        }
      }
    }

    // 5. Both just joined recently (newbie solidarity)
    if (isNewUser(currentUser) && isNewUser(other)) {
      matches.push({
        type: 'both_new',
        with: other.handle,
        context: 'both new to /vibe',
        relevance: 0.5,
        suggestion: `@${other.handle} is also new here`,
        action: 'welcome'
      });
    }
  }

  // Sort by relevance
  return matches.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Extract module/directory from file path
 */
function getModule(filePath) {
  if (!filePath) return null;

  // Handle common patterns
  const parts = filePath.split('/');

  // Look for meaningful directories
  const meaningfulDirs = ['src', 'lib', 'app', 'components', 'pages', 'api', 'services', 'utils', 'hooks', 'store', 'models', 'controllers'];

  for (let i = 0; i < parts.length - 1; i++) {
    if (meaningfulDirs.includes(parts[i])) {
      // Return next directory after meaningful one
      return parts[i + 1] || parts[i];
    }
  }

  // Default to parent directory
  return parts.length >= 2 ? parts[parts.length - 2] : null;
}

/**
 * Extract topic from branch name
 * e.g., "fix-auth-bug" -> "auth"
 * e.g., "feat/user-profile" -> "user-profile"
 */
function extractBranchTopic(branch) {
  if (!branch) return null;

  // Remove common prefixes
  const cleaned = branch
    .replace(/^(fix|feat|feature|bug|hotfix|chore|refactor|docs)[-_\/]?/i, '')
    .replace(/[-_\/]/g, '-')
    .toLowerCase();

  // Extract first meaningful segment
  const parts = cleaned.split('-').filter(p => p.length > 2);

  // Common topic keywords
  const topics = ['auth', 'user', 'api', 'db', 'database', 'ui', 'test', 'config', 'payment', 'email', 'notification', 'search', 'cache', 'session', 'login', 'signup'];

  // Look for topic keywords
  for (const part of parts) {
    if (topics.includes(part)) {
      return part;
    }
  }

  // Return first segment if no topic found
  return parts[0] || null;
}

/**
 * Get branch type (fix, feature, etc.)
 */
function getBranchType(branch) {
  if (!branch) return 'unknown';

  const lower = branch.toLowerCase();
  if (/^(fix|bug|hotfix)[-_\/]/.test(lower)) return 'fix';
  if (/^(feat|feature)[-_\/]/.test(lower)) return 'feature';
  if (/^(chore|refactor)[-_\/]/.test(lower)) return 'chore';
  if (['main', 'master', 'production', 'prod'].includes(lower)) return 'main';

  return 'feature'; // Default to feature
}

/**
 * Calculate similarity between two error messages
 */
function errorSimilarity(error1, error2) {
  if (!error1 || !error2) return 0;

  // Normalize errors
  const normalize = (err) => err
    .toLowerCase()
    .replace(/[0-9]+/g, 'N')        // Replace numbers
    .replace(/['"`]/g, '')           // Remove quotes
    .replace(/\s+/g, ' ')            // Normalize whitespace
    .slice(0, 100);                  // Truncate

  const e1 = normalize(error1);
  const e2 = normalize(error2);

  if (e1 === e2) return 1.0;

  // Check for common error types
  const errorTypes = [
    'TypeError', 'SyntaxError', 'ReferenceError', 'RangeError',
    'undefined is not', 'cannot read property', 'is not a function',
    'module not found', 'cannot find module', 'ENOENT', 'ECONNREFUSED'
  ];

  for (const type of errorTypes) {
    const typeLower = type.toLowerCase();
    if (e1.includes(typeLower) && e2.includes(typeLower)) {
      return 0.7;
    }
  }

  // Simple word overlap
  const words1 = new Set(e1.split(' ').filter(w => w.length > 3));
  const words2 = new Set(e2.split(' ').filter(w => w.length > 3));
  const overlap = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return union > 0 ? overlap / union : 0;
}

/**
 * Check if user is new (first seen within last 24 hours)
 */
function isNewUser(user) {
  if (!user.firstSeen) return false;

  const firstSeen = new Date(user.firstSeen).getTime();
  const hoursAgo = (Date.now() - firstSeen) / (1000 * 60 * 60);

  return hoursAgo < 24;
}

/**
 * Format serendipity moment for display
 */
function formatSerendipityMoment(moment) {
  const emoji = {
    'same_file': '✨',
    'same_module': '🔗',
    'same_topic': '🎯',
    'same_struggle': '🤝',
    'complementary': '💡',
    'both_new': '👋'
  };

  return {
    emoji: emoji[moment.type] || '💫',
    text: moment.suggestion,
    action: moment.action,
    handle: moment.with,
    relevance: moment.relevance
  };
}

/**
 * Get top serendipity moment for a user
 * Returns null if no strong matches
 */
function getTopSerendipity(currentUser, allUsers) {
  const matches = findSerendipity(currentUser, allUsers);

  // Only surface if relevance is high enough
  if (matches.length === 0 || matches[0].relevance < 0.6) {
    return null;
  }

  return formatSerendipityMoment(matches[0]);
}

/**
 * Get all serendipity moments above threshold
 */
function getAllSerendipity(currentUser, allUsers, minRelevance = 0.5) {
  const matches = findSerendipity(currentUser, allUsers);
  return matches
    .filter(m => m.relevance >= minRelevance)
    .map(formatSerendipityMoment);
}

module.exports = {
  findSerendipity,
  getTopSerendipity,
  getAllSerendipity,
  formatSerendipityMoment,
  // Utilities for testing
  getModule,
  extractBranchTopic,
  errorSimilarity
};
