/**
 * vibe farcaster — Interact with Farcaster protocol
 *
 * Read and write to the decentralized social protocol.
 * Supports channels, mentions, casts, and reactions.
 */

const farcaster = require('../bridges/farcaster');
const { requireInit, header, divider, success, warning, formatTimeAgo } = require('./_shared');

const definition = {
  name: 'vibe_farcaster',
  description: 'Interact with Farcaster - read feed, post casts, get mentions',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['feed', 'mentions', 'cast', 'channels', 'search', 'user', 'status'],
        description: 'Action to perform (default: feed)'
      },
      text: {
        type: 'string',
        description: 'Text to cast (use with action: cast)'
      },
      channel: {
        type: 'string',
        description: 'Channel ID to post to or read from (e.g., "dev", "builders")'
      },
      reply_to: {
        type: 'string',
        description: 'Cast hash to reply to (use with action: cast)'
      },
      query: {
        type: 'string',
        description: 'Search query (use with action: search)'
      },
      username: {
        type: 'string',
        description: 'Username to look up (use with action: user)'
      },
      limit: {
        type: 'number',
        description: 'Number of results to show (default: 10, max: 25)'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { action = 'feed', text, channel, reply_to, query, username, limit = 10 } = args;

  // Check configuration
  if (!farcaster.isConfigured()) {
    return {
      display: `${header('Farcaster')}\n\n${warning('Farcaster not configured.')}\n\nSet NEYNAR_API_KEY, FARCASTER_SIGNER_UUID, and FARCASTER_FID in config.json\n\nGet API key: https://neynar.com\nSetup guide: https://docs.neynar.com/reference/developer-managed-signers`
    };
  }

  try {
    switch (action) {
      case 'status':
        return await handleStatus();
        
      case 'feed':
        return await handleFeed(channel, Math.min(limit, 25));
        
      case 'mentions':
        return await handleMentions(Math.min(limit, 25));
        
      case 'cast':
        return await handleCast(text, channel, reply_to);
        
      case 'channels':
        return handleChannels();
        
      case 'search':
        return await handleSearch(query, Math.min(limit, 25));
        
      case 'user':
        return await handleUser(username);
        
      default:
        return { display: `Unknown action: ${action}` };
    }
  } catch (e) {
    return {
      display: `${header('Farcaster')}\n\n_Error:_ ${e.message}`
    };
  }
}

async function handleStatus() {
  let display = header('Farcaster Status');
  display += '\n\n';
  
  const userInfo = await farcaster.getUser();
  const user = userInfo.users[0];
  
  display += success(`✅ Connected to Farcaster\n\n`);
  display += `**Your Account:**\n`;
  display += `• Name: ${user.display_name}\n`;
  display += `• Username: @${user.username}\n`;
  display += `• FID: ${user.fid}\n`;
  display += `• Followers: ${user.follower_count}\n`;
  display += `• Following: ${user.following_count}\n`;
  display += `• Bio: ${user.profile?.bio?.text || 'No bio'}\n\n`;
  
  display += divider();
  display += '**Available actions:**\n';
  display += '• `vibe farcaster --action feed` - View your feed\n';
  display += '• `vibe farcaster --action mentions` - See mentions\n';
  display += '• `vibe farcaster --action cast --text "hello farcaster"` - Post cast\n';
  display += '• `vibe farcaster --action channels` - Browse channels\n';
  display += '• `vibe farcaster --action search --query "ethereum"`';
  
  return { display };
}

async function handleFeed(channelId, limit) {
  let display = header(channelId ? `/${channelId} Channel` : 'Your Feed');
  display += '\n\n';
  
  let feedData;
  if (channelId) {
    feedData = await farcaster.getChannelFeed(channelId, limit);
  } else {
    feedData = await farcaster.getFeed(null, limit);
  }
  
  const casts = feedData.casts || [];
  
  if (casts.length === 0) {
    display += '_No casts found._';
    return { display };
  }
  
  display += `📡 ${casts.length} casts\n`;
  display += divider();
  display += '\n';
  
  for (const cast of casts) {
    const processed = farcaster.processCast(cast);
    display += formatCast(processed);
    display += '\n';
  }
  
  display += divider();
  display += 'Reply: `vibe farcaster --action cast --text "your reply" --reply_to CAST_HASH`';
  
  return { display };
}

async function handleMentions(limit) {
  let display = header('Mentions');
  display += '\n\n';
  
  const mentionsData = await farcaster.getMentions(null, limit);
  const notifications = mentionsData.notifications || [];
  
  if (notifications.length === 0) {
    display += '_No mentions found._';
    return { display };
  }
  
  display += `@️ ${notifications.length} mentions\n`;
  display += divider();
  display += '\n';
  
  for (const notification of notifications) {
    if (notification.cast) {
      const processed = farcaster.processCast(notification.cast);
      display += formatCast(processed, true);
      display += '\n';
    }
  }
  
  display += divider();
  display += 'Reply: `vibe farcaster --action cast --text "thanks!" --reply_to CAST_HASH`';
  
  return { display };
}

async function handleCast(text, channelId, replyTo) {
  if (!text || text.trim().length === 0) {
    return { display: 'Need text to cast. Use --text "your message here"' };
  }
  
  const options = {};
  if (channelId) options.channel = channelId;
  if (replyTo) options.replyTo = replyTo;
  
  let display = header(replyTo ? 'Casting Reply...' : 'Casting...');
  display += '\n\n';
  
  const result = await farcaster.publishCast(text.trim(), options);
  
  if (result.success) {
    display = header('Cast Published! 🚀');
    display += '\n\n';
    display += success(`✅ Cast sent successfully\n\n`);
    display += `**Details:**\n`;
    display += `• Hash: ${result.cast.hash}\n`;
    display += `• Content: "${text.trim()}"\n`;
    if (channelId) display += `• Channel: /${channelId}\n`;
    if (replyTo) display += `• Reply to: ${replyTo}\n`;
    display += `• URL: https://warpcast.com/${result.cast.author.username}/${result.cast.hash.slice(0, 10)}\n\n`;
    
    display += divider();
    display += 'Your cast is now live on Farcaster! 🎉';
  } else {
    display += `❌ Failed to publish cast\n`;
    display += `Error: ${result.message || 'Unknown error'}`;
  }
  
  return { display };
}

function handleChannels() {
  let display = header('Recommended Channels');
  display += '\n\n';
  
  const channels = farcaster.getRecommendedChannels();
  
  display += `🔮 Popular channels for builders:\n\n`;
  
  for (const channel of channels) {
    display += `• **/${channel.id}** — ${channel.name}\n`;
  }
  
  display += '\n' + divider();
  display += '**Usage:**\n';
  display += '• Browse: `vibe farcaster --action feed --channel dev`\n';
  display += '• Post: `vibe farcaster --action cast --text "gm builders" --channel dev`\n\n';
  
  display += 'Find more channels at: https://warpcast.com/~/channels';
  
  return { display };
}

async function handleSearch(query, limit) {
  if (!query || query.trim().length === 0) {
    return { display: 'Need search query. Use --query "your search terms"' };
  }
  
  let display = header(`Search: "${query}"`);
  display += '\n\n';
  
  const searchResults = await farcaster.searchCasts(query.trim(), limit);
  const casts = searchResults.result?.casts || [];
  
  if (casts.length === 0) {
    display += `_No casts found for "${query}"._`;
    return { display };
  }
  
  display += `🔍 ${casts.length} results\n`;
  display += divider();
  display += '\n';
  
  for (const cast of casts) {
    const processed = farcaster.processCast(cast);
    display += formatCast(processed);
    display += '\n';
  }
  
  return { display };
}

async function handleUser(username) {
  if (!username) {
    return { display: 'Need username. Use --username "handle"' };
  }
  
  // This would require additional API call to lookup by username
  // For now, show error message with guidance
  return { 
    display: `${header('User Lookup')}\n\n_Username lookup not implemented yet._\n\nUse FID instead with the status action or search for their casts.`
  };
}

function formatCast(cast, isMention = false) {
  const channelInfo = cast.channel_id ? ` in /${cast.channel_id}` : '';
  const mentionFlag = isMention ? ' @' : '';
  
  let result = `🟣 **@${cast.from.handle}**${mentionFlag}${channelInfo} — _${formatTimeAgo(new Date(cast.timestamp))}_\n`;
  result += `${cast.content}\n`;
  
  // Show engagement metrics
  const metrics = [];
  if (cast.replies > 0) metrics.push(`${cast.replies} replies`);
  if (cast.reactions > 0) metrics.push(`${cast.reactions} likes`);
  if (cast.recasts > 0) metrics.push(`${cast.recasts} recasts`);
  
  if (metrics.length > 0) {
    result += `_${metrics.join(' • ')}_\n`;
  }
  
  result += `_[farcaster:${cast.hash.slice(0, 8)}]_\n`;
  
  return result;
}

module.exports = { definition, handler };