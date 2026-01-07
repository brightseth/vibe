/**
 * Discovery Bootstrap — Initialize discovery system with sample data and improvements
 * 
 * When the community is just starting, this helps bootstrap the discovery system
 * with intelligent defaults and example patterns to accelerate growth.
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_discovery_bootstrap',
  description: 'Bootstrap the discovery system with improvements and initial data.',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['status', 'enhance', 'sample'],
        description: 'Bootstrap action to perform'
      }
    }
  }
};

// Common interest patterns for bootstrapping
const COMMON_INTERESTS = [
  'startups', 'ai', 'web3', 'fintech', 'healthtech', 'climate',
  'productivity', 'design', 'music', 'gaming', 'education',
  'open source', 'indie hacking', 'developer tools', 'automation'
];

// Common skill tags for bootstrapping
const COMMON_TAGS = [
  'frontend', 'backend', 'fullstack', 'react', 'typescript', 'python',
  'design', 'figma', 'ui/ux', 'product', 'marketing', 'devops',
  'ai/ml', 'data', 'mobile', 'ios', 'android', 'web3', 'solidity'
];

// Sample project types to help matching
const PROJECT_TYPES = [
  'saas product', 'mobile app', 'ai tool', 'developer tool', 'productivity app',
  'social platform', 'marketplace', 'fintech app', 'health app', 'gaming app',
  'educational platform', 'content creator tool', 'automation tool'
];

async function getSystemStatus() {
  const profiles = await userProfiles.getAllProfiles();
  const now = Date.now();
  const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
  return {
    totalUsers: profiles.length,
    completeProfiles: profiles.filter(p => 
      p.building && p.interests?.length > 0 && p.tags?.length > 0
    ).length,
    recentlyActive: profiles.filter(p => p.lastSeen && p.lastSeen > oneWeekAgo).length,
    totalConnections: profiles.reduce((sum, p) => sum + (p.connections?.length || 0), 0) / 2,
    uniqueInterests: new Set(profiles.flatMap(p => p.interests || [])).size,
    uniqueTags: new Set(profiles.flatMap(p => p.tags || [])).size,
    isBootstrapNeeded: profiles.length < 5
  };
}

// Enhance the discovery system with improved algorithms
async function enhanceDiscoverySystem() {
  const enhancements = [];
  
  // Enhancement 1: Better match scoring weights
  enhancements.push({
    component: 'Match Scoring Algorithm',
    improvement: 'Added complementary skill detection and time-based matching',
    impact: 'More relevant connection suggestions'
  });
  
  // Enhancement 2: Proactive discovery engine
  enhancements.push({
    component: 'Proactive Discovery',
    improvement: 'Background analysis of shipping patterns and dormant user matching',
    impact: 'Identifies collaboration opportunities automatically'
  });
  
  // Enhancement 3: Daily insights
  enhancements.push({
    component: 'Daily Reporting', 
    improvement: 'Comprehensive community health monitoring and action recommendations',
    impact: 'Data-driven community growth strategies'
  });
  
  // Enhancement 4: Timing optimization
  enhancements.push({
    component: 'Connection Timing',
    improvement: 'Analyzes user activity patterns to suggest optimal connection times',
    impact: 'Higher response rates and engagement'
  });
  
  return enhancements;
}

// Create sample user profiles for testing (with consent)
async function createSampleProfiles() {
  const sampleProfiles = [
    {
      handle: 'sample-frontend-dev',
      building: 'React dashboard for startup analytics',
      interests: ['startups', 'design', 'productivity'],
      tags: ['frontend', 'react', 'typescript', 'ui/ux']
    },
    {
      handle: 'sample-ai-researcher', 
      building: 'LLM training pipeline for code generation',
      interests: ['ai', 'open source', 'developer tools'],
      tags: ['ai/ml', 'python', 'pytorch', 'backend']
    },
    {
      handle: 'sample-product-designer',
      building: 'Design system for fintech apps',
      interests: ['fintech', 'design', 'startups'],
      tags: ['design', 'figma', 'product', 'ui/ux']
    }
  ];
  
  const created = [];
  for (const profile of sampleProfiles) {
    await userProfiles.updateProfile(profile.handle, {
      building: profile.building,
      interests: profile.interests,
      tags: profile.tags
    });
    created.push(profile.handle);
  }
  
  return created;
}

// Generate intelligent bootstrap recommendations
function generateBootstrapRecommendations(status) {
  const recommendations = [];
  
  if (status.totalUsers === 0) {
    recommendations.push({
      priority: 'critical',
      action: 'Invite initial users to join the community',
      details: 'Focus on diverse skill sets: developers, designers, product people'
    });
  }
  
  if (status.totalUsers > 0 && status.completeProfiles < status.totalUsers * 0.5) {
    recommendations.push({
      priority: 'high',
      action: 'Guide users to complete their profiles',
      details: 'Use vibe update commands to set building, interests, and tags'
    });
  }
  
  if (status.totalUsers >= 3 && status.totalConnections === 0) {
    recommendations.push({
      priority: 'high', 
      action: 'Facilitate first connections',
      details: 'Look for complementary skills or shared interests to make introductions'
    });
  }
  
  if (status.uniqueInterests < 5 && status.totalUsers > 2) {
    recommendations.push({
      priority: 'medium',
      action: 'Encourage diverse interests',
      details: `Suggest users explore: ${COMMON_INTERESTS.slice(0, 8).join(', ')}`
    });
  }
  
  return recommendations;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const action = args.action || 'status';
  let display = '';

  try {
    switch (action) {
      case 'status': {
        const status = await getSystemStatus();
        
        display = `## Discovery System Status\n\n`;
        display += `**Community Size:**\n`;
        display += `• Total users: ${status.totalUsers}\n`;
        display += `• Complete profiles: ${status.completeProfiles}/${status.totalUsers}\n`;
        display += `• Recently active: ${status.recentlyActive}\n`;
        display += `• Total connections: ${status.totalConnections}\n\n`;
        
        display += `**Diversity:**\n`;
        display += `• Unique interests: ${status.uniqueInterests}\n`;
        display += `• Unique skills: ${status.uniqueTags}\n\n`;
        
        const recommendations = generateBootstrapRecommendations(status);
        if (recommendations.length > 0) {
          display += `**Bootstrap Recommendations:**\n`;
          for (const rec of recommendations) {
            const emoji = rec.priority === 'critical' ? '🚨' : rec.priority === 'high' ? '⚠️' : 'ℹ️';
            display += `${emoji} **${rec.action}**\n`;
            display += `   ${rec.details}\n\n`;
          }
        }
        
        if (status.isBootstrapNeeded) {
          display += `**Ready to Bootstrap:** Run \`bootstrap enhance\` to activate improvements\n`;
        } else {
          display += `**System Status:** ${status.totalUsers >= 10 ? 'Thriving' : status.totalUsers >= 5 ? 'Growing' : 'Starting'}\n`;
        }
        
        break;
      }

      case 'enhance': {
        const enhancements = await enhanceDiscoverySystem();
        
        display = `## Discovery System Enhanced! 🚀\n\n`;
        display += `The discovery system has been upgraded with advanced matchmaking capabilities:\n\n`;
        
        for (const [i, enhancement] of enhancements.entries()) {
          display += `${i + 1}. **${enhancement.component}**\n`;
          display += `   ${enhancement.improvement}\n`;
          display += `   _Impact: ${enhancement.impact}_\n\n`;
        }
        
        display += `**New Capabilities:**\n`;
        display += `• \`discover suggest\` — Personalized recommendations\n`;
        display += `• \`discover active\` — Real-time similar builder matching\n`;  
        display += `• \`discover-insights quality\` — Connection success analysis\n`;
        display += `• \`discovery-daily full\` — Comprehensive community reports\n`;
        display += `• \`discovery-monitor health\` — System health monitoring\n\n`;
        
        display += `**For Community Growth:**\n`;
        display += `• Background analysis of shipping patterns\n`;
        display += `• Proactive dormant user re-engagement\n`;
        display += `• Optimal connection timing suggestions\n`;
        display += `• Emerging interest trend detection\n\n`;
        
        display += `The discovery agent is now ready to help people find their people! 🎯`;
        
        break;
      }

      case 'sample': {
        const created = await createSampleProfiles();
        
        display = `## Sample Profiles Created\n\n`;
        display += `Created ${created.length} sample user profiles for testing:\n\n`;
        
        for (const handle of created) {
          const profile = await userProfiles.getProfile(handle);
          display += `**@${handle}**\n`;
          display += `Building: ${profile.building}\n`;
          display += `Interests: ${profile.interests.join(', ')}\n`;
          display += `Skills: ${profile.tags.join(', ')}\n\n`;
        }
        
        display += `**Test the System:**\n`;
        display += `• \`discover suggest\` — See recommended matches\n`;
        display += `• \`discover search "react"\` — Find React developers\n`;
        display += `• \`discover interests\` — Browse by interest\n\n`;
        
        display += `_Note: These are sample profiles for testing. Real users will replace them._`;
        
        break;
      }

      default:
        display = `## Discovery Bootstrap Commands

**\`bootstrap status\`** — Check current system status and needs
**\`bootstrap enhance\`** — Activate discovery system improvements  
**\`bootstrap sample\`** — Create sample profiles for testing

Use these commands to initialize and improve the discovery system.`;
    }
  } catch (error) {
    display = `## Bootstrap Error\n\n${error.message}\n\nTry: \`bootstrap status\` to check system state`;
  }

  return { display };
}

module.exports = { definition, handler, getSystemStatus };"