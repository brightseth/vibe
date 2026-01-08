/**
 * vibe discovery-dashboard — Personal Discovery Dashboard
 *
 * Shows users their discovery profile health, connection potential, and
 * actionable steps to improve their discoverability within /vibe.
 *
 * Commands:
 * - discovery-dashboard health — Check your discovery profile health
 * - discovery-dashboard potential — See your connection potential
 * - discovery-dashboard improve — Get specific improvement suggestions
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_dashboard',
  description: 'Personal dashboard showing your discovery profile and connection potential.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['health', 'potential', 'improve'],
        description: 'Dashboard command to run'
      }
    }
  }
};

// Calculate profile health score
async function calculateProfileHealth(profile) {
  let score = 0;
  const feedback = [];
  
  // Building project (30 points)
  if (profile.building) {
    score += 30;
    feedback.push('✓ Has project description');
  } else {
    feedback.push('✗ Missing project description (+30 points)');
  }
  
  // Interests (25 points)
  const interestCount = (profile.interests || []).length;
  if (interestCount >= 3) {
    score += 25;
    feedback.push('✓ Has diverse interests');
  } else if (interestCount > 0) {
    score += Math.round(25 * (interestCount / 3));
    feedback.push(`△ Has ${interestCount} interests (add ${3 - interestCount} more for full points)`);
  } else {
    feedback.push('✗ No interests listed (+25 points)');
  }
  
  // Skills/Tags (25 points)
  const tagCount = (profile.tags || []).length;
  if (tagCount >= 5) {
    score += 25;
    feedback.push('✓ Has comprehensive skills');
  } else if (tagCount > 0) {
    score += Math.round(25 * (tagCount / 5));
    feedback.push(`△ Has ${tagCount} skills (add ${5 - tagCount} more for full points)`);
  } else {
    feedback.push('✗ No skills tagged (+25 points)');
  }
  
  // Recent activity (10 points)
  if (profile.lastSeen) {
    const hoursSince = (Date.now() - profile.lastSeen) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      score += 10;
      feedback.push('✓ Recently active');
    } else if (hoursSince < 168) { // 1 week
      score += 5;
      feedback.push('△ Active this week');
    } else {
      feedback.push('△ Inactive for a while');
    }
  }
  
  // Connections made (10 points)
  const connectionCount = (profile.connections || []).length;
  if (connectionCount >= 5) {
    score += 10;
    feedback.push('✓ Well connected');
  } else if (connectionCount > 0) {
    score += Math.round(10 * (connectionCount / 5));
    feedback.push(`△ Has ${connectionCount} connections`);
  } else {
    feedback.push('△ No connections yet');
  }
  
  return { score, feedback, maxScore: 100 };
}

// Calculate connection potential
async function calculateConnectionPotential(myHandle) {
  const myProfile = await userProfiles.getProfile(myHandle);
  const allProfiles = await userProfiles.getAllProfiles();
  
  let potentialMatches = 0;
  let skillMatches = 0;
  let interestMatches = 0;
  let projectMatches = 0;
  
  for (const other of allProfiles) {
    if (other.handle === myHandle) continue;
    
    // Skip if already connected
    const alreadyConnected = await userProfiles.hasBeenConnected(myHandle, other.handle);
    if (alreadyConnected) continue;
    
    let hasMatch = false;
    
    // Check skill overlap
    if (myProfile.tags && other.tags) {
      const sharedSkills = myProfile.tags.filter(tag => other.tags.includes(tag));
      if (sharedSkills.length > 0) {
        skillMatches++;
        hasMatch = true;
      }
    }
    
    // Check interest overlap
    if (myProfile.interests && other.interests) {
      const sharedInterests = myProfile.interests.filter(interest => other.interests.includes(interest));
      if (sharedInterests.length > 0) {
        interestMatches++;
        hasMatch = true;
      }
    }
    
    // Check project similarity
    if (myProfile.building && other.building) {
      const myWords = myProfile.building.toLowerCase().split(/\s+/);
      const theirWords = other.building.toLowerCase().split(/\s+/);
      const overlap = myWords.filter(word => theirWords.includes(word) && word.length > 3);
      if (overlap.length > 0) {
        projectMatches++;
        hasMatch = true;
      }
    }
    
    if (hasMatch) {
      potentialMatches++;
    }
  }
  
  return {
    total: potentialMatches,
    bySkills: skillMatches,
    byInterests: interestMatches,
    byProjects: projectMatches,
    totalPeople: allProfiles.length - 1
  };
}

// Generate improvement suggestions
async function generateImprovements(myHandle) {
  const myProfile = await userProfiles.getProfile(myHandle);
  const allProfiles = await userProfiles.getAllProfiles();
  const suggestions = [];
  
  // Analyze what's missing
  if (!myProfile.building) {
    suggestions.push({
      action: 'Add project description',
      command: 'vibe update building "what you\'re working on"',
      impact: 'High - helps find collaborators and similar builders',
      points: 30
    });
  }
  
  const interestCount = (myProfile.interests || []).length;
  if (interestCount < 3) {
    suggestions.push({
      action: 'Add more interests',
      command: 'vibe update interests "ai, startups, music, gaming"',
      impact: 'Medium - expands your community reach',
      points: 25 - Math.round(25 * (interestCount / 3))
    });
  }
  
  const tagCount = (myProfile.tags || []).length;
  if (tagCount < 5) {
    suggestions.push({
      action: 'Tag your skills',
      command: 'vibe update tags "frontend, react, typescript, design"',
      impact: 'High - enables skill-based matching',
      points: 25 - Math.round(25 * (tagCount / 5))
    });
  }
  
  // Analyze community trends for suggestions
  const trendingInterests = await userProfiles.getTrendingInterests();
  const trendingTags = await userProfiles.getTrendingTags();
  
  if (trendingInterests.length > 0) {
    const missingPopularInterests = trendingInterests
      .filter(trend => !(myProfile.interests || []).includes(trend.interest))
      .slice(0, 3);
      
    if (missingPopularInterests.length > 0) {
      suggestions.push({
        action: 'Consider popular interests',
        command: `Consider adding: ${missingPopularInterests.map(i => i.interest).join(', ')}`,
        impact: 'Medium - join popular communities',
        points: 'Connection boost'
      });
    }
  }
  
  // Connection-based suggestions
  const connectionCount = (myProfile.connections || []).length;
  if (connectionCount === 0) {
    suggestions.push({
      action: 'Make your first connection',
      command: 'discover suggest',
      impact: 'High - starts your network',
      points: 'Network effect'
    });
  }
  
  return suggestions.sort((a, b) => (b.points || 0) - (a.points || 0));
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'health';
  
  let display = '';

  try {
    switch (command) {
      case 'health': {
        const myProfile = await userProfiles.getProfile(myHandle);
        const health = await calculateProfileHealth(myProfile);
        
        display = `## Your Discovery Profile Health 🏥\n\n`;
        display += `**Overall Score: ${health.score}/${health.maxScore}** `;
        
        if (health.score >= 80) {
          display += `🌟 Excellent!\n\n`;
        } else if (health.score >= 60) {
          display += `👍 Good\n\n`;
        } else if (health.score >= 40) {
          display += `⚡ Needs work\n\n`;
        } else {
          display += `🚧 Getting started\n\n`;
        }
        
        display += `### Profile Checklist\n`;
        for (const item of health.feedback) {
          display += `${item}\n`;
        }
        
        display += `\n### Your Current Profile\n`;
        display += `**Building:** ${myProfile.building || '_Not set_'}\n`;
        display += `**Interests:** ${(myProfile.interests || []).join(', ') || '_None set_'}\n`;
        display += `**Skills:** ${(myProfile.tags || []).join(', ') || '_None set_'}\n`;
        display += `**Connections:** ${(myProfile.connections || []).length}\n`;
        if (myProfile.lastSeen) {
          display += `**Last Active:** ${formatTimeAgo(myProfile.lastSeen)}\n`;
        }
        
        display += `\n**Next Steps:**\n`;
        display += `• \`discovery-dashboard improve\` — Get specific suggestions\n`;
        display += `• \`discovery-dashboard potential\` — See connection opportunities`;
        break;
      }

      case 'potential': {
        const potential = await calculateConnectionPotential(myHandle);
        const myProfile = await userProfiles.getProfile(myHandle);
        
        display = `## Your Connection Potential 🎯\n\n`;
        
        if (potential.totalPeople === 0) {
          display += `_No other users in the community yet._\n\n`;
          display += `**When people join, you'll be ready to connect if you:**\n`;
          display += `• Complete your profile\n`;
          display += `• Add interests and skills\n`;
          display += `• Share what you're building`;
        } else {
          display += `**Potential Matches:** ${potential.total}/${potential.totalPeople} people (${Math.round((potential.total/potential.totalPeople)*100)}%)\n\n`;
          
          if (potential.total > 0) {
            display += `### Match Breakdown\n`;
            display += `**Skill Matches:** ${potential.bySkills} people\n`;
            display += `**Interest Matches:** ${potential.byInterests} people\n`;
            display += `**Project Matches:** ${potential.byProjects} people\n\n`;
            
            if (potential.total >= potential.totalPeople * 0.3) {
              display += `🎉 **Great potential!** You match with many community members.\n`;
            } else if (potential.total >= 3) {
              display += `👍 **Good potential!** Several connection opportunities.\n`;
            } else {
              display += `⚡ **Room to grow!** Expanding your profile will help.\n`;
            }
            
            display += `\n**Find your matches:**\n`;
            display += `• \`discover suggest\` — See your top recommendations\n`;
            display += `• \`workshop-buddy find\` — Find collaboration partners`;
          } else {
            display += `**No matches found yet.**\n\n`;
            display += `This might be because:\n`;
            display += `• Your profile needs more details\n`;
            display += `• The community is just starting\n`;
            display += `• You have unique interests (be a pioneer!)\n\n`;
            display += `**Improve your potential:**\n`;
            display += `\`discovery-dashboard improve\` — Get specific suggestions`;
          }
        }
        break;
      }

      case 'improve': {
        const suggestions = await generateImprovements(myHandle);
        
        if (suggestions.length === 0) {
          display = `## Profile Optimization Complete! 🎉\n\n`;
          display += `Your discovery profile is in great shape!\n\n`;
          display += `**Keep growing:**\n`;
          display += `• Stay active in the community\n`;
          display += `• Update your project as it evolves\n`;
          display += `• Make new connections regularly\n`;
          display += `• Share what you ship\n\n`;
          display += `**Check your stats:**\n`;
          display += `• \`discovery-dashboard health\` — Profile health\n`;
          display += `• \`discovery-dashboard potential\` — Connection opportunities`;
        } else {
          display = `## Discovery Profile Improvements 🚀\n\n`;
          display += `_Quick wins to boost your discoverability:_\n\n`;
          
          for (const suggestion of suggestions.slice(0, 5)) {
            display += `### ${suggestion.action}\n`;
            display += `**Impact:** ${suggestion.impact}\n`;
            if (typeof suggestion.points === 'number') {
              display += `**Points:** +${suggestion.points}\n`;
            } else if (suggestion.points) {
              display += `**Value:** ${suggestion.points}\n`;
            }
            display += `**Action:** \`${suggestion.command}\`\n\n`;
          }
          
          display += `**After improvements:**\n`;
          display += `• Run \`discovery-dashboard health\` to see your new score\n`;
          display += `• Try \`discover suggest\` to find matches\n`;
          display += `• Use \`workshop-buddy find\` for collaborations`;
        }
        break;
      }

      default:
        display = `## Discovery Dashboard Commands

**\`discovery-dashboard health\`** — Check your profile health score
**\`discovery-dashboard potential\`** — See your connection opportunities  
**\`discovery-dashboard improve\`** — Get specific improvement suggestions

**Your personal discovery toolkit:**
- Health score (0-100) based on profile completeness
- Connection potential analysis
- Actionable improvement suggestions
- Community trend insights

**Goal: Maximum discoverability and meaningful connections!**`;
    }
  } catch (error) {
    display = `## Dashboard Error

${error.message}

Try: \`discovery-dashboard\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };