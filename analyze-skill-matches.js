#!/usr/bin/env node

/**
 * Analyze current skill exchange posts to find specific connection opportunities
 * for the discovery agent to act on
 */

const fs = require('fs');
const path = require('path');

// Load skill exchanges
function loadSkillExchanges() {
  try {
    const content = fs.readFileSync('skill-exchanges.jsonl', 'utf8');
    return content.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line))
      .filter(post => post.status === 'active');
  } catch (error) {
    return [];
  }
}

// Load user profiles
function loadProfiles() {
  try {
    return JSON.parse(fs.readFileSync('profiles.json', 'utf8'));
  } catch (error) {
    return {};
  }
}

// Smart skill matching algorithm
function findSmartMatches(posts) {
  const offers = posts.filter(p => p.type === 'offer');
  const requests = posts.filter(p => p.type === 'request');
  
  const matches = [];
  
  // Direct skill matching
  requests.forEach(request => {
    offers.forEach(offer => {
      if (offer.handle === request.handle) return;
      
      const requestSkill = request.skill.toLowerCase();
      const offerSkill = offer.skill.toLowerCase();
      
      let confidence = 0;
      let matchType = '';
      
      // Exact match
      if (requestSkill === offerSkill) {
        confidence = 90;
        matchType = 'exact';
      }
      // Contains match
      else if (requestSkill.includes(offerSkill) || offerSkill.includes(requestSkill)) {
        confidence = 75;
        matchType = 'contains';
      }
      // Semantic matches based on skill relationships
      else {
        const semanticMatch = getSemanticMatch(requestSkill, offerSkill);
        if (semanticMatch.confidence > 50) {
          confidence = semanticMatch.confidence;
          matchType = semanticMatch.type;
        }
      }
      
      // Boost confidence based on details quality
      if (request.details && offer.details) confidence += 10;
      
      // Boost for recent posts (more likely to be active)
      const daysSinceRequest = (Date.now() - request.timestamp) / (1000 * 60 * 60 * 24);
      const daysSinceOffer = (Date.now() - offer.timestamp) / (1000 * 60 * 60 * 24);
      
      if (daysSinceRequest < 3) confidence += 5;
      if (daysSinceOffer < 3) confidence += 5;
      
      if (confidence >= 60) {
        matches.push({
          requester: request.handle,
          provider: offer.handle,
          skill: request.skill,
          requestDetails: request.details || '',
          offerDetails: offer.details || '',
          confidence: Math.min(100, confidence),
          matchType,
          requestAge: Math.floor(daysSinceRequest),
          offerAge: Math.floor(daysSinceOffer)
        });
      }
    });
  });
  
  return matches.sort((a, b) => b.confidence - a.confidence);
}

// Semantic skill matching for related skills
function getSemanticMatch(skill1, skill2) {
  const skillRelations = {
    'react': ['frontend', 'javascript', 'web development', 'ui'],
    'frontend': ['react', 'vue', 'angular', 'ui', 'css'],
    'backend': ['python', 'node', 'api', 'database', 'server'],
    'python': ['backend', 'data', 'ml', 'ai', 'django'],
    'ui': ['ux', 'design', 'frontend', 'figma'],
    'ux': ['ui', 'design', 'user research', 'product'],
    'design': ['ui', 'ux', 'figma', 'branding', 'visual'],
    'mobile': ['react native', 'ios', 'android', 'app'],
    'ai': ['ml', 'machine learning', 'python', 'data'],
    'api': ['backend', 'integration', 'rest', 'graphql']
  };
  
  for (const [baseSkill, related] of Object.entries(skillRelations)) {
    if (skill1.includes(baseSkill) && related.some(r => skill2.includes(r))) {
      return { confidence: 65, type: 'semantic' };
    }
    if (skill2.includes(baseSkill) && related.some(r => skill1.includes(r))) {
      return { confidence: 65, type: 'semantic' };
    }
  }
  
  return { confidence: 0, type: 'none' };
}

// Generate connection suggestions
function generateConnectionSuggestions(matches, profiles) {
  const suggestions = [];
  
  matches.slice(0, 5).forEach(match => {
    const requesterProfile = profiles[match.requester] || {};
    const providerProfile = profiles[match.provider] || {};
    
    let reason = `@${match.provider} offers expertise in "${match.skill}" which matches @${match.requester}'s request`;
    
    // Add context from profiles if available
    if (requesterProfile.building && providerProfile.building) {
      reason += `. @${match.requester} is building "${requesterProfile.building}" and @${match.provider} is working on "${providerProfile.building}"`;
    } else if (requesterProfile.building) {
      reason += `. This could help @${match.requester} with their project: "${requesterProfile.building}"`;
    }
    
    // Add match quality context
    if (match.matchType === 'exact') {
      reason += ' (exact skill match)';
    } else if (match.matchType === 'semantic') {
      reason += ' (complementary skills)';
    }
    
    suggestions.push({
      from: match.requester,
      to: match.provider,
      reason,
      confidence: match.confidence,
      skill: match.skill,
      matchType: match.matchType
    });
  });
  
  return suggestions;
}

// Main analysis
async function main() {
  console.log('🔍 Analyzing Skills Exchange for Connection Opportunities...\n');
  
  const posts = loadSkillExchanges();
  const profiles = loadProfiles();
  
  console.log(`📊 Data loaded: ${posts.length} skill posts, ${Object.keys(profiles).length} profiles\n`);
  
  const matches = findSmartMatches(posts);
  console.log(`🎯 Found ${matches.length} potential skill matches\n`);
  
  if (matches.length > 0) {
    console.log('TOP SKILL MATCHES:');
    console.log('='.repeat(50));
    
    matches.slice(0, 8).forEach((match, i) => {
      console.log(`${i + 1}. ${match.skill} (${match.confidence}% confidence)`);
      console.log(`   @${match.requester} needs ← @${match.provider} offers`);
      console.log(`   Match: ${match.matchType}, Ages: ${match.requestAge}d / ${match.offerAge}d`);
      if (match.requestDetails) console.log(`   Request: "${match.requestDetails}"`);
      if (match.offerDetails) console.log(`   Offer: "${match.offerDetails}"`);
      console.log('');
    });
    
    // Generate actionable connection suggestions
    const suggestions = generateConnectionSuggestions(matches, profiles);
    
    console.log('🚀 RECOMMENDED CONNECTIONS TO SUGGEST:');
    console.log('='.repeat(50));
    
    suggestions.forEach((suggestion, i) => {
      console.log(`${i + 1}. Connect @${suggestion.from} → @${suggestion.to}`);
      console.log(`   Skill: ${suggestion.skill} (${suggestion.confidence}%)`);
      console.log(`   Reason: ${suggestion.reason}`);
      console.log('');
    });
    
    return suggestions;
  } else {
    console.log('❌ No high-confidence matches found');
    console.log('\n💡 MARKETPLACE NEEDS:');
    console.log('• More diverse skill offerings');
    console.log('• Better skill descriptions with details');
    console.log('• More active user participation');
    
    return [];
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, findSmartMatches, generateConnectionSuggestions };