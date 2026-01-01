/**
 * vibe bye — End session with summary
 *
 * Triggers Smart Summary, then cleans up session state.
 * The summary appears locally before sign-off.
 */

const config = require('../config');
const store = require('../store');
const summarize = require('./summarize');

const definition = {
  name: 'vibe_bye',
  description: 'End your /vibe session. Shows a summary of activity before signing off.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

async function handler(args) {
  if (!config.isInitialized()) {
    return {
      display: 'No active session to end.'
    };
  }

  const myHandle = config.getHandle();

  // Generate summary first
  const summaryResult = await summarize.handler({});
  let display = summaryResult.display;

  // Clear activity tracking
  summarize.clearActivity();

  // Clear session identity (but keep shared config)
  config.clearSession();

  // Sign-off message
  display += `\n\n---\n`;
  display += `**Signed off as @${myHandle}**\n`;
  display += `_Run \`vibe init\` to start a new session._`;

  return { display };
}

module.exports = { definition, handler };
