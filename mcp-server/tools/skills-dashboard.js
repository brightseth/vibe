/**
 * vibe skills-dashboard — Skills Exchange Dashboard
 *
 * A comprehensive dashboard view of the Skills Exchange marketplace:
 * - Live marketplace overview with stats
 * - Featured skill matches and opportunities
 * - Recent activity and trending skills
 * - Quick actions for posting and browsing
 * - Success stories and exchange highlights
 */

const config = require('../config');
const skillsStore = require('../store/skills');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_skills_dashboard',
  description: 'Comprehensive dashboard view of the Skills Exchange marketplace.',
  inputSchema: {
    type: 'object',
    properties: {
      view: {
        type: 'string',
        enum: ['overview', 'matches', 'trending', 'recent'],
        description: 'Dashboard view to display'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const view = args.view || 'overview';

  let display = '';

  try {
    switch (view) {
      case 'overview': {
        const stats = await skillsStore.getExchangeStats();
        const categories = await skillsStore.getSkillsByCategory();
        const myMatches = await skillsStore.findSkillMatches(myHandle);
        
        display = `## 🏪 Skills Exchange Marketplace Dashboard\n\n`;
        
        // Quick stats
        display += `### 📊 Marketplace Stats\n`;
        display += `• **${stats.activeOffers}** skills offered by workshop members\n`;
        display += `• **${stats.activeRequests}** skills requested\n`;
        display += `• **${stats.totalExchanges}** successful connections made\n`;
        display += `• **${Object.keys(categories).length}** active categories\n\n`;
        
        // Personal matches preview
        if (myMatches.forMyRequests.length > 0 || myMatches.forMyOffers.length > 0) {
          display += `### 🎯 Your Opportunities\n`;
          if (myMatches.forMyRequests.length > 0) {
            display += `• **${myMatches.forMyRequests.length}** people can help you\n`;
          }
          if (myMatches.forMyOffers.length > 0) {
            display += `• **${myMatches.forMyOffers.length}** people you can help\n`;
          }
          display += `👉 \`skills matches\` for detailed matches\n\n`;
        } else {
          display += `### 🚀 Get Started\n`;
          display += `• \`skills offer "your-expertise"\` to share your skills\n`;
          display += `• \`skills request "skill-you-need"\` to find help\n`;
          display += `• \`skills browse\` to explore opportunities\n\n`;
        }
        
        // Hot categories
        const topCategories = Object.entries(categories)
          .sort(([,a], [,b]) => (b.offers.length + b.requests.length) - (a.offers.length + a.requests.length))
          .slice(0, 4);
        
        if (topCategories.length > 0) {
          display += `### 🔥 Most Active Categories\n`;
          for (const [category, items] of topCategories) {
            const total = items.offers.length + items.requests.length;
            display += `• **${category}**: ${items.offers.length} offers, ${items.requests.length} requests\n`;
          }
          display += `\n`;
        }
        
        // Top skills
        if (stats.topSkills.length > 0) {
          display += `### 📈 Trending Skills\n`;
          display += stats.topSkills.slice(0, 6)
            .map(s => `• ${s.skill} (${s.count})`)
            .join('\n');
          display += `\n\n`;
        }
        
        // Quick actions
        display += `### ⚡ Quick Actions\n`;
        display += `• \`skills matches\` — Find your perfect matches\n`;
        display += `• \`skills browse\` — Explore all categories\n`;
        display += `• \`skills-dashboard trending\` — See what's hot\n`;
        display += `• \`skills-dashboard recent\` — Latest activity\n`;
        
        break;
      }
      
      case 'matches': {
        const matches = await skillsStore.findSkillMatches(myHandle);
        
        display = `## 🎯 Your Skill Exchange Matches\n\n`;
        
        if (matches.forMyRequests.length === 0 && matches.forMyOffers.length === 0) {
          display += `_No active matches found._\n\n`;
          display += `**Improve your matches:**\n`;
          display += `• \`skills offer "your-expertise"\` to help others\n`;
          display += `• \`skills request "needed-skill"\` to find help\n`;
          display += `• \`profile tags "your,skills,here"\` to improve matching\n`;
          display += `• \`skills browse\` to see all opportunities\n`;
        } else {
          // High-priority matches first
          const highPriorityOffers = matches.forMyOffers
            .filter(m => m.theirItem.urgency === 'high')
            .slice(0, 3);
            
          if (highPriorityOffers.length > 0) {
            display += `### 🚨 Urgent Help Needed\n`;
            for (const match of highPriorityOffers) {
              display += `**@${match.theirItem.handle}** urgently needs **${match.theirItem.skill}**\n`;
              if (match.theirItem.context) {
                display += `_${match.theirItem.context}_\n`;
              }
              display += `💬 \`dm @${match.theirItem.handle} "I can help with ${match.theirItem.skill}!"\`\n\n`;
            }
          }
          
          // Best matches for user's requests
          if (matches.forMyRequests.length > 0) {
            display += `### 👥 People Who Can Help You\n`;
            for (const match of matches.forMyRequests.slice(0, 3)) {
              display += `**@${match.theirItem.handle}** offers **${match.theirItem.skill}** _(${match.theirItem.level})_\n`;
              if (match.theirItem.description) {
                display += `${match.theirItem.description}\n`;
              }
              display += `💬 \`dm @${match.theirItem.handle} "I'd love help with ${match.myItem.skill}!"\`\n\n`;
            }
          }
          
          // Other people user can help
          const remainingOffers = matches.forMyOffers
            .filter(m => m.theirItem.urgency !== 'high')
            .slice(0, 3);
            
          if (remainingOffers.length > 0) {
            display += `### 🤝 People You Can Help\n`;
            for (const match of remainingOffers) {
              display += `**@${match.theirItem.handle}** needs **${match.theirItem.skill}**\n`;
              if (match.theirItem.context) {
                display += `_${match.theirItem.context}_\n`;
              }
              display += `💬 \`dm @${match.theirItem.handle} "I can help with ${match.theirItem.skill}!"\`\n\n`;
            }
          }
        }
        
        break;
      }
      
      case 'trending': {
        const stats = await skillsStore.getExchangeStats();
        const categories = await skillsStore.getSkillsByCategory();
        
        display = `## 📈 Trending Skills & Categories\n\n`;
        
        // Most requested skills
        if (stats.topSkills.length > 0) {
          display += `### 🔥 Most Popular Skills\n`;
          display += stats.topSkills.slice(0, 8)
            .map((s, i) => `${i+1}. **${s.skill}** (${s.count} posts)`)
            .join('\n');
          display += `\n\n`;
        }
        
        // Growing categories
        const categoryActivity = Object.entries(categories)
          .map(([name, items]) => ({
            name,
            total: items.offers.length + items.requests.length,
            ratio: items.requests.length / (items.offers.length || 1)
          }))
          .sort((a, b) => b.total - a.total);
        
        if (categoryActivity.length > 0) {
          display += `### 🎯 Category Activity\n`;
          for (const cat of categoryActivity.slice(0, 6)) {
            const demand = cat.ratio > 1.5 ? ' 🔥 High Demand' : cat.ratio < 0.5 ? ' 💼 Supply Rich' : '';
            display += `• **${cat.name}**: ${cat.total} posts${demand}\n`;
          }
          display += `\n`;
        }
        
        // Market opportunities
        const highDemand = categoryActivity.filter(c => c.ratio > 2);
        if (highDemand.length > 0) {
          display += `### 🚀 Market Opportunities\n`;
          display += `_High demand, low supply - great categories to offer skills:_\n`;
          for (const cat of highDemand.slice(0, 3)) {
            display += `• **${cat.name}** - ${Math.round(cat.ratio)}x more requests than offers\n`;
          }
          display += `\n`;
        }
        
        break;
      }
      
      case 'recent': {
        const [offers, requests] = await Promise.all([
          skillsStore.getSkillOffers(),
          skillsStore.getSkillRequests()
        ]);
        
        // Combine and sort by recency
        const recentActivity = [...offers, ...requests]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 10);
        
        display = `## 🕒 Recent Marketplace Activity\n\n`;
        
        if (recentActivity.length === 0) {
          display += `_No recent activity._\n\n`;
          display += `**Be the first:**\n`;
          display += `• \`skills offer "your-skill"\` to share expertise\n`;
          display += `• \`skills request "needed-skill"\` to find help\n`;
        } else {
          for (const item of recentActivity) {
            const type = item.level ? '🔧 Offering' : '🙋 Requesting';
            const urgencyEmoji = item.urgency === 'high' ? '🚨 ' : item.urgency === 'medium' ? '⚡ ' : '';
            const levelText = item.level ? ` _(${item.level} level)_` : '';
            
            display += `${type}: **${item.skill}** by @${item.handle}${levelText}\n`;
            if (item.description || item.context) {
              display += `_${item.description || item.context}_\n`;
            }
            display += `${urgencyEmoji}${formatTimeAgo(item.timestamp)}\n\n`;
          }
        }
        
        break;
      }
      
      default:
        display = `## Skills Dashboard Views\n\n`;
        display += `**\`skills-dashboard\`** — Complete marketplace overview\n`;
        display += `**\`skills-dashboard matches\`** — Your personalized matches\n`;
        display += `**\`skills-dashboard trending\`** — Hot skills and categories\n`;
        display += `**\`skills-dashboard recent\`** — Latest marketplace activity\n\n`;
        display += `**Quick Links:**\n`;
        display += `• \`skills\` — Main skills exchange commands\n`;
        display += `• \`skills matches\` — Find connections\n`;
        display += `• \`skills browse\` — Explore categories\n`;
    }
  } catch (error) {
    display = `## Skills Dashboard Error\n\n${error.message}`;
  }

  return { display };
}

module.exports = { definition, handler };