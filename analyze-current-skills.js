// Quick analysis of current skills marketplace
const fs = require('fs');

function analyzeSkillsMarketplace() {
  // Read skills data
  const skillsData = fs.readFileSync('./skill-exchanges.jsonl', 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  const offers = skillsData.filter(s => s.type === 'offer');
  const requests = skillsData.filter(s => s.type === 'request');

  console.log('Skills Marketplace Analysis:');
  console.log(`Total posts: ${skillsData.length}`);
  console.log(`Offers: ${offers.length}`);
  console.log(`Requests: ${requests.length}`);
  
  // Count by skill
  const skillCounts = {};
  skillsData.forEach(skill => {
    const key = `${skill.skill} (${skill.type})`;
    skillCounts[key] = (skillCounts[key] || 0) + 1;
  });
  
  console.log('\nSkill breakdown:');
  Object.entries(skillCounts).forEach(([skill, count]) => {
    console.log(`  ${skill}: ${count}`);
  });

  // Find matches
  console.log('\nPotential Matches:');
  offers.forEach(offer => {
    const matches = requests.filter(req => 
      req.skill.toLowerCase().includes(offer.skill.toLowerCase()) ||
      offer.skill.toLowerCase().includes(req.skill.toLowerCase()) ||
      (offer.skill.includes('React') && req.skill.includes('API')) // Special case
    );
    
    if (matches.length > 0) {
      console.log(`  ${offer.handle} (offers ${offer.skill}) → ${matches.map(m => `${m.handle} (needs ${m.skill})`).join(', ')}`);
    }
  });
}

analyzeSkillsMarketplace();