/**
 * Connection Queue Management — Smart queuing for connection suggestions
 *
 * Prevents suggestion spam and optimizes timing:
 * - Tracks recent suggestions to avoid repeats
 * - Queues suggestions for optimal timing
 * - Rates limits to prevent overwhelming users
 * - Prioritizes high-quality matches
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

const QUEUE_FILE = path.join(config.VIBE_DIR, 'connection-queue.json');
const SUGGESTION_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const MAX_SUGGESTIONS_PER_DAY = 3;

// Load queue data from disk
function loadQueue() {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      const data = fs.readFileSync(QUEUE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to load connection queue:', e.message);
  }
  return {
    recent_suggestions: [],
    queued_suggestions: [],
    user_limits: {}
  };
}

// Save queue data to disk
function saveQueue(queueData) {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queueData, null, 2));
  } catch (e) {
    console.error('Failed to save connection queue:', e.message);
  }
}

// Check if suggestion was made recently
function isRecentSuggestion(from, to) {
  const queue = loadQueue();
  const now = Date.now();
  const cutoff = now - SUGGESTION_COOLDOWN;
  
  return queue.recent_suggestions.some(s => 
    s.from === from && 
    s.to === to && 
    s.timestamp > cutoff
  );
}

// Check if user has reached daily suggestion limit
function hasReachedDailyLimit(userHandle) {
  const queue = loadQueue();
  const now = Date.now();
  const dayStart = now - (24 * 60 * 60 * 1000);
  
  if (!queue.user_limits[userHandle]) {
    return false;
  }
  
  const todaysSuggestions = queue.user_limits[userHandle].filter(
    timestamp => timestamp > dayStart
  );
  
  return todaysSuggestions.length >= MAX_SUGGESTIONS_PER_DAY;
}

// Record a new suggestion
function recordSuggestion(from, to, reason, priority = 'medium') {
  const queue = loadQueue();
  const now = Date.now();
  
  // Add to recent suggestions
  queue.recent_suggestions.push({
    from,
    to,
    reason,
    timestamp: now,
    priority
  });
  
  // Track user limit
  if (!queue.user_limits[from]) {
    queue.user_limits[from] = [];
  }
  queue.user_limits[from].push(now);
  
  // Clean up old data
  const cutoff = now - SUGGESTION_COOLDOWN;
  queue.recent_suggestions = queue.recent_suggestions.filter(s => s.timestamp > cutoff);
  
  // Clean up user limits (keep last 7 days)
  const weekCutoff = now - (7 * 24 * 60 * 60 * 1000);
  for (const [user, timestamps] of Object.entries(queue.user_limits)) {
    queue.user_limits[user] = timestamps.filter(t => t > weekCutoff);
    if (queue.user_limits[user].length === 0) {
      delete queue.user_limits[user];
    }
  }
  
  saveQueue(queue);
}

// Queue a suggestion for later delivery
function queueSuggestion(from, to, reason, priority = 'medium', idealTiming = null) {
  const queue = loadQueue();
  const now = Date.now();
  
  queue.queued_suggestions.push({
    from,
    to,
    reason,
    priority,
    queued_at: now,
    ideal_timing: idealTiming,
    status: 'pending'
  });
  
  saveQueue(queue);
}

// Get next suggestions to process
function getNextSuggestions(limit = 5) {
  const queue = loadQueue();
  const now = Date.now();
  
  return queue.queued_suggestions
    .filter(s => s.status === 'pending')
    .filter(s => {
      // Check timing constraint if specified
      if (s.ideal_timing && now < s.ideal_timing) {
        return false;
      }
      
      // Check rate limits
      if (hasReachedDailyLimit(s.from)) {
        return false;
      }
      
      // Check recent suggestion cooldown
      if (isRecentSuggestion(s.from, s.to)) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Priority sorting: high -> medium -> low
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by queue time (older first)
      return a.queued_at - b.queued_at;
    })
    .slice(0, limit);
}

// Mark suggestion as processed
function markSuggestionProcessed(from, to, status = 'sent') {
  const queue = loadQueue();
  
  const suggestion = queue.queued_suggestions.find(s => 
    s.from === from && s.to === to && s.status === 'pending'
  );
  
  if (suggestion) {
    suggestion.status = status;
    suggestion.processed_at = Date.now();
    saveQueue(queue);
    
    // Also record in recent suggestions if sent
    if (status === 'sent') {
      recordSuggestion(from, to, suggestion.reason, suggestion.priority);
    }
  }
}

// Get user's suggestion history
function getUserSuggestionHistory(userHandle, days = 7) {
  const queue = loadQueue();
  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
  
  const recent = queue.recent_suggestions.filter(s => 
    s.from === userHandle && s.timestamp > cutoff
  );
  
  const queued = queue.queued_suggestions.filter(s => 
    s.from === userHandle
  );
  
  return { recent, queued };
}

// Get queue statistics
function getQueueStats() {
  const queue = loadQueue();
  const now = Date.now();
  
  const pending = queue.queued_suggestions.filter(s => s.status === 'pending').length;
  const processed = queue.queued_suggestions.filter(s => s.status !== 'pending').length;
  
  const today = now - (24 * 60 * 60 * 1000);
  const recentSuggestions = queue.recent_suggestions.filter(s => s.timestamp > today).length;
  
  const priorityCounts = {};
  for (const suggestion of queue.queued_suggestions) {
    if (suggestion.status === 'pending') {
      priorityCounts[suggestion.priority] = (priorityCounts[suggestion.priority] || 0) + 1;
    }
  }
  
  return {
    pending,
    processed,
    recentSuggestions,
    priorityCounts,
    totalUsers: Object.keys(queue.user_limits).length
  };
}

// Clean up old queue data
function cleanupQueue() {
  const queue = loadQueue();
  const now = Date.now();
  const cutoff = now - (7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Remove old processed suggestions
  queue.queued_suggestions = queue.queued_suggestions.filter(s => 
    s.status === 'pending' || (s.processed_at && s.processed_at > cutoff)
  );
  
  // Remove old recent suggestions (already handled in recordSuggestion)
  
  saveQueue(queue);
}

module.exports = {
  isRecentSuggestion,
  hasReachedDailyLimit,
  recordSuggestion,
  queueSuggestion,
  getNextSuggestions,
  markSuggestionProcessed,
  getUserSuggestionHistory,
  getQueueStats,
  cleanupQueue,
  SUGGESTION_COOLDOWN,
  MAX_SUGGESTIONS_PER_DAY
};