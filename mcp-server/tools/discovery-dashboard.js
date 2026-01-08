/**
 * vibe discovery-dashboard — Overview of /vibe's discovery ecosystem
 *
 * Shows community trends, active skill exchanges, and quick discovery actions.
 * Perfect for understanding the current social graph and finding connection opportunities.
 *
 * Commands:
 * - discovery-dashboard — Show full dashboard
 * - discovery-dashboard trends — Show trending skills and interests
 * - discovery-dashboard quick — Quick actions for immediate connection
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_dashboard',
  description: 'Overview of community discovery trends and connection opportunities.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['overview', 'trends', 'quick'],
        description: 'Dashboard view to show'
      }
    }
  }
};

// Get community stats
async function getCommunityStats() {
  const profiles = await userProfiles.getAllProfiles();
  
  const stats = {
    totalUsers: profiles.length,
    activeUsers: profiles.filter(p => p.lastSeen && (Date.now() - p.lastSeen) < 7 * 24 * 60 * 60 * 1000).length,
    buildersWithProjects: profiles.filter(p => p.building).length,
    usersWithSkills: profiles.filter(p => p.tags && p.tags.length > 0).length,
    usersWithInterests: profiles.filter(p => p.interests && p.interests.length > 0).length
  };
  
  return stats;
}

// Get discovery opportunities
async function getDiscoveryOpportunities() {
  const profiles = await userProfiles.getAllProfiles();
  const opportunities = [];
  
  // Look for skill complementarity
  const skillMap = {};
  for (const profile of profiles) {
    if (profile.tags) {
      for (const tag of profile.tags) {
        if (!skillMap[tag]) skillMap[tag] = [];
        skillMap[tag].push(profile.handle);
      }
    }
  }
  
  // Find popular skill combinations
  const complementaryPairs = [
    ['frontend', 'backend'],
    ['design', 'engineering'],
    ['ai', 'data'],
    ['product', 'engineering'],
    ['marketing', 'product'],
    ['mobile', 'web'],
    ['devops', 'security']
  ];
  
  for (const [skillA, skillB] of complementaryPairs) {
    const hasA = skillMap[skillA] || [];
    const hasB = skillMap[skillB] || [];
    
    if (hasA.length > 0 && hasB.length > 0) {
      opportunities.push({
        type: 'skill_complementarity',
        description: `${hasA.length} ${skillA} × ${hasB.length} ${skillB}`,
        potential: hasA.length * hasB.length,
        skillA,
        skillB,
        usersA: hasA.slice(0, 3),
        usersB: hasB.slice(0, 3)
      });
    }
  }
  
  return opportunities.sort((a, b) => b.potential - a.potential).slice(0, 5);
}

// Get trending discovery data
async function getTrendingData() {
  const trendingInterests = await userProfiles.getTrendingInterests();
  const trendingTags = await userProfiles.getTrendingTags();
  
  return { trendingInterests, trendingTags };
}

// Get quick connection suggestions
async function getQuickConnections(myHandle) {
  const myProfile = await userProfiles.getProfile(myHandle);
  const allProfiles = await userProfiles.getAllProfiles();
  
  const quickConnections = [];
  
  // People with complementary skills
  if (myProfile.tags) {
    const complementary = {
      'frontend': ['backend', 'design'],
      'backend': ['frontend', 'devops'],
      'design': ['frontend', 'product'],
      'ai': ['data', 'backend'],
      'product': ['engineering', 'design'],
      'marketing': ['product', 'design']
    };
    
    for (const mySkill of myProfile.tags) {
      const seekSkills = complementary[mySkill.toLowerCase()] || [];
      
      for (const profile of allProfiles) {
        if (profile.handle === myHandle) continue;
        
        const hasComplementary = profile.tags?.some(tag => 
          seekSkills.includes(tag.toLowerCase())
        );
        
        if (hasComplementary && quickConnections.length < 3) {
          quickConnections.push({
            handle: profile.handle,
            reason: `Your ${mySkill} + their ${profile.tags.find(t => seekSkills.includes(t.toLowerCase()))}`,
            building: profile.building,
            lastSeen: profile.lastSeen
          });
        }
      }
    }
  }
  
  return quickConnections;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'overview';

  let display = '';

  try {
    switch (command) {
      case 'overview': {
        const stats = await getCommunityStats();
        const opportunities = await getDiscoveryOpportunities();
        const trending = await getTrendingData();
        
        display = `## /vibe Discovery Dashboard 🔍\n\n`;
        
        // Community stats
        display += `### Community Overview\n`;
        display += `👥 **${stats.totalUsers}** total members • **${stats.activeUsers}** active this week\n`;
        display += `🚀 **${stats.buildersWithProjects}** building projects • **${stats.usersWithSkills}** with skills listed\n`;
        display += `💡 **${stats.usersWithInterests}** with interests • Ready for connections!\n\n`;
        
        // Top opportunities
        if (opportunities.length > 0) {
          display += `### Top Connection Opportunities 🤝\n`;
          for (const opp of opportunities.slice(0, 3)) {
            display += `**${opp.description}** — ${opp.potential} potential connections\n`;
            display += `_${opp.skillA}: @${opp.usersA.join(', @')} • ${opp.skillB}: @${opp.usersB.join(', @')}_\n\n`;
          }
        }
        
        // Trending
        if (trending.trendingTags.length > 0) {
          display += `### Trending Skills 📊\n`;
          const topTags = trending.trendingTags.slice(0, 5);
          display += topTags.map(({tag, count}) => `**${tag}** (${count})`).join(' • ');
          display += '\n\n';
        }
        
        if (trending.trendingInterests.length > 0) {
          display += `### Popular Interests 🎯\n`;
          const topInterests = trending.trendingInterests.slice(0, 5);
          display += topInterests.map(({interest, count}) => `**${interest}** (${count})`).join(' • ');
          display += '\n\n';
        }
        
        // Quick actions
        display += `### Quick Discovery Actions\n`;
        display += `🎯 \`workshop-buddy find\` — Find your ideal workshop partner\n`;
        display += `🏪 \`skills-exchange browse\` — Browse skill marketplace\n`;
        display += `🔍 \`discover suggest\` — Get personalized matches\n`;
        display += `📈 \`discovery-dashboard trends\` — Deep dive into trends\n`;
        
        if (stats.totalUsers < 5) {
          display += `\n_💡 Community is growing! Invite friends to unlock better matching._`;
        }
        break;
      }

      case 'trends': {
        const trending = await getTrendingData();
        
        display = `## Discovery Trends 📊\n\n`;
        
        if (trending.trendingTags.length > 0) {
          display += `### Trending Skills & Technologies\n`;
          for (const {tag, count} of trending.trendingTags) {
            display += `**${tag}** — ${count} member${count > 1 ? 's' : ''}\n`;
          }
          display += `\n_Find people: \`discover search "${trending.trendingTags[0].tag}"\`_\n\n`;
        }
        
        if (trending.trendingInterests.length > 0) {
          display += `### Popular Interest Areas\n`;
          for (const {interest, count} of trending.trendingInterests) {
            display += `**${interest}** — ${count} member${count > 1 ? 's' : ''}\n`;
          }
          display += `\n_Browse interest: \`discover interests\`_\n\n`;
        }
        
        if (trending.trendingTags.length === 0 && trending.trendingInterests.length === 0) {
          display += `_No trends yet — be the first to set skills and interests!_\n\n`;
          display += `**Get started:**\n`;
          display += `\`update tags "your-skills"\`\n`;
          display += `\`update interests "your-interests"\``;
        }
        break;
      }

      case 'quick': {
        const quickConnections = await getQuickConnections(myHandle);
        
        display = `## Quick Connections for @${myHandle} ⚡\n\n`;
        
        if (quickConnections.length > 0) {
          display += `### Ready-to-Connect Matches\n`;
          for (const conn of quickConnections) {
            display += `**@${conn.handle}** — ${conn.reason}\n`;
            if (conn.building) display += `_Building: ${conn.building}_\n`;
            display += `💬 \`dm @${conn.handle} "Hey! I think we'd work great together..."\`\n\n`;
          }
        } else {
          display += `_No quick matches found right now._\n\n`;
          display += `**Improve your matches:**\n`;
          display += `1. \`update tags "your-skills"\` (e.g., "frontend, react, design")\n`;
          display += `2. \`update building "your project"\`\n`;
          display += `3. Try: \`workshop-buddy find\`\n`;
          display += `4. Or: \`skills-exchange browse\`\n\n`;
        }
        
        display += `### Other Discovery Options\n`;
        display += `🔍 \`discover suggest\` — AI-powered recommendations\n`;
        display += `🎯 \`workshop-buddy find\` — Collaboration-focused matching\n`;
        display += `🏪 \`skills-exchange match\` — Teaching/learning opportunities\n`;
        display += `👥 \`discover active\` — See who's online with similar interests`;
        break;
      }

      default:
        display = `## Discovery Dashboard Commands

**\`discovery-dashboard\`** — Full community overview and opportunities
**\`discovery-dashboard trends\`** — Deep dive into trending skills & interests
**\`discovery-dashboard quick\`** — Quick connection suggestions for you

**All Discovery Tools:**
- \`workshop-buddy find\` — Perfect collaboration partners
- \`skills-exchange browse\` — Teaching/learning marketplace  
- \`discover suggest\` — AI-powered recommendations
- \`discover active\` — See who's building similar things now`;
    }
  } catch (error) {
    display = `## Discovery Dashboard Error

${error.message}

Try: \`discovery-dashboard\` for the main view`;
  }

  return { display };
}

module.exports = { definition, handler };