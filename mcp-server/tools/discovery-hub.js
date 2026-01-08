/**
 * vibe discovery-hub — Your Discovery Command Center
 *
 * A unified hub for all discovery and connection features in /vibe.
 * Provides quick access to all discovery tools and shows recent activity.
 *
 * Commands:
 * - discovery-hub overview — All discovery tools and recent activity
 * - discovery-hub onboarding — Guide new users to discovery
 * - discovery-hub stats — Quick community statistics
 * - discovery-hub tools — All available discovery commands
 */

const config = require('../config');
const store = require('../store');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_hub',
  description: 'Central hub for all discovery and connection features.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['overview', 'onboarding', 'stats', 'tools'],
        description: 'Discovery hub command to run'
      }
    }
  }
};

// Get quick community stats
async function getQuickStats() {
  const profiles = await userProfiles.getAllProfiles();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  
  const totalUsers = profiles.length;
  const activeToday = profiles.filter(p => p.lastSeen && (now - p.lastSeen) < day).length;
  const withProjects = profiles.filter(p => p.building).length;
  const topInterests = await userProfiles.getTrendingInterests();
  const topSkills = await userProfiles.getTrendingTags();
  
  return {
    totalUsers,
    activeToday,
    withProjects,
    topInterests: topInterests.slice(0, 3),
    topSkills: topSkills.slice(0, 3)
  };
}

// Get recent community activity
async function getRecentActivity() {
  const profiles = await userProfiles.getAllProfiles();
  const recentlyUpdated = profiles
    .filter(p => p.lastUpdated)
    .sort((a, b) => b.lastUpdated - a.lastUpdated)
    .slice(0, 5);
    
  const recentlyActive = profiles
    .filter(p => p.lastSeen)
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, 5);
    
  return { recentlyUpdated, recentlyActive };
}

// Check if user needs onboarding
async function checkOnboardingStatus(handle) {
  const profile = await userProfiles.getProfile(handle);
  const needs = [];
  
  if (!profile.building) {
    needs.push('building');
  }
  if (!profile.interests || profile.interests.length === 0) {
    needs.push('interests');
  }
  if (!profile.tags || profile.tags.length === 0) {
    needs.push('tags');
  }
  if (!profile.connections || profile.connections.length === 0) {
    needs.push('connections');
  }
  
  return { needs, isComplete: needs.length === 0 };
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
        const stats = await getQuickStats();
        const activity = await getRecentActivity();
        const onboarding = await checkOnboardingStatus(myHandle);
        
        display = `## /vibe Discovery Hub 🎯\n\n`;
        
        // Quick stats
        display += `### Community at a Glance\n`;
        display += `**${stats.totalUsers} builders** • **${stats.activeToday} active today** • **${stats.withProjects} with projects**\n\n`;
        
        if (stats.topInterests.length > 0) {
          display += `**Trending:** ${stats.topInterests.map(i => i.interest).join(', ')}`;
          if (stats.topSkills.length > 0) {
            display += ` • ${stats.topSkills.map(s => s.tag).join(', ')}`;
          }
          display += `\n\n`;
        }
        
        // Onboarding check
        if (!onboarding.isComplete) {
          display += `### 🚀 Complete Your Discovery Profile\n`;
          if (onboarding.needs.includes('building')) {
            display += `• **Share what you're building:** \`update building "your project"\`\n`;
          }
          if (onboarding.needs.includes('interests')) {
            display += `• **Add interests:** \`update interests "ai, startups, music"\`\n`;
          }
          if (onboarding.needs.includes('tags')) {
            display += `• **Tag your skills:** \`update tags "frontend, react, typescript"\`\n`;
          }
          if (onboarding.needs.includes('connections')) {
            display += `• **Find connections:** \`discover suggest\` or \`skills-exchange browse\`\n`;
          }
          display += `\n`;
        }
        
        // Discovery tools
        display += `### 🔍 Discovery Tools\n`;
        display += `**\`discover suggest\`** — AI-matched recommendations\n`;
        display += `**\`skills-exchange browse\`** — Skills marketplace\n`;
        display += `**\`workshop-buddy find\`** — Find collaboration partners\n`;
        display += `**\`discovery-analytics overview\`** — Community insights\n\n`;
        
        // Recent activity
        if (activity.recentlyActive.length > 0) {
          display += `### 📊 Recent Activity\n`;
          for (const user of activity.recentlyActive.slice(0, 3)) {
            display += `**@${user.handle}** `;
            if (user.building) {
              display += `building ${user.building.length > 30 ? user.building.substring(0, 30) + '...' : user.building}`;
            } else {
              display += `was active`;
            }
            display += ` _(${formatTimeAgo(user.lastSeen)})_\n`;
          }
          display += `\n`;
        }
        
        // Quick actions
        display += `### ⚡ Quick Actions\n`;
        display += `• \`discover active\` — See who's online now\n`;
        display += `• \`skills-exchange match\` — Find skill exchanges\n`;
        display += `• \`discovery-hub tools\` — All discovery commands\n`;
        
        break;
      }

      case 'onboarding': {
        const onboarding = await checkOnboardingStatus(myHandle);
        
        if (onboarding.isComplete) {
          display = `## Discovery Setup Complete! ✅\n\n`;
          display += `Your profile is ready for discovery. Here's what you can do:\n\n`;
          display += `**Find People:**\n`;
          display += `• \`discover suggest\` — Get AI-matched recommendations\n`;
          display += `• \`discover search "topic"\` — Find people by interest\n`;
          display += `• \`discover active\` — See who's building similar things now\n\n`;
          
          display += `**Skills & Collaboration:**\n`;
          display += `• \`skills-exchange browse\` — Browse skill offers/requests\n`;
          display += `• \`workshop-buddy find\` — Find collaboration partners\n`;
          display += `• \`skills-exchange post --type offer --skill "your expertise"\`\n\n`;
          
          display += `**Analytics:**\n`;
          display += `• \`discovery-analytics overview\` — Community insights\n`;
          display += `• \`discovery-analytics gaps\` — Find connection opportunities\n`;
        } else {
          display = `## Complete Your Discovery Setup 🚀\n\n`;
          display += `To get the best recommendations and connections, complete your profile:\n\n`;
          
          if (onboarding.needs.includes('building')) {
            display += `### 1. Share What You're Building\n`;
            display += `\`update building "AI chat app using Next.js"\`\n`;
            display += `_This helps us find people working on similar projects._\n\n`;
          }
          
          if (onboarding.needs.includes('interests')) {
            display += `### 2. Add Your Interests\n`;
            display += `\`update interests "ai, startups, music, photography"\`\n`;
            display += `_Connect with people who share your passions._\n\n`;
          }
          
          if (onboarding.needs.includes('tags')) {
            display += `### 3. Tag Your Skills\n`;
            display += `\`update tags "frontend, react, typescript, design"\`\n`;
            display += `_Enable skill-based matching and collaboration._\n\n`;
          }
          
          if (onboarding.needs.includes('connections')) {
            display += `### 4. Make Your First Connections\n`;
            display += `\`discover suggest\` — Get personalized recommendations\n`;
            display += `\`skills-exchange browse\` — Find skill exchanges\n`;
            display += `_Start building your network._\n\n`;
          }
          
          display += `**Once complete, you'll unlock:**\n`;
          display += `• Better AI-matched recommendations\n`;
          display += `• Skills marketplace access\n`;
          display += `• Workshop buddy matching\n`;
          display += `• Community analytics\n`;
        }
        break;
      }

      case 'stats': {
        const stats = await getQuickStats();
        
        display = `## Community Stats 📊\n\n`;
        display += `**Total Builders:** ${stats.totalUsers}\n`;
        display += `**Active Today:** ${stats.activeToday}\n`;
        display += `**With Projects:** ${stats.withProjects}\n\n`;
        
        if (stats.topInterests.length > 0) {
          display += `**Top Interests:**\n`;
          for (const interest of stats.topInterests) {
            display += `• ${interest.interest} (${interest.count} people)\n`;
          }
          display += `\n`;
        }
        
        if (stats.topSkills.length > 0) {
          display += `**Popular Skills:**\n`;
          for (const skill of stats.topSkills) {
            display += `• ${skill.tag} (${skill.count} people)\n`;
          }
          display += `\n`;
        }
        
        display += `**Discovery Health:**\n`;
        display += `• Profile completion rate: ${Math.round((stats.withProjects / stats.totalUsers) * 100)}%\n`;
        display += `• Daily activity rate: ${Math.round((stats.activeToday / stats.totalUsers) * 100)}%\n\n`;
        
        display += `For detailed analytics: \`discovery-analytics overview\``;
        break;
      }

      case 'tools': {
        display = `## All Discovery Tools 🛠️\n\n`;
        
        display += `### Core Discovery\n`;
        display += `**\`discover suggest\`** — AI-matched recommendations\n`;
        display += `**\`discover search <topic>\`** — Find people by interest/skill\n`;
        display += `**\`discover interests\`** — Browse by interest categories\n`;
        display += `**\`discover active\`** — Who's building similar things now\n\n`;
        
        display += `### Skills & Collaboration\n`;
        display += `**\`skills-exchange browse\`** — Browse skill marketplace\n`;
        display += `**\`skills-exchange post --type offer|request --skill "skill"\`** — Post offers/requests\n`;
        display += `**\`skills-exchange match\`** — Find skill exchange matches\n`;
        display += `**\`workshop-buddy find\`** — Find collaboration partners\n`;
        display += `**\`workshop-buddy seeking "skill"\`** — Find specific expertise\n\n`;
        
        display += `### Analytics & Insights\n`;
        display += `**\`discovery-analytics overview\`** — Community health metrics\n`;
        display += `**\`discovery-analytics gaps\`** — Find connection opportunities\n`;
        display += `**\`discovery-analytics popular\`** — Trending interests/skills\n`;
        display += `**\`discovery-analytics lonely\`** — People who need connections\n\n`;
        
        display += `### Profile Setup\n`;
        display += `**\`update building "project"\`** — Share what you're working on\n`;
        display += `**\`update interests "list"\`** — Add interests for matching\n`;
        display += `**\`update tags "skills"\`** — Tag your skills for collaboration\n\n`;
        
        display += `### Quick Actions\n`;
        display += `**\`who\`** — See who's online now\n`;
        display += `**\`dm @handle "message"\`** — Direct message someone\n`;
        display += `**\`ship "what you built"\`** — Share your accomplishments\n`;
        
        break;
      }

      default:
        display = `## Discovery Hub Commands

**\`discovery-hub overview\`** — Complete discovery dashboard
**\`discovery-hub onboarding\`** — Setup guide for new users  
**\`discovery-hub stats\`** — Quick community statistics
**\`discovery-hub tools\`** — All available discovery commands

**Your central hub for:**
- Finding interesting people to connect with
- Skills marketplace and collaboration
- Community insights and analytics
- Profile setup and optimization`;
    }
  } catch (error) {
    display = `## Discovery Hub Error

${error.message}

Try: \`discovery-hub\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };