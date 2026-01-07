/**
 * Discovery Momentum — Enhanced matching based on shipping velocity and recent activity
 *
 * This tool improves connection quality by analyzing:
 * - Recent shipping activity (who's building similar things)
 * - Building momentum (active vs. stalled projects)
 * - Collaborative potential (complementary recent ships)
 * - Timing patterns (when people are most active)
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const store = require('../store');
const { formatTimeAgo } = require('./_shared');

// Analyze shipping momentum and patterns
function analyzeShippingMomentum(profile) {
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
  
  const ships = profile.ships || [];
  const recentShips = ships.filter(s => s.timestamp > oneWeekAgo);
  const monthlyShips = ships.filter(s => s.timestamp > oneMonthAgo);
  
  // Calculate momentum score
  let momentum = 0;
  
  if (recentShips.length > 0) {
    momentum += recentShips.length * 20; // High weight for recent activity
  }
  
  if (monthlyShips.length > 2) {
    momentum += 15; // Consistent builder bonus
  }
  
  // Analyze ship content for collaboration signals
  const shipTexts = ships.map(s => s.what.toLowerCase()).join(' ');
  const collaborationKeywords = [
    'looking for', 'need help', 'seeking', 'collaboration', 'partner',
    'feedback wanted', 'beta testers', 'contributors'
  ];
  
  const hasCollaborationSignals = collaborationKeywords.some(keyword => 
    shipTexts.includes(keyword)
  );
  
  if (hasCollaborationSignals) {
    momentum += 25; // Actively seeking collaboration
  }
  
  // Project type analysis
  const projectTypes = [];
  const typeKeywords = {
    'frontend': ['react', 'vue', 'ui', 'interface', 'web', 'frontend'],
    'backend': ['api', 'server', 'database', 'backend', 'service'],
    'mobile': ['ios', 'android', 'mobile', 'app'],
    'ai': ['ai', 'ml', 'machine learning', 'gpt', 'llm'],
    'devtools': ['cli', 'tool', 'script', 'automation', 'workflow'],
    'design': ['design', 'figma', 'prototype', 'mockup', 'ui/ux']
  };
  
  for (const [type, keywords] of Object.entries(typeKeywords)) {
    if (keywords.some(keyword => shipTexts.includes(keyword))) {
      projectTypes.push(type);
    }
  }
  
  return {
    score: momentum,
    recentShips: recentShips.length,
    totalShips: ships.length,
    seekingCollaboration: hasCollaborationSignals,
    projectTypes,
    lastShip: ships[0]?.timestamp || null
  };
}

// Enhanced matching that considers shipping patterns
function calculateMomentumMatch(user1, user2) {
  const momentum1 = analyzeShippingMomentum(user1);
  const momentum2 = analyzeShippingMomentum(user2);
  
  let score = 0;
  const reasons = [];
  
  // Both users have recent shipping activity
  if (momentum1.recentShips > 0 && momentum2.recentShips > 0) {
    score += 30;
    reasons.push(`Both actively shipping (${momentum1.recentShips + momentum2.recentShips} recent ships)`);
  }
  
  // One seeks collaboration, other is active
  if ((momentum1.seekingCollaboration && momentum2.recentShips > 0) ||
      (momentum2.seekingCollaboration && momentum1.recentShips > 0)) {
    score += 40;
    reasons.push('One seeking collaboration, other actively building');
  }
  
  // Both seeking collaboration
  if (momentum1.seekingCollaboration && momentum2.seekingCollaboration) {
    score += 25;
    reasons.push('Both looking for collaboration partners');
  }
  
  // Complementary project types
  const complementaryPairs = [
    ['frontend', 'backend'],
    ['design', 'frontend'],
    ['ai', 'backend'],
    ['mobile', 'backend']
  ];
  
  for (const [type1, type2] of complementaryPairs) {
    if ((momentum1.projectTypes.includes(type1) && momentum2.projectTypes.includes(type2)) ||
        (momentum1.projectTypes.includes(type2) && momentum2.projectTypes.includes(type1))) {
      score += 35;
      reasons.push(`Complementary skills: ${type1} + ${type2}`);
      break;
    }
  }
  
  // Similar project types (potential knowledge sharing)
  const similarTypes = momentum1.projectTypes.filter(type => 
    momentum2.projectTypes.includes(type)
  );
  if (similarTypes.length > 0) {
    score += 20;
    reasons.push(`Similar focus: ${similarTypes.join(', ')}`);
  }
  
  // Both consistent builders
  if (momentum1.totalShips > 3 && momentum2.totalShips > 3) {
    score += 15;
    reasons.push('Both experienced builders');
  }
  
  // Activity timing alignment
  const now = Date.now();
  const bothRecentlyActive = 
    momentum1.lastShip && momentum1.lastShip > (now - 7 * 24 * 60 * 60 * 1000) &&
    momentum2.lastShip && momentum2.lastShip > (now - 7 * 24 * 60 * 60 * 1000);
  
  if (bothRecentlyActive) {
    score += 20;
    reasons.push('Both shipped recently - great timing to connect');
  }
  
  // Calculate confidence based on data quality
  const dataQuality1 = (user1.building ? 1 : 0) + (user1.interests?.length || 0) + (user1.tags?.length || 0);
  const dataQuality2 = (user2.building ? 1 : 0) + (user2.interests?.length || 0) + (user2.tags?.length || 0);
  const confidence = Math.min(1.0, (dataQuality1 + dataQuality2) / 8);
  
  return {
    score: Math.round(score * confidence),
    reasons: reasons.slice(0, 3),
    confidence,
    momentum1,
    momentum2
  };
}

// Find momentum-based matches for a user
async function findMomentumMatches(targetHandle, limit = 5) {
  const targetProfile = await userProfiles.getProfile(targetHandle);
  const allProfiles = await userProfiles.getAllProfiles();
  
  const candidates = allProfiles.filter(p => 
    p.handle !== targetHandle && 
    p.ships && p.ships.length > 0 // Must have shipping history
  );
  
  const matches = [];
  
  for (const candidate of candidates) {
    // Skip if already connected recently
    const alreadyConnected = await userProfiles.hasBeenConnected(targetHandle, candidate.handle);
    if (alreadyConnected) continue;
    
    const match = calculateMomentumMatch(targetProfile, candidate);
    
    if (match.score >= 25) { // Quality threshold
      matches.push({
        handle: candidate.handle,
        score: match.score,
        confidence: match.confidence,
        reasons: match.reasons,
        building: candidate.building,
        momentum: match.momentum2,
        lastShip: candidate.ships?.[0]
      });
    }
  }
  
  return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}

// Identify collaboration opportunities
async function findCollaborationOpportunities() {
  const profiles = await userProfiles.getAllProfiles();
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  const seekingCollaboration = [];
  const activeBuilders = [];
  
  for (const profile of profiles) {
    if (!profile.ships || profile.ships.length === 0) continue;
    
    const momentum = analyzeShippingMomentum(profile);
    
    if (momentum.seekingCollaboration) {
      seekingCollaboration.push({
        ...profile,
        momentum,
        lastShip: profile.ships[0]
      });
    } else if (momentum.recentShips > 0) {
      activeBuilders.push({
        ...profile,
        momentum,
        lastShip: profile.ships[0]
      });
    }
  }
  
  const opportunities = [];
  
  // Match seekers with active builders
  for (const seeker of seekingCollaboration) {
    for (const builder of activeBuilders) {
      const match = calculateMomentumMatch(seeker, builder);
      
      if (match.score >= 30) {
        opportunities.push({
          seeker: seeker.handle,
          builder: builder.handle,
          score: match.score,
          reasons: match.reasons,
          seekerProject: seeker.lastShip?.what,
          builderProject: builder.lastShip?.what
        });
      }
    }
  }
  
  return {
    totalSeekers: seekingCollaboration.length,
    totalActiveBuilders: activeBuilders.length,
    opportunities: opportunities.sort((a, b) => b.score - a.score).slice(0, 8)
  };
}

// Generate shipping-based recommendations
async function generateShippingRecommendations(targetHandle) {
  const matches = await findMomentumMatches(targetHandle);
  const opportunities = await findCollaborationOpportunities();
  const targetProfile = await userProfiles.getProfile(targetHandle);
  const targetMomentum = analyzeShippingMomentum(targetProfile);
  
  return {
    targetMomentum,
    momentumMatches: matches,
    collaborationOpportunities: opportunities.opportunities.filter(
      opp => opp.seeker === targetHandle || opp.builder === targetHandle
    ),
    recommendations: {
      connect: matches.slice(0, 3),
      collaborate: opportunities.opportunities.slice(0, 2),
      ship: targetMomentum.score < 20 ? 'Consider shipping something to increase visibility' : null
    }
  };
}

module.exports = {
  analyzeShippingMomentum,
  calculateMomentumMatch,
  findMomentumMatches,
  findCollaborationOpportunities,
  generateShippingRecommendations
};