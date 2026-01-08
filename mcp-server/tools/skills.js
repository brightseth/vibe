/**
 * vibe skills — Skills Exchange Marketplace
 *
 * A marketplace where workshop members can:
 * - Offer skills they have (coding, design, marketing, etc.)
 * - Request skills they need for their projects
 * - Get matched with complementary skill partners
 * - Build connections through skill trading
 *
 * Commands:
 * - skills offer <skill> — Offer a skill you have
 * - skills request <skill> — Request a skill you need  
 * - skills matches — See who you can help and who can help you
 * - skills browse — Browse all available skills by category
 * - skills search <query> — Search for specific skills
 * - skills mine — See your offers and requests
 * - skills stats — Marketplace statistics
 */

const config = require('../config');
const skillsStore = require('../store/skills');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_skills',
  description: 'Skills Exchange marketplace - offer skills, request help, find collaborators.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['offer', 'request', 'matches', 'browse', 'search', 'mine', 'stats', 'help'],
        description: 'Skills command to run'
      },
      skill: {
        type: 'string',
        description: 'Skill name (for offer/request/search commands)'
      },
      level: {
        type: 'string',
        enum: ['beginner', 'intermediate', 'expert'],
        description: 'Your skill level (for offer command)'
      },
      urgency: {
        type: 'string',
        enum: ['low', 'medium', 'high'],
        description: 'How urgently you need this skill (for request command)'
      },
      description: {
        type: 'string',
        description: 'Additional details about your offer/request'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'help';

  let display = '';

  try {
    switch (command) {
      case 'offer': {
        if (!args.skill) {
          return { error: 'Please specify a skill: skills offer "frontend development"' };
        }
        
        const details = {
          level: args.level || 'intermediate',
          description: args.description,
          format: ['chat', 'call'] // Default formats
        };
        
        const offer = await skillsStore.addSkillOffer(myHandle, args.skill, details);
        
        display = `## Skill Offer Added! 🎯

**Offering:** ${offer.skill}  
**Level:** ${offer.level}  
**Category:** ${offer.category}  

${offer.description ? `**Details:** ${offer.description}\n` : ''}
Your offer is now live in the marketplace!

**Next steps:**
- \`skills matches\` to see who needs your help
- \`skills mine\` to manage your offers/requests
- Add more offers: \`skills offer "design" --level expert\``;
        break;
      }

      case 'request': {
        if (!args.skill) {
          return { error: 'Please specify a skill: skills request "ui/ux design"' };
        }
        
        const details = {
          urgency: args.urgency || 'medium',
          description: args.description,
          format: ['chat', 'call'] // Default formats
        };
        
        const request = await skillsStore.addSkillRequest(myHandle, args.skill, details);
        
        display = `## Skill Request Added! 🙋‍♂️

**Requesting:** ${request.skill}  
**Urgency:** ${request.urgency}  
**Category:** ${request.category}  

${request.description ? `**Context:** ${request.description}\n` : ''}
Your request is now live in the marketplace!

**Next steps:**
- \`skills matches\` to see who can help you
- \`skills browse\` to see all available skills
- \`message @handle\` to reach out to skill providers`;
        break;
      }

      case 'matches': {
        const matches = await skillsStore.findSkillMatches(myHandle);
        
        if (matches.forMyRequests.length === 0 && matches.forMyOffers.length === 0) {
          display = `## No Matches Yet 🤔

You don't have active offers or requests to match.

**Get started:**
- \`skills offer "your-skill"\` to offer help
- \`skills request "needed-skill"\` to ask for help
- \`skills browse\` to see what's available

The more specific you are, the better the matches!`;
        } else {
          display = `## Your Skill Matches 🎯\n\n`;
          
          if (matches.forMyRequests.length > 0) {
            display += `### People Who Can Help You\n\n`;
            for (const match of matches.forMyRequests.slice(0, 5)) {
              display += `**@${match.theirItem.handle}** offers **${match.theirItem.skill}**\n`;
              display += `_${match.theirItem.level} level, ${match.theirItem.availability} availability_\n`;
              if (match.theirItem.description) {
                display += `${match.theirItem.description}\n`;
              }
              display += `👉 \`message @${match.theirItem.handle}\` to connect\n\n`;
            }
          }
          
          if (matches.forMyOffers.length > 0) {
            display += `### People You Can Help\n\n`;
            for (const match of matches.forMyOffers.slice(0, 5)) {
              display += `**@${match.theirItem.handle}** needs **${match.theirItem.skill}**\n`;
              display += `_${match.theirItem.urgency} urgency_\n`;
              if (match.theirItem.context) {
                display += `Context: ${match.theirItem.context}\n`;
              }
              display += `👉 \`message @${match.theirItem.handle}\` to offer help\n\n`;
            }
          }
          
          display += `**Perfect time to connect! 🤝**`;
        }
        break;
      }

      case 'browse': {
        const categories = await skillsStore.getSkillsByCategory();
        
        if (Object.keys(categories).length === 0) {
          display = `## Skills Marketplace Empty 🏪

No skills offered or requested yet.

**Be the first:**
- \`skills offer "your-best-skill"\`  
- \`skills request "skill-you-need"\`

**Popular skills to offer:**
Frontend, Backend, Design, Marketing, Writing, AI/ML`;
        } else {
          display = `## Skills Marketplace 🏪\n\n`;
          
          for (const [category, items] of Object.entries(categories)) {
            if (items.offers.length === 0 && items.requests.length === 0) continue;
            
            display += `### ${category}\n\n`;
            
            if (items.offers.length > 0) {
              display += `**Available (${items.offers.length}):** `;
              display += items.offers.slice(0, 5).map(o => `${o.skill}(@${o.handle})`).join(', ');
              if (items.offers.length > 5) display += ` +${items.offers.length - 5} more`;
              display += '\n';
            }
            
            if (items.requests.length > 0) {
              display += `**Needed (${items.requests.length}):** `;
              display += items.requests.slice(0, 5).map(r => `${r.skill}(@${r.handle})`).join(', ');
              if (items.requests.length > 5) display += ` +${items.requests.length - 5} more`;
              display += '\n';
            }
            
            display += '\n';
          }
          
          display += `**Commands:**\n`;
          display += `- \`skills search "frontend"\` for specific skills\n`;
          display += `- \`skills matches\` for personalized matches\n`;
          display += `- \`message @handle\` to connect with someone`;
        }
        break;
      }

      case 'search': {
        if (!args.skill) {
          return { error: 'Please provide a search term: skills search "react"' };
        }
        
        const [offers, requests] = await Promise.all([
          skillsStore.getSkillOffers(args.skill),
          skillsStore.getSkillRequests(args.skill)
        ]);
        
        if (offers.length === 0 && requests.length === 0) {
          display = `## No Results for "${args.skill}" 🔍

**Try searching for:**
- Technologies: "react", "python", "figma"
- Domains: "marketing", "ai", "mobile"  
- General: "design", "writing", "strategy"

Or browse all categories: \`skills browse\``;
        } else {
          display = `## Skills: "${args.skill}" 🔍\n\n`;
          
          if (offers.length > 0) {
            display += `### People Offering (${offers.length})\n\n`;
            for (const offer of offers.slice(0, 8)) {
              display += `**@${offer.handle}** — ${offer.skill} _(${offer.level})_\n`;
              if (offer.description) {
                display += `${offer.description}\n`;
              }
              display += `👉 \`message @${offer.handle}\`\n\n`;
            }
          }
          
          if (requests.length > 0) {
            display += `### People Requesting (${requests.length})\n\n`;
            for (const request of requests.slice(0, 8)) {
              display += `**@${request.handle}** needs ${request.skill} _(${request.urgency} urgency)_\n`;
              if (request.context) {
                display += `Context: ${request.context}\n`;
              }
              display += `👉 \`message @${request.handle}\`\n\n`;
            }
          }
        }
        break;
      }

      case 'mine': {
        const [myOffers, myRequests] = await Promise.all([
          skillsStore.getUserOffers(myHandle),
          skillsStore.getUserRequests(myHandle)
        ]);
        
        if (myOffers.length === 0 && myRequests.length === 0) {
          display = `## Your Skills Profile 👤

You haven't offered or requested any skills yet.

**Get started:**
- \`skills offer "your-best-skill" --level expert\`
- \`skills request "skill-you-need" --urgency medium\`

**Examples:**
- \`skills offer "react development" --level intermediate\`
- \`skills request "ui design" --urgency high\``;
        } else {
          display = `## Your Skills Profile 👤\n\n`;
          
          if (myOffers.length > 0) {
            display += `### Your Offers (${myOffers.length})\n\n`;
            for (const offer of myOffers) {
              display += `**${offer.skill}** _(${offer.level} level)_\n`;
              if (offer.description) {
                display += `${offer.description}\n`;
              }
              display += `_Added ${formatTimeAgo(offer.timestamp)}_\n\n`;
            }
          }
          
          if (myRequests.length > 0) {
            display += `### Your Requests (${myRequests.length})\n\n`;
            for (const request of myRequests) {
              display += `**${request.skill}** _(${request.urgency} urgency)_\n`;
              if (request.context) {
                display += `Context: ${request.context}\n`;
              }
              display += `_Added ${formatTimeAgo(request.timestamp)}_\n\n`;
            }
          }
          
          display += `**Next steps:**\n`;
          display += `- \`skills matches\` to see connections\n`;
          display += `- Add more: \`skills offer "another-skill"\``;
        }
        break;
      }

      case 'stats': {
        const stats = await skillsStore.getExchangeStats();
        
        display = `## Skills Marketplace Stats 📊

**Activity:**
- ${stats.activeOffers} skills offered by workshop members
- ${stats.activeRequests} skills requested  
- ${stats.totalExchanges} successful connections made

**Most Popular Skills:**
${stats.topSkills.slice(0, 8).map(s => `- ${s.skill} (${s.count})`).join('\n')}

**Categories:**
${Object.keys(skillsStore.SKILL_CATEGORIES).map(cat => 
  `- ${cat}: ${skillsStore.SKILL_CATEGORIES[cat].length} skills`
).join('\n')}

**Get involved:**
- \`skills browse\` to explore opportunities
- \`skills offer "your-skill"\` to help others`;
        break;
      }

      default:
        display = `## Skills Exchange Marketplace 🏪

**Trade skills, build connections, ship faster!**

### Core Commands
**\`skills offer <skill>\`** — Offer a skill you have  
**\`skills request <skill>\`** — Request help with something  
**\`skills matches\`** — See who you can help & who can help you  

### Discovery Commands
**\`skills browse\`** — Browse all skills by category  
**\`skills search <query>\`** — Find specific skills or people  
**\`skills mine\`** — View your offers and requests  
**\`skills stats\`** — Marketplace overview  

### Examples
\`skills offer "react development" --level expert\`  
\`skills request "ui design" --urgency high\`  
\`skills search "marketing"\`

### Skill Categories
${Object.entries(skillsStore.SKILL_CATEGORIES).map(([cat, skills]) => 
  `**${cat}:** ${skills.join(', ')}`
).join('\n')}

**Start trading skills today!** 🤝`;
    }
  } catch (error) {
    display = `## Skills Exchange Error

${error.message}

Try: \`skills\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };