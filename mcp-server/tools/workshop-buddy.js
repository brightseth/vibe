/**
 * vibe workshop-buddy — Find Your Perfect Workshop Partner
 *
 * Pairs users based on complementary skills and interests to form
 * productive workshop partnerships. Unlike general discovery,
 * this focuses on active collaboration potential.
 *
 * Commands:
 * - workshop-buddy find — Find your ideal workshop partner
 * - workshop-buddy offer <skills> — Offer skills to the community
 * - workshop-buddy seeking <skills> — What you're looking for
 * - workshop-buddy matches — See current skill exchange opportunities
 */

const config = require('../config');
const store = require('../store');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_workshop_buddy',
  description: 'Find workshop partners with complementary skills for collaboration.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['find', 'offer', 'seeking', 'matches'],
        description: 'Workshop buddy command to run'
      },
      skills: {
        type: 'string',
        description: 'Skills you offer or seek (comma-separated)'
      }
    }
  }
};

// Skill complementarity matrix
const complementarySkills = {
  'frontend': ['backend', 'design', 'ux'],
  'backend': ['frontend', 'devops', 'database'],
  'design': ['frontend', 'user-research', 'engineering'],
  'ux': ['design', 'frontend', 'user-research'],
  'ai': ['data', 'backend', 'research'],
  'data': ['ai', 'backend', 'analytics'],
  'mobile': ['backend', 'design', 'ux'],
  'devops': ['backend', 'security', 'infrastructure'],
  'product': ['engineering', 'design', 'marketing'],
  'engineering': ['product', 'design', 'backend'],
  'research': ['ai', 'data', 'implementation'],
  'marketing': ['product', 'design', 'content'],
  'content': ['marketing', 'design', 'writing'],
  'security': ['devops', 'backend', 'infrastructure'],
  'infrastructure': ['devops', 'backend', 'security'],
  'analytics': ['data', 'product', 'research'],
  'user-research': ['ux', 'product', 'design'],
  'writing': ['content', 'marketing', 'editing'],
  'business': ['product', 'marketing', 'strategy'],
  'strategy': ['business', 'product', 'leadership']
};

// Calculate workshop collaboration potential
function calculateBuddyScore(user1, user2) {
  let score = 0;
  const reasons = [];
  const collaborationPotential = [];

  const user1Skills = (user1.tags || []).concat(user1.interests || []);
  const user2Skills = (user2.tags || []).concat(user2.interests || []);

  // High-value complementary skills
  for (const skill1 of user1Skills) {
    const complementaries = complementarySkills[skill1.toLowerCase()] || [];
    for (const skill2 of user2Skills) {
      if (complementaries.includes(skill2.toLowerCase())) {
        score += 30;
        collaborationPotential.push(`${skill1} + ${skill2}`);
      }
    }
  }

  // Project collaboration potential
  if (user1.building && user2.building) {
    const building1 = user1.building.toLowerCase();
    const building2 = user2.building.toLowerCase();
    
    // Different but related domains
    const domains = ['ai', 'web', 'mobile', 'fintech', 'healthcare', 'gaming', 'productivity'];
    const user1Domains = domains.filter(d => building1.includes(d));
    const user2Domains = domains.filter(d => building2.includes(d));
    
    if (user1Domains.length > 0 && user2Domains.length > 0) {
      const sharedDomains = user1Domains.filter(d => user2Domains.includes(d));
      if (sharedDomains.length > 0) {
        score += 25;
        reasons.push(`Both working in ${sharedDomains.join(', ')}`);
      }
    }
  }

  // Experience level balance
  const user1Level = getExperienceLevel(user1);
  const user2Level = getExperienceLevel(user2);
  
  if (Math.abs(user1Level - user2Level) <= 1) {
    score += 15;
    reasons.push('Compatible experience levels');
  }

  // Activity synchronization
  if (user1.lastSeen && user2.lastSeen) {
    const timeDiff = Math.abs(user1.lastSeen - user2.lastSeen);
    const hours = timeDiff / (1000 * 60 * 60);
    if (hours < 6) {
      score += 20;
      reasons.push('Active at similar times');
    }
  }

  // Add collaboration potential to reasons
  if (collaborationPotential.length > 0) {
    reasons.unshift(`Perfect skill combo: ${collaborationPotential.slice(0, 2).join(', ')}`);
  }

  return { score, reasons: reasons.slice(0, 3), collaborationPotential };
}

// Estimate experience level from profile
function getExperienceLevel(user) {
  const skills = (user.tags || []).length;
  const interests = (user.interests || []).length;
  const hasBuilding = user.building ? 1 : 0;
  
  return Math.min(5, skills + interests + hasBuilding);
}

// Find workshop buddies
async function findWorkshopBuddies(myHandle) {
  const myProfile = await userProfiles.getProfile(myHandle);
  const allProfiles = await userProfiles.getAllProfiles();
  
  const candidates = allProfiles.filter(p => p.handle !== myHandle);
  const matches = [];

  for (const candidate of candidates) {
    const match = calculateBuddyScore(myProfile, candidate);
    if (match.score > 20) { // Higher threshold for workshop partnerships
      matches.push({
        handle: candidate.handle,
        score: match.score,
        reasons: match.reasons,
        collaborationPotential: match.collaborationPotential,
        building: candidate.building,
        tags: candidate.tags || [],
        interests: candidate.interests || [],
        lastSeen: candidate.lastSeen,
        experienceLevel: getExperienceLevel(candidate)
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score).slice(0, 3);
}

// Get skill offering/seeking data
async function getSkillExchange() {
  // This would integrate with a persistent skills marketplace
  // For now, analyze profiles to suggest exchanges
  const allProfiles = await userProfiles.getAllProfiles();
  const exchanges = [];

  for (const profile of allProfiles) {
    if (profile.tags && profile.tags.length > 0) {
      for (const skill of profile.tags) {
        const seeking = complementarySkills[skill.toLowerCase()] || [];
        if (seeking.length > 0) {
          exchanges.push({
            handle: profile.handle,
            offering: skill,
            seeking: seeking,
            building: profile.building
          });
        }
      }
    }
  }

  return exchanges.slice(0, 10);
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'find';

  let display = '';

  try {
    switch (command) {
      case 'find': {
        const buddies = await findWorkshopBuddies(myHandle);
        
        if (buddies.length === 0) {
          display = `## No Workshop Buddies Found

_Need more profiles to find great partnerships._

**To find your perfect workshop buddy:**
1. \`vibe update tags "your-skills"\` (e.g., "frontend, react, typescript")
2. \`vibe update building "your current project"\`
3. \`vibe update interests "what excites you"\`

**What makes a great workshop buddy:**
- Complementary skills (frontend + backend)
- Similar availability/timezone
- Compatible experience level
- Shared domain interest`;
        } else {
          display = `## Your Workshop Buddy Matches 🤝\n\n`;
          
          for (const buddy of buddies) {
            display += `### **@${buddy.handle}** _(${buddy.score}% match)_\n`;
            display += `${buddy.building || 'Available for collaboration'}\n\n`;
            
            display += `**Why you'd work great together:**\n`;
            for (const reason of buddy.reasons) {
              display += `• ${reason}\n`;
            }
            
            if (buddy.collaborationPotential.length > 0) {
              display += `\n**Skill synergy:** ${buddy.collaborationPotential.slice(0, 2).join(', ')}\n`;
            }
            
            display += `**Their skills:** ${buddy.tags.join(', ')}\n`;
            display += `**Experience level:** ${'⭐'.repeat(buddy.experienceLevel)}\n`;
            display += `_Last seen: ${formatTimeAgo(buddy.lastSeen)}_\n\n`;
            display += `**Reach out:** \`message @${buddy.handle} "Hey! We seem like a great workshop match..."\`\n\n`;
            display += '---\n\n';
          }
          
          display += `**Next steps:**\n`;
          display += `• Message your top match to start collaborating\n`;
          display += `• Use \`workshop-buddy matches\` to see community skill exchanges\n`;
          display += `• Try \`workshop-buddy seeking "skill"\` to find specific expertise`;
        }
        break;
      }

      case 'offer': {
        if (!args.skills) {
          return { error: 'Specify skills you offer: workshop-buddy offer "frontend, react"' };
        }
        
        // Update user tags with offered skills
        const skills = args.skills.split(',').map(s => s.trim().toLowerCase());
        const currentProfile = await userProfiles.getProfile(myHandle);
        const updatedTags = [...new Set([...(currentProfile.tags || []), ...skills])];
        
        await userProfiles.updateProfile(myHandle, { tags: updatedTags });
        
        display = `## Skills Offered! 🎯

**You're now offering:** ${skills.join(', ')}

People looking for these skills can find you via:
- \`discover search "${skills[0]}"\`
- \`workshop-buddy matches\`

**Want to find collaboration opportunities?**
\`workshop-buddy find\` — Find your ideal workshop partner`;
        break;
      }

      case 'seeking': {
        if (!args.skills) {
          return { error: 'Specify skills you need: workshop-buddy seeking "backend, devops"' };
        }
        
        const seekingSkills = args.skills.split(',').map(s => s.trim().toLowerCase());
        const allProfiles = await userProfiles.getAllProfiles();
        
        const matches = allProfiles.filter(profile => {
          const theirSkills = (profile.tags || []).map(t => t.toLowerCase());
          return seekingSkills.some(skill => theirSkills.includes(skill)) && profile.handle !== myHandle;
        });
        
        if (matches.length === 0) {
          display = `## No One Found with: ${args.skills}

**Try:**
- \`discover search "${seekingSkills[0]}"\` for broader search
- \`workshop-buddy matches\` to browse all skill exchanges
- Post what you're seeking: \`ship "Looking for ${args.skills} expertise"\``;
        } else {
          display = `## People with: ${args.skills}\n\n`;
          
          for (const match of matches) {
            const theirMatchingSkills = (match.tags || []).filter(t => 
              seekingSkills.includes(t.toLowerCase())
            );
            
            display += `**@${match.handle}**\n`;
            display += `${match.building || 'Available to help'}\n`;
            display += `**Has:** ${theirMatchingSkills.join(', ')}\n`;
            display += `**All skills:** ${(match.tags || []).join(', ')}\n`;
            display += `_Last seen: ${formatTimeAgo(match.lastSeen)}_\n\n`;
          }
          
          display += `**Ready to collaborate?**\n`;
          display += `\`workshop-buddy find\` — See your best overall matches`;
        }
        break;
      }

      case 'matches': {
        const exchanges = await getSkillExchange();
        
        if (exchanges.length === 0) {
          display = `## No Skill Exchanges Yet

_The skill marketplace is empty._

**Start the exchange:**
1. \`workshop-buddy offer "your-skills"\`
2. Others can find you via \`workshop-buddy seeking "your-skills"\`

**Example skills to offer/seek:**
- Technical: frontend, backend, mobile, ai, data
- Design: ui, ux, illustration, branding  
- Business: product, marketing, strategy, writing`;
        } else {
          display = `## Community Skill Exchange 🔄\n\n`;
          
          const groupedByOffering = {};
          for (const exchange of exchanges) {
            if (!groupedByOffering[exchange.offering]) {
              groupedByOffering[exchange.offering] = [];
            }
            groupedByOffering[exchange.offering].push(exchange);
          }
          
          for (const [skill, providers] of Object.entries(groupedByOffering)) {
            display += `### ${skill.toUpperCase()}\n`;
            
            for (const provider of providers.slice(0, 3)) {
              display += `**@${provider.handle}** offers ${skill}, seeks: ${provider.seeking.join(', ')}\n`;
              if (provider.building) {
                display += `_Building: ${provider.building}_\n`;
              }
            }
            
            display += '\n';
          }
          
          display += `**Find your perfect exchange:**\n`;
          display += `- \`workshop-buddy seeking "skill"\` to find specific expertise\n`;
          display += `- \`workshop-buddy find\` for AI-matched partners`;
        }
        break;
      }

      default:
        display = `## Workshop Buddy Commands

**\`workshop-buddy find\`** — Find your ideal workshop partner
**\`workshop-buddy offer <skills>\`** — Offer skills to the community  
**\`workshop-buddy seeking <skills>\`** — Find people with specific skills
**\`workshop-buddy matches\`** — Browse community skill exchanges

**Perfect for:**
- Finding a coding partner with complementary skills
- Pairing designers with developers
- Connecting product people with engineers
- Building cross-functional teams

**Examples:**
\`workshop-buddy offer "frontend, react, typescript"\`
\`workshop-buddy seeking "backend, python"\``;
    }
  } catch (error) {
    display = `## Workshop Buddy Error

${error.message}

Try: \`workshop-buddy\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };