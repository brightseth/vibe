#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const VIBE_DIR = path.join(__dirname, 'data/vibe');
const PROFILES_FILE = path.join(VIBE_DIR, 'profiles.json');
const SKILLS_FILE = path.join(VIBE_DIR, 'skill-exchanges.jsonl');

// Load data helpers
function loadProfiles() {
  try {
    return JSON.parse(fs.readFileSync(PROFILES_FILE, 'utf8'));
  } catch (error) {
    return {};
  }
}

function loadSkillExchanges() {
  try {
    const content = fs.readFileSync(SKILLS_FILE, 'utf8');
    return content.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line))
      .filter(post => post.status === 'active');
  } catch (error) {
    return [];
  }
}

// Find best connection opportunities
function findConnectionOpportunities() {
  const profiles = loadProfiles();
  const posts = loadSkillExchanges();
  
  const opportunities = [];
  
  // For each request, find matching offers
  const requests = posts.filter(p => p.type === 'request');
  const offers = posts.filter(p => p.type === 'offer');
  
  console.log(`Found ${requests.length} requests and ${offers.length} offers\n`);
  
  requests.forEach(request => {
    const matchingOffers = offers.filter(offer => {
      if (offer.handle === request.handle) return false;
      
      // Simple skill matching
      const requestSkill = request.skill.toLowerCase();
      const offerSkill = offer.skill.toLowerCase();
      
      return requestSkill.includes(offerSkill) || 
             offerSkill.includes(requestSkill) ||
             requestSkill === offerSkill;
    });
    
    matchingOffers.forEach(offer => {
      const requesterProfile = profiles[request.handle] || {};
      const offerProfile = profiles[offer.handle] || {};
      
      opportunities.push({
        type: 'skill_match',
        requester: request.handle,
        provider: offer.handle,
        skill: request.skill,
        requestDetails: request.details,
        offerDetails: offer.details,
        requesterBuilding: requesterProfile.building,
        providerBuilding: offerProfile.building,
        confidence: calculateMatchConfidence(request, offer)
      });
    });
  });
  
  return opportunities.sort((a, b) => b.confidence - a.confidence);
}

function calculateMatchConfidence(request, offer) {
  let confidence = 50; // Base confidence
  
  const requestSkill = request.skill.toLowerCase();
  const offerSkill = offer.skill.toLowerCase();
  
  // Exact match
  if (requestSkill === offerSkill) confidence += 30;
  // Partial match
  else if (requestSkill.includes(offerSkill) || offerSkill.includes(requestSkill)) confidence += 20;
  
  // Both have details (more serious)
  if (request.details && offer.details) confidence += 10;
  
  // Recent posts (more active)
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  if ((now - request.timestamp) < 3 * dayInMs) confidence += 5;
  if ((now - offer.timestamp) < 3 * dayInMs) confidence += 5;
  
  return Math.min(100, confidence);
}

async function main() {
  console.log('🔍 Analyzing Skills Exchange Opportunities...\n');
  
  const profiles = loadProfiles();
  const posts = loadSkillExchanges();
  const opportunities = findConnectionOpportunities();
  
  console.log('📊 CURRENT MARKETPLACE STATE');
  console.log('-'.repeat(40));
  console.log(`Profiles: ${Object.keys(profiles).length}`);
  console.log(`Total Skill Posts: ${posts.length}`);
  console.log(`Offers: ${posts.filter(p => p.type === 'offer').length}`);
  console.log(`Requests: ${posts.filter(p => p.type === 'request').length}\n`);
  
  if (opportunities.length > 0) {
    console.log('🎯 TOP CONNECTION OPPORTUNITIES');
    console.log('-'.repeat(40));
    opportunities.slice(0, 5).forEach((opp, i) => {
      console.log(`${i + 1}. ${opp.skill} (${opp.confidence}% match)`);
      console.log(`   @${opp.requester} needs ← @${opp.provider} offers`);
      console.log(`   Request: ${opp.requestDetails.substring(0, 60)}...`);
      console.log(`   Offer: ${opp.offerDetails.substring(0, 60)}...`);
      console.log('');
    });
  } else {
    console.log('❌ No skill matches found in current data\n');
  }
  
  return opportunities;
}

if (require.main === module) {
  main().catch(console.error);
}