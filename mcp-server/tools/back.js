/**
 * vibe back — Clear away status and return
 *
 * Part of the /vibe Nostalgia Stack.
 * The companion to "vibe away".
 */

const config = require('../config');
const store = require('../store');
const { requireInit } = require('./_shared');
const { getProactiveSummary, markBack } = require('../intelligence/proactive');

const definition = {
  name: 'vibe_back',
  description: 'Clear your away status. You\'re back!',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

async function handler(args) {
  // Require init
  const initCheck = requireInit();
  if (initCheck) {
    return initCheck;
  }

  const handle = config.getHandle();

  // Get current away status to personalize response
  const wasAway = await store.getAwayStatus(handle);

  // Clear away status
  await store.clearAwayStatus(handle);

  let display = '👋 back';

  // Check if anything happened while away
  const unreadCount = await store.getUnreadCount(handle).catch(() => 0);
  if (unreadCount > 0) {
    display += ` — ${unreadCount} unread`;
  }

  // Mark as back for proactive tracking
  markBack();

  return { display };
}

module.exports = { definition, handler };
