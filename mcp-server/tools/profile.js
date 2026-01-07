/**
 * vibe profile — Manage your /vibe profile for better discovery
 *
 * Set up your profile so others can find you:
 * - What you're building
 * - Your interests (broad topics you care about)
 * - Your tags (specific skills/technologies)
 * - View and update your profile
 *
 * Commands:
 * - profile view [@handle] — View your or someone's profile
 * - profile building "what you're working on" — Set current project
 * - profile interests "ai, startups, music" — Set interests (comma-separated)
 * - profile tags "react, typescript, frontend" — Set skill tags
 * - profile clear — Clear your profile data
 */

const config = require('../config');
const userProfiles = require('../store/profiles');
const { formatTimeAgo, requireInit } = require('./_shared');

const definition = {
  name: 'vibe_profile',
  description: 'Manage your profile for better discovery and connections.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['view', 'building', 'interests', 'tags', 'clear'],
        description: 'Profile action to take'
      },
      value: {
        type: 'string',
        description: 'Value to set (for building, interests, tags)'
      },
      handle: {
        type: 'string',
        description: 'Handle to view (for view command, defaults to you)'
      }
    }
  }
};

// Format profile for display
function formatProfile(profile, isMe = false) {
  const title = isMe ? 'Your Profile' : `@${profile.handle}'s Profile`;
  let display = `## ${title}\n\n`;

  // Building
  if (profile.building) {
    display += `🚀 **Building:** ${profile.building}\n\n`;
  } else {
    display += `🚀 **Building:** _Not set_\n\n`;
  }

  // Interests
  if (profile.interests && profile.interests.length > 0) {
    display += `💡 **Interests:** ${profile.interests.join(', ')}\n\n`;
  } else {
    display += `💡 **Interests:** _Not set_\n\n`;
  }

  // Tags/Skills
  if (profile.tags && profile.tags.length > 0) {
    display += `🏷️ **Skills/Tags:** ${profile.tags.join(', ')}\n\n`;
  } else {
    display += `🏷️ **Skills/Tags:** _Not set_\n\n`;
  }

  // Activity
  if (profile.lastSeen) {
    display += `🕐 **Last active:** ${formatTimeAgo(profile.lastSeen)}\n`;
  }
  
  if (profile.firstSeen) {
    display += `📅 **Member since:** ${new Date(profile.firstSeen).toLocaleDateString()}\n`;
  }

  // Ships
  if (profile.ships && profile.ships.length > 0) {
    display += `\n**Recent ships:**\n`;
    profile.ships.slice(0, 3).forEach(ship => {
      display += `• ${ship.what} _(${formatTimeAgo(ship.timestamp)})_\n`;
    });
  }

  // Connections
  if (profile.connections && profile.connections.length > 0) {
    display += `\n**Connected to ${profile.connections.length} people**\n`;
  }

  return display;
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'view';

  let display = '';

  try {
    switch (command) {
      case 'view': {
        const targetHandle = args.handle ? args.handle.replace('@', '') : myHandle;
        const profile = await userProfiles.getProfile(targetHandle);
        const isMe = targetHandle === myHandle;
        
        display = formatProfile(profile, isMe);
        
        if (isMe) {
          display += `\n---\n`;
          display += `**Update your profile:**\n`;
          display += `• \`profile building "AI chat app"\`\n`;
          display += `• \`profile interests "ai, startups, music"\`\n`;
          display += `• \`profile tags "react, typescript, frontend"\`\n\n`;
          display += `Better profiles = better connections! 🤝`;
        } else {
          display += `\n---\n`;
          display += `**Connect:**\n`;
          display += `• \`message @${targetHandle}\` to reach out\n`;
          display += `• \`discover\` to find similar builders`;
        }
        break;
      }

      case 'building': {
        if (!args.value) {
          return { error: 'Please specify what you\'re building: profile building "AI chat app"' };
        }
        
        await userProfiles.updateProfile(myHandle, { building: args.value });
        
        display = `## Profile Updated\n\n`;
        display += `🚀 **Now building:** ${args.value}\n\n`;
        display += `Others can find you via:\n`;
        display += `• \`discover search "${args.value.split(' ')[0]}"\`\n`;
        display += `• Similar project recommendations\n\n`;
        display += `**Next:** Set your interests and tags for better matches!`;
        break;
      }

      case 'interests': {
        if (!args.value) {
          return { error: 'Please specify interests: profile interests "ai, startups, music"' };
        }
        
        const interests = args.value.split(',').map(s => s.trim()).filter(s => s);
        await userProfiles.updateProfile(myHandle, { interests });
        
        display = `## Profile Updated\n\n`;
        display += `💡 **Interests:** ${interests.join(', ')}\n\n`;
        display += `You'll now get matched with people who share:\n`;
        interests.forEach(interest => {
          display += `• ${interest}\n`;
        });
        display += `\n**Try:** \`discover suggest\` to see your matches!`;
        break;
      }

      case 'tags': {
        if (!args.value) {
          return { error: 'Please specify skill tags: profile tags "react, typescript, frontend"' };
        }
        
        const tags = args.value.split(',').map(s => s.trim()).filter(s => s);
        await userProfiles.updateProfile(myHandle, { tags });
        
        display = `## Profile Updated\n\n`;
        display += `🏷️ **Skills/Tags:** ${tags.join(', ')}\n\n`;
        display += `You'll get matched with people who:\n`;
        display += `• Share these skills\n`;
        display += `• Have complementary skills\n`;
        display += `• Are building similar things\n\n`;
        display += `**Try:** \`discover active\` to see similar builders online now!`;
        break;
      }

      case 'clear': {
        const emptyProfile = {
          building: null,
          interests: [],
          tags: []
        };
        await userProfiles.updateProfile(myHandle, emptyProfile);
        
        display = `## Profile Cleared\n\n`;
        display += `Your profile data has been reset.\n\n`;
        display += `**Set up again:**\n`;
        display += `• \`profile building "what you're working on"\`\n`;
        display += `• \`profile interests "topic1, topic2, topic3"\`\n`;
        display += `• \`profile tags "skill1, skill2, skill3"\``;
        break;
      }

      default:
        display = `## Profile Commands\n\n`;
        display += `**View profiles:**\n`;
        display += `• \`profile view\` — Your profile\n`;
        display += `• \`profile view @handle\` — Someone else's profile\n\n`;
        display += `**Update your profile:**\n`;
        display += `• \`profile building "what you're working on"\`\n`;
        display += `• \`profile interests "ai, startups, music"\`\n`;
        display += `• \`profile tags "react, typescript, frontend"\`\n`;
        display += `• \`profile clear\` — Reset your profile\n\n`;
        display += `**Why profiles matter:**\n`;
        display += `Better profiles = better connections through \`discover\`!`;
    }
  } catch (error) {
    display = `## Profile Error\n\n${error.message}`;
  }

  return { display };
}

module.exports = { definition, handler };