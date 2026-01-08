/**
 * vibe discovery-hub — One Place for All Discovery Features
 *
 * A unified interface that brings together all discovery tools:
 * - General people discovery
 * - Workshop buddy matching  
 * - Skills exchange marketplace
 * - Community analytics
 *
 * This helps users navigate the discovery ecosystem without getting lost
 * in separate commands.
 *
 * Commands:
 * - discovery-hub — Show overview of all discovery options
 * - discovery-hub quick — Quick discovery based on your profile
 * - discovery-hub browse — Browse all community features
 * - discovery-hub help — Get started with discovery
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_hub',
  description: 'Unified interface for all discovery and connection features.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['overview', 'quick', 'browse', 'help'],
        description: 'Discovery hub command to run'
      }
    }
  }
};

// Analyze user's profile to suggest best discovery path
async function getPersonalizedPath(handle) {
  const profile = await userProfiles.getProfile(handle);
  const suggestions = [];
  
  // Profile completeness
  const hasBuilding = profile.building && profile.building.length > 0;
  const hasInterests = profile.interests && profile.interests.length > 0;
  const hasTags = profile.tags && profile.tags.length > 0;
  const hasConnections = profile.connections && profile.connections.length > 0;
  
  // Suggest profile improvements first
  if (!hasBuilding && !hasInterests && !hasTags) {
    suggestions.push({
      type: 'setup',
      priority: 'high',
      action: 'Complete your profile first',
      command: 'vibe update building "what you\'re working on"',
      reason: 'Discovery works better with a complete profile'
    });
  } else {
    // Suggest discovery actions based on what they have
    if (hasBuilding && hasTags) {
      suggestions.push({
        type: 'buddy',
        priority: 'high', 
        action: 'Find your workshop buddy',
        command: 'workshop-buddy find',
        reason: 'You have skills - find collaboration partners'
      });
    }
    
    if (hasTags) {
      suggestions.push({
        type: 'exchange',
        priority: 'medium',
        action: 'Join skills marketplace',
        command: 'skills-exchange post --type offer --skill "your-expertise"',
        reason: 'Share your skills with the community'
      });
    }
    
    if (hasInterests) {
      suggestions.push({
        type: 'discover',
        priority: 'medium', 
        action: 'Find similar builders',
        command: 'discover suggest',
        reason: 'Connect with people who share your interests'
      });
    }
    
    if (!hasConnections) {
      suggestions.push({
        type: 'analytics',
        priority: 'low',
        action: 'See who needs connections',
        command: 'discovery-analytics lonely',
        reason: 'Help others while making connections'
      });
    }
  }
  
  return suggestions.sort((a, b) => {
    const priority = { high: 3, medium: 2, low: 1 };
    return priority[b.priority] - priority[a.priority];
  });
}

// Get community overview stats
async function getCommunityOverview() {
  const profiles = await userProfiles.getAllProfiles();
  const totalUsers = profiles.length;
  
  if (totalUsers === 0) {
    return {
      isEmpty: true,
      message: "Community is just getting started!"
    };
  }
  
  const withSkills = profiles.filter(p => p.tags && p.tags.length > 0).length;
  const withProjects = profiles.filter(p => p.building).length;
  const connected = profiles.filter(p => p.connections && p.connections.length > 0).length;
  
  const trendingInterests = await userProfiles.getTrendingInterests();
  const trendingTags = await userProfiles.getTrendingTags();
  
  return {
    isEmpty: false,
    totalUsers,
    withSkills,
    withProjects,
    connected,
    connectionRate: Math.round((connected / totalUsers) * 100),
    topInterests: trendingInterests.slice(0, 3),
    topSkills: trendingTags.slice(0, 3)
  };
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'overview';

  let display = '';

  try {
    switch (command) {
      case 'overview':
      case undefined: {
        const overview = await getCommunityOverview();
        
        display = `## /vibe Discovery Hub 🧭\n\n`;
        display += `_Your one-stop shop for finding interesting people to connect with._\n\n`;
        
        if (overview.isEmpty) {
          display += `### ${overview.message}\n\n`;
          display += `**Help us build the community:**\n`;
          display += `1. \`vibe update building "your project"\`\n`;
          display += `2. \`vibe update tags "your-skills"\`\n`;
          display += `3. \`vibe update interests "what excites you"\`\n\n`;
        } else {
          display += `### Community Snapshot\n`;
          display += `👥 **${overview.totalUsers} total members**\n`;
          display += `🛠️ **${overview.withProjects} building projects**\n`;
          display += `⚡ **${overview.withSkills} sharing skills**\n`;
          display += `🤝 **${overview.connectionRate}% have made connections**\n\n`;
          
          if (overview.topInterests.length > 0) {
            display += `**Trending:** ${overview.topInterests.map(i => i.interest).join(', ')}\n`;
          }
          if (overview.topSkills.length > 0) {
            display += `**Hot skills:** ${overview.topSkills.map(s => s.tag).join(', ')}\n`;
          }
        }
        
        display += `\n### Discovery Tools\n`;
        display += `🎯 **\`discovery-hub quick\`** — Personalized discovery path\n`;
        display += `👥 **\`discover suggest\`** — Find similar builders\n`;
        display += `🤝 **\`workshop-buddy find\`** — Find collaboration partners\n`;
        display += `🏪 **\`skills-exchange browse\`** — Skills marketplace\n`;
        display += `📊 **\`discovery-analytics overview\`** — Community insights\n\n`;
        
        display += `### Quick Actions\n`;
        display += `🔍 **\`discover search "ai"\`** — Find people by topic\n`;
        display += `📝 **\`skills-exchange post\`** — Offer/request skills\n`;
        display += `💬 **\`discovery-hub browse\`** — Explore everything\n`;
        display += `❓ **\`discovery-hub help\`** — Get started guide`;
        break;
      }

      case 'quick': {
        const path = await getPersonalizedPath(myHandle);
        
        display = `## Your Personalized Discovery Path 🎯\n\n`;
        
        if (path.length === 0) {
          display += `**You're all set!** 🎉\n\n`;
          display += `Your profile looks good and you're connected. Here's what you can do:\n\n`;
          display += `• **\`discover active\`** — See who's building similar things now\n`;
          display += `• **\`skills-exchange match\`** — Find skill exchange opportunities\n`;
          display += `• **\`discovery-analytics gaps\`** — Help others connect\n`;
        } else {
          display += `_Based on your profile, here's the best path forward:_\n\n`;
          
          for (let i = 0; i < path.length && i < 3; i++) {
            const step = path[i];
            const priority = step.priority === 'high' ? '🔥' : step.priority === 'medium' ? '⭐' : '💡';
            
            display += `${priority} **${step.action}**\n`;
            display += `\`${step.command}\`\n`;
            display += `_${step.reason}_\n\n`;
          }
          
          if (path.length > 3) {
            display += `**More options:**\n`;
            for (let i = 3; i < path.length; i++) {
              display += `• ${path[i].action}\n`;
            }
          }
        }
        
        display += `\n**Want to explore?**\n`;
        display += `\`discovery-hub browse\` — See all features`;
        break;
      }

      case 'browse': {
        display = `## All Discovery Features 🌐\n\n`;
        
        display += `### 👥 General Discovery\n`;
        display += `• **\`discover suggest\`** — AI-matched recommendations\n`;
        display += `• **\`discover search <topic>\`** — Find people by interest/skill\n`;
        display += `• **\`discover interests\`** — Browse by community interests\n`;
        display += `• **\`discover active\`** — Similar builders online now\n\n`;
        
        display += `### 🤝 Workshop Collaboration\n`;
        display += `• **\`workshop-buddy find\`** — Find perfect collaboration partner\n`;
        display += `• **\`workshop-buddy seeking <skills>\`** — Find specific expertise\n`;
        display += `• **\`workshop-buddy offer <skills>\`** — Share what you can help with\n`;
        display += `• **\`workshop-buddy matches\`** — Browse skill exchanges\n\n`;
        
        display += `### 🏪 Skills Marketplace\n`;
        display += `• **\`skills-exchange browse\`** — Browse all offerings\n`;
        display += `• **\`skills-exchange post\`** — Post offer/request\n`;
        display += `• **\`skills-exchange match\`** — Find your perfect exchanges\n`;
        display += `• **\`skills-exchange requests\`** — See what people need\n\n`;
        
        display += `### 📊 Community Intelligence\n`;
        display += `• **\`discovery-analytics overview\`** — Community health\n`;
        display += `• **\`discovery-analytics gaps\`** — Connection opportunities\n`;
        display += `• **\`discovery-analytics popular\`** — Trending topics\n`;
        display += `• **\`discovery-analytics lonely\`** — People needing connections\n\n`;
        
        display += `### 🚀 Quick Starts\n`;
        display += `• **New here?** → \`discovery-hub help\`\n`;
        display += `• **Have skills?** → \`workshop-buddy find\`\n`;
        display += `• **Looking for help?** → \`skills-exchange browse\`\n`;
        display += `• **Want to browse?** → \`discover interests\``;
        break;
      }

      case 'help': {
        display = `## Getting Started with Discovery 🚀\n\n`;
        
        display += `### Step 1: Complete Your Profile\n`;
        display += `\`vibe update building "your current project"\`\n`;
        display += `\`vibe update tags "frontend,react,typescript"\`\n`;
        display += `\`vibe update interests "ai,startups,music"\`\n\n`;
        
        display += `### Step 2: Find Your First Connections\n`;
        display += `**Option A:** \`discover suggest\` — Get AI recommendations\n`;
        display += `**Option B:** \`discover search "ai"\` — Find people by topic\n`;
        display += `**Option C:** \`workshop-buddy find\` — Find collaboration partners\n\n`;
        
        display += `### Step 3: Join the Marketplace\n`;
        display += `\`skills-exchange post --type offer --skill "your expertise"\`\n`;
        display += `\`skills-exchange browse\` — See what others offer\n\n`;
        
        display += `### Step 4: Connect!\n`;
        display += `\`dm @username "Hey! I saw your profile..."\`\n`;
        display += `\`suggest-connection @user1 @user2 "reason"\` — Help others connect\n\n`;
        
        display += `### Tips for Success\n`;
        display += `• **Be specific** in your profile (helps matching)\n`;
        display += `• **Update regularly** as your interests change\n`;
        display += `• **Reach out proactively** — don't wait for perfect matches\n`;
        display += `• **Help others connect** — it builds community karma\n\n`;
        
        display += `**Ready to start?**\n`;
        display += `\`discovery-hub quick\` — Get your personalized path`;
        break;
      }

      default:
        display = `## Discovery Hub Commands

**\`discovery-hub\`** — Show overview of all discovery features
**\`discovery-hub quick\`** — Get your personalized discovery path  
**\`discovery-hub browse\`** — Explore all features
**\`discovery-hub help\`** — Complete getting started guide

This hub connects you to:
- General people discovery (\`discover\`)
- Workshop collaboration (\`workshop-buddy\`) 
- Skills marketplace (\`skills-exchange\`)
- Community analytics (\`discovery-analytics\`)`;
    }
  } catch (error) {
    display = `## Discovery Hub Error

${error.message}

Try: \`discovery-hub\` for the overview`;
  }

  return { display };
}

module.exports = { definition, handler };