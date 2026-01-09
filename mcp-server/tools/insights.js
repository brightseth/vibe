/**
 * vibe insights — View your behavioral patterns
 *
 * Shows accumulated insights about your work, social, and creative patterns.
 * All data is stored locally (~/.vibe/work-patterns.json) and never transmitted.
 */

const patterns = require('../intelligence/patterns');
const { requireInit, header, divider } = require('./_shared');

const definition = {
  name: 'vibe_insights',
  description: 'View your accumulated work, social, and creative patterns.',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['work', 'social', 'creative', 'all'],
        description: 'Which patterns to show (default: all)'
      }
    }
  }
};

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'unknown';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const category = args.category || 'all';
  let display = header('Your Patterns');
  display += '\n_Local only_\n\n';

  const data = patterns.load();

  if (!patterns.hasEnoughData()) {
    display += '_Not enough data yet — keep vibing!_\n';
    display += '_Sessions: ' + data.sessions.total + '_';
    return { display };
  }

  // Work patterns
  if (category === 'all' || category === 'work') {
    const rhythm = patterns.getSessionRhythm();
    const peakHours = patterns.getPeakHours();
    const dominantState = patterns.getDominantState();
    const topModules = patterns.getTopModules(3);

    display += '**Work**\n';
    display += rhythm.totalSessions + ' sessions · ' + rhythm.totalHours + 'h total\n';
    display += 'avg ' + rhythm.averageMinutes + 'm · longest ' + rhythm.longestMinutes + 'm\n';

    if (peakHours.length > 0) {
      const hours = peakHours.map(h => h.hour + ':00').join(', ');
      display += 'peak: ' + hours + '\n';
    }

    if (dominantState) {
      display += 'usually: ' + dominantState.state + ' (' + dominantState.percentage + '%)\n';
    }

    if (topModules.length > 0) {
      const mods = topModules.map(m => m.name).join(', ');
      display += 'focus: ' + mods + '\n';
    }

    display += '\n';
  }

  // Social patterns
  if (category === 'all' || category === 'social') {
    const social = patterns.getSocialSummary();
    const topConnections = patterns.getTopConnections(3);

    display += '**Social**\n';
    display += social.messagesSent + ' sent · ' + social.messagesReceived + ' received\n';
    display += social.uniqueConnections + ' connections\n';

    if (topConnections.length > 0) {
      const names = topConnections.map(c => '@' + c.handle).join(', ');
      display += 'closest: ' + names + '\n';
    }

    display += '\n';
  }

  // Creative patterns
  if (category === 'all' || category === 'creative') {
    const creative = patterns.getCreativeSummary();
    const topDomains = patterns.getTopDomains(3);
    const inspirations = patterns.getInspirations(3);

    display += '**Creative**\n';
    display += creative.totalShips + ' ships · ' + creative.totalIdeas + ' ideas · ' + creative.totalRiffs + ' riffs\n';

    if (topDomains.length > 0) {
      const domains = topDomains.map(d => '#' + d.domain).join(' ');
      display += 'domains: ' + domains + '\n';
    }

    if (inspirations.length > 0) {
      const names = inspirations.map(i => '@' + i.handle).join(', ');
      display += 'inspired by: ' + names + '\n';
    }

    display += '\n';
  }

  display += divider() + '_since ' + formatTimeAgo(new Date(data.firstSeen).getTime()) + '_';

  return { display };
}

module.exports = { definition, handler };
