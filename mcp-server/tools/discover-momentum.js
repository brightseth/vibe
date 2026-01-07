/**
 * Momentum-Enhanced Discovery Command — Find people based on shipping velocity and collaboration signals
 *
 * This provides users with discovery options that consider:
 * - Recent shipping activity
 * - Collaboration intent signals
 * - Building momentum patterns
 * - Project complementarity
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');
const momentum = require('./discovery-momentum');

const definition = {
  name: 'vibe_discover_momentum',
  description: 'Find connections based on shipping patterns and collaboration signals.',
  inputSchema: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['matches', 'collaborate', 'momentum', 'opportunities'],
        description: 'Discovery mode: matches (general), collaborate (seeking partners), momentum (activity-based), opportunities (all collaboration matches)'
      }
    },
    required: []
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const mode = args.mode || 'matches';
  
  let display = '';

  try {
    switch (mode) {
      case 'matches': {
        const recommendations = await momentum.generateShippingRecommendations(myHandle);
        
        if (recommendations.momentumMatches.length === 0) {
          display = `## No Momentum Matches Found

_Looking for people with recent shipping activity..._

${recommendations.targetMomentum.recentShips > 0 
  ? `**Your momentum:** ${recommendations.targetMomentum.score} (${recommendations.targetMomentum.recentShips} recent ships)`
  : '**Tip:** Ship something recently to improve matching with active builders'
}

**Try:**
- \`discover momentum collaborate\` — Find collaboration opportunities
- \`discover momentum opportunities\` — See all seeking partnerships
- \`vibe ship "what you built"\` — Update your activity`;

        } else {
          display = `## Momentum-Based Matches\n\n`;
          display += `**Your building momentum:** ${recommendations.targetMomentum.score}\n`;
          display += `_${recommendations.targetMomentum.recentShips} ships this week • ${recommendations.targetMomentum.totalShips} total_\n\n`;

          for (const match of recommendations.momentumMatches) {
            display += `### @${match.handle} _(${match.score} match • ${Math.round(match.confidence * 100)}% confidence)_\n\n`;
            display += `**Building:** ${match.building || 'Active project'}\n`;
            
            if (match.lastShip) {
              display += `**Latest ship:** ${match.lastShip.what}\n`;
              display += `_${formatTimeAgo(match.lastShip.timestamp)}_\n`;
            }
            
            display += `**Why connect:**\n`;
            for (const reason of match.reasons) {
              display += `• ${reason}\n`;
            }
            
            display += `**Activity:** ${match.momentum.recentShips} recent ships`;
            if (match.momentum.seekingCollaboration) {
              display += ` • 🤝 **Seeking collaboration**`;
            }
            display += '\n\n';
          }

          display += `**Quick actions:**\n`;
          display += `- \`message @handle\` to connect\n`;
          display += `- \`discover momentum collaborate\` for partnership opportunities`;
        }
        break;
      }

      case 'collaborate': {
        const recommendations = await momentum.generateShippingRecommendations(myHandle);
        const collabOpps = recommendations.collaborationOpportunities;
        
        if (collabOpps.length === 0) {
          const myMomentum = recommendations.targetMomentum;
          
          display = `## No Direct Collaboration Matches

${myMomentum.seekingCollaboration 
            ? '**You\'re seeking collaboration** — here are active builders:'
            : '**Tip:** Signal collaboration intent in your ships with phrases like "looking for help" or "seeking feedback"'
          }

**Alternative matches:**`;
          
          const topMatches = recommendations.momentumMatches.slice(0, 2);
          for (const match of topMatches) {
            display += `\n\n**@${match.handle}** _(${match.score} match)_`;
            display += `\nBuilding: ${match.building}`;
            display += `\nActive: ${match.momentum.recentShips} recent ships`;
            if (match.reasons.length > 0) {
              display += `\nWhy: ${match.reasons[0]}`;
            }
          }
          
          if (topMatches.length === 0) {
            display += `\n\n_No matches found. Try shipping something or updating your profile._`;
          }

        } else {
          display = `## Collaboration Opportunities\n\n`;
          
          for (const opp of collabOpps) {
            const isSeeker = opp.seeker === myHandle;
            const partnerHandle = isSeeker ? opp.builder : opp.seeker;
            const partnerProject = isSeeker ? opp.builderProject : opp.seekerProject;
            
            display += `### @${partnerHandle} _(${opp.score} match)_\n`;
            display += `**Their project:** ${partnerProject}\n`;
            display += `**Match reasons:**\n`;
            for (const reason of opp.reasons) {
              display += `• ${reason}\n`;
            }
            display += '\n';
          }

          display += `**Next steps:**\n`;
          display += `- Reach out with \`message @handle\`\n`;
          display += `- Reference their recent ship to show genuine interest\n`;
          display += `- Be specific about how you could collaborate`;
        }
        break;
      }

      case 'momentum': {
        const myProfile = await userProfiles.getProfile(myHandle);
        const myMomentum = momentum.analyzeShippingMomentum(myProfile);
        
        display = `## Your Building Momentum\n\n`;
        display += `**Momentum Score:** ${myMomentum.score}\n`;
        display += `**Recent ships:** ${myMomentum.recentShips} (past week)\n`;
        display += `**Total ships:** ${myMomentum.totalShips}\n`;
        
        if (myMomentum.seekingCollaboration) {
          display += `**Status:** 🤝 Seeking collaboration\n`;
        }
        
        if (myMomentum.projectTypes.length > 0) {
          display += `**Project types:** ${myMomentum.projectTypes.join(', ')}\n`;
        }
        
        display += '\n';
        
        // Momentum insights
        if (myMomentum.score >= 50) {
          display += `🚀 **High momentum!** Great time to find collaboration partners.\n\n`;
        } else if (myMomentum.score >= 25) {
          display += `⚡ **Good momentum.** Consider shipping more to increase visibility.\n\n`;
        } else {
          display += `📈 **Building momentum.** Ship something recent to improve matching.\n\n`;
        }

        // Show recent ships
        if (myProfile.ships && myProfile.ships.length > 0) {
          display += `**Recent ships:**\n`;
          for (const ship of myProfile.ships.slice(0, 3)) {
            display += `• ${ship.what} _(${formatTimeAgo(ship.timestamp)})_\n`;
          }
        } else {
          display += `**No ships recorded.** Use \`vibe ship "what you built"\` to get started.`;
        }
        
        display += `\n\n**Improve your momentum:**\n`;
        display += `- Ship regularly (\`vibe ship\`)\n`;
        display += `- Signal collaboration intent ("seeking feedback", "looking for help")\n`;
        display += `- Update your profile with current project (\`vibe update building\`)`;
        break;
      }

      case 'opportunities': {
        const opportunities = await momentum.findCollaborationOpportunities();
        
        if (opportunities.opportunities.length === 0) {
          display = `## No Collaboration Opportunities Found

**Current activity:**
- ${opportunities.totalSeekers} people seeking collaboration
- ${opportunities.totalActiveBuilders} active builders

_Not enough overlap for quality matches yet._

**Help grow the community:**
- Ship with collaboration signals ("looking for", "need help")
- Update your profile and interests
- Connect with \`discover momentum matches\``;

        } else {
          display = `## All Collaboration Opportunities\n\n`;
          display += `**Found ${opportunities.opportunities.length} potential matches**\n`;
          display += `_${opportunities.totalSeekers} seeking • ${opportunities.totalActiveBuilders} building_\n\n`;

          for (const opp of opportunities.opportunities) {
            display += `**@${opp.seeker} 🤝 @${opp.builder}** _(${opp.score} match)_\n`;
            display += `Seeker: ${opp.seekerProject || 'Seeking collaboration'}\n`;
            display += `Builder: ${opp.builderProject || 'Active project'}\n`;
            display += `Match: ${opp.reasons[0] || 'Good fit'}\n\n`;
          }

          display += `**As a community member, you could:**\n`;
          display += `- Suggest these connections to the people involved\n`;
          display += `- Join \`discover momentum collaborate\` to find your own matches`;
        }
        break;
      }

      default:
        display = `## Momentum Discovery Commands

**\`discover momentum matches\`** — Find matches based on shipping patterns
**\`discover momentum collaborate\`** — Find collaboration opportunities  
**\`discover momentum momentum\`** — Analyze your building momentum
**\`discover momentum opportunities\`** — See all collaboration matches

**Key features:**
- Matches based on recent shipping activity
- Detects collaboration intent in ships
- Considers project complementarity
- Analyzes building momentum patterns`;
    }

  } catch (error) {
    display = `## Momentum Discovery Error

${error.message}

Try: \`discover momentum\` for available commands`;
  }

  return { display };
}

module.exports = { definition, handler };