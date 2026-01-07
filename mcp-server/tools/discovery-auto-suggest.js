/**
 * Discovery Auto Suggest — Intelligent automatic connection suggestions
 *
 * This tool runs automatically when the discovery agent is active to:
 * - Find high-quality matches based on recent activity
 * - Send personalized connection suggestions
 * - Track suggestion success rates
 * - Optimize timing for better engagement
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const store = require('../store');
const { formatTimeAgo } = require('./_shared');
const smartIntro = require('./smart-intro');

// Calculate enhanced match score with behavioral signals
function calculateEnhancedMatchScore(user1, user2) {
  let score = 0;
  const reasons = [];
  
  // Core similarity scoring
  if (user1.interests && user2.interests) {
    const shared = user1.interests.filter(i => 
      user2.interests.some(j => i.toLowerCase() === j.toLowerCase())
    );
    if (shared.length > 0) {
      score += shared.length * 15;
      reasons.push(`Shared interests: ${shared.slice(0, 2).join(', ')}`);
    }
  }
  
  if (user1.tags && user2.tags) {
    const sharedTags = user1.tags.filter(t => 
      user2.tags.some(u => t.toLowerCase() === u.toLowerCase())
    );
    if (sharedTags.length > 0) {
      score += sharedTags.length * 12;
      reasons.push(`Similar skills: ${sharedTags.slice(0, 2).join(', ')}`);
    }
  }
  
  // Building similarity
  if (user1.building && user2.building) {
    const building1 = user1.building.toLowerCase();
    const building2 = user2.building.toLowerCase();
    const words1 = building1.split(/\s+/);
    const words2 = building2.split(/\s+/);
    const overlap = words1.filter(w => words2.includes(w) && w.length > 3);
    if (overlap.length > 0) {
      score += overlap.length * 10;
      reasons.push(`Both working on ${overlap[0]}`);
    }
  }
  
  // Complementary skills bonus
  const complementaryPairs = [
    [['frontend', 'react', 'ui'], ['backend', 'api', 'server']],
    [['design', 'figma', 'ui'], ['frontend', 'development']],
    [['ai', 'ml'], ['data', 'python', 'backend']],
    [['product', 'pm'], ['engineering', 'technical']],
    [['mobile', 'ios', 'android'], ['backend', 'api']]
  ];
  
  for (const [group1, group2] of complementaryPairs) {
    const hasGroup1 = user1.tags?.some(t => 
      group1.some(g => t.toLowerCase().includes(g))
    );
    const hasGroup2 = user2.tags?.some(t => 
      group2.some(g => t.toLowerCase().includes(g))
    );
    
    if ((hasGroup1 && hasGroup2) || (user1.tags?.some(t => group2.some(g => t.toLowerCase().includes(g))) && user2.tags?.some(t => group1.some(g => t.toLowerCase().includes(g))))) {
      score += 18; // Higher weight for complementary skills
      reasons.push('Complementary skills - great collaboration potential');
      break;
    }
  }
  
  // Recent activity boost
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  if (user1.lastSeen && user1.lastSeen > oneWeekAgo && 
      user2.lastSeen && user2.lastSeen > oneWeekAgo) {
    score += 8;
    reasons.push('Both recently active');
  }
  
  // Shipping activity boost
  if (user1.ships?.length > 0 && user2.ships?.length > 0) {
    const recentShips = user1.ships.filter(s => s.timestamp > oneWeekAgo).length +
                       user2.ships.filter(s => s.timestamp > oneWeekAgo).length;
    if (recentShips > 0) {
      score += recentShips * 5;
      reasons.push('Active builders');
    }
  }
  
  return { score, reasons: reasons.slice(0, 3) };
}

// Find the best potential matches for a user
async function findBestMatches(targetHandle, limit = 3) {
  const targetProfile = await userProfiles.getProfile(targetHandle);
  const allProfiles = await userProfiles.getAllProfiles();
  
  const candidates = allProfiles.filter(p => 
    p.handle !== targetHandle && 
    p.building && 
    (p.interests?.length > 0 || p.tags?.length > 0)
  );
  
  const matches = [];
  
  for (const candidate of candidates) {
    // Skip if already connected
    const alreadyConnected = await userProfiles.hasBeenConnected(targetHandle, candidate.handle);
    if (alreadyConnected) continue;
    
    const match = calculateEnhancedMatchScore(targetProfile, candidate);
    if (match.score >= 20) { // Higher threshold for auto-suggestions
      matches.push({
        handle: candidate.handle,
        score: match.score,
        reasons: match.reasons,
        building: candidate.building,
        interests: candidate.interests || [],
        tags: candidate.tags || [],
        lastSeen: candidate.lastSeen
      });
    }
  }
  
  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Generate and queue connection suggestions
async function generateSuggestions() {
  const profiles = await userProfiles.getAllProfiles();
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  // Focus on recently active users with complete profiles
  const activeUsers = profiles.filter(p => 
    p.lastSeen && p.lastSeen > oneWeekAgo &&
    p.building && p.interests?.length > 0
  );
  
  if (activeUsers.length < 2) {
    return {
      success: false,
      reason: 'Not enough active users with complete profiles',
      activeUsers: activeUsers.length
    };
  }
  
  const suggestions = [];
  
  for (const user of activeUsers) {
    const matches = await findBestMatches(user.handle, 2);
    
    for (const match of matches) {
      // Generate personalized introduction
      const intro = await smartIntro.generateIntroduction(user.handle, match.handle, 'casual');
      
      suggestions.push({
        from: user.handle,
        to: match.handle,
        score: match.score,
        reasons: match.reasons,
        introduction: intro,
        timestamp: now
      });
    }
  }
  
  return {
    success: true,
    suggestions: suggestions.sort((a, b) => b.score - a.score).slice(0, 8),
    totalGenerated: suggestions.length
  };
}

// Intelligent timing for connection suggestions
function getOptimalSuggestionTime() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  
  // Best times based on typical developer/builder activity:
  // Weekdays: 9-11am, 2-4pm, 7-9pm
  // Weekends: 10am-12pm, 2-5pm
  
  const isWeekend = currentDay === 0 || currentDay === 6;
  const goodTimes = isWeekend 
    ? [10, 11, 14, 15, 16, 17] 
    : [9, 10, 14, 15, 19, 20];
  
  const isOptimalTime = goodTimes.includes(currentHour);
  
  return {
    isOptimal: isOptimalTime,
    currentHour,
    recommendation: isOptimalTime 
      ? 'Good time for connection suggestions'
      : `Better to suggest connections at ${goodTimes.join(', ')} o'clock`
  };
}

// Track suggestion success (when users actually connect)
async function trackSuggestionSuccess(fromHandle, toHandle, successful) {
  // This would integrate with actual connection tracking
  // For now, we'll update connection records
  
  if (successful) {
    await userProfiles.recordConnection(
      fromHandle, 
      toHandle, 
      'Auto-suggested connection - successful match'
    );
  }
  
  return { tracked: true, successful };
}

// Main auto-suggestion workflow
async function runAutoSuggestions() {
  const startTime = Date.now();
  
  // Check if it's a good time for suggestions
  const timing = getOptimalSuggestionTime();
  
  // Generate suggestions
  const result = await generateSuggestions();
  
  if (!result.success) {
    return {
      success: false,
      message: result.reason,
      timing: timing.recommendation,
      duration: Date.now() - startTime
    };
  }
  
  const summary = {
    success: true,
    suggestionsGenerated: result.suggestions.length,
    highQualityMatches: result.suggestions.filter(s => s.score >= 35).length,
    topSuggestion: result.suggestions[0] || null,
    timing: timing.isOptimal ? 'optimal' : 'suboptimal',
    duration: Date.now() - startTime
  };
  
  // If it's optimal timing, we could actually send the suggestions
  if (timing.isOptimal && result.suggestions.length > 0) {
    summary.recommendedAction = 'Send top 3 suggestions to users';
    summary.topSuggestions = result.suggestions.slice(0, 3).map(s => ({
      connection: `@${s.from} → @${s.to}`,
      score: s.score,
      primaryReason: s.reasons[0] || 'Good match'
    }));
  }
  
  return summary;
}

module.exports = {
  calculateEnhancedMatchScore,
  findBestMatches,
  generateSuggestions,
  getOptimalSuggestionTime,
  trackSuggestionSuccess,
  runAutoSuggestions
};