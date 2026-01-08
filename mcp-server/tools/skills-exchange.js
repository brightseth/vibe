/**
 * vibe skills-exchange — Community Skills Marketplace
 *
 * A dedicated marketplace for skill sharing and collaboration within /vibe.
 * Complements workshop-buddy by focusing specifically on teaching/learning exchanges.
 *
 * Commands:
 * - skills-exchange post — Post a skill offer or request
 * - skills-exchange browse — Browse all skill offerings
 * - skills-exchange match — Find skill exchange matches for you
 * - skills-exchange requests — View skill requests in the community
 */

const config = require('../config');
const store = require('../store');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_skills_exchange',
  description: 'Community marketplace for skill sharing and learning exchanges.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['post', 'browse', 'match', 'requests'],
        description: 'Skills exchange command to run'
      },
      type: {
        type: 'string',
        enum: ['offer', 'request'],
        description: 'Type of post (for post command)'
      },
      skill: {
        type: 'string',
        description: 'Skill name'
      },
      details: {
        type: 'string',
        description: 'Additional details about the skill offer/request'
      }
    }
  }
};

// Skill categories for better organization
const skillCategories = {
  'technical': ['frontend', 'backend', 'mobile', 'ai', 'data', 'devops', 'security'],
  'design': ['ui', 'ux', 'graphic-design', 'illustration', 'branding', 'figma'],
  'business': ['product', 'marketing', 'strategy', 'sales', 'fundraising', 'leadership'],
  'creative': ['writing', 'content', 'video', 'photography', 'music', 'storytelling'],
  'research': ['user-research', 'market-research', 'data-analysis', 'academic'],
  'soft-skills': ['communication', 'mentoring', 'project-management', 'team-building']
};

// Get skill category
function getSkillCategory(skill) {
  const skillLower = skill.toLowerCase().replace(/\s+/g, '-');
  for (const [category, skills] of Object.entries(skillCategories)) {
    if (skills.includes(skillLower)) {
      return category;
    }
  }
  return 'other';
}

// Store skill exchange posts
async function storeSkillPost(handle, type, skill, details) {
  const post = {
    id: Date.now() + Math.random(),
    handle,
    type, // 'offer' or 'request'
    skill,
    details: details || '',
    category: getSkillCategory(skill),
    timestamp: Date.now(),
    status: 'active'
  };
  
  await store.appendSkillExchange(post);
  return post;
}

// Get all active skill posts
async function getSkillPosts() {
  try {
    const posts = await store.getSkillExchanges() || [];
    return posts.filter(p => p.status === 'active');
  } catch (error) {
    return [];
  }
}

// Find skill matches for a user
async function findSkillMatches(handle) {
  const userProfile = await userProfiles.getProfile(handle);
  const allPosts = await getSkillPosts();
  const matches = [];
  
  // User's skills (what they can offer)
  const userSkills = (userProfile.tags || []).concat(userProfile.interests || []);
  
  // Find requests for skills the user has
  const requestMatches = allPosts.filter(post => {
    if (post.type === 'request' && post.handle !== handle) {
      const requestedSkill = post.skill.toLowerCase();
      return userSkills.some(skill => 
        skill.toLowerCase().includes(requestedSkill) || 
        requestedSkill.includes(skill.toLowerCase())
      );
    }
    return false;
  });
  
  // Find offers for skills the user might want
  const offerMatches = allPosts.filter(post => {
    if (post.type === 'offer' && post.handle !== handle) {
      // Simple heuristic: if user is building something related to the offered skill
      if (userProfile.building) {
        const buildingLower = userProfile.building.toLowerCase();
        const offeredSkill = post.skill.toLowerCase();
        return buildingLower.includes(offeredSkill) || offeredSkill.includes(buildingLower.split(' ')[0]);
      }
    }
    return false;
  });
  
  return {
    canHelp: requestMatches.slice(0, 3),
    canLearn: offerMatches.slice(0, 3)
  };
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'browse';

  let display = '';

  try {
    switch (command) {
      case 'post': {
        if (!args.type || !args.skill) {
          return { 
            error: 'Usage: skills-exchange post --type offer|request --skill "skill name" --details "optional details"' 
          };
        }
        
        const post = await storeSkillPost(myHandle, args.type, args.skill, args.details);
        
        display = `## Skill ${args.type === 'offer' ? 'Offer' : 'Request'} Posted! 📝\n\n`;
        display += `**${args.type === 'offer' ? 'Offering' : 'Seeking'}:** ${args.skill}\n`;
        if (args.details) {
          display += `**Details:** ${args.details}\n`;
        }
        display += `**Category:** ${post.category}\n`;
        display += `**Posted:** ${formatTimeAgo(post.timestamp)}\n\n`;
        
        display += `**What's next?**\n`;
        if (args.type === 'offer') {
          display += `• People seeking "${args.skill}" will see your offer\n`;
          display += `• Check \`skills-exchange match\` to see who you can help\n`;
        } else {
          display += `• People with "${args.skill}" skills will see your request\n`;
          display += `• Check \`skills-exchange browse\` to see available offers\n`;
        }
        display += `• Others can reach out via \`dm @${myHandle}\``;
        break;
      }

      case 'browse': {
        const posts = await getSkillPosts();
        
        if (posts.length === 0) {
          display = `## No Skills Posted Yet 📭\n\n`;
          display += `_The skills exchange is empty._\n\n`;
          display += `**Start the marketplace:**\n`;
          display += `\`skills-exchange post --type offer --skill "your expertise"\`\n`;
          display += `\`skills-exchange post --type request --skill "what you need"\`\n\n`;
          display += `**Examples:**\n`;
          display += `• "React development" • "UI/UX design" • "Product strategy"\n`;
          display += `• "Python tutoring" • "Pitch deck review" • "Marketing advice"`;
        } else {
          // Group by category
          const byCategory = {};
          for (const post of posts) {
            if (!byCategory[post.category]) {
              byCategory[post.category] = { offers: [], requests: [] };
            }
            byCategory[post.category][post.type + 's'].push(post);
          }
          
          display = `## Skills Exchange Marketplace 🏪\n\n`;
          
          for (const [category, posts] of Object.entries(byCategory)) {
            if (posts.offers.length > 0 || posts.requests.length > 0) {
              display += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
              
              if (posts.offers.length > 0) {
                display += `**Available Skills:**\n`;
                for (const offer of posts.offers) {
                  display += `• **${offer.skill}** by @${offer.handle}`;
                  if (offer.details) display += ` — ${offer.details}`;
                  display += ` _(${formatTimeAgo(offer.timestamp)})_\n`;
                }
                display += `\n`;
              }
              
              if (posts.requests.length > 0) {
                display += `**Skill Requests:**\n`;
                for (const request of posts.requests) {
                  display += `• **${request.skill}** wanted by @${request.handle}`;
                  if (request.details) display += ` — ${request.details}`;
                  display += ` _(${formatTimeAgo(request.timestamp)})_\n`;
                }
                display += `\n`;
              }
            }
          }
          
          display += `**Connect with people:**\n`;
          display += `\`dm @username "I saw your skills post..."\`\n`;
          display += `\`skills-exchange match\` — Find your perfect exchanges`;
        }
        break;
      }

      case 'match': {
        const matches = await findSkillMatches(myHandle);
        
        display = `## Your Skill Exchange Matches 🎯\n\n`;
        
        if (matches.canHelp.length > 0) {
          display += `### You Can Help 🤝\n`;
          display += `_People requesting skills you have:_\n\n`;
          
          for (const request of matches.canHelp) {
            display += `**@${request.handle}** needs: **${request.skill}**\n`;
            if (request.details) display += `${request.details}\n`;
            display += `Posted: ${formatTimeAgo(request.timestamp)}\n`;
            display += `💬 \`dm @${request.handle} "I can help with ${request.skill}!"\`\n\n`;
          }
        }
        
        if (matches.canLearn.length > 0) {
          display += `### You Can Learn 📚\n`;
          display += `_Skills offered that might interest you:_\n\n`;
          
          for (const offer of matches.canLearn) {
            display += `**@${offer.handle}** offers: **${offer.skill}**\n`;
            if (offer.details) display += `${offer.details}\n`;
            display += `Posted: ${formatTimeAgo(offer.timestamp)}\n`;
            display += `💬 \`dm @${offer.handle} "I'd love to learn ${offer.skill}!"\`\n\n`;
          }
        }
        
        if (matches.canHelp.length === 0 && matches.canLearn.length === 0) {
          display += `_No matches found right now._\n\n`;
          display += `**Improve your matches:**\n`;
          display += `• Update your skills: \`update tags "your-skills"\`\n`;
          display += `• Post what you offer: \`skills-exchange post --type offer --skill "your expertise"\`\n`;
          display += `• Request what you need: \`skills-exchange post --type request --skill "skill you want"\`\n`;
          display += `• Browse all posts: \`skills-exchange browse\``;
        }
        break;
      }

      case 'requests': {
        const posts = await getSkillPosts();
        const requests = posts.filter(p => p.type === 'request');
        
        if (requests.length === 0) {
          display = `## No Skill Requests Yet 📋\n\n`;
          display += `_No one has posted skill requests._\n\n`;
          display += `**Be the first:**\n`;
          display += `\`skills-exchange post --type request --skill "what you need help with"\``;
        } else {
          display = `## Community Skill Requests 🙋\n\n`;
          display += `_People looking for help and expertise:_\n\n`;
          
          // Group by recency
          const recent = requests.filter(r => (Date.now() - r.timestamp) < 7 * 24 * 60 * 60 * 1000);
          const older = requests.filter(r => (Date.now() - r.timestamp) >= 7 * 24 * 60 * 60 * 1000);
          
          if (recent.length > 0) {
            display += `### Recent Requests\n`;
            for (const request of recent) {
              display += `**${request.skill}** — @${request.handle}\n`;
              if (request.details) display += `_${request.details}_\n`;
              display += `${formatTimeAgo(request.timestamp)}\n\n`;
            }
          }
          
          if (older.length > 0) {
            display += `### Earlier Requests\n`;
            for (const request of older.slice(0, 5)) {
              display += `**${request.skill}** — @${request.handle} (${formatTimeAgo(request.timestamp)})\n`;
            }
            display += `\n`;
          }
          
          display += `**Help someone out:**\n`;
          display += `\`dm @username "I can help with [skill]!"\`\n`;
          display += `\`skills-exchange match\` — See requests matching your skills`;
        }
        break;
      }

      default:
        display = `## Skills Exchange Commands

**\`skills-exchange post --type offer|request --skill "skill"\`** — Post skill offer/request
**\`skills-exchange browse\`** — Browse all skill posts by category  
**\`skills-exchange match\`** — Find skill exchanges perfect for you
**\`skills-exchange requests\`** — View community skill requests

**Examples:**
\`skills-exchange post --type offer --skill "React development" --details "5+ years experience"\`
\`skills-exchange post --type request --skill "UI design feedback" --details "Early stage startup"\`

**Perfect for:**
- Teaching skills you've mastered
- Learning new skills from the community
- Finding mentors and mentees
- Quick skill-specific help and advice`;
    }
  } catch (error) {
    display = `## Skills Exchange Error

${error.message}

Try: \`skills-exchange\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };