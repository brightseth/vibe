/**
 * Smart Introductions — AI-powered introduction message generation
 *
 * Creates personalized introduction messages for connection suggestions:
 * - Highlights shared interests and complementary skills
 * - Suggests specific collaboration opportunities  
 * - Includes conversation starters
 * - Maintains natural, friendly tone
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_smart_intro',
  description: 'Generate personalized introduction messages for connecting two users.',
  inputSchema: {
    type: 'object',
    properties: {
      from: {
        type: 'string',
        description: 'Handle of person to write intro for'
      },
      to: {
        type: 'string', 
        description: 'Handle of person to introduce them to'
      },
      style: {
        type: 'string',
        enum: ['casual', 'professional', 'enthusiastic', 'brief'],
        description: 'Tone of introduction message'
      }
    },
    required: ['from', 'to']
  }
};

// Generate smart introduction message
async function generateIntroduction(fromHandle, toHandle, style = 'casual') {
  const fromProfile = await userProfiles.getProfile(fromHandle);
  const toProfile = await userProfiles.getProfile(toHandle);
  
  // Find connection points
  const connectionPoints = findConnectionPoints(fromProfile, toProfile);
  
  if (connectionPoints.shared.length === 0 && connectionPoints.complementary.length === 0) {
    return generateGenericIntro(fromProfile, toProfile, style);
  }
  
  return generatePersonalizedIntro(fromProfile, toProfile, connectionPoints, style);
}

// Find specific connection points between two profiles
function findConnectionPoints(profile1, profile2) {
  const shared = {
    interests: [],
    tags: [],
    buildingSimilarity: null
  };
  
  const complementary = {
    skills: [],
    experiences: []
  };
  
  // Shared interests
  if (profile1.interests && profile2.interests) {
    shared.interests = profile1.interests.filter(i => 
      profile2.interests.some(j => i.toLowerCase() === j.toLowerCase())
    );
  }
  
  // Shared tags
  if (profile1.tags && profile2.tags) {
    shared.tags = profile1.tags.filter(t => 
      profile2.tags.some(u => t.toLowerCase() === u.toLowerCase())
    );
  }
  
  // Building similarity
  if (profile1.building && profile2.building) {
    const building1 = profile1.building.toLowerCase();
    const building2 = profile2.building.toLowerCase();
    
    const words1 = building1.split(/\s+/);
    const words2 = building2.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w) && w.length > 3);
    
    if (commonWords.length > 0) {
      shared.buildingSimilarity = commonWords;
    }
  }
  
  // Complementary skills
  const complementaryPairs = [
    [['frontend', 'react', 'vue', 'angular'], ['backend', 'api', 'server', 'database']],
    [['design', 'ui', 'ux', 'figma'], ['engineering', 'development', 'coding']],
    [['ai', 'ml', 'llm'], ['data', 'analytics', 'infrastructure']],
    [['mobile', 'ios', 'android'], ['web', 'frontend', 'fullstack']],
    [['product', 'pm', 'strategy'], ['engineering', 'technical', 'dev']],
    [['marketing', 'growth', 'content'], ['product', 'engineering']],
    [['research', 'academic'], ['implementation', 'production', 'scaling']]
  ];
  
  for (const [group1, group2] of complementaryPairs) {
    const hasGroup1 = profile1.tags?.some(t => 
      group1.some(g => t.toLowerCase().includes(g))
    );
    const hasGroup2 = profile2.tags?.some(t => 
      group2.some(g => t.toLowerCase().includes(g))
    );
    
    if (hasGroup1 && hasGroup2) {
      complementary.skills.push({
        person1Skill: group1.find(g => profile1.tags?.some(t => t.toLowerCase().includes(g))),
        person2Skill: group2.find(g => profile2.tags?.some(t => t.toLowerCase().includes(g)))
      });
    }
    
    // Check reverse
    const hasGroup2First = profile1.tags?.some(t => 
      group2.some(g => t.toLowerCase().includes(g))
    );
    const hasGroup1Second = profile2.tags?.some(t => 
      group1.some(g => t.toLowerCase().includes(g))
    );
    
    if (hasGroup2First && hasGroup1Second) {
      complementary.skills.push({
        person1Skill: group2.find(g => profile1.tags?.some(t => t.toLowerCase().includes(g))),
        person2Skill: group1.find(g => profile2.tags?.some(t => t.toLowerCase().includes(g)))
      });
    }
  }
  
  return { shared, complementary };
}

// Generate personalized introduction
function generatePersonalizedIntro(fromProfile, toProfile, connectionPoints, style) {
  let intro = '';
  
  // Opening based on style
  const openings = {
    casual: [`Hey @${toProfile.handle}! 👋`, `Hi @${toProfile.handle}!`],
    professional: [`Hello @${toProfile.handle},`, `Hi @${toProfile.handle},`],
    enthusiastic: [`Hey @${toProfile.handle}! 🚀`, `@${toProfile.handle} - excited to connect!`],
    brief: [`@${toProfile.handle} -`, `Hi @${toProfile.handle} -`]
  };
  
  intro += openings[style][0] + '\n\n';
  
  // Main connection reason
  if (connectionPoints.shared.buildingSimilarity) {
    intro += `I noticed you're working on ${toProfile.building} - I'm building something similar`;
    if (fromProfile.building) {
      intro += `: ${fromProfile.building}`;
    }
    intro += '. Would love to chat about our approaches!\n\n';
  }
  else if (connectionPoints.shared.interests.length > 0) {
    const sharedInterests = connectionPoints.shared.interests.slice(0, 2);
    intro += `Saw that we both share an interest in ${sharedInterests.join(' and ')}. `;
    if (fromProfile.building && toProfile.building) {
      intro += `I'm working on ${fromProfile.building} and would love to hear about ${toProfile.building}!\n\n`;
    } else {
      intro += `Would love to connect and share what we're each working on!\n\n`;
    }
  }
  else if (connectionPoints.complementary.skills.length > 0) {
    const skill = connectionPoints.complementary.skills[0];
    intro += `I noticed you have ${skill.person2Skill} experience, and I focus on ${skill.person1Skill}. `;
    intro += `Seems like we might have complementary skills - would be great to connect!\n\n`;
  }
  else if (connectionPoints.shared.tags.length > 0) {
    const sharedTags = connectionPoints.shared.tags.slice(0, 2);
    intro += `We both work with ${sharedTags.join(' and ')} - always great to meet fellow builders in the space!\n\n`;
  }
  
  // Conversation starters
  if (style !== 'brief') {
    intro += addConversationStarters(fromProfile, toProfile, connectionPoints);
  }
  
  // Closing based on style
  const closings = {
    casual: 'Looking forward to connecting! ✨',
    professional: 'Would be great to connect and learn more about your work.',
    enthusiastic: 'Excited to learn more about what you\'re building! 🔥',
    brief: 'Would love to connect!'
  };
  
  intro += closings[style];
  
  return intro;
}

// Add conversation starters
function addConversationStarters(fromProfile, toProfile, connectionPoints) {
  const starters = [];
  
  if (fromProfile.building) {
    starters.push(`I'd love to hear more about ${toProfile.building || 'what you\'re working on'}`);
  }
  
  if (connectionPoints.shared.interests.length > 0) {
    const interest = connectionPoints.shared.interests[0];
    starters.push(`How did you get into ${interest}?`);
  }
  
  if (connectionPoints.shared.buildingSimilarity) {
    starters.push('What\'s been your biggest challenge so far?');
    starters.push('Have you found any particularly useful tools or resources?');
  }
  
  if (connectionPoints.complementary.skills.length > 0) {
    starters.push('Would be interesting to compare our different perspectives on building');
  }
  
  if (fromProfile.ships?.length > 0) {
    const recentShip = fromProfile.ships[0];
    starters.push(`I recently shipped ${recentShip.what} - would love to hear what you've been working on`);
  }
  
  if (starters.length > 0) {
    const randomStarter = starters[Math.floor(Math.random() * starters.length)];
    return `${randomStarter}.\n\n`;
  }
  
  return '';
}

// Generate generic introduction for minimal connection
function generateGenericIntro(fromProfile, toProfile, style) {
  let intro = '';
  
  const openings = {
    casual: `Hey @${toProfile.handle}! 👋`,
    professional: `Hello @${toProfile.handle},`,
    enthusiastic: `Hi @${toProfile.handle}! 🚀`,
    brief: `Hi @${toProfile.handle} -`
  };
  
  intro += openings[style] + '\n\n';
  
  if (fromProfile.building && toProfile.building) {
    intro += `I'm working on ${fromProfile.building} and saw you're building ${toProfile.building}. `;
    intro += `Always interesting to connect with fellow builders!\n\n`;
  } else if (fromProfile.building) {
    intro += `I'm working on ${fromProfile.building} and would love to connect with other builders. `;
    intro += `What are you working on?\n\n`;
  } else {
    intro += `Saw your profile and would love to connect! What are you currently building?\n\n`;
  }
  
  const closings = {
    casual: 'Looking forward to chatting! ✨',
    professional: 'Would be great to learn more about your work.',
    enthusiastic: 'Excited to connect! 🔥',
    brief: 'Would love to connect!'
  };
  
  intro += closings[style];
  
  return intro;
}

// Generate introduction with explanation of match reasoning
function generateIntroWithReasoning(fromProfile, toProfile, matchScore, matchReasons) {
  let intro = `Hey @${toProfile.handle}! 👋\n\n`;
  
  intro += `I came across your profile through /vibe's discovery system `;
  intro += `(we got a ${matchScore}% match score!) and thought we should connect.\n\n`;
  
  if (matchReasons.length > 0) {
    intro += `Here's why I think we'd click:\n`;
    for (const reason of matchReasons.slice(0, 2)) {
      intro += `• ${reason}\n`;
    }
    intro += `\n`;
  }
  
  if (fromProfile.building && toProfile.building) {
    intro += `I'm working on ${fromProfile.building}, and I'd love to hear about ${toProfile.building}!\n\n`;
  }
  
  intro += `Would love to connect and share what we're each building! ✨`;
  
  return intro;
}

// Main handler function
async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { from, to, style } = args;
  
  if (!from || !to) {
    return { 
      error: 'Please specify both users: smart-intro from @alice to @bob' 
    };
  }
  
  const fromHandle = from.replace('@', '');
  const toHandle = to.replace('@', '');
  
  if (fromHandle === toHandle) {
    return { 
      error: 'Cannot create introduction message to yourself!' 
    };
  }
  
  try {
    // Check if these users have already been connected
    const hasConnected = await userProfiles.hasBeenConnected(fromHandle, toHandle);
    
    if (hasConnected) {
      return {
        display: `## Already Connected! 🔗

@${fromHandle} and @${toHandle} have been introduced before.

**Try:**
- \`discover suggest\` for new recommendations
- \`discover active\` to find other builders online`
      };
    }
    
    const introduction = await generateIntroduction(fromHandle, toHandle, style);
    
    return {
      display: `## Smart Introduction Generated 💌

**From @${fromHandle} to @${toHandle}:**

${introduction}

**Next steps:**
- Copy and send this via \`message @${toHandle}\`
- Or customize it to match your voice
- Use \`smart-intro from @${fromHandle} to @${toHandle} style professional\` for different tones`
    };
    
  } catch (error) {
    return { 
      error: `Failed to generate introduction: ${error.message}` 
    };
  }
}

module.exports = { definition, handler, generateIntroduction, generateIntroWithReasoning };