/**
 * Skills Exchange API - Marketplace for workshop skill sharing
 *
 * POST /api/skills-exchange - Create a skill offer or request
 * GET /api/skills-exchange - Browse all skill posts (with filtering)
 * GET /api/skills-exchange/matches?user=X - Get personalized matches for user
 * GET /api/skills-exchange/dashboard - Get marketplace analytics
 *
 * Features:
 * - Skill offers (I can teach X)
 * - Skill requests (I want to learn Y)
 * - Smart matching based on skills + profiles
 * - Categories: technical, design, business, creative
 * - Discovery agent analytics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_EXCHANGE_FILE = path.join(__dirname, '..', 'skill-exchanges.jsonl');
const PROFILES_FILE = path.join(__dirname, '..', 'profiles.json');

// ============ FILE HELPERS ============

function loadSkillExchanges() {
  try {
    if (!fs.existsSync(SKILL_EXCHANGE_FILE)) return [];
    const content = fs.readFileSync(SKILL_EXCHANGE_FILE, 'utf8').trim();
    if (!content) return [];
    
    return content
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line))
      .filter(post => post.status === 'active')
      .sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Error loading skill exchanges:', error);
    return [];
  }
}

function loadProfiles() {
  try {
    if (!fs.existsSync(PROFILES_FILE)) return {};
    return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
  } catch (error) {
    console.error('Error loading profiles:', error);
    return {};
  }
}

function saveSkillExchange(post) {
  try {
    const line = JSON.stringify(post) + '\n';
    fs.appendFileSync(SKILL_EXCHANGE_FILE, line);
    return true;
  } catch (error) {
    console.error('Error saving skill exchange:', error);
    return false;
  }
}

function generateId() {
  return Date.now() + Math.random().toString(36).substring(2, 9);
}

// ============ MATCHING ENGINE ============

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

function findMatches(userHandle, type = 'all') {
  const posts = loadSkillExchanges();
  const profiles = loadProfiles();
  const userPosts = posts.filter(p => p.handle === userHandle);
  const otherPosts = posts.filter(p => p.handle !== userHandle);
  
  const matches = [];
  
  if (type === 'all' || type === 'offers') {
    // Find requests that match user's offers
    const userOffers = userPosts.filter(p => p.type === 'offer');
    const otherRequests = otherPosts.filter(p => p.type === 'request');
    
    userOffers.forEach(offer => {
      otherRequests.forEach(request => {
        const score = calculateMatchScore(offer, request, profiles);
        if (score >= 30) {
          matches.push({
            type: 'you_can_help',
            score,
            yourPost: offer,
            theirPost: request,
            reason: `Your ${offer.skill} expertise matches their learning goal`
          });
        }
      });
    });
  }
  
  if (type === 'all' || type === 'requests') {
    // Find offers that match user's requests  
    const userRequests = userPosts.filter(p => p.type === 'request');
    const otherOffers = otherPosts.filter(p => p.type === 'offer');
    
    userRequests.forEach(request => {
      otherOffers.forEach(offer => {
        const score = calculateMatchScore(offer, request, profiles);
        if (score >= 30) {
          matches.push({
            type: 'they_can_help',
            score,
            yourPost: request,
            theirPost: offer,
            reason: `Their ${offer.skill} expertise matches your learning goal`
          });
        }
      });
    });
  }
  
  return matches.sort((a, b) => b.score - a.score);
}

// ============ DASHBOARD ANALYTICS ============

function generateDashboard() {
  const posts = loadSkillExchanges();
  const profiles = loadProfiles();
  
  const offers = posts.filter(p => p.type === 'offer');
  const requests = posts.filter(p => p.type === 'request');
  
  // Category breakdown
  const categories = {};
  posts.forEach(post => {
    const category = post.category || 'other';
    if (!categories[category]) categories[category] = { offers: 0, requests: 0 };
    categories[category][post.type + 's']++;
  });
  
  // Skill popularity
  const skills = {};
  posts.forEach(post => {
    const skill = post.skill.toLowerCase();
    if (!skills[skill]) skills[skill] = { offers: 0, requests: 0 };
    skills[skill][post.type + 's']++;
  });
  
  const popularSkills = Object.entries(skills)
    .map(([skill, counts]) => ({
      skill,
      total: counts.offers + counts.requests,
      balance: counts.offers / Math.max(1, counts.requests),
      demand: counts.requests - counts.offers,
      ...counts
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
  
  const highDemand = Object.entries(skills)
    .filter(([, counts]) => counts.requests > counts.offers)
    .map(([skill, counts]) => ({
      skill,
      demand: counts.requests - counts.offers,
      requests: counts.requests,
      offers: counts.offers
    }))
    .sort((a, b) => b.demand - a.demand)
    .slice(0, 5);
  
  // Connection opportunities 
  const opportunities = [];
  requests.forEach(request => {
    offers.forEach(offer => {
      if (offer.handle !== request.handle) {
        const score = calculateMatchScore(offer, request, profiles);
        if (score >= 50) {
          opportunities.push({
            requester: request.handle,
            provider: offer.handle,
            skill: request.skill,
            confidence: score,
            requestDetails: request.details,
            offerDetails: offer.details
          });
        }
      }
    });
  });
  
  return {
    timestamp: new Date().toISOString(),
    summary: {
      users: new Set(posts.map(p => p.handle)).size,
      posts: posts.length,
      offers: offers.length,
      requests: requests.length,
      categories: Object.keys(categories).length,
      balance: offers.length / Math.max(1, requests.length)
    },
    categories,
    popularSkills,
    highDemand,
    opportunities: opportunities.sort((a, b) => b.confidence - a.confidence)
  };
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/skills-exchange/dashboard - Analytics for discovery agent
  if (req.method === 'GET' && req.url?.includes('/dashboard')) {
    const dashboard = generateDashboard();
    return res.status(200).json({
      success: true,
      ...dashboard
    });
  }

  // GET /api/skills-exchange/matches?user=X - Personalized matches
  if (req.method === 'GET' && req.query.user && req.url?.includes('/matches')) {
    const { user, type } = req.query;
    const handle = user.toLowerCase().replace('@', '');
    const matches = findMatches(handle, type);
    
    return res.status(200).json({
      success: true,
      user: handle,
      matches,
      total: matches.length
    });
  }

  // GET /api/skills-exchange - Browse all posts
  if (req.method === 'GET') {
    const { category, type, skill, limit = 50 } = req.query;
    let posts = loadSkillExchanges();
    
    // Apply filters
    if (category) {
      posts = posts.filter(p => p.category === category);
    }
    
    if (type) {
      posts = posts.filter(p => p.type === type);
    }
    
    if (skill) {
      const skillQuery = skill.toLowerCase();
      posts = posts.filter(p => p.skill.toLowerCase().includes(skillQuery));
    }
    
    posts = posts.slice(0, parseInt(limit));
    
    // Add time formatting
    posts = posts.map(post => ({
      ...post,
      timeAgo: formatTimeAgo(post.timestamp)
    }));
    
    return res.status(200).json({
      success: true,
      posts,
      total: posts.length,
      filters: { category, type, skill }
    });
  }

  // POST /api/skills-exchange - Create new post
  if (req.method === 'POST') {
    const { handle, type, skill, details, category } = req.body;
    
    // Validation
    if (!handle || !type || !skill) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: handle, type, skill'
      });
    }
    
    if (!['offer', 'request'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be "offer" or "request"'
      });
    }
    
    const validCategories = ['technical', 'design', 'business', 'creative'];
    const postCategory = category && validCategories.includes(category) ? category : 'technical';
    
    const post = {
      id: generateId(),
      handle: handle.toLowerCase().replace('@', ''),
      type,
      skill: skill.trim(),
      details: details ? details.trim().substring(0, 500) : '',
      category: postCategory,
      timestamp: Date.now(),
      status: 'active'
    };
    
    if (saveSkillExchange(post)) {
      return res.status(200).json({
        success: true,
        post: {
          ...post,
          timeAgo: formatTimeAgo(post.timestamp)
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to save skill exchange post'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function formatTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) return minutes <= 1 ? 'just now' : `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}