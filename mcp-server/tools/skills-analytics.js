/**
 * Skills Analytics — Intelligence for the Skills Exchange Marketplace
 *
 * Provides insights and analytics for the skills marketplace:
 * - Most requested skills
 * - Skills gaps in the community
 * - Best times for skill exchanges
 * - Success rate analysis
 *
 * Commands:
 * - skills-analytics trends — Show skill demand trends
 * - skills-analytics gaps — Skills the community needs
 * - skills-analytics insights — Data-driven insights for skill sharing
 */

const config = require('../config');
const store = require('../store');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_skills_analytics',
  description: 'Analytics and insights for the skills exchange marketplace.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['trends', 'gaps', 'insights'],
        description: 'Analytics command to run'
      }
    }
  }
};

// Analyze skill demand patterns
async function analyzeSkillTrends() {
  const posts = await store.getSkillExchanges() || [];
  const profiles = await userProfiles.getAllProfiles();
  
  // Count skill requests vs offers
  const skillStats = {};
  
  for (const post of posts) {
    if (post.status === 'active') {
      const skill = post.skill.toLowerCase();
      if (!skillStats[skill]) {
        skillStats[skill] = { requests: 0, offers: 0, lastActivity: 0 };
      }
      
      if (post.type === 'request') {
        skillStats[skill].requests++;
      } else {
        skillStats[skill].offers++;
      }
      
      skillStats[skill].lastActivity = Math.max(
        skillStats[skill].lastActivity, 
        post.timestamp
      );
    }
  }
  
  // Calculate demand score (requests - offers)
  const trends = Object.entries(skillStats).map(([skill, stats]) => ({
    skill,
    ...stats,
    demand: stats.requests - stats.offers,
    popularity: stats.requests + stats.offers,
    demandRatio: stats.requests / Math.max(1, stats.offers)
  }));
  
  return trends.sort((a, b) => b.demand - a.demand);
}

// Find skill gaps in the community
async function findSkillGaps() {
  const posts = await store.getSkillExchanges() || [];
  const profiles = await userProfiles.getAllProfiles();
  
  // Get all requested skills
  const requestedSkills = posts
    .filter(p => p.type === 'request' && p.status === 'active')
    .map(p => p.skill.toLowerCase());
  
  // Get all available skills from profiles
  const availableSkills = new Set();
  for (const profile of profiles) {
    const skills = (profile.tags || []).concat(profile.interests || []);
    skills.forEach(skill => availableSkills.add(skill.toLowerCase()));
  }
  
  // Find requested skills with no offers
  const gaps = [];
  const requestCounts = {};
  
  for (const skill of requestedSkills) {
    requestCounts[skill] = (requestCounts[skill] || 0) + 1;
    if (!availableSkills.has(skill)) {
      gaps.push(skill);
    }
  }
  
  // Return unique gaps with request counts
  const uniqueGaps = [...new Set(gaps)].map(skill => ({
    skill,
    requests: requestCounts[skill],
    lastRequested: posts
      .filter(p => p.skill.toLowerCase() === skill && p.type === 'request')
      .sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp
  }));
  
  return uniqueGaps.sort((a, b) => b.requests - a.requests);
}

// Generate community insights
async function generateInsights() {
  const posts = await store.getSkillExchanges() || [];
  const profiles = await userProfiles.getAllProfiles();
  const trends = await analyzeSkillTrends();
  
  const insights = [];
  
  // Total activity insight
  const activeUsers = profiles.filter(p => p.lastSeen && (Date.now() - p.lastSeen) < 7 * 24 * 60 * 60 * 1000);
  const participationRate = posts.length > 0 ? (posts.length / Math.max(1, profiles.length)) * 100 : 0;
  
  if (participationRate < 20) {
    insights.push({
      type: 'opportunity',
      title: 'Low Skills Marketplace Participation',
      message: `Only ${participationRate.toFixed(0)}% of users have posted skills. Encourage more skill sharing!`,
      action: 'Post a skill offer to get things started'
    });
  }
  
  // Top demand insight
  const topDemand = trends.filter(t => t.demand > 0).slice(0, 3);
  if (topDemand.length > 0) {
    insights.push({
      type: 'demand',
      title: 'High-Demand Skills',
      message: `${topDemand.map(t => t.skill).join(', ')} are in high demand`,
      action: 'Consider offering these skills if you have them'
    });
  }
  
  // Skill balance insight
  const oversupplied = trends.filter(t => t.demand < -2).slice(0, 3);
  if (oversupplied.length > 0) {
    insights.push({
      type: 'balance',
      title: 'Oversupplied Skills',
      message: `${oversupplied.map(t => t.skill).join(', ')} have many offers but few requests`,
      action: 'These might be good skills to learn from the community'
    });
  }
  
  // Recent activity insight
  const recentPosts = posts.filter(p => (Date.now() - p.timestamp) < 24 * 60 * 60 * 1000);
  if (recentPosts.length > 0) {
    insights.push({
      type: 'activity',
      title: 'Recent Skills Activity',
      message: `${recentPosts.length} new skills posts in the last 24 hours`,
      action: 'Check skills-exchange browse for new opportunities'
    });
  } else if (posts.length > 0) {
    const lastPost = posts.sort((a, b) => b.timestamp - a.timestamp)[0];
    insights.push({
      type: 'quiet',
      title: 'Quiet Skills Marketplace',
      message: `Last activity was ${formatTimeAgo(lastPost.timestamp)}`,
      action: 'Consider posting a skill to re-energize the community'
    });
  }
  
  return insights;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const command = args.command || 'insights';
  let display = '';

  try {
    switch (command) {
      case 'trends': {
        const trends = await analyzeSkillTrends();
        
        if (trends.length === 0) {
          display = `## No Skills Data Yet 📊\n\n`;
          display += `_Need some skill posts to analyze trends._\n\n`;
          display += `**Start generating data:**\n`;
          display += `\`skills-exchange post --type offer --skill "your expertise"\`\n`;
          display += `\`skills-exchange post --type request --skill "what you need"\``;
        } else {
          display = `## Skills Marketplace Trends 📈\n\n`;
          
          const highDemand = trends.filter(t => t.demand > 0).slice(0, 5);
          const balanced = trends.filter(t => t.demand === 0).slice(0, 3);
          const oversupplied = trends.filter(t => t.demand < 0).slice(0, 3);
          
          if (highDemand.length > 0) {
            display += `### 🔥 High Demand Skills\n`;
            for (const skill of highDemand) {
              display += `**${skill.skill}** — ${skill.requests} requests, ${skill.offers} offers `;
              display += `(${skill.demandRatio.toFixed(1)}:1 demand ratio)\n`;
            }
            display += `\n`;
          }
          
          if (balanced.length > 0) {
            display += `### ⚖️ Balanced Market\n`;
            for (const skill of balanced) {
              display += `**${skill.skill}** — ${skill.requests} requests, ${skill.offers} offers\n`;
            }
            display += `\n`;
          }
          
          if (oversupplied.length > 0) {
            display += `### 📦 Plenty of Supply\n`;
            for (const skill of oversupplied) {
              display += `**${skill.skill}** — ${skill.offers} offers, ${skill.requests} requests\n`;
            }
            display += `\n`;
          }
          
          display += `**Insights:**\n`;
          display += `• Focus on high-demand skills for quick connections\n`;
          display += `• Oversupplied skills = great learning opportunities\n`;
          display += `• Use \`skills-analytics gaps\` to find unmet needs`;
        }
        break;
      }

      case 'gaps': {
        const gaps = await findSkillGaps();
        
        if (gaps.length === 0) {
          display = `## No Skill Gaps Found ✅\n\n`;
          display += `_The community has offerings for all requested skills._\n\n`;
          display += `**This means:**\n`;
          display += `• Good skill diversity in the community\n`;
          display += `• All requests have potential matches\n`;
          display += `• Check \`skills-exchange match\` to connect with people\n\n`;
          display += `**Keep the momentum:**\n`;
          display += `• Share skills you haven't posted yet\n`;
          display += `• Request specific skills you want to learn`;
        } else {
          display = `## Skills Gaps in the Community 🕳️\n\n`;
          display += `_Skills requested but not available from current members:_\n\n`;
          
          for (const gap of gaps.slice(0, 8)) {
            display += `**${gap.skill}** — `;
            display += `${gap.requests} request${gap.requests > 1 ? 's' : ''} `;
            if (gap.lastRequested) {
              display += `(last: ${formatTimeAgo(gap.lastRequested)})`;
            }
            display += `\n`;
          }
          
          display += `\n**Opportunities:**\n`;
          display += `• Invite experts in these areas to join /vibe\n`;
          display += `• Consider these skills for your next learning project\n`;
          display += `• Post if you have any of these skills\n\n`;
          
          display += `**External resources:**\n`;
          display += `• Share tutorials/courses for gap skills\n`;
          display += `• Organize learning groups around missing skills`;
        }
        break;
      }

      case 'insights': {
        const insights = await generateInsights();
        const trends = await analyzeSkillTrends();
        
        display = `## Skills Marketplace Insights 🧠\n\n`;
        
        if (insights.length === 0) {
          display += `_Not enough data for insights yet._\n\n`;
          display += `**Build marketplace intelligence:**\n`;
          display += `1. More people post skills: \`skills-exchange post\`\n`;
          display += `2. Add skills to profiles: \`update tags "your-skills"\`\n`;
          display += `3. Make connections: \`skills-exchange match\``;
        } else {
          for (const insight of insights) {
            const emoji = {
              'opportunity': '🎯',
              'demand': '🔥',
              'balance': '⚖️',
              'activity': '🚀',
              'quiet': '😴'
            }[insight.type] || '💡';
            
            display += `### ${emoji} ${insight.title}\n`;
            display += `${insight.message}\n\n`;
            display += `**Action:** ${insight.action}\n\n`;
          }
        }
        
        // Add quick stats
        if (trends.length > 0) {
          display += `### 📊 Quick Stats\n`;
          display += `• **Total skills traded:** ${trends.length}\n`;
          display += `• **Most requested:** ${trends.filter(t => t.requests > 0)[0]?.skill || 'none'}\n`;
          display += `• **Most offered:** ${trends.filter(t => t.offers > 0).sort((a, b) => b.offers - a.offers)[0]?.skill || 'none'}\n\n`;
        }
        
        display += `**Explore more:**\n`;
        display += `• \`skills-analytics trends\` — See demand patterns\n`;
        display += `• \`skills-analytics gaps\` — Find unmet needs\n`;
        display += `• \`skills-exchange browse\` — View all postings`;
        break;
      }

      default:
        display = `## Skills Analytics Commands

**\`skills-analytics insights\`** — Data-driven insights for skill sharing
**\`skills-analytics trends\`** — Show skill demand vs supply patterns
**\`skills-analytics gaps\`** — Skills the community needs but doesn't have

**Perfect for:**
- Understanding marketplace dynamics
- Finding high-impact skills to offer
- Identifying learning opportunities
- Growing community skill diversity

**Use with:**
- \`skills-exchange browse\` to see current posts
- \`skills-exchange match\` to find connections
- \`workshop-buddy find\` for collaboration partners`;
    }
  } catch (error) {
    display = `## Skills Analytics Error

${error.message}

Try: \`skills-analytics\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };