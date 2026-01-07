/**
 * /vibe Telegram Command Processor
 * 
 * Executes /vibe commands received via Telegram bot.
 * Maps Telegram users to /vibe handles and executes core protocol functions.
 */

const { dm } = require('../tools/dm');
const { status } = require('../tools/status'); 
const { who } = require('../tools/who');
const { ship } = require('../tools/ship');
const config = require('../config');

/**
 * Process a /vibe command from Telegram
 */
async function processVibeCommand(command, params, telegramUser) {
  // Map Telegram user to /vibe handle
  const vibeHandle = mapTelegramUserToHandle(telegramUser);
  
  if (!vibeHandle) {
    return `❌ Telegram account not linked to /vibe. Contact admin to link @${telegramUser.username || telegramUser.first_name} to a /vibe handle.`;
  }

  try {
    switch (command) {
      case 'status':
        return await executeStatus(params.mood, params.note, vibeHandle);
        
      case 'who':
        return await executeWho();
        
      case 'ship':
        return await executeShip(params.message, vibeHandle);
        
      case 'dm':
        return await executeDM(params.handle, params.message, vibeHandle);
        
      default:
        return `❌ Unknown command: ${command}`;
    }
    
  } catch (error) {
    console.error(`Telegram command error [${command}]:`, error);
    return `❌ Command failed: ${error.message}`;
  }
}

/**
 * Map Telegram user to /vibe handle using config
 */
function mapTelegramUserToHandle(telegramUser) {
  const cfg = config.load();
  const telegramMappings = cfg.telegram_user_mappings || {};
  
  // Try username first, then user ID
  const telegramKey = telegramUser.username || telegramUser.id.toString();
  return telegramMappings[telegramKey] || null;
}

/**
 * Execute status command
 */
async function executeStatus(mood, note, handle) {
  if (!mood) {
    return '❌ Need a mood. Try: `/status shipping "building the future"`';
  }
  
  const validMoods = ['shipping', 'debugging', 'deep', 'afk', 'celebrating', 'pairing'];
  if (!validMoods.includes(mood)) {
    return `❌ Invalid mood. Use: ${validMoods.join(', ')}`;
  }
  
  // Execute the status update
  const result = await status.handler({ mood, note });
  
  if (result.error) {
    return `❌ ${result.error}`;
  }
  
  return `✅ Status updated: **${handle}** is ${mood}${note ? ` - "${note}"` : ''}`;
}

/**
 * Execute who command
 */
async function executeWho() {
  const result = await who.handler({});
  
  if (result.error) {
    return `❌ ${result.error}`;
  }
  
  // Convert display format to Telegram-friendly
  let response = result.display;
  
  // Replace markdown formatting for Telegram
  response = response
    .replace(/\*\*(.*?)\*\*/g, '*$1*') // Bold
    .replace(/_(.*?)_/g, '_$1_')       // Italic
    .replace(/`(.*?)`/g, '`$1`');       // Code
    
  return response;
}

/**
 * Execute ship command  
 */
async function executeShip(message, handle) {
  const result = await ship.handler({ what: message });
  
  if (result.error) {
    return `❌ ${result.error}`;
  }
  
  return `🚀 Shipped! ${message ? `"${message}"` : 'Great work!'} has been announced to /vibe.`;
}

/**
 * Execute DM command
 */
async function executeDM(targetHandle, message, fromHandle) {
  if (!targetHandle) {
    return '❌ Need target handle. Try: `/dm @alice "hey there!"`';
  }
  
  if (!message) {
    return '❌ Need message content.';
  }
  
  // Remove @ if present
  const cleanHandle = targetHandle.replace('@', '');
  
  const result = await dm.handler({ 
    to: cleanHandle, 
    message: message 
  });
  
  if (result.error) {
    return `❌ ${result.error}`;
  }
  
  return `📨 DM sent to @${cleanHandle}: "${message}"`;
}

/**
 * Link a Telegram user to a /vibe handle (admin function)
 */
async function linkTelegramUser(telegramUser, vibeHandle) {
  const cfg = config.load();
  
  if (!cfg.telegram_user_mappings) {
    cfg.telegram_user_mappings = {};
  }
  
  // Store both username and ID for flexibility
  if (telegramUser.username) {
    cfg.telegram_user_mappings[telegramUser.username] = vibeHandle;
  }
  cfg.telegram_user_mappings[telegramUser.id.toString()] = vibeHandle;
  
  config.save(cfg);
  
  return {
    success: true,
    message: `Linked Telegram user ${telegramUser.username || telegramUser.id} to /vibe handle @${vibeHandle}`
  };
}

/**
 * Get all Telegram user mappings (admin function)
 */
function getTelegramMappings() {
  const cfg = config.load();
  return cfg.telegram_user_mappings || {};
}

/**
 * Remove Telegram user mapping (admin function)
 */
function unlinkTelegramUser(telegramKey) {
  const cfg = config.load();
  
  if (cfg.telegram_user_mappings && cfg.telegram_user_mappings[telegramKey]) {
    delete cfg.telegram_user_mappings[telegramKey];
    config.save(cfg);
    return { success: true, message: `Unlinked ${telegramKey}` };
  }
  
  return { success: false, message: `No mapping found for ${telegramKey}` };
}

module.exports = {
  processVibeCommand,
  linkTelegramUser,
  unlinkTelegramUser,
  getTelegramMappings,
  mapTelegramUserToHandle
};