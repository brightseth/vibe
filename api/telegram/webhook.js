/**
 * /vibe Telegram Webhook Handler
 * 
 * Processes incoming Telegram bot updates in real-time.
 * Handles both /vibe commands and forwards relevant messages to social inbox.
 */

import { telegram } from '../../mcp-server/bridges/telegram.js';
import { processVibeCommand } from '../../mcp-server/protocol/telegram-commands.js';

export default async function handler(req, res) {
  // Only accept POST requests from Telegram
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    
    // Verify this is a valid Telegram update
    if (!update || typeof update.update_id !== 'number') {
      return res.status(400).json({ error: 'Invalid update format' });
    }

    // Process the update
    const result = await processTelegramUpdate(update);
    
    // Always respond 200 to Telegram (prevents retries)
    res.status(200).json({ 
      status: 'processed',
      update_id: update.update_id,
      ...result 
    });

  } catch (error) {
    console.error('Telegram webhook error:', error);
    
    // Still return 200 to prevent Telegram retries
    res.status(200).json({ 
      status: 'error', 
      message: error.message 
    });
  }
}

async function processTelegramUpdate(update) {
  const message = update.message || update.edited_message;
  
  if (!message) {
    return { action: 'ignored', reason: 'No message content' };
  }

  const chatType = message.chat.type; // 'private', 'group', 'supergroup', 'channel'
  const fromUser = message.from;
  const text = message.text || '';

  // Parse the message into /vibe format
  const vibeMessage = {
    id: `telegram:${message.message_id}`,
    channel: 'telegram',
    type: chatType === 'private' ? 'dm' : 'group',
    from: {
      id: fromUser.id.toString(),
      handle: fromUser.username || fromUser.first_name,
      name: [fromUser.first_name, fromUser.last_name].filter(Boolean).join(' '),
      first_name: fromUser.first_name,
      last_name: fromUser.last_name,
      username: fromUser.username
    },
    chat: {
      id: message.chat.id.toString(),
      type: chatType,
      title: message.chat.title || null
    },
    content: text || '[media]',
    timestamp: new Date(message.date * 1000).toISOString(),
    raw: update
  };

  // Handle /vibe bot commands
  if (text.startsWith('/')) {
    return await handleBotCommand(vibeMessage, text);
  }
  
  // Handle mentions of /vibe or the bot
  if (text.toLowerCase().includes('/vibe') || text.toLowerCase().includes('vibe')) {
    return await handleVibeMessage(vibeMessage);
  }

  // For private chats, treat all messages as potentially relevant
  if (chatType === 'private') {
    return await handleDirectMessage(vibeMessage);
  }

  return { action: 'ignored', reason: 'Not a command or /vibe mention' };
}

async function handleBotCommand(vibeMessage, text) {
  try {
    // Parse the command
    const commandResult = telegram.parseVibeCommand(text);
    
    if (!commandResult) {
      return await sendHelpMessage(vibeMessage.chat.id);
    }

    // Execute the /vibe command
    const response = await processVibeCommand(
      commandResult.command, 
      commandResult.params, 
      vibeMessage.from
    );

    // Send response back to Telegram
    if (response) {
      await telegram.sendMessage(vibeMessage.chat.id, response, { 
        markdown: true,
        reply_to_message_id: parseInt(vibeMessage.id.split(':')[1])
      });
    }

    return { 
      action: 'command_executed', 
      command: commandResult.command,
      user: vibeMessage.from.handle 
    };

  } catch (error) {
    // Send error message back to user
    await telegram.sendMessage(
      vibeMessage.chat.id, 
      `❌ Command failed: ${error.message}`, 
      { reply_to_message_id: parseInt(vibeMessage.id.split(':')[1]) }
    );

    return { action: 'command_error', error: error.message };
  }
}

async function handleVibeMessage(vibeMessage) {
  // Forward /vibe mentions to social inbox for unified reading
  try {
    // Store in social inbox (same format as X mentions)
    await storeInSocialInbox(vibeMessage);

    return { 
      action: 'stored_in_inbox', 
      message_id: vibeMessage.id 
    };

  } catch (error) {
    console.error('Failed to store message in inbox:', error);
    return { action: 'storage_failed', error: error.message };
  }
}

async function handleDirectMessage(vibeMessage) {
  // Store private messages in social inbox as DMs
  vibeMessage.type = 'dm';
  
  try {
    await storeInSocialInbox(vibeMessage);

    // Auto-acknowledge DMs
    await telegram.sendMessage(
      vibeMessage.chat.id,
      "📩 Message received! I'll let the /vibe team know.",
      { silent: true }
    );

    return { 
      action: 'dm_stored', 
      message_id: vibeMessage.id 
    };

  } catch (error) {
    console.error('Failed to handle DM:', error);
    return { action: 'dm_failed', error: error.message };
  }
}

async function sendHelpMessage(chatId) {
  const helpText = `🤖 **ViBE Bot Commands**

**Status & Presence:**
• \`/status mood [note]\` - Update your /vibe status
• \`/who\` - See who's currently online

**Communication:**
• \`/dm @handle message\` - Send DM in /vibe
• \`/ship [message]\` - Announce what you shipped

**Examples:**
• \`/status shipping "Building Telegram bridge"\`
• \`/dm @alice "Great idea on the protocol design!"\`
• \`/ship "Telegram bridge is live! 🚀"\`

Questions? Visit https://slashvibe.dev`;

  await telegram.sendMessage(chatId, helpText, { markdown: true });

  return { action: 'help_sent' };
}

async function storeInSocialInbox(vibeMessage) {
  // Import social inbox storage (same as used by social sync)
  const { storeMessage } = await import('../../api/social/inbox.js');
  
  // Calculate signal score
  vibeMessage.signal_score = calculateSignalScore(vibeMessage);
  vibeMessage.synced_at = new Date().toISOString();

  // Store in unified inbox
  await storeMessage(vibeMessage);
}

function calculateSignalScore(message) {
  let score = 30; // Base score for Telegram messages
  
  // DMs are higher signal
  if (message.type === 'dm') {
    score = 70;
  }
  
  // Messages mentioning /vibe are higher signal
  if (message.content.toLowerCase().includes('/vibe')) {
    score += 20;
  }
  
  // Commands are medium signal
  if (message.content.startsWith('/')) {
    score = 50;
  }
  
  return Math.min(score, 100);
}