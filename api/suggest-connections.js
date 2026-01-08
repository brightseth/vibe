/**
 * Smart Connection Suggestions API
 * Analyzes skills marketplace and suggests connections between users
 */

const fs = require('fs');
const path = require('path');

// Read data files
function readSkillExchanges() {
  try {
    const filePath = path.join(process.cwd(), 'skill-exchanges.jsonl');
    if (!fs.existsSync(filePath)) return [];
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean).filter(skill => skill.status === 'active');
  } catch (error) {
    console.error('Error reading skill exchanges:', error);
    return [];
  }
}

function readProfiles() {
  try {
    const filePath = path.join(process.cwd(), 'profiles.json');
    if (!fs.existsSync(filePath)) return {};
    
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error('Error reading profiles:', error);
    return {};
  }
}

// Connection suggestion engine
function generateConnectionSuggestions(limit = 10) {
  const skills = readSkillExchanges();
  const profiles = readProfiles();
  
  const offers = skills.filter(s => s.type === 'offer');
  const requests = skills.filter(s => s.type === 'request');
  
  const suggestions = [];
  
  offers.forEach(offer => {
    requests.forEach(request => {
      if (offer.handle !== request.handle) {
        const score = calculateMatchScore(offer, request, profiles);
        if (score >= 40) {
          suggestions.push({
            id: `${offer.id}-${request.id}`,
            type: 'skill_match',
            confidence: score,
            offerer: {
              handle: offer.handle,
              skill: offer.skill,
              details: offer.details,
              category: offer.category,
              building: profiles[offer.handle]?.building || null
            },
            requester: {
              handle: request.handle,
              skill: request.skill,
              details: request.details,
              category: request.category,
              building: profiles[request.handle]?.building || null
            },
            reason: generateConnectionReason(offer, request, score),
            suggestedActions: [
              `Message @${request.handle}: "${offer.handle} can help with ${offer.skill}"`,
              `Message @${offer.handle}: "${request.handle} is looking for help with ${request.skill}"`,
              `Create group intro: "Hey @${offer.handle} and @${request.handle}, you both work on ${offer.category} - ${offer.handle} offers ${offer.skill}, ${request.handle} needs it!"`
            ],
            timestamp: Date.now()
          });
        }
      }
    });
  });
  
  // Add building-based suggestions (complementary projects)
  const userHandles = Object.keys(profiles);
  userHandles.forEach(handle1 => {
    userHandles.forEach(handle2 => {
      if (handle1 !== handle2) {
        const profile1 = profiles[handle1];
        const profile2 = profiles[handle2];
        
        if (profile1.building && profile2.building) {
          const complementaryScore = calculateComplementaryScore(profile1, profile2);
          if (complementaryScore >= 60) {
            suggestions.push({
              id: `${handle1}-${handle2}-building`,
              type: 'complementary_building',
              confidence: complementaryScore,
              user1: {
                handle: handle1,
                building: profile1.building,
                tags: profile1.tags || [],
                interests: profile1.interests || []
              },
              user2: {
                handle: handle2,
                building: profile2.building,
                tags: profile2.tags || [],
                interests: profile2.interests || []
              },
              reason: generateComplementaryReason(profile1, profile2, complementaryScore),
              suggestedActions: [
                `Message @${handle1}: "Check out what @${handle2} is building - could be complementary to your work"`,
                `Message @${handle2}: "You and @${handle1} are building complementary projects"`,
                `Create group intro: "@${handle1} and @${handle2} - you're both building in similar spaces, might want to sync up!"`
              ],
              timestamp: Date.now()
            });
          }
        }
      }
    });
  });
  
  // Remove duplicates and sort by confidence
  const uniqueSuggestions = suggestions
    .filter((suggestion, index, self) => 
      index === self.findIndex(s => s.id === suggestion.id)
    )
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);
  
  return uniqueSuggestions;
}

function calculateMatchScore(offer, request, profiles) {
  let score = 0;
  
  // Skill name matching
  const offerSkill = offer.skill.toLowerCase();
  const requestSkill = request.skill.toLowerCase();
  
  if (offerSkill === requestSkill) score += 40;
  else if (offerSkill.includes(requestSkill) || requestSkill.includes(offerSkill)) score += 30;
  else {
    // Semantic similarity (basic keyword matching)
    const offerWords = offerSkill.split(' ');
    const requestWords = requestSkill.split(' ');
    const commonWords = offerWords.filter(word => requestWords.includes(word));
    score += Math.min(20, commonWords.length * 5);
  }
  
  // Category match
  if (offer.category === request.category) score += 15;
  
  // Details quality (shows engagement)
  if (offer.details && offer.details.length > 50) score += 5;
  if (request.details && request.details.length > 50) score += 5;
  
  // Recent activity
  const daysSinceOffer = (Date.now() - offer.timestamp) / (1000 * 60 * 60 * 24);
  const daysSinceRequest = (Date.now() - request.timestamp) / (1000 * 60 * 60 * 24);
  if (daysSinceOffer < 7) score += 5;
  if (daysSinceRequest < 7) score += 5;
  
  // Profile compatibility
  const offerProfile = profiles[offer.handle] || {};
  const requestProfile = profiles[request.handle] || {};
  
  if (offerProfile.building && requestProfile.building) {
    const offerBuilding = offerProfile.building.toLowerCase();
    const requestBuilding = requestProfile.building.toLowerCase();
    
    // Complementary projects
    if (offerBuilding.includes('frontend') && requestBuilding.includes('backend')) score += 10;
    if (offerBuilding.includes('backend') && requestBuilding.includes('frontend')) score += 10;
    if (offerBuilding.includes('ai') && requestBuilding.includes('web')) score += 8;
    if (offerBuilding.includes('mobile') && requestBuilding.includes('api')) score += 8;
  }
  
  // Interest overlap
  const offerInterests = offerProfile.interests || [];
  const requestInterests = requestProfile.interests || [];
  const commonInterests = offerInterests.filter(i => requestInterests.includes(i));
  score += Math.min(10, commonInterests.length * 3);
  
  return Math.min(100, score);
}

function calculateComplementaryScore(profile1, profile2) {
  let score = 0;
  
  const building1 = profile1.building.toLowerCase();
  const building2 = profile2.building.toLowerCase();
  
  // Frontend/Backend complementarity
  if ((building1.includes('frontend') && building2.includes('backend')) ||
      (building1.includes('backend') && building2.includes('frontend'))) {
    score += 30;
  }
  
  // AI/Web complementarity
  if ((building1.includes('ai') && building2.includes('web')) ||
      (building1.includes('web') && building2.includes('ai'))) {
    score += 25;
  }
  
  // Mobile/API complementarity
  if ((building1.includes('mobile') && building2.includes('api')) ||
      (building1.includes('api') && building2.includes('mobile'))) {
    score += 25;
  }
  
  // Design/Development complementarity
  if ((building1.includes('design') && building2.includes('dev')) ||
      (building1.includes('dev') && building2.includes('design'))) {
    score += 20;
  }
  
  // Same domain but different approaches
  const commonDomains = ['fintech', 'crypto', 'ai', 'social', 'productivity', 'gaming'];
  commonDomains.forEach(domain => {
    if (building1.includes(domain) && building2.includes(domain)) {
      score += 15;
    }
  });
  
  // Shared interests
  const interests1 = profile1.interests || [];
  const interests2 = profile2.interests || [];
  const commonInterests = interests1.filter(i => interests2.includes(i));
  score += Math.min(15, commonInterests.length * 3);
  
  // Complementary tags
  const tags1 = profile1.tags || [];
  const tags2 = profile2.tags || [];
  const complementaryPairs = [
    ['frontend', 'backend'],
    ['react', 'python'],
    ['design', 'development'],
    ['mobile', 'web']
  ];
  
  complementaryPairs.forEach(([tag1, tag2]) => {
    if (tags1.includes(tag1) && tags2.includes(tag2) ||
        tags1.includes(tag2) && tags2.includes(tag1)) {
      score += 10;
    }
  });
  
  return Math.min(100, score);
}

function generateConnectionReason(offer, request, score) {
  const reasons = [];
  
  if (offer.skill.toLowerCase() === request.skill.toLowerCase()) {
    reasons.push(`Perfect skill match: ${offer.skill}`);
  } else {
    reasons.push(`Related skills: ${offer.skill} → ${request.skill}`);
  }
  
  if (offer.category === request.category) {
    reasons.push(`Same category: ${offer.category}`);
  }
  
  if (score >= 80) {
    reasons.push('High confidence match');
  } else if (score >= 60) {
    reasons.push('Good potential connection');
  }
  
  return reasons.join(' • ');
}

function generateComplementaryReason(profile1, profile2, score) {
  const reasons = [];
  
  const building1 = profile1.building.toLowerCase();
  const building2 = profile2.building.toLowerCase();
  
  if (building1.includes('frontend') && building2.includes('backend')) {
    reasons.push('Frontend + Backend = Full Stack Potential');
  } else if (building1.includes('ai') && building2.includes('web')) {
    reasons.push('AI + Web = Powerful Combination');
  } else if (building1.includes('mobile') && building2.includes('api')) {
    reasons.push('Mobile + API = Complete Solution');
  } else {
    reasons.push('Complementary skill sets');
  }
  
  const commonInterests = (profile1.interests || []).filter(i => 
    (profile2.interests || []).includes(i)
  );
  
  if (commonInterests.length > 0) {
    reasons.push(`Shared interests: ${commonInterests.slice(0, 2).join(', ')}`);
  }
  
  return reasons.join(' • ');
}

// Main handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  try {
    const limit = parseInt(req.query.limit || '10');
    const suggestions = generateConnectionSuggestions(limit);
    
    // Calculate summary stats
    const skillMatches = suggestions.filter(s => s.type === 'skill_match').length;
    const buildingMatches = suggestions.filter(s => s.type === 'complementary_building').length;
    const avgConfidence = suggestions.length > 0 
      ? Math.round(suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length)
      : 0;
    
    res.status(200).json({
      success: true,
      suggestions,
      summary: {
        total: suggestions.length,
        skillMatches,
        buildingMatches,
        avgConfidence,
        highConfidence: suggestions.filter(s => s.confidence >= 70).length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Connection suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      suggestions: []
    });
  }
};