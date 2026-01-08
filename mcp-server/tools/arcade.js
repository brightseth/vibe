/**
 * vibe arcade — Browse and discover all available games
 *
 * Workshop Arcade - Central hub for /vibe games
 */

const { requireInit } = require('./_shared');
const arcade = require('../games/arcade');

const definition = {
  name: 'vibe_arcade',
  description: 'Browse the Workshop Arcade - discover all available games in /vibe',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Navigation command (e.g., "classic", "chess", "back", "main")',
      }
    }
  }
};

// Store arcade state per user (in memory for now)
const userStates = new Map();

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { command } = args;
  const config = require('../config');
  const myHandle = config.getHandle();
  
  // Get or create user's arcade state
  let gameState = userStates.get(myHandle);
  if (!gameState) {
    gameState = arcade.createInitialArcadeState();
    userStates.set(myHandle, gameState);
  }

  // Handle command if provided
  if (command) {
    const result = arcade.handleArcadeCommand(gameState, command);
    
    if (result.error) {
      return { display: `❌ ${result.error}` };
    }
    
    if (result.success) {
      gameState = result.gameState;
      userStates.set(myHandle, gameState);
    }
  }

  // Display current arcade state
  const display = arcade.formatArcadeDisplay(gameState);
  
  return { display };
}

module.exports = { definition, handler };