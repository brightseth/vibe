/**
 * Skills Exchange API - Enhanced version with smart matching
 * Returns active skill offers and requests from the community
 */

const fs = require('fs');
const path = require('path');

// Read skill exchanges from storage
function readSkillExchanges() {
  try {
    const filePath = path.join(process.cwd(), 'skill-exchanges.jsonl');
    
    if (!fs.existsSync(filePath)) {
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (error) {
    console.error('Error reading skill exchanges:', error);
    return [];
  }
}

// Read user profiles
function readProfiles() {
  try {
    const filePath = path.join(process.cwd(), 'profiles.json');
    
    if (!fs.existsSync(filePath)) {
      return {};
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading profiles:', error);
    return {};
  }
}

// Calculate match score between offer and request
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
  
  return Math.min(100, score);
}

// Find potential connections
function findConnections() {
  const skills = readSkillExchanges();
  const profiles = readProfiles();
  
  const offers = skills.filter(s => s.type === 'offer' && s.status === 'active');
  const requests = skills.filter(s => s.type === 'request' && s.status === 'active');
  
  const connections = [];
  
  offers.forEach(offer => {
    requests.forEach(request => {
      if (offer.handle !== request.handle) {
        const score = calculateMatchScore(offer, request, profiles);
        if (score >= 50) {
          connections.push({
            offerer: offer.handle,
            requester: request.handle,
            offerSkill: offer.skill,
            requestSkill: request.skill,
            matchScore: score,
            category: offer.category,
            offerDetails: offer.details,
            requestDetails: request.details,
            reason: `${offer.handle} offers ${offer.skill}, ${request.handle} needs ${request.skill}`
          });
        }
      }
    });
  });
  
  return connections.sort((a, b) => b.matchScore - a.matchScore);
}

// Format time ago
function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

// Main handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    const skills = readSkillExchanges();
    const profiles = readProfiles();
    
    // Filter active skills only
    const activeSkills = skills.filter(skill => 
      skill && skill.status === 'active'
    );
    
    // Add time formatting and enrich with profile data
    const enrichedSkills = activeSkills.map(skill => {
      const userProfile = profiles[skill.handle] || {};
      return {
        ...skill,
        timeAgo: formatTimeAgo(skill.timestamp),
        building: userProfile.building,
        tags: userProfile.tags || []
      };
    });
    
    // Sort by timestamp (newest first)
    enrichedSkills.sort((a, b) => b.timestamp - a.timestamp);
    
    // Calculate stats
    const stats = {
      total: activeSkills.length,
      offers: activeSkills.filter(s => s.type === 'offer').length,
      requests: activeSkills.filter(s => s.type === 'request').length,
      users: new Set(activeSkills.map(s => s.handle)).size,
      categories: {}
    };
    
    // Count by category
    activeSkills.forEach(skill => {
      stats.categories[skill.category] = (stats.categories[skill.category] || 0) + 1;
    });
    
    // Find potential connections for discovery
    const connections = findConnections();
    
    res.status(200).json({
      success: true,
      skills: enrichedSkills,
      stats,
      connections: connections.slice(0, 5), // Top 5 connections
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Skills API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      skills: [],
      stats: { total: 0, offers: 0, requests: 0, users: 0, categories: {} }
    });
  }
};