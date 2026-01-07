/**
 * Discovery Monitor — Proactive matching when people come online
 *
 * Features:
 * - Watches for new users joining
 * - Automatically suggests connections for new users
 * - Identifies high-value connections when users become active
 * - Sends smart welcome messages with connection suggestions
 */

const config = require('../config');
const store = require('../store');
const userProfiles = require('../store/profiles');
const { suggest_connection } = require('./_actions');
const { formatTimeAgo } = require('./_shared');

// Watch for new users and suggest welcome connections
async function monitorNewUsers() {
  const recentUsers = await getRecentUsers(24); // Last 24 hours
  const suggestions = [];
  
  for (const user of recentUsers) {
    if (user.isNew) {
      const welcomeConnections = await getWelcomeConnections(user.handle);
      
      for (const connection of welcomeConnections.slice(0, 2)) {
        // Suggest the connection
        await suggest_connection(user.handle, connection.handle, connection.reason);
        suggestions.push({
          from: user.handle,
          to: connection.handle,
          reason: connection.reason,
          type: 'welcome'
        });
      }
    }
  }
  
  return suggestions;
}

// Get users who joined recently
async function getRecentUsers(hoursBack = 24) {
  const profiles = await userProfiles.getAllProfiles();
  const cutoff = Date.now() - (hoursBack * 60 * 60 * 1000);
  
  const recent = profiles.filter(p => 
    p.firstSeen && p.firstSeen > cutoff
  );
  
  return recent.map(p => ({
    handle: p.handle,
    firstSeen: p.firstSeen,
    building: p.building,
    interests: p.interests || [],
    tags: p.tags || [],
    isNew: true
  }));
}

// Find best welcome connections for new users
async function getWelcomeConnections(newUserHandle) {
  const newUser = await userProfiles.getProfile(newUserHandle);
  const allProfiles = await userProfiles.getAllProfiles();
  
  // Filter to established users (not brand new)
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const establishedUsers = allProfiles.filter(p => 
    p.handle !== newUserHandle &&
    p.firstSeen && p.firstSeen < weekAgo &&
    (p.connections?.length || 0) >= 1 // Has made at least one connection
  );
  
  if (establishedUsers.length === 0) {
    return []; // No established users to suggest
  }
  
  const potentialConnections = [];
  
  for (const user of establishedUsers) {
    const score = calculateWelcomeScore(newUser, user);
    
    if (score.total > 15) {
      potentialConnections.push({
        handle: user.handle,
        score: score.total,
        reason: score.reason,
        building: user.building,
        lastSeen: user.lastSeen
      });
    }
  }
  
  // Sort by score and prioritize recently active users
  return potentialConnections
    .sort((a, b) => {
      // Boost recently active users
      const aActive = a.lastSeen > Date.now() - (24 * 60 * 60 * 1000) ? 10 : 0;
      const bActive = b.lastSeen > Date.now() - (24 * 60 * 60 * 1000) ? 10 : 0;
      
      return (b.score + bActive) - (a.score + aActive);
    })
    .slice(0, 3);
}

// Calculate welcome connection score (similar to discovery but weighted for new users)
function calculateWelcomeScore(newUser, establishedUser) {
  let score = 0;
  let reasons = [];
  
  // Base score for being an established, connected user
  score += 10;
  reasons.push('Active community member');
  
  // Interest overlap (high weight for new users)
  if (newUser.interests?.length > 0 && establishedUser.interests?.length > 0) {
    const shared = newUser.interests.filter(i => 
      establishedUser.interests.some(ei => ei.toLowerCase() === i.toLowerCase())
    );
    
    if (shared.length > 0) {
      score += shared.length * 20;
      reasons.unshift(`Both interested in ${shared.join(', ')}`);
    }
  }
  
  // Tag/skill overlap 
  if (newUser.tags?.length > 0 && establishedUser.tags?.length > 0) {
    const sharedTags = newUser.tags.filter(t => 
      establishedUser.tags.some(et => et.toLowerCase() === t.toLowerCase())
    );
    
    if (sharedTags.length > 0) {
      score += sharedTags.length * 15;
      reasons.unshift(`Both work with ${sharedTags.join(', ')}`);
    }
  }
  
  // Building similar things
  if (newUser.building && establishedUser.building) {
    const newBuilding = newUser.building.toLowerCase();
    const establishedBuilding = establishedUser.building.toLowerCase();
    
    const words1 = newBuilding.split(/\s+/).filter(w => w.length > 3);
    const words2 = establishedBuilding.split(/\s+/).filter(w => w.length > 3);
    const overlap = words1.filter(w => words2.includes(w));
    
    if (overlap.length > 0) {
      score += overlap.length * 12;
      reasons.unshift(`Both building ${overlap.join(', ')} projects`);
    }
  }
  
  // Complementary skills boost (mentor potential)
  if (newUser.tags && establishedUser.tags) {
    const complementary = findComplementarySkills(newUser.tags, establishedUser.tags);
    if (complementary.length > 0) {
      score += complementary.length * 8;
      reasons.push(`Could help with ${complementary.join(', ')}`);
    }
  }
  
  // Choose the best reason
  const primaryReason = reasons[0] || 'Welcoming community member';
  
  return {
    total: score,
    reason: primaryReason
  };
}

// Find complementary skills for mentorship
function findComplementarySkills(newUserTags, establishedTags) {
  const mentorPairs = [
    { beginner: 'frontend', mentor: 'fullstack' },
    { beginner: 'react', mentor: 'senior-engineer' },
    { beginner: 'ai', mentor: 'machine-learning' },
    { beginner: 'startup', mentor: 'founder' },
    { beginner: 'design', mentor: 'product-design' },
  ];
  
  const complementary = [];
  
  for (const pair of mentorPairs) {
    const hasBeginnerSkill = newUserTags.some(t => 
      t.toLowerCase().includes(pair.beginner.toLowerCase())
    );
    const hasMentorSkill = establishedTags.some(t => 
      t.toLowerCase().includes(pair.mentor.toLowerCase())
    );
    
    if (hasBeginnerSkill && hasMentorSkill) {
      complementary.push(pair.mentor);
    }
  }
  
  return complementary;
}

// Monitor for high-value connections (mutual interest spikes)
async function monitorHighValueConnections() {
  const profiles = await userProfiles.getAllProfiles();
  const activeUsers = await store.getActiveUsers();
  
  const highValueOpportunities = [];
  
  for (let i = 0; i < activeUsers.length; i++) {
    for (let j = i + 1; j < activeUsers.length; j++) {
      const user1 = activeUsers[i];
      const user2 = activeUsers[j];
      
      // Skip if already connected
      const alreadyConnected = await userProfiles.hasBeenConnected(user1.handle, user2.handle);
      if (alreadyConnected) continue;
      
      const profile1 = await userProfiles.getProfile(user1.handle);
      const profile2 = await userProfiles.getProfile(user2.handle);
      
      const matchScore = calculateTimeSensitiveScore(profile1, profile2, user1, user2);
      
      if (matchScore.score > 30) { // High threshold for proactive suggestions
        highValueOpportunities.push({
          user1: user1.handle,
          user2: user2.handle,
          score: matchScore.score,
          reason: matchScore.reason,
          urgency: 'both-online'
        });
      }
    }
  }
  
  return highValueOpportunities.sort((a, b) => b.score - a.score).slice(0, 3);
}

// Calculate time-sensitive match scores (bonus for being online together)
function calculateTimeSensitiveScore(profile1, profile2, activeUser1, activeUser2) {
  let score = 0;
  let reasons = [];
  
  // Base match calculation (similar to discovery)
  if (profile1.interests && profile2.interests) {
    const shared = profile1.interests.filter(i => profile2.interests.includes(i));
    score += shared.length * 15;
    if (shared.length > 0) reasons.push(`Both into ${shared.join(', ')}`);
  }
  
  if (profile1.tags && profile2.tags) {
    const sharedTags = profile1.tags.filter(t => profile2.tags.includes(t));
    score += sharedTags.length * 12;
    if (sharedTags.length > 0) reasons.push(`Both skilled in ${sharedTags.join(', ')}`);
  }
  
  // Time bonus - both online now
  score += 20;
  reasons.unshift('Both online right now');
  
  // Activity similarity bonus
  if (activeUser1.status && activeUser2.status) {
    if (activeUser1.status === activeUser2.status) {
      score += 10;
      reasons.push(`Both ${activeUser1.status}`);
    }
  }
  
  return {
    score,
    reason: reasons[0] || 'Great time to connect'
  };
}

// Get connection statistics for monitoring
async function getConnectionStats() {
  const profiles = await userProfiles.getAllProfiles();
  
  const stats = {
    totalUsers: profiles.length,
    usersWithConnections: 0,
    avgConnectionsPerUser: 0,
    connectionsMadeToday: 0,
    newUsersToday: 0,
    activeUsersToday: 0
  };
  
  const today = Date.now() - (24 * 60 * 60 * 1000);
  let totalConnections = 0;
  
  for (const profile of profiles) {
    if (profile.connections && profile.connections.length > 0) {
      stats.usersWithConnections++;
      totalConnections += profile.connections.length;
      
      // Count connections made today
      const todayConnections = profile.connections.filter(c => c.timestamp > today);
      stats.connectionsMadeToday += todayConnections.length;
    }
    
    if (profile.firstSeen > today) {
      stats.newUsersToday++;
    }
    
    if (profile.lastSeen > today) {
      stats.activeUsersToday++;
    }
  }
  
  stats.avgConnectionsPerUser = profiles.length > 0 ? (totalConnections / 2) / profiles.length : 0;
  stats.connectionsMadeToday = Math.floor(stats.connectionsMadeToday / 2); // Each connection counted twice
  
  return stats;
}

module.exports = {
  monitorNewUsers,
  monitorHighValueConnections,
  getWelcomeConnections,
  getConnectionStats,
  getRecentUsers
};