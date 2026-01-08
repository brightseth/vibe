/**
 * Skills Exchange Store — Marketplace for skills trading
 *
 * Manages skill offers and requests:
 * - Users can offer skills they have (with expertise level)
 * - Users can request skills they need (with urgency/project context)
 * - Smart matching between skill offers and requests
 * - Track successful exchanges and feedback
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');
const userProfiles = require('./profiles');

const SKILLS_FILE = path.join(config.VIBE_DIR, 'skills.json');

// Core skills categories for structured matching
const SKILL_CATEGORIES = {
  'Engineering': ['frontend', 'backend', 'fullstack', 'mobile', 'devops', 'ai/ml', 'data', 'security'],
  'Design': ['ui/ux', 'visual', 'branding', 'illustration', 'animation', 'research'],
  'Business': ['marketing', 'sales', 'strategy', 'finance', 'operations', 'legal'],
  'Content': ['writing', 'copywriting', 'video', 'photography', 'podcast', 'social'],
  'Product': ['pm', 'growth', 'analytics', 'user-research', 'strategy'],
  'Other': ['consulting', 'mentoring', 'networking', 'feedback']
};

// Load skills data from disk
function loadSkillsData() {
  try {
    if (fs.existsSync(SKILLS_FILE)) {
      const data = fs.readFileSync(SKILLS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Failed to load skills data:', e.message);
  }
  return { offers: [], requests: [], exchanges: [] };
}

// Save skills data to disk
function saveSkillsData(data) {
  try {
    fs.writeFileSync(SKILLS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save skills data:', e.message);
  }
}

// Add a skill offer
async function addSkillOffer(handle, skill, details = {}) {
  const data = loadSkillsData();
  const offer = {
    id: Date.now().toString(),
    handle: handle.toLowerCase().replace('@', ''),
    skill: skill.toLowerCase(),
    category: getCategoryForSkill(skill),
    level: details.level || 'intermediate', // beginner, intermediate, expert
    availability: details.availability || 'flexible', // flexible, limited, busy
    format: details.format || ['chat', 'call'], // chat, call, pair, review
    description: details.description || null,
    examples: details.examples || [], // Links to work examples
    timestamp: Date.now(),
    status: 'active' // active, paused, fulfilled
  };
  
  // Remove duplicate offers for same skill
  data.offers = data.offers.filter(o => !(o.handle === offer.handle && o.skill === offer.skill));
  data.offers.unshift(offer);
  
  saveSkillsData(data);
  return offer;
}

// Add a skill request
async function addSkillRequest(handle, skill, details = {}) {
  const data = loadSkillsData();
  const request = {
    id: Date.now().toString(),
    handle: handle.toLowerCase().replace('@', ''),
    skill: skill.toLowerCase(),
    category: getCategoryForSkill(skill),
    urgency: details.urgency || 'medium', // low, medium, high
    context: details.context || null, // What project/goal
    format: details.format || ['chat', 'call'], // Preferred format
    description: details.description || null,
    timestamp: Date.now(),
    status: 'active' // active, paused, fulfilled
  };
  
  // Remove duplicate requests for same skill
  data.requests = data.requests.filter(r => !(r.handle === request.handle && r.skill === request.skill));
  data.requests.unshift(request);
  
  saveSkillsData(data);
  return request;
}

// Get all active skill offers
async function getSkillOffers(skillFilter = null) {
  const data = loadSkillsData();
  let offers = data.offers.filter(o => o.status === 'active');
  
  if (skillFilter) {
    const filter = skillFilter.toLowerCase();
    offers = offers.filter(o => 
      o.skill.includes(filter) || 
      o.category.toLowerCase().includes(filter) ||
      o.description?.toLowerCase().includes(filter)
    );
  }
  
  return offers;
}

// Get all active skill requests
async function getSkillRequests(skillFilter = null) {
  const data = loadSkillsData();
  let requests = data.requests.filter(r => r.status === 'active');
  
  if (skillFilter) {
    const filter = skillFilter.toLowerCase();
    requests = requests.filter(r => 
      r.skill.includes(filter) || 
      r.category.toLowerCase().includes(filter) ||
      r.description?.toLowerCase().includes(filter) ||
      r.context?.toLowerCase().includes(filter)
    );
  }
  
  return requests;
}

// Get user's skill offers
async function getUserOffers(handle) {
  const data = loadSkillsData();
  const key = handle.toLowerCase().replace('@', '');
  return data.offers.filter(o => o.handle === key && o.status === 'active');
}

// Get user's skill requests
async function getUserRequests(handle) {
  const data = loadSkillsData();
  const key = handle.toLowerCase().replace('@', '');
  return data.requests.filter(r => r.handle === key && r.status === 'active');
}

// Find matches between offers and requests
async function findSkillMatches(handle) {
  const data = loadSkillsData();
  const key = handle.toLowerCase().replace('@', '');
  
  // Get user's requests and find matching offers
  const myRequests = data.requests.filter(r => r.handle === key && r.status === 'active');
  const myOffers = data.offers.filter(o => o.handle === key && o.status === 'active');
  
  const matches = {
    forMyRequests: [], // People who can help me
    forMyOffers: []    // People I can help
  };
  
  // Find offers that match my requests
  for (const request of myRequests) {
    const matchingOffers = data.offers.filter(o => 
      o.handle !== key && 
      o.status === 'active' && 
      skillsMatch(request.skill, o.skill)
    );
    
    for (const offer of matchingOffers) {
      matches.forMyRequests.push({
        type: 'offer',
        myItem: request,
        theirItem: offer,
        score: calculateSkillMatchScore(request, offer)
      });
    }
  }
  
  // Find requests that match my offers
  for (const offer of myOffers) {
    const matchingRequests = data.requests.filter(r => 
      r.handle !== key && 
      r.status === 'active' && 
      skillsMatch(offer.skill, r.skill)
    );
    
    for (const request of matchingRequests) {
      matches.forMyOffers.push({
        type: 'request',
        myItem: offer,
        theirItem: request,
        score: calculateSkillMatchScore(request, offer)
      });
    }
  }
  
  // Sort by match score
  matches.forMyRequests.sort((a, b) => b.score - a.score);
  matches.forMyOffers.sort((a, b) => b.score - a.score);
  
  return matches;
}

// Check if two skills match
function skillsMatch(skill1, skill2) {
  const s1 = skill1.toLowerCase();
  const s2 = skill2.toLowerCase();
  
  // Exact match
  if (s1 === s2) return true;
  
  // Partial match (one contains the other)
  if (s1.includes(s2) || s2.includes(s1)) return true;
  
  // Synonym matching
  const synonyms = {
    'frontend': ['frontend', 'front-end', 'ui', 'react', 'vue', 'angular'],
    'backend': ['backend', 'back-end', 'server', 'api', 'node', 'python'],
    'design': ['design', 'ui/ux', 'ux', 'ui', 'visual'],
    'marketing': ['marketing', 'growth', 'seo', 'ads'],
    'ai': ['ai', 'ml', 'machine learning', 'ai/ml'],
    'mobile': ['mobile', 'ios', 'android', 'react native', 'flutter']
  };
  
  for (const [base, variants] of Object.entries(synonyms)) {
    if (variants.includes(s1) && variants.includes(s2)) {
      return true;
    }
  }
  
  return false;
}

// Calculate match score between request and offer
function calculateSkillMatchScore(request, offer) {
  let score = 50; // Base score
  
  // Skill similarity
  if (request.skill === offer.skill) {
    score += 30;
  } else if (skillsMatch(request.skill, offer.skill)) {
    score += 20;
  }
  
  // Format compatibility
  const formatOverlap = request.format.filter(f => offer.format.includes(f));
  score += formatOverlap.length * 10;
  
  // Urgency vs availability
  if (request.urgency === 'high' && offer.availability === 'flexible') {
    score += 15;
  } else if (request.urgency === 'low' && offer.availability === 'busy') {
    score -= 10;
  }
  
  // Level appropriateness (expert offers are good for all requests)
  if (offer.level === 'expert') {
    score += 10;
  }
  
  return score;
}

// Get skill category for a skill
function getCategoryForSkill(skill) {
  const skillLower = skill.toLowerCase();
  
  for (const [category, skills] of Object.entries(SKILL_CATEGORIES)) {
    for (const s of skills) {
      if (skillLower.includes(s) || s.includes(skillLower)) {
        return category;
      }
    }
  }
  
  return 'Other';
}

// Get skills by category
async function getSkillsByCategory() {
  const [offers, requests] = await Promise.all([getSkillOffers(), getSkillRequests()]);
  
  const categories = {};
  
  // Group offers by category
  for (const offer of offers) {
    if (!categories[offer.category]) {
      categories[offer.category] = { offers: [], requests: [] };
    }
    categories[offer.category].offers.push(offer);
  }
  
  // Group requests by category
  for (const request of requests) {
    if (!categories[request.category]) {
      categories[request.category] = { offers: [], requests: [] };
    }
    categories[request.category].requests.push(request);
  }
  
  return categories;
}

// Record successful skill exchange
async function recordExchange(fromHandle, toHandle, skill, details = {}) {
  const data = loadSkillsData();
  const exchange = {
    id: Date.now().toString(),
    from: fromHandle.toLowerCase().replace('@', ''),
    to: toHandle.toLowerCase().replace('@', ''),
    skill,
    timestamp: Date.now(),
    status: 'completed', // initiated, in-progress, completed, cancelled
    rating: details.rating || null, // 1-5 stars
    feedback: details.feedback || null
  };
  
  data.exchanges.push(exchange);
  saveSkillsData(data);
  
  return exchange;
}

// Get exchange statistics
async function getExchangeStats() {
  const data = loadSkillsData();
  const stats = {
    totalOffers: data.offers.length,
    totalRequests: data.requests.length,
    totalExchanges: data.exchanges.length,
    activeOffers: data.offers.filter(o => o.status === 'active').length,
    activeRequests: data.requests.filter(r => r.status === 'active').length,
    topSkills: {}
  };
  
  // Count most popular skills
  const skillCount = {};
  [...data.offers, ...data.requests].forEach(item => {
    skillCount[item.skill] = (skillCount[item.skill] || 0) + 1;
  });
  
  stats.topSkills = Object.entries(skillCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([skill, count]) => ({ skill, count }));
  
  return stats;
}

// Remove offer or request
async function removeSkillItem(handle, id, type) {
  const data = loadSkillsData();
  const key = handle.toLowerCase().replace('@', '');
  
  if (type === 'offer') {
    data.offers = data.offers.filter(o => !(o.handle === key && o.id === id));
  } else if (type === 'request') {
    data.requests = data.requests.filter(r => !(r.handle === key && r.id === id));
  }
  
  saveSkillsData(data);
}

module.exports = {
  SKILL_CATEGORIES,
  addSkillOffer,
  addSkillRequest,
  getSkillOffers,
  getSkillRequests,
  getUserOffers,
  getUserRequests,
  findSkillMatches,
  getSkillsByCategory,
  recordExchange,
  getExchangeStats,
  removeSkillItem
};