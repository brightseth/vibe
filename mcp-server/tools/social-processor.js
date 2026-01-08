/**
 * /vibe Social Events Processor
 * 
 * Processes social media events from all platforms (X, Telegram, Discord)
 * and executes actions based on content analysis.
 */

const config = require('../config');

/**
 * Social action patterns and responses
 */
const SOCIAL_PATTERNS = {
  // /vibe commands
  commands: {
    'join vibe': 'invite_to_vibe',
    'what is vibe': 'explain_vibe', 
    'how to join': 'send_invite_link',
    'vibe invite': 'send_invite_link',
    'ship update': 'ask_for_ship_details'
  },
  
  // Intent detection
  intents: {
    building: ['building', 'coding', 'developing', 'working on', 'shipping'],
    learning: ['learning', 'studying', 'tutorial', 'how to', 'need help'],
    collaboration: ['collaborate', 'pair program', 'work together', 'team up'],
    feedback: ['feedback', 'review', 'thoughts on', 'what do you think'],
    sharing: ['check this out', 'built this', 'shipped', 'just made']
  },
  
  // Auto-response triggers
  triggers: {
    mention_with_question: /(@\w+.*\?)|(\?.*@\w+)/,
    product_hunt_launch: /(product hunt)|(launching on ph)|(ph launch)/i,
    github_share: /github\.com\/[\w-]+\/[\w-]+/,
    demo_share: /(demo)|(live demo)|(check out).*https?/i
  }
};

/**
 * Process incoming social event
 */
async function processSocialEvent(event) {
  const { platform, type, from, content, metadata } = event;
  
  console.log(`[Social] Processing ${type} from @${from.handle} on ${platform}`);
  
  const actions = [];
  
  try {
    // 1. Command detection
    const command = detectCommand(content);
    if (command) {
      actions.push({
        type: 'command',
        action: SOCIAL_PATTERNS.commands[command],
        priority: 'high'
      });
    }
    
    // 2. Intent analysis
    const intent = analyzeIntent(content);
    if (intent) {
      actions.push({
        type: 'intent',
        intent,
        priority: 'medium'
      });
    }
    
    // 3. Auto-response triggers
    const trigger = checkTriggers(content);
    if (trigger) {
      actions.push({
        type: 'trigger',
        trigger,
        priority: 'low'
      });
    }
    
    // 4. Platform-specific processing
    const platformActions = await processPlatformSpecific(platform, type, event);
    actions.push(...platformActions);
    
    // 5. Execute actions
    const results = [];
    for (const action of actions) {
      const result = await executeAction(action, event);
      if (result) results.push(result);
    }
    
    return {
      processed: true,
      actions_taken: results.length,
      actions: results
    };
    
  } catch (error) {
    console.error('[Social] Processing error:', error);
    return {
      processed: false,
      error: error.message
    };
  }
}

/**
 * Detect /vibe commands in text
 */
function detectCommand(text) {
  const lowerText = text.toLowerCase();
  
  for (const [phrase, action] of Object.entries(SOCIAL_PATTERNS.commands)) {
    if (lowerText.includes(phrase)) {
      return phrase;
    }
  }
  
  return null;
}

/**
 * Analyze user intent from message content
 */
function analyzeIntent(text) {
  const lowerText = text.toLowerCase();
  
  for (const [intent, keywords] of Object.entries(SOCIAL_PATTERNS.intents)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return intent;
      }
    }
  }
  
  return null;
}

/**
 * Check for auto-response triggers
 */
function checkTriggers(text) {
  for (const [trigger, pattern] of Object.entries(SOCIAL_PATTERNS.triggers)) {
    if (pattern.test(text)) {
      return trigger;
    }
  }
  
  return null;
}

/**
 * Platform-specific event processing
 */
async function processPlatformSpecific(platform, type, event) {
  const actions = [];
  
  switch (platform) {
    case 'x':
      if (type === 'mention') {
        actions.push({ type: 'notify_team', platform: 'x', priority: 'medium' });
        
        // If mention contains @vibebuilders or #vibe, flag for team attention
        if (event.content.includes('@vibebuilders') || event.content.includes('#vibe')) {
          actions.push({ type: 'team_alert', priority: 'high' });
        }
      }
      
      if (type === 'dm') {
        // Auto-reply to DMs with basic info
        actions.push({ type: 'auto_reply', template: 'dm_welcome', priority: 'high' });
      }
      break;
      
    case 'telegram':
      if (type === 'message' && event.metadata?.isGroup) {
        // Group message - log but don't auto-respond
        actions.push({ type: 'log_group_activity', priority: 'low' });
      }
      break;
      
    case 'discord':
      if (type === 'slash_command') {
        // Discord commands are handled by the webhook directly
        actions.push({ type: 'log_command_usage', priority: 'low' });
      }
      break;
  }
  
  return actions;
}

/**
 * Execute a social action
 */
async function executeAction(action, originalEvent) {
  const { type, priority } = action;
  
  try {
    switch (type) {
      case 'command':
        return await handleCommand(action.action, originalEvent);
        
      case 'intent':
        return await handleIntent(action.intent, originalEvent);
        
      case 'auto_reply':
        return await sendAutoReply(action.template, originalEvent);
        
      case 'notify_team':
        return await notifyTeam(originalEvent);
        
      case 'team_alert':
        return await sendTeamAlert(originalEvent);
        
      default:
        console.log(`[Social] Action ${type} logged`);
        return { action: type, status: 'logged' };
    }
  } catch (error) {
    console.error(`[Social] Action ${type} failed:`, error);
    return { action: type, status: 'failed', error: error.message };
  }
}

/**
 * Handle /vibe commands
 */
async function handleCommand(command, event) {
  const { platform, from } = event;
  
  switch (command) {
    case 'invite_to_vibe':
      return await sendVibeInvite(platform, from);
      
    case 'explain_vibe':
      return await sendVibeExplanation(platform, from);
      
    case 'send_invite_link':
      return await sendInviteLink(platform, from);
      
    case 'ask_for_ship_details':
      return await askShipDetails(platform, from);
      
    default:
      return { command, status: 'unknown' };
  }
}

/**
 * Handle user intents
 */
async function handleIntent(intent, event) {
  const suggestions = {
    building: "That's awesome! Consider sharing your progress in /vibe for feedback and collaboration.",
    learning: "Learning is great! Check out /vibe's workshop resources and connect with other learners.",
    collaboration: "Perfect mindset! /vibe is all about collaborative building. Join us!",
    feedback: "Feedback is valuable! /vibe has active builders who love reviewing each other's work.",
    sharing: "Love the sharing spirit! /vibe is a great place to showcase what you build."
  };
  
  return {
    intent,
    suggestion: suggestions[intent] || "Thanks for sharing!",
    status: 'processed'
  };
}

/**
 * Send auto-reply based on template
 */
async function sendAutoReply(template, event) {
  const templates = {
    dm_welcome: `Hi! Thanks for reaching out. /vibe is a collaborative workshop where builders ship cool projects together. 

🚀 Join us: https://slashvibe.dev
🎮 Try features: Chess, Streaks, Matching
💬 Connect: @vibebuilders

What are you building?`
  };
  
  const message = templates[template];
  if (!message) return null;
  
  // In a full implementation, this would send the reply via the platform API
  console.log(`[Social] Auto-reply to @${event.from.handle}: ${message.slice(0, 50)}...`);
  
  return {
    type: 'auto_reply',
    template,
    recipient: event.from.handle,
    status: 'sent'
  };
}

/**
 * Send /vibe invite
 */
async function sendVibeInvite(platform, user) {
  const invite = {
    message: `🎉 You're invited to /vibe!\n\nA collaborative workshop where builders ship together.\n\n🔗 Join: https://slashvibe.dev\n\nSee you in the workshop! 🚀`,
    platform,
    user: user.handle
  };
  
  console.log(`[Social] Sent /vibe invite to @${user.handle} on ${platform}`);
  
  return {
    type: 'invite',
    recipient: user.handle,
    platform,
    status: 'sent'
  };
}

/**
 * Send /vibe explanation
 */
async function sendVibeExplanation(platform, user) {
  const explanation = `✨ /vibe is a collaborative workshop where builders ship cool projects together!

🎯 What we do:
• Build games (Chess, Drawing, Icebreakers)  
• Track progress (Streaks, Achievements)
• Connect builders (Matching, Skills Exchange)
• Ship fast (Real-time collaboration)

🚀 Join the workshop: https://slashvibe.dev`;
  
  console.log(`[Social] Sent /vibe explanation to @${user.handle} on ${platform}`);
  
  return {
    type: 'explanation',
    recipient: user.handle,
    platform,
    status: 'sent'
  };
}

/**
 * Send invite link
 */
async function sendInviteLink(platform, user) {
  return {
    type: 'invite_link',
    link: 'https://slashvibe.dev',
    recipient: user.handle,
    platform,
    status: 'sent'
  };
}

/**
 * Ask for ship details
 */
async function askShipDetails(platform, user) {
  const response = `🚀 Awesome that you're shipping! 

What did you build? Tell us about:
• What it does
• Tech stack used  
• Any challenges you solved

We love celebrating builders in /vibe! 🎉`;
  
  return {
    type: 'ship_inquiry',
    message: response,
    recipient: user.handle,
    platform,
    status: 'sent'
  };
}

/**
 * Notify team about social activity
 */
async function notifyTeam(event) {
  const notification = {
    type: 'team_notification',
    event_type: event.type,
    platform: event.platform,
    from: event.from.handle,
    content: event.content.slice(0, 100),
    timestamp: new Date().toISOString()
  };
  
  console.log('[Social] Team notification:', notification);
  
  // In a full implementation, this would send to team channels
  return {
    type: 'team_notification',
    status: 'sent'
  };
}

/**
 * Send high-priority team alert
 */
async function sendTeamAlert(event) {
  const alert = {
    type: 'team_alert',
    priority: 'high',
    event_type: event.type,
    platform: event.platform,
    from: event.from.handle,
    content: event.content,
    timestamp: new Date().toISOString(),
    requires_response: true
  };
  
  console.log('[Social] HIGH PRIORITY TEAM ALERT:', alert);
  
  // In a full implementation, this would ping the team immediately
  return {
    type: 'team_alert',
    priority: 'high',
    status: 'sent'
  };
}

/**
 * Get social activity summary
 */
async function getSocialSummary() {
  // This would fetch from KV store in a full implementation
  return {
    platforms_active: ['x', 'telegram', 'discord'],
    events_today: 0, // Would be calculated from KV
    auto_responses_sent: 0,
    team_notifications: 0,
    top_intents: ['building', 'learning', 'collaboration']
  };
}

module.exports = {
  processSocialEvent,
  detectCommand,
  analyzeIntent,
  checkTriggers,
  getSocialSummary,
  SOCIAL_PATTERNS
};