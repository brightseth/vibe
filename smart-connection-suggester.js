#!/usr/bin/env node

/**
 * Smart Connection Suggester - AI-powered matching for Skills Exchange
 * 
 * Analyzes the marketplace to find and suggest high-value connections
 * between users with complementary skills and needs.
 */

const fs = require('fs');
const path = require('path');

const VIBE_DIR = path.join(process.env.HOME, '.vibecodings');
const SKILL_EXCHANGE_FILE = path.join(VIBE_DIR, 'skill-exchanges.jsonl');
const SUGGESTIONS_FILE = path.join(VIBE_DIR, 'connection-suggestions.jsonl');

// Skill complementarity mapping
const skillSynergies = {
  'React development': ['backend API development', 'UI/UX design', 'TypeScript mentoring'],
  'backend API development': ['React development', 'frontend development', 'DevOps', 'database design'],
  'UI/UX design': ['React development', 'frontend development', 'user research'],
  'Python backend development': ['frontend development', 'DevOps', 'machine learning'],
  'machine learning': ['Python backend development', 'data analysis', 'product strategy'],
  'product strategy': ['machine learning', 'user research', 'marketing'],
  'Figma design systems': ['React development', 'frontend development'],
  'React Native development': ['backend API development', 'UI/UX design'],
  'blockchain integration': ['backend development', 'security'],
  'content strategy': ['marketing', 'product strategy', 'writing'],
  'GPT prompt engineering': ['backend API development', 'content strategy']
};

// Load skill exchanges
function loadSkillExchanges() {
  try {
    if (!fs.existsSync(SKILL_EXCHANGE_FILE)) {
      return [];
    }
    
    const content = fs.readFileSync(SKILL_EXCHANGE_FILE, 'utf8').trim();
    if (!content) return [];
    
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .filter(post => post.status === 'active');
  } catch (error) {
    return [];
  }
}

// Find perfect matches
function findPerfectMatches(posts) {
  const matches = [];
  const offers = posts.filter(p => p.type === 'offer');
  const requests = posts.filter(p => p.type === 'request');

  requests.forEach(request => {
    // Direct skill matches
    const directMatches = offers.filter(offer => 
      offer.skill.toLowerCase().includes(request.skill.toLowerCase()) ||
      request.skill.toLowerCase().includes(offer.skill.toLowerCase())
    );

    directMatches.forEach(offer => {
      if (offer.handle !== request.handle) {
        matches.push({
          type: 'direct_match',
          requester: request.handle,
          offerer: offer.handle,
          skill: request.skill,
          offered_skill: offer.skill,
          confidence: 95,
          reason: `${offer.handle} offers "${offer.skill}" which matches ${request.handle}'s request for "${request.skill}"`
        });
      }
    });

    // Complementary skill matches
    const complementary = skillSynergies[request.skill] || [];
    complementary.forEach(compSkill => {
      const compOffers = offers.filter(offer => 
        offer.skill.toLowerCase().includes(compSkill.toLowerCase()) &&
        offer.handle !== request.handle
      );

      compOffers.forEach(offer => {
        matches.push({
          type: 'complementary_match',
          requester: request.handle,
          offerer: offer.handle,
          skill: request.skill,
          offered_skill: offer.skill,
          confidence: 75,
          reason: `${offer.handle}'s "${offer.skill}" expertise complements ${request.handle}'s need for "${request.skill}"`
        });
      });
    });
  });

  // Remove duplicates and sort by confidence
  const uniqueMatches = matches.filter((match, index, self) => 
    index === self.findIndex(m => 
      m.requester === match.requester && 
      m.offerer === match.offerer && 
      m.skill === match.skill
    )
  );

  return uniqueMatches.sort((a, b) => b.confidence - a.confidence);
}

// Find collaboration opportunities (mutual exchanges)
function findCollaborationOpportunities(posts) {
  const collaborations = [];
  const userPosts = {};

  // Group posts by user
  posts.forEach(post => {
    if (!userPosts[post.handle]) {
      userPosts[post.handle] = { offers: [], requests: [] };
    }
    userPosts[post.handle][post.type + 's'].push(post);
  });

  // Find mutual opportunities
  const users = Object.keys(userPosts);
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const user1 = users[i];
      const user2 = users[j];
      const user1Posts = userPosts[user1];
      const user2Posts = userPosts[user2];

      // Check if user1's offers match user2's requests
      user1Posts.offers.forEach(offer1 => {
        user2Posts.requests.forEach(request2 => {
          const skillMatch = offer1.skill.toLowerCase().includes(request2.skill.toLowerCase()) ||
                            request2.skill.toLowerCase().includes(offer1.skill.toLowerCase());
          
          if (skillMatch) {
            // Check if there's a reverse match
            const reverseMatch = user2Posts.offers.some(offer2 => 
              user1Posts.requests.some(request1 => 
                offer2.skill.toLowerCase().includes(request1.skill.toLowerCase()) ||
                request1.skill.toLowerCase().includes(offer2.skill.toLowerCase())
              )
            );

            collaborations.push({
              type: reverseMatch ? 'mutual_exchange' : 'one_way_help',
              user1,
              user2,
              user1_gives: offer1.skill,
              user2_needs: request2.skill,
              confidence: reverseMatch ? 90 : 70,
              mutual: reverseMatch,
              reason: reverseMatch ? 
                `Perfect mutual exchange: ${user1} helps ${user2} with "${offer1.skill}", ${user2} can help ${user1} in return` :
                `${user1} can help ${user2} with "${offer1.skill}"`
            });
          }
        });
      });
    }
  }

  return collaborations
    .filter((collab, index, self) => 
      index === self.findIndex(c => 
        (c.user1 === collab.user1 && c.user2 === collab.user2) ||
        (c.user1 === collab.user2 && c.user2 === collab.user1)
      )
    )
    .sort((a, b) => b.confidence - a.confidence);
}

// Generate smart suggestions
function generateSmartSuggestions() {
  console.log('🧠 Smart Connection Suggester\n');
  console.log('Analyzing skills marketplace for perfect matches...\n');

  const posts = loadSkillExchanges();
  
  if (posts.length === 0) {
    console.log('💭 No skills exchange posts to analyze');
    console.log('🚀 Run `node run_bootstrap.js` to populate with sample data');
    return;
  }

  console.log(`📊 Analyzing ${posts.length} posts from ${new Set(posts.map(p => p.handle)).size} users...\n`);

  // Find matches
  const perfectMatches = findPerfectMatches(posts);
  const collaborations = findCollaborationOpportunities(posts);

  // Display perfect matches
  if (perfectMatches.length > 0) {
    console.log('🎯 PERFECT SKILL MATCHES');
    console.log('─'.repeat(60));
    
    perfectMatches.slice(0, 8).forEach((match, i) => {
      const confidence = `${match.confidence}%`;
      const emoji = match.type === 'direct_match' ? '🎯' : '🤝';
      console.log(`${emoji} ${match.offerer} → ${match.requester} (${confidence})`);
      console.log(`   "${match.offered_skill}" helps with "${match.skill}"`);
      console.log(`   💬 Suggested intro: "Hey @${match.requester}, I saw you need ${match.skill}. @${match.offerer} offers ${match.offered_skill}!"`);
      console.log('');
    });
  }

  // Display collaboration opportunities  
  if (collaborations.length > 0) {
    console.log('🤝 COLLABORATION OPPORTUNITIES');
    console.log('─'.repeat(60));
    
    collaborations.slice(0, 5).forEach((collab, i) => {
      const emoji = collab.mutual ? '⚡' : '🤝';
      console.log(`${emoji} ${collab.user1} ↔ ${collab.user2} (${collab.confidence}%)`);
      console.log(`   ${collab.user1} gives: "${collab.user1_gives}"`);
      console.log(`   ${collab.user2} needs: "${collab.user2_needs}"`);
      
      if (collab.mutual) {
        console.log(`   💫 MUTUAL EXCHANGE OPPORTUNITY!`);
      }
      
      console.log(`   💬 Suggested intro: "You two should connect about ${collab.user1_gives}!"`);
      console.log('');
    });
  }

  // Summary
  console.log('📈 SUGGESTION SUMMARY');
  console.log('─'.repeat(60));
  console.log(`🎯 ${perfectMatches.length} skill matches found`);
  console.log(`🤝 ${collaborations.length} collaboration opportunities`);
  console.log(`⚡ ${collaborations.filter(c => c.mutual).length} mutual exchanges possible`);
  
  if (perfectMatches.length > 0 || collaborations.length > 0) {
    console.log('\n💡 Next steps:');
    console.log('   • Use suggested intro messages to connect people');
    console.log('   • Monitor for new posts to trigger automatic matching');
    console.log('   • Track successful connections to improve algorithm');
  } else {
    console.log('\n💭 No obvious matches yet. Add more diverse skill posts to improve matching.');
  }

  return { perfectMatches, collaborations };
}

// Save suggestions for later processing
function saveSuggestions(suggestions) {
  try {
    const timestamp = Date.now();
    const suggestionRecord = {
      timestamp,
      perfectMatches: suggestions.perfectMatches.length,
      collaborations: suggestions.collaborations.length,
      suggestions: suggestions
    };
    
    const content = JSON.stringify(suggestionRecord) + '\n';
    fs.appendFileSync(SUGGESTIONS_FILE, content);
  } catch (error) {
    console.error('Failed to save suggestions:', error.message);
  }
}

// Run smart suggester
if (require.main === module) {
  const suggestions = generateSmartSuggestions();
  if (suggestions && (suggestions.perfectMatches.length > 0 || suggestions.collaborations.length > 0)) {
    saveSuggestions(suggestions);
  }
}

module.exports = { 
  generateSmartSuggestions, 
  findPerfectMatches, 
  findCollaborationOpportunities,
  loadSkillExchanges 
};