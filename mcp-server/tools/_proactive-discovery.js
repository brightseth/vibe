/**
 * Proactive Discovery Engine — Smart background matching for offline users
 * 
 * This runs when users aren't online to:
 * - Analyze recent ships and suggest collaborations
 * - Pre-compute high-quality matches for when users return
 * - Identify emerging interest clusters
 * - Schedule connection suggestions for optimal timing
 */

const userProfiles = require('../store/profiles');
const store = require('../store');
const { formatTimeAgo } = require('./_shared');

// Analyze shipping patterns to suggest collaborations
async function analyzeShippingPatterns() {
  const profiles = await userProfiles.getAllProfiles();
  const now = Date.now();
  const twoWeeksAgo = now - (14 * 24 * 60 * 60 * 1000);
  
  const patterns = {
    recentShippers: [],
    complementaryShips: [],
    similarProjects: [],
    emergingTrends: {}
  };
  
  // Find users who shipped recently
  for (const profile of profiles) {
    if (!profile.ships || profile.ships.length === 0) continue;
    
    const recentShips = profile.ships.filter(s => s.timestamp > twoWeeksAgo);
    if (recentShips.length > 0) {
      patterns.recentShippers.push({
        handle: profile.handle,
        ships: recentShips,
        building: profile.building,
        tags: profile.tags || [],
        interests: profile.interests || []
      });
    }
  }
  
  // Find complementary ships (e.g., one shipped frontend, another backend)
  const complementaryPairs = [
    { keywords: ['frontend', 'ui', 'react', 'vue'], complement: ['backend', 'api', 'server', 'database'] },
    { keywords: ['design', 'figma', 'ui'], complement: ['frontend', 'react', 'css'] },
    { keywords: ['ai', 'ml', 'model'], complement: ['data', 'python', 'backend'] },
    { keywords: ['mobile', 'app', 'ios', 'android'], complement: ['backend', 'api'] },
    { keywords: ['smart contract', 'solidity', 'web3'], complement: ['frontend', 'dapp'] }
  ];
  
  for (const pair of complementaryPairs) {
    const primaryShippers = patterns.recentShippers.filter(s => 
      s.ships.some(ship => 
        pair.keywords.some(keyword => 
          ship.what.toLowerCase().includes(keyword)
        )
      )
    );
    
    const complementShippers = patterns.recentShippers.filter(s => 
      s.ships.some(ship => 
        pair.complement.some(keyword => 
          ship.what.toLowerCase().includes(keyword)
        )
      )
    );
    
    if (primaryShippers.length > 0 && complementShippers.length > 0) {
      patterns.complementaryShips.push({
        type: `${pair.keywords[0]}/${pair.complement[0]}`,
        primary: primaryShippers,
        complement: complementShippers
      });
    }
  }
  
  // Find similar project patterns
  const projectKeywords = {};
  for (const shipper of patterns.recentShippers) {
    for (const ship of shipper.ships) {
      const words = ship.what.toLowerCase().split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['the', 'and', 'for', 'with', 'that', 'this'].includes(word));
      
      for (const word of words) {
        if (!projectKeywords[word]) projectKeywords[word] = [];
        projectKeywords[word].push({
          handle: shipper.handle,
          ship: ship.what,
          timestamp: ship.timestamp
        });
      }
    }
  }
  
  // Find keywords with multiple recent ships (emerging trends)
  for (const [keyword, ships] of Object.entries(projectKeywords)) {
    if (ships.length >= 2 && keyword !== 'app' && keyword !== 'website') {
      patterns.emergingTrends[keyword] = {
        count: ships.length,
        ships: ships.sort((a, b) => b.timestamp - a.timestamp)
      };
    }
  }
  
  return patterns;
}

// Pre-compute high-quality matches for inactive users
async function preComputeMatches() {
  const profiles = await userProfiles.getAllProfiles();
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  // Find users who haven't been active but have good profiles
  const dormantUsers = profiles.filter(p => 
    p.lastSeen && p.lastSeen < oneWeekAgo &&
    p.building && p.interests?.length > 0
  );
  
  const activeUsers = profiles.filter(p => 
    p.lastSeen && p.lastSeen > oneWeekAgo
  );
  
  const preComputedMatches = [];
  
  for (const dormantUser of dormantUsers) {
    const potentialMatches = [];
    
    for (const activeUser of activeUsers) {
      if (dormantUser.handle === activeUser.handle) continue;
      
      // Check if already connected
      const alreadyConnected = await userProfiles.hasBeenConnected(
        dormantUser.handle, 
        activeUser.handle
      );
      if (alreadyConnected) continue;
      
      // Calculate match score using existing algorithm
      const match = calculateSimpleMatchScore(dormantUser, activeUser);
      if (match.score > 15) { // Higher threshold for dormant users
        potentialMatches.push({
          handle: activeUser.handle,
          score: match.score,
          reasons: match.reasons,
          building: activeUser.building
        });
      }
    }
    
    if (potentialMatches.length > 0) {
      preComputedMatches.push({
        dormantUser: dormantUser.handle,
        lastSeen: dormantUser.lastSeen,
        matches: potentialMatches.sort((a, b) => b.score - a.score).slice(0, 3)
      });
    }
  }
  
  return preComputedMatches;
}

// Simplified match scoring for background processing
function calculateSimpleMatchScore(user1, user2) {
  let score = 0;
  const reasons = [];
  
  // Interest overlap
  if (user1.interests && user2.interests) {
    const shared = user1.interests.filter(i => user2.interests.includes(i));
    if (shared.length > 0) {
      score += shared.length * 15;
      reasons.push(`Shared interests: ${shared.slice(0, 2).join(', ')}`);
    }
  }
  
  // Tag overlap  
  if (user1.tags && user2.tags) {
    const sharedTags = user1.tags.filter(t => user2.tags.includes(t));
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
      score += overlap.length * 8;
      reasons.push(`Both working on ${overlap[0]}`);
    }
  }
  
  return { score, reasons: reasons.slice(0, 2) };
}

// Identify emerging interest clusters
async function identifyEmergingClusters() {
  const profiles = await userProfiles.getAllProfiles();
  const now = Date.now();
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  // Only consider recent users for emerging trends
  const recentProfiles = profiles.filter(p => p.firstSeen && p.firstSeen > oneMonthAgo);
  
  if (recentProfiles.length < 3) {
    return { message: 'Not enough recent users to identify emerging clusters' };
  }
  
  const clusters = {};
  
  // Group by interests
  for (const profile of recentProfiles) {
    if (!profile.interests || profile.interests.length === 0) continue;
    
    for (const interest of profile.interests) {
      if (!clusters[interest]) {
        clusters[interest] = [];
      }
      clusters[interest].push(profile.handle);
    }
  }
  
  // Find clusters with 2+ recent users (potential communities)
  const emergingClusters = Object.entries(clusters)
    .filter(([interest, handles]) => handles.length >= 2)
    .map(([interest, handles]) => ({
      interest,
      size: handles.length,
      members: handles,
      potential: handles.length >= 3 ? 'high' : 'medium'
    }))
    .sort((a, b) => b.size - a.size);
  
  return emergingClusters;
}

// Suggest optimal timing for connection recommendations
async function suggestOptimalTiming() {
  const profiles = await userProfiles.getAllProfiles();
  const now = Date.now();
  
  // Analyze when users are typically active
  const activityPatterns = {};
  
  for (const profile of profiles) {
    if (!profile.lastSeen) continue;
    
    const lastSeenDate = new Date(profile.lastSeen);
    const hour = lastSeenDate.getHours();
    const dayOfWeek = lastSeenDate.getDay();
    
    if (!activityPatterns[profile.handle]) {
      activityPatterns[profile.handle] = {
        preferredHours: [],
        preferredDays: [],
        timezone: null // Could be inferred from activity patterns
      };
    }
    
    activityPatterns[profile.handle].preferredHours.push(hour);
    activityPatterns[profile.handle].preferredDays.push(dayOfWeek);
  }
  
  // Find common active hours across users
  const hourCounts = {};
  for (const pattern of Object.values(activityPatterns)) {
    for (const hour of pattern.preferredHours) {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  }
  
  const peakHours = Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour, count]) => ({ hour: parseInt(hour), userCount: count }));
  
  return {
    peakActivityHours: peakHours,
    totalActiveUsers: Object.keys(activityPatterns).length,
    recommendedConnectionTimes: peakHours.map(p => 
      `${p.hour}:00 (${p.userCount} users typically active)`
    )
  };
}

module.exports = {
  analyzeShippingPatterns,
  preComputeMatches,
  identifyEmergingClusters,
  suggestOptimalTiming,
  calculateSimpleMatchScore
};"