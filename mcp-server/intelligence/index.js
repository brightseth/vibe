/**
 * Intelligence Module — Ambient Social Awareness
 *
 * Four layers of intelligence:
 * 1. Infer — Smart state detection from context signals
 * 2. Serendipity — Surface meaningful coincidences
 * 3. Proactive — Background agent for social moments
 * 4. Patterns — Persistent behavioral memory (work, social, creative)
 */

const infer = require('./infer');
const serendipity = require('./serendipity');
const proactive = require('./proactive');
const patterns = require('./patterns');

module.exports = {
  // Inference
  inferState: infer.inferState,
  enhanceUserWithInference: infer.enhanceUserWithInference,
  enhanceUsersWithInference: infer.enhanceUsersWithInference,
  STATES: infer.STATES,

  // Serendipity
  findSerendipity: serendipity.findSerendipity,
  getTopSerendipity: serendipity.getTopSerendipity,
  getAllSerendipity: serendipity.getAllSerendipity,

  // Proactive
  generateProactiveSuggestions: proactive.generateProactiveSuggestions,
  getProactiveSummary: proactive.getProactiveSummary,
  checkProactiveOpportunities: proactive.checkProactiveOpportunities,
  markAway: proactive.markAway,
  markBack: proactive.markBack,
  setSessionStart: proactive.setSessionStart,

  // Patterns (persistent behavioral memory)
  patterns
};
