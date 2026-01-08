/**
 * vibe discovery-hub — Unified Discovery Command Center
 *
 * A single entry point that brings together all discovery and connection features.
 * Perfect for new users to understand the full ecosystem and for experienced users
 * to quickly access any discovery feature.
 *
 * Commands:
 * - discovery-hub explore — Browse all discovery features
 * - discovery-hub onboard — Complete discovery profile setup
 * - discovery-hub connect — Find people to connect with right now
 * - discovery-hub status — Your discovery profile health
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_hub',
  description: 'Unified discovery command center - your gateway to /vibe connections.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['explore', 'onboard', 'connect', 'status'],
        description: 'Hub command to run'
      }
    }
  }
};

// Calculate quick profile score
async function getQuickProfileScore(handle) {
  const profile = await userProfiles.getProfile(handle);
  
  let score = 0;
  let maxScore = 100;
  let gaps = [];
  
  // Building (30 points)
  if (profile.building) {
    score += 30;
  } else {
    gaps.push('Add what you\'re building (+30)');
  }
  
  // Interests (25 points)
  const interestCount = (profile.interests || []).length;
  if (interestCount >= 3) {
    score += 25;
  } else if (interestCount > 0) {
    score += Math.round(25 * (interestCount / 3));
    gaps.push(`Add ${3 - interestCount} more interests (+${25 - Math.round(25 * (interestCount / 3))})`);
  } else {
    gaps.push('Add interests (+25)');
  }
  
  // Skills (25 points)
  const tagCount = (profile.tags || []).length;
  if (tagCount >= 5) {
    score += 25;
  } else if (tagCount > 0) {
    score += Math.round(25 * (tagCount / 5));
    gaps.push(`Add ${5 - tagCount} more skills (+${25 - Math.round(25 * (tagCount / 5))})`);
  } else {
    gaps.push('Add skills (+25)');
  }
  
  // Connections (10 points)
  const connectionCount = (profile.connections || []).length;
  if (connectionCount >= 3) {
    score += 10;
  } else if (connectionCount > 0) {
    score += Math.round(10 * (connectionCount / 3));
    gaps.push('Make more connections');
  } else {
    gaps.push('Make first connection (+10)');
  }
  
  // Recent activity (10 points)
  if (profile.lastSeen) {
    const hoursSince = (Date.now() - profile.lastSeen) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      score += 10;
    } else if (hoursSince < 168) {
      score += 5;
    }
  }
  
  return { score, maxScore, gaps: gaps.slice(0, 3) };
}

// Get connection opportunities count
async function getConnectionOpportunities(handle) {
  const myProfile = await userProfiles.getProfile(handle);
  const allProfiles = await userProfiles.getAllProfiles();
  
  let opportunities = 0;
  
  for (const other of allProfiles) {
    if (other.handle === handle) continue;
    
    // Check if already connected
    const alreadyConnected = await userProfiles.hasBeenConnected(handle, other.handle);
    if (alreadyConnected) continue;
    
    // Simple matching logic
    let hasMatch = false;
    
    // Skill overlap
    if (myProfile.tags && other.tags) {
      const overlap = myProfile.tags.filter(tag => other.tags.includes(tag));
      if (overlap.length > 0) hasMatch = true;
    }
    
    // Interest overlap
    if (myProfile.interests && other.interests) {
      const overlap = myProfile.interests.filter(interest => other.interests.includes(interest));
      if (overlap.length > 0) hasMatch = true;
    }
    
    if (hasMatch) opportunities++;
  }
  
  return opportunities;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'explore';

  let display = '';

  try {
    switch (command) {
      case 'explore': {
        display = `## /vibe Discovery Hub 🧭\n\n`;
        display += `_Your command center for finding the perfect connections._\n\n`;
        
        display += `### 🤝 Find People\n`;
        display += `**\`discover suggest\`** — AI-powered connection suggestions\n`;
        display += `**\`workshop-buddy find\`** — Find collaboration partners\n`;
        display += `**\`discover search <keyword>\`** — Search for specific skills/interests\n\n`;
        
        display += `### 🏪 Skills Exchange\n`;
        display += `**\`skills-exchange browse\`** — Browse marketplace\n`;
        display += `**\`skills-exchange post --type offer --skill "expertise"\`** — Offer skills\n`;
        display += `**\`skills-exchange post --type request --skill "what you need"\`** — Request help\n`;
        display += `**\`skills-exchange match\`** — Find skill exchanges for you\n\n`;
        
        display += `### 📊 Profile & Analytics\n`;
        display += `**\`discovery-dashboard health\`** — Check profile health\n`;
        display += `**\`discovery-analytics overview\`** — Community insights\n`;
        display += `**\`discover-insights quality\`** — Connection analytics\n\n`;
        
        display += `### 🚀 Quick Actions\n`;
        display += `**\`discovery-hub onboard\`** — Complete profile setup\n`;
        display += `**\`discovery-hub connect\`** — Get instant connections\n`;
        display += `**\`discovery-hub status\`** — Check your discovery health\n\n`;
        
        display += `**New to discovery?** Start with \`discovery-hub onboard\`\n`;
        display += `**Ready to connect?** Try \`discovery-hub connect\``;
        break;
      }

      case 'onboard': {
        const myProfile = await userProfiles.getProfile(myHandle);
        const { score, gaps } = await getQuickProfileScore(myHandle);
        
        display = `## Discovery Profile Setup 🎯\n\n`;
        display += `**Current Score: ${score}/100**\n\n`;
        
        if (score >= 80) {
          display += `🌟 **Excellent!** Your profile is discovery-ready!\n\n`;
          display += `**Next steps:**\n`;
          display += `• \`discover suggest\` — Find your first connections\n`;
          display += `• \`skills-exchange browse\` — Explore skill marketplace\n`;
          display += `• \`workshop-buddy find\` — Find collaboration partners`;
        } else {
          display += `**Complete your profile to unlock connections:**\n\n`;
          
          if (gaps.length > 0) {
            display += `**Quick wins:**\n`;
            for (const gap of gaps) {
              display += `• ${gap}\n`;
            }
            display += `\n`;
          }
          
          display += `**Profile setup commands:**\n`;
          if (!myProfile.building) {
            display += `\`vibe update building "what you're working on"\`\n`;
          }
          if (!myProfile.interests || myProfile.interests.length === 0) {
            display += `\`vibe update interests "ai, startups, music"\` (your interests)\n`;
          }
          if (!myProfile.tags || myProfile.tags.length === 0) {
            display += `\`vibe update tags "frontend, react, typescript"\` (your skills)\n`;
          }
          
          display += `\n**After updating:**\n`;
          display += `\`discovery-hub status\` — Check your new score\n`;
          display += `\`discovery-hub connect\` — Find connections\n\n`;
          
          display += `**Example complete profile:**\n`;
          display += `Building: "AI-powered productivity app"\n`;
          display += `Interests: "ai, productivity, startups, music"\n`;
          display += `Skills: "frontend, react, typescript, design"`;
        }
        break;
      }

      case 'connect': {
        const { score } = await getQuickProfileScore(myHandle);
        const opportunities = await getConnectionOpportunities(myHandle);
        
        display = `## Find Connections Now 🔗\n\n`;
        
        if (score < 40) {
          display += `⚡ **Profile needs work first!**\n`;
          display += `Your discovery score is ${score}/100. Complete your profile for better matches.\n\n`;
          display += `**Quick setup:** \`discovery-hub onboard\``;
        } else {
          display += `**Your connection toolkit:**\n\n`;
          
          if (opportunities > 0) {
            display += `🎯 **${opportunities} potential matches found!**\n\n`;
          }
          
          display += `### Start Here\n`;
          display += `**\`discover suggest\`** — See your top 3 AI-matched people\n`;
          display += `**\`workshop-buddy find\`** — Find collaboration partners\n\n`;
          
          display += `### Browse & Search\n`;
          display += `**\`skills-exchange browse\`** — See who's offering/requesting skills\n`;
          display += `**\`skills-exchange match\`** — Find perfect skill exchanges\n`;
          display += `**\`discover search "keyword"\`** — Search for specific expertise\n\n`;
          
          display += `### Analytics & Insights\n`;
          display += `**\`discovery-analytics gaps\`** — See community connection opportunities\n`;
          display += `**\`discovery-analytics lonely\`** — People who need connections\n\n`;
          
          display += `**After finding someone:**\n`;
          display += `\`dm @username "Hi! I saw we both..."\` — Send a message\n`;
          display += `\`suggest-connection @user1 @user2 "reason"\` — Suggest others connect`;
        }
        break;
      }

      case 'status': {
        const myProfile = await userProfiles.getProfile(myHandle);
        const { score, gaps } = await getQuickProfileScore(myHandle);
        const opportunities = await getConnectionOpportunities(myHandle);
        
        display = `## Your Discovery Status 📈\n\n`;
        
        // Profile health
        display += `### Profile Health: ${score}/100`;
        if (score >= 80) {
          display += ` 🌟\n`;
        } else if (score >= 60) {
          display += ` 👍\n`;
        } else if (score >= 40) {
          display += ` ⚡\n`;
        } else {
          display += ` 🚧\n`;
        }
        
        display += `**Building:** ${myProfile.building || '_Not set_'}\n`;
        display += `**Interests:** ${(myProfile.interests || []).join(', ') || '_None_'}\n`;
        display += `**Skills:** ${(myProfile.tags || []).join(', ') || '_None_'}\n`;
        display += `**Connections:** ${(myProfile.connections || []).length}\n\n`;
        
        // Connection potential
        display += `### Connection Opportunities\n`;
        display += `**Potential matches:** ${opportunities}\n`;
        if (myProfile.lastSeen) {
          display += `**Last active:** ${formatTimeAgo(myProfile.lastSeen)}\n`;
        }
        display += `\n`;
        
        // Improvement suggestions
        if (gaps.length > 0) {
          display += `### Quick Improvements\n`;
          for (const gap of gaps) {
            display += `• ${gap}\n`;
          }
          display += `\n`;
        }
        
        // Next actions
        display += `### Recommended Actions\n`;
        if (score < 60) {
          display += `• \`discovery-hub onboard\` — Complete profile setup\n`;
        }
        if (opportunities > 0) {
          display += `• \`discover suggest\` — See your matches\n`;
        }
        display += `• \`skills-exchange browse\` — Explore marketplace\n`;
        display += `• \`workshop-buddy find\` — Find collaborators\n\n`;
        
        display += `**Track progress:** Run \`discovery-hub status\` anytime`;
        break;
      }

      default:
        display = `## Discovery Hub Commands

**\`discovery-hub explore\`** — Browse all discovery features
**\`discovery-hub onboard\`** — Complete your discovery profile
**\`discovery-hub connect\`** — Find people to connect with now
**\`discovery-hub status\`** — Check your discovery health

**Your unified gateway to:**
- AI-powered connection suggestions
- Skills marketplace
- Collaboration partner finding
- Profile optimization
- Community analytics

**New user?** Start with \`discovery-hub onboard\`
**Ready to connect?** Try \`discovery-hub connect\``;
    }
  } catch (error) {
    display = `## Discovery Hub Error

${error.message}

Try: \`discovery-hub\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };