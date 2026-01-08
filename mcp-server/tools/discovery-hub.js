/**
 * Discovery Hub — Central Navigation for Finding Your People
 *
 * A unified dashboard that brings together all discovery tools:
 * - Skills Exchange marketplace
 * - Workshop Buddy matching  
 * - General discovery
 * - Analytics and insights
 *
 * Commands:
 * - discovery-hub — Show the main discovery dashboard
 * - discovery-hub onboard — Quick onboarding for new users
 * - discovery-hub stats — Overall community connection stats
 */

const config = require('../config');
const store = require('../store');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_hub',
  description: 'Central hub for all discovery and connection tools.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['dashboard', 'onboard', 'stats'],
        description: 'Hub command to run'
      }
    }
  }
};

// Get user's discovery readiness score
async function getDiscoveryReadiness(handle) {
  const profile = await userProfiles.getProfile(handle);
  let score = 0;
  const missing = [];

  if (profile.building) score += 30;
  else missing.push('what you\'re building');

  if (profile.interests && profile.interests.length > 0) score += 25;
  else missing.push('your interests');

  if (profile.tags && profile.tags.length > 0) score += 25;
  else missing.push('your skills/tags');

  if (profile.lastSeen && (Date.now() - profile.lastSeen) < 7 * 24 * 60 * 60 * 1000) score += 20;
  else missing.push('recent activity');

  return { score, missing };
}

// Get community activity summary
async function getCommunityActivity() {
  const allProfiles = await userProfiles.getAllProfiles();
  const skillExchanges = await store.getSkillExchanges() || [];
  
  const stats = {
    totalMembers: allProfiles.length,
    activeMembers: allProfiles.filter(p => p.lastSeen && (Date.now() - p.lastSeen) < 7 * 24 * 60 * 60 * 1000).length,
    skillPosts: skillExchanges.filter(s => s.status === 'active').length,
    completeProfiles: allProfiles.filter(p => p.building && p.interests && p.tags).length,
    recentActivity: skillExchanges.filter(s => (Date.now() - s.timestamp) < 24 * 60 * 60 * 1000).length
  };

  return stats;
}

// Get personalized quick actions
async function getQuickActions(handle) {
  const profile = await userProfiles.getProfile(handle);
  const actions = [];

  // Profile completion
  if (!profile.building) {
    actions.push({
      icon: '🎯',
      action: 'Share what you\'re building',
      command: 'vibe update building "your current project"',
      priority: 'high'
    });
  }

  if (!profile.interests || profile.interests.length === 0) {
    actions.push({
      icon: '💡',
      action: 'Add your interests',
      command: 'vibe update interests "ai, startups, design"',
      priority: 'high'
    });
  }

  if (!profile.tags || profile.tags.length === 0) {
    actions.push({
      icon: '🏷️',
      action: 'Tag your skills',
      command: 'vibe update tags "frontend, react, python"',
      priority: 'high'
    });
  }

  // Discovery actions
  if (profile.building && profile.interests) {
    actions.push({
      icon: '🤝',
      action: 'Find your workshop buddy',
      command: 'workshop-buddy find',
      priority: 'medium'
    });

    actions.push({
      icon: '🔍',
      action: 'Get personalized matches',
      command: 'discover suggest',
      priority: 'medium'
    });
  }

  // Skill sharing
  if (profile.tags && profile.tags.length > 0) {
    actions.push({
      icon: '🏪',
      action: 'Browse skills marketplace',
      command: 'skills-exchange browse',
      priority: 'low'
    });

    actions.push({
      icon: '📊',
      action: 'View skill analytics',
      command: 'skills-analytics insights',
      priority: 'low'
    });
  }

  return actions.slice(0, 4); // Top 4 suggestions
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'dashboard';

  let display = '';

  try {
    switch (command) {
      case 'dashboard': {
        const readiness = await getDiscoveryReadiness(myHandle);
        const quickActions = await getQuickActions(myHandle);
        const communityStats = await getCommunityActivity();

        display = `# 🌟 Discovery Hub\n\n`;
        
        // Profile readiness section
        display += `## Your Discovery Profile (${readiness.score}%)\n`;
        if (readiness.score >= 80) {
          display += `🎉 **Excellent!** Your profile is ready for great connections.\n\n`;
        } else if (readiness.score >= 60) {
          display += `⚡ **Good!** A few tweaks will improve your matches.\n\n`;
        } else {
          display += `📝 **Getting started.** Complete your profile for better matches.\n\n`;
        }

        if (readiness.missing.length > 0) {
          display += `**Missing:** ${readiness.missing.join(', ')}\n\n`;
        }

        // Quick actions
        display += `## Quick Actions\n`;
        for (const action of quickActions) {
          const priority = action.priority === 'high' ? ' **(recommended)**' : '';
          display += `${action.icon} **${action.action}**${priority}\n`;
          display += `   \`${action.command}\`\n\n`;
        }

        // Discovery tools overview
        display += `## 🛠️ Discovery Tools\n\n`;
        
        display += `### Skills Exchange 🏪\n`;
        display += `Trade skills with the community. Post offers and requests.\n`;
        display += `• \`skills-exchange browse\` — See all skill posts\n`;
        display += `• \`skills-exchange post --type offer --skill "your expertise"\`\n`;
        display += `• \`skills-analytics insights\` — Market intelligence\n\n`;

        display += `### Workshop Buddy 🤝\n`;
        display += `Find your perfect collaboration partner with complementary skills.\n`;
        display += `• \`workshop-buddy find\` — Get AI-matched partners\n`;
        display += `• \`workshop-buddy seeking "skill"\` — Find specific expertise\n\n`;

        display += `### General Discovery 🔍\n`;
        display += `Find people based on projects, interests, and activity.\n`;
        display += `• \`discover suggest\` — Personalized recommendations\n`;
        display += `• \`discover search "topic"\` — Find specific interests\n`;
        display += `• \`discover active\` — See who's online and building\n\n`;

        // Community stats
        display += `## 📊 Community Pulse\n`;
        display += `• **${communityStats.totalMembers}** total members\n`;
        display += `• **${communityStats.activeMembers}** active this week\n`;
        display += `• **${communityStats.skillPosts}** active skill posts\n`;
        display += `• **${communityStats.completeProfiles}** complete profiles\n`;
        
        if (communityStats.recentActivity > 0) {
          display += `• **${communityStats.recentActivity}** new posts today\n`;
        }

        display += `\n**Ready to connect?** Start with your highest priority action above! 🚀`;
        break;
      }

      case 'onboard': {
        display = `# 🎯 Discovery Onboarding\n\n`;
        display += `Welcome to /vibe! Let's get you set up for great connections.\n\n`;

        display += `## Step 1: Tell Us About You\n`;
        display += `**What are you building?** _(Projects help us find collaborators)_\n`;
        display += `\`vibe update building "AI chat app for customer service"\`\n\n`;

        display += `**What interests you?** _(We'll find people with shared passions)_\n`;
        display += `\`vibe update interests "ai, startups, music, climbing"\`\n\n`;

        display += `**What are your skills?** _(For skill sharing and complementary matching)_\n`;
        display += `\`vibe update tags "frontend, react, typescript, design"\`\n\n`;

        display += `## Step 2: Start Discovering\n`;
        display += `Once your profile is set up:\n\n`;

        display += `🤝 **Find a workshop buddy**\n`;
        display += `\`workshop-buddy find\` — Get matched with complementary skills\n\n`;

        display += `🔍 **Discover interesting people**\n`;
        display += `\`discover suggest\` — AI recommendations based on your profile\n\n`;

        display += `🏪 **Join the skills marketplace**\n`;
        display += `\`skills-exchange browse\` — See what people are offering/requesting\n\n`;

        display += `## Pro Tips\n`;
        display += `• **Be specific** in your building description (helps with matches)\n`;
        display += `• **Update regularly** — your profile evolves with your projects\n`;
        display += `• **Engage actively** — reach out when you see good matches\n`;
        display += `• **Use the hub** — \`discovery-hub\` shows your personalized action plan\n\n`;

        display += `**Ready?** Run \`discovery-hub\` for your personalized dashboard! 🌟`;
        break;
      }

      case 'stats': {
        const communityStats = await getCommunityActivity();
        const allProfiles = await userProfiles.getAllProfiles();
        const skillExchanges = await store.getSkillExchanges() || [];

        display = `# 📊 Community Discovery Stats\n\n`;

        display += `## Member Engagement\n`;
        display += `• **Total members:** ${communityStats.totalMembers}\n`;
        display += `• **Complete profiles:** ${communityStats.completeProfiles} (${Math.round((communityStats.completeProfiles / Math.max(1, communityStats.totalMembers)) * 100)}%)\n`;
        display += `• **Active this week:** ${communityStats.activeMembers}\n`;
        display += `• **Recent activity:** ${communityStats.recentActivity} posts today\n\n`;

        display += `## Skills Marketplace\n`;
        display += `• **Active skill posts:** ${communityStats.skillPosts}\n`;
        
        const skillTypes = skillExchanges.reduce((acc, post) => {
          if (post.status === 'active') {
            acc[post.type] = (acc[post.type] || 0) + 1;
          }
          return acc;
        }, {});

        if (skillTypes.offer || skillTypes.request) {
          display += `• **Offers:** ${skillTypes.offer || 0}\n`;
          display += `• **Requests:** ${skillTypes.request || 0}\n`;
        }

        // Top interests
        const interestCounts = {};
        for (const profile of allProfiles) {
          if (profile.interests) {
            for (const interest of profile.interests) {
              interestCounts[interest] = (interestCounts[interest] || 0) + 1;
            }
          }
        }

        const topInterests = Object.entries(interestCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);

        if (topInterests.length > 0) {
          display += `\n## Popular Interests\n`;
          for (const [interest, count] of topInterests) {
            display += `• **${interest}** (${count} people)\n`;
          }
        }

        // Top skills
        const skillCounts = {};
        for (const profile of allProfiles) {
          if (profile.tags) {
            for (const tag of profile.tags) {
              skillCounts[tag] = (skillCounts[tag] || 0) + 1;
            }
          }
        }

        const topSkills = Object.entries(skillCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);

        if (topSkills.length > 0) {
          display += `\n## Common Skills\n`;
          for (const [skill, count] of topSkills) {
            display += `• **${skill}** (${count} people)\n`;
          }
        }

        display += `\n**Growing the community?**\n`;
        display += `• Encourage profile completion with \`discovery-hub onboard\`\n`;
        display += `• Share interesting discoveries to inspire others\n`;
        display += `• Use \`skills-analytics trends\` for marketplace insights`;
        break;
      }

      default:
        display = `## Discovery Hub Commands

**\`discovery-hub\`** — Your personalized discovery dashboard
**\`discovery-hub onboard\`** — Quick onboarding guide for new users  
**\`discovery-hub stats\`** — Community connection and engagement stats

**All Discovery Tools:**
- Skills Exchange: \`skills-exchange browse\`
- Workshop Buddy: \`workshop-buddy find\`
- General Discovery: \`discover suggest\`
- Analytics: \`skills-analytics insights\`

Perfect central command for navigating all /vibe discovery features!`;
    }
  } catch (error) {
    display = `## Discovery Hub Error

${error.message}

Try: \`discovery-hub\` for the main dashboard`;
  }

  return { display };
}

module.exports = { definition, handler };