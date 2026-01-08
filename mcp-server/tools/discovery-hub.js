/**
 * vibe discovery-hub — Your Gateway to Community Connections
 *
 * One-stop dashboard for all discovery and connection features.
 * Aggregates suggestions from all discovery tools and presents
 * the most relevant opportunities for each user.
 *
 * Commands:
 * - discovery-hub dashboard — Personal connection dashboard
 * - discovery-hub quick — Quick actions for immediate connections
 * - discovery-hub status — Discovery system health and stats
 * - discovery-hub tour — Guide to all discovery features
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

// Import other discovery tools
const discover = require('./discover');
const workshopBuddy = require('./workshop-buddy');
const skillsExchange = require('./skills-exchange');
const discoverInsights = require('./discover-insights');
const discoveryProactive = require('./discovery-proactive');

const definition = {
  name: 'vibe_discovery_hub',
  description: 'Central dashboard for all discovery and connection features.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['dashboard', 'quick', 'status', 'tour'],
        description: 'Discovery hub command to run'
      }
    }
  }
};

// Generate personalized discovery dashboard
async function generateDashboard(handle) {
  let dashboard = `# 🎯 Discovery Dashboard for @${handle}\n\n`;
  
  try {
    // Get user profile
    const profile = await userProfiles.getProfile(handle);
    const profileComplete = profile.building && profile.interests?.length > 0 && profile.tags?.length > 0;
    
    // Profile status
    dashboard += `## Your Profile Status\n`;
    if (profileComplete) {
      dashboard += `✅ **Profile Complete** - Great for matching!\n`;
      dashboard += `• Building: ${profile.building}\n`;
      if (profile.interests?.length > 0) {
        dashboard += `• Interests: ${profile.interests.join(', ')}\n`;
      }
      if (profile.tags?.length > 0) {
        dashboard += `• Skills: ${profile.tags.join(', ')}\n`;
      }
    } else {
      dashboard += `⚠️ **Profile Incomplete** - Update for better matches\n`;
      if (!profile.building) dashboard += `• Add what you're building: \`update building "your project"\`\n`;
      if (!profile.interests?.length) dashboard += `• Add interests: \`update interests "ai, startups"\`\n`;
      if (!profile.tags?.length) dashboard += `• Add skills: \`update tags "frontend, react"\`\n`;
    }
    dashboard += `\n`;

    // Quick discovery results
    if (profileComplete) {
      // Get top suggestions from each tool
      dashboard += `## Your Top Connections 🤝\n`;
      
      try {
        // General discovery
        const generalResults = await discover.handler({ command: 'suggest' });
        if (generalResults.display && !generalResults.display.includes('No Matches Found')) {
          const matches = extractTopMatches(generalResults.display, 2);
          dashboard += `**Similar Builders:**\n${matches}\n`;
        }
        
        // Workshop buddies
        const buddyResults = await workshopBuddy.handler({ command: 'find' });
        if (buddyResults.display && !buddyResults.display.includes('No Workshop Buddies Found')) {
          const buddies = extractTopMatches(buddyResults.display, 1);
          dashboard += `**Workshop Partners:**\n${buddies}\n`;
        }
        
        // Skills exchange
        const skillResults = await skillsExchange.handler({ command: 'match' });
        if (skillResults.display && !skillResults.display.includes('No matches found')) {
          dashboard += `**Skill Exchange:** Available - check \`skills-exchange match\`\n`;
        }
        
      } catch (error) {
        dashboard += `_Connection matching temporarily unavailable_\n`;
      }
      
      dashboard += `\n## Quick Actions 🚀\n`;
      dashboard += `• \`discovery-hub quick\` — Immediate connection opportunities\n`;
      dashboard += `• \`discover suggest\` — Get full personalized recommendations\n`;
      dashboard += `• \`workshop-buddy find\` — Find perfect collaboration partners\n`;
      dashboard += `• \`skills-exchange match\` — See skill trading opportunities\n`;
      
    } else {
      dashboard += `## Complete Your Profile First! 📝\n`;
      dashboard += `A complete profile gets 5x more connection opportunities.\n\n`;
      dashboard += `**Quick setup:**\n`;
      dashboard += `1. \`update building "what you're working on"\`\n`;
      dashboard += `2. \`update interests "ai, startups, music"\`\n`;
      dashboard += `3. \`update tags "frontend, react, typescript"\`\n`;
      dashboard += `4. \`discovery-hub dashboard\` — Return here for matches!\n`;
    }
    
    dashboard += `\n---\n`;
    dashboard += `💡 Use \`discovery-hub tour\` to learn about all discovery features`;
    
  } catch (error) {
    dashboard += `Dashboard temporarily unavailable: ${error.message}\n\n`;
    dashboard += `Try: \`discovery-hub tour\` for feature overview`;
  }
  
  return dashboard;
}

// Extract top matches from discovery results (helper)
function extractTopMatches(displayText, count = 2) {
  const lines = displayText.split('\n');
  const matches = [];
  
  for (const line of lines) {
    if (line.startsWith('**@') && line.includes('**')) {
      matches.push(`• ${line}`);
      if (matches.length >= count) break;
    }
  }
  
  return matches.join('\n') || '• No matches available right now';
}

// Quick connection opportunities
async function getQuickConnections(handle) {
  let quick = `## ⚡ Quick Connection Opportunities\n\n`;
  
  try {
    // Check for online opportunities
    const proactiveResults = await discoveryProactive.handler({ action: 'opportunities' });
    if (proactiveResults.display.includes('high-value opportunities')) {
      quick += `🔥 **Perfect Timing Matches** - People online now with great compatibility!\n`;
      quick += `Check: \`discovery-proactive opportunities\`\n\n`;
    }
    
    // Recent ships connections
    const shipResults = await discoveryProactive.handler({ action: 'ships' });
    if (shipResults.display.includes('Connection Opportunities')) {
      quick += `🚢 **Recent Ship Connections** - Connect with people who just built something!\n`;
      quick += `Check: \`discovery-proactive ships\`\n\n`;
    }
    
    // Trending topics
    const trendingResults = await discoveryProactive.handler({ action: 'trending' });
    if (trendingResults.display.includes('trending topics')) {
      quick += `📈 **Trending Topics** - Join active conversations and clusters!\n`;
      quick += `Check: \`discovery-proactive trending\`\n\n`;
    }
    
    // General recommendations
    quick += `## 📋 Always Available\n`;
    quick += `• \`who\` — See who's online now\n`;
    quick += `• \`discover search "ai"\` — Find people by topic\n`;
    quick += `• \`skills-exchange browse\` — Browse skill marketplace\n`;
    quick += `• \`workshop-buddy matches\` — See community skill exchanges\n\n`;
    
    quick += `💡 **Pro tip:** The best connections happen when both people are online!`;
    
  } catch (error) {
    quick += `Quick connections temporarily unavailable.\n\n`;
    quick += `**Fallback options:**\n`;
    quick += `• \`discover suggest\` for general recommendations\n`;
    quick += `• \`who\` to see who's currently online\n`;
    quick += `• \`discover search <topic>\` to find specific interests`;
  }
  
  return quick;
}

// Discovery system status
async function getSystemStatus() {
  let status = `## 🔧 Discovery System Status\n\n`;
  
  try {
    // Get basic stats
    const allProfiles = await userProfiles.getAllProfiles();
    const completeProfiles = allProfiles.filter(p => 
      p.building && p.interests?.length > 0 && p.tags?.length > 0
    );
    
    status += `**Community Stats:**\n`;
    status += `• Total users: ${allProfiles.length}\n`;
    status += `• Complete profiles: ${completeProfiles.length} (${Math.round((completeProfiles.length / allProfiles.length) * 100)}%)\n`;
    status += `• Avg interests per user: ${(allProfiles.reduce((sum, p) => sum + (p.interests?.length || 0), 0) / allProfiles.length).toFixed(1)}\n`;
    status += `• Avg skills per user: ${(allProfiles.reduce((sum, p) => sum + (p.tags?.length || 0), 0) / allProfiles.length).toFixed(1)}\n\n`;
    
    status += `**Discovery Features Status:**\n`;
    status += `✅ General Discovery (\`discover\`) - Active\n`;
    status += `✅ Workshop Buddy (\`workshop-buddy\`) - Active\n`;
    status += `✅ Skills Exchange (\`skills-exchange\`) - Active\n`;
    status += `✅ Proactive Discovery (\`discovery-proactive\`) - Active\n`;
    status += `✅ Discovery Insights (\`discover-insights\`) - Active\n`;
    status += `✅ Discovery Hub (\`discovery-hub\`) - Active\n\n`;
    
    if (completeProfiles.length < 5) {
      status += `⚠️ **Recommendation:** Need more complete profiles for better matching.\n`;
      status += `Encourage users to run: \`update building/interests/tags\`\n`;
    } else {
      status += `🎯 **System Health:** Good - sufficient data for quality matching\n`;
    }
    
  } catch (error) {
    status += `System status check failed: ${error.message}\n\n`;
    status += `All individual discovery tools should still work independently.`;
  }
  
  return status;
}

// Feature tour
function getFeatureTour() {
  return `# 🗺️ Discovery Features Tour

Welcome to /vibe's comprehensive discovery system! Here's everything available:

## 🎯 Core Discovery
**\`discover\`** - Smart matchmaking based on projects, interests, and activity
• \`discover suggest\` - Personalized recommendations
• \`discover search "ai"\` - Find people by topic
• \`discover interests\` - Browse by interest categories
• \`discover active\` - See who's building similar things now

## 🤝 Workshop Collaboration
**\`workshop-buddy\`** - Find perfect collaboration partners
• \`workshop-buddy find\` - AI-matched workshop partners
• \`workshop-buddy offer "frontend, react"\` - Offer skills to community
• \`workshop-buddy seeking "backend"\` - Find specific expertise
• \`workshop-buddy matches\` - Browse skill exchanges

## 🏪 Skills Marketplace
**\`skills-exchange\`** - Community learning and teaching
• \`skills-exchange post --type offer --skill "React"\` - Offer to teach
• \`skills-exchange post --type request --skill "UI design"\` - Ask for help
• \`skills-exchange browse\` - Browse all offerings by category
• \`skills-exchange match\` - Find perfect skill trades

## ⚡ Real-time Opportunities
**\`discovery-proactive\`** - Perfect timing connections
• \`discovery-proactive opportunities\` - Both users online now
• \`discovery-proactive welcome\` - Users who just came online
• \`discovery-proactive trending\` - Hot topics and clusters
• \`discovery-proactive ships\` - Connect based on recent ships

## 📊 Analytics & Insights
**\`discover-insights\`** - System analytics and improvements
• \`discover-insights quality\` - Connection success analysis
• \`discover-insights growth\` - Community growth metrics
• \`discover-insights gaps\` - Underserved users and skills
• \`discover-insights tune\` - Algorithm improvement suggestions

## 🏠 This Hub
**\`discovery-hub\`** - Central command center
• \`discovery-hub dashboard\` - Personal connection dashboard
• \`discovery-hub quick\` - Immediate opportunities
• \`discovery-hub status\` - System health and stats
• \`discovery-hub tour\` - This guide!

---

**🚀 Getting Started:**
1. Complete your profile: \`update building/interests/tags\`
2. Check your dashboard: \`discovery-hub dashboard\`
3. Find connections: \`discover suggest\`
4. Start collaborating! 🎯

**💡 Pro Tips:**
• Complete profiles get 5x more connections
• Best matches happen when both users are online
• Workshop buddy focuses on collaboration, general discovery on interests
• Skills exchange is perfect for learning and teaching
• Use proactive discovery when you want immediate connections`;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'dashboard';

  let display = '';

  try {
    switch (command) {
      case 'dashboard':
        display = await generateDashboard(myHandle);
        break;

      case 'quick':
        display = await getQuickConnections(myHandle);
        break;

      case 'status':
        display = await getSystemStatus();
        break;

      case 'tour':
        display = getFeatureTour();
        break;

      default:
        display = `## Discovery Hub Commands

**\`discovery-hub dashboard\`** — Your personal connection dashboard
**\`discovery-hub quick\`** — Quick actions for immediate connections  
**\`discovery-hub status\`** — System health and community stats
**\`discovery-hub tour\`** — Complete guide to all discovery features

This is your central hub for finding great connections in /vibe!`;
    }
  } catch (error) {
    display = `## Discovery Hub Error

${error.message}

Try individual discovery tools:
• \`discover suggest\` for general recommendations
• \`workshop-buddy find\` for collaboration partners
• \`skills-exchange match\` for skill exchanges`;
  }

  return { display };
}

module.exports = { definition, handler };