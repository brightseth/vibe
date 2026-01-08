/**
 * Generate Smart Connection Suggestions
 * 
 * Analyze the current Skills Exchange data and generate specific,
 * actionable connection suggestions for the discovery agent to make.
 */

const fs = require('fs');
const path = require('path');

const VIBE_DIR = path.join(__dirname, 'data/vibe');

function loadData() {
  const profiles = JSON.parse(fs.readFileSync(path.join(VIBE_DIR, 'profiles.json'), 'utf8'));
  const skillsContent = fs.readFileSync(path.join(VIBE_DIR, 'skill-exchanges.jsonl'), 'utf8');
  const skills = skillsContent.trim().split('\n')
    .filter(line => line.length > 0)
    .map(line => JSON.parse(line))
    .filter(post => post.status === 'active');
  
  return { profiles, skills };
}

function findPerfectMatches() {
  const { profiles, skills } = loadData();
  
  const perfectMatches = [];
  const requests = skills.filter(s => s.type === 'request');
  const offers = skills.filter(s => s.type === 'offer');
  
  requests.forEach(request => {
    offers.forEach(offer => {
      if (offer.handle === request.handle) return; // Same person
      
      const skillMatch = checkSkillMatch(request.skill, offer.skill);
      if (skillMatch.isMatch) {
        const requesterProfile = profiles[request.handle] || {};
        const providerProfile = profiles[offer.handle] || {};
        
        perfectMatches.push({
          requester: request.handle,
          provider: offer.handle,
          skill: request.skill,
          matchStrength: skillMatch.strength,
          requestDetails: request.details,
          offerDetails: offer.details,
          requesterProject: requesterProfile.building,
          providerProject: providerProfile.building,
          suggestionText: generateSuggestionText(request, offer, requesterProfile, providerProfile),
          dmToRequester: generateDMText('requester', request, offer, requesterProfile, providerProfile),
          dmToProvider: generateDMText('provider', request, offer, requesterProfile, providerProfile)
        });
      }
    });
  });
  
  return perfectMatches.sort((a, b) => b.matchStrength - a.matchStrength);
}

function checkSkillMatch(requestSkill, offerSkill) {
  const req = requestSkill.toLowerCase().trim();
  const off = offerSkill.toLowerCase().trim();
  
  // Exact match
  if (req === off) {
    return { isMatch: true, strength: 100 };
  }
  
  // One contains the other
  if (req.includes(off) || off.includes(req)) {
    return { isMatch: true, strength: 85 };
  }
  
  // Check for common synonyms and related skills
  const skillMappings = {
    'react': ['react development', 'react.js', 'reactjs', 'frontend'],
    'ui design': ['ui', 'user interface', 'interface design', 'design'],
    'ux design': ['ux', 'user experience', 'experience design'],
    'backend': ['backend development', 'server development', 'api development'],
    'python': ['python development', 'python backend'],
    'marketing': ['growth marketing', 'digital marketing', 'marketing strategy'],
    'product': ['product management', 'product strategy']
  };
  
  for (const [base, variations] of Object.entries(skillMappings)) {
    const reqMatches = req.includes(base) || variations.some(v => req.includes(v));
    const offMatches = off.includes(base) || variations.some(v => off.includes(v));
    
    if (reqMatches && offMatches) {
      return { isMatch: true, strength: 75 };
    }
  }
  
  return { isMatch: false, strength: 0 };
}

function generateSuggestionText(request, offer, requesterProfile, providerProfile) {
  const skill = request.skill;
  const requester = request.handle;
  const provider = offer.handle;
  
  return `Perfect match found! @${requester} needs "${skill}" and @${provider} offers it. ` +
         `${requester} is building ${requesterProfile.building || 'something interesting'}, ` +
         `while ${provider} is working on ${providerProfile.building || 'their project'}. ` +
         `This could be a great collaboration opportunity!`;
}

function generateDMText(recipient, request, offer, requesterProfile, providerProfile) {
  if (recipient === 'requester') {
    return `Hi @${request.handle}! I noticed you're looking for help with "${request.skill}". ` +
           `Great news - @${offer.handle} has posted an offer for exactly that! ` +
           `They're working on ${providerProfile.building || 'an interesting project'} and have experience with "${offer.skill}". ` +
           `${offer.details ? `They mentioned: "${offer.details}"` : ''} ` +
           `Might be worth reaching out to see if you can help each other! 🤝`;
  } else {
    return `Hi @${offer.handle}! I saw your offer to help with "${offer.skill}" - that's awesome! ` +
           `@${request.handle} just posted that they need exactly that skill for their project: ${requesterProfile.building || 'something cool'}. ` +
           `${request.details ? `They mentioned: "${request.details}"` : ''} ` +
           `This could be a perfect match - interested in connecting? 🚀`;
  }
}

function generateComplementaryMatches() {
  const { profiles, skills } = loadData();
  
  const complementaryPairs = [
    ['design', 'development'],
    ['frontend', 'backend'], 
    ['ui', 'development'],
    ['marketing', 'product'],
    ['business', 'technical']
  ];
  
  const complementaryMatches = [];
  
  Object.values(profiles).forEach(user1 => {
    Object.values(profiles).forEach(user2 => {
      if (user1.handle === user2.handle) return;
      
      const user1Skills = getUserSkills(user1, skills);
      const user2Skills = getUserSkills(user2, skills);
      
      complementaryPairs.forEach(([skill1, skill2]) => {
        if (hasSkillType(user1Skills, skill1) && hasSkillType(user2Skills, skill2)) {
          complementaryMatches.push({
            user1: user1.handle,
            user2: user2.handle,
            skill1,
            skill2,
            user1Project: user1.building,
            user2Project: user2.building,
            suggestionText: `@${user1.handle} (${skill1}) and @${user2.handle} (${skill2}) could collaborate well. ` +
                          `${user1.handle} is building ${user1.building || 'something interesting'}, ` +
                          `${user2.handle} is working on ${user2.building || 'their project'}. ` +
                          `Their complementary skills could create great synergy!`
          });
        }
      });
    });
  });
  
  return complementaryMatches.slice(0, 5); // Top 5 complementary matches
}

function getUserSkills(user, skills) {
  const userSkills = skills.filter(s => s.handle === user.handle);
  const allSkills = [...(user.tags || []), ...(user.interests || [])];
  userSkills.forEach(s => allSkills.push(s.skill));
  return allSkills.map(s => s.toLowerCase());
}

function hasSkillType(userSkills, skillType) {
  return userSkills.some(skill => 
    skill.includes(skillType) || 
    (skillType === 'development' && (skill.includes('react') || skill.includes('python') || skill.includes('frontend') || skill.includes('backend')))
  );
}

function generateActionableSuggestions() {
  console.log('🎯 SMART CONNECTION SUGGESTIONS FOR DISCOVERY AGENT');
  console.log('='.repeat(70));
  console.log(`Generated: ${new Date().toLocaleString()}\n`);
  
  // Perfect skill matches
  const perfectMatches = findPerfectMatches();
  if (perfectMatches.length > 0) {
    console.log('🔥 HIGH-PRIORITY PERFECT MATCHES');
    console.log('-'.repeat(40));
    perfectMatches.slice(0, 5).forEach((match, i) => {
      console.log(`${i + 1}. SKILL MATCH: "${match.skill}" (${match.matchStrength}% confidence)`);
      console.log(`   @${match.requester} needs ← @${match.provider} offers`);
      console.log(`   Projects: ${match.requesterProject} ↔ ${match.providerProject}`);
      console.log(`   \n   📩 DM to @${match.requester}:`);
      console.log(`   "${match.dmToRequester}"`);
      console.log(`   \n   📩 DM to @${match.provider}:`);
      console.log(`   "${match.dmToProvider}"\n`);
    });
  } else {
    console.log('🔥 HIGH-PRIORITY PERFECT MATCHES');
    console.log('-'.repeat(40));
    console.log('No perfect skill matches found in current data.\n');
  }
  
  // Complementary matches
  const complementaryMatches = generateComplementaryMatches();
  if (complementaryMatches.length > 0) {
    console.log('✨ COMPLEMENTARY SKILL PARTNERSHIPS');
    console.log('-'.repeat(40));
    complementaryMatches.forEach((match, i) => {
      console.log(`${i + 1}. ${match.skill1.toUpperCase()} + ${match.skill2.toUpperCase()}`);
      console.log(`   @${match.user1} ↔ @${match.user2}`);
      console.log(`   ${match.suggestionText}\n`);
    });
  }
  
  // Action summary
  console.log('🚀 IMMEDIATE ACTIONS FOR DISCOVERY AGENT');
  console.log('-'.repeat(40));
  if (perfectMatches.length > 0) {
    console.log(`• Send ${perfectMatches.length * 2} targeted DMs about perfect skill matches`);
    console.log(`• Priority: ${perfectMatches.slice(0, 3).map(m => `@${m.requester}↔@${m.provider}`).join(', ')}`);
  }
  if (complementaryMatches.length > 0) {
    console.log(`• Suggest ${complementaryMatches.length} complementary partnerships`);
  }
  console.log(`• Monitor for new skill posts to create fresh matches`);
  console.log(`• Focus on high-confidence matches (>75%) for best success rate\n`);
  
  // Save detailed suggestions
  const suggestions = {
    timestamp: new Date().toISOString(),
    perfectMatches,
    complementaryMatches,
    totalSuggestions: perfectMatches.length + complementaryMatches.length,
    highPriority: perfectMatches.filter(m => m.matchStrength >= 85).length
  };
  
  fs.writeFileSync('smart-suggestions.json', JSON.stringify(suggestions, null, 2));
  console.log('📁 Detailed suggestions saved to: smart-suggestions.json');
  
  return suggestions;
}

if (require.main === module) {
  generateActionableSuggestions();
}

module.exports = {
  findPerfectMatches,
  generateComplementaryMatches,
  generateActionableSuggestions
};