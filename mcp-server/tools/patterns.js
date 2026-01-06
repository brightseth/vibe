/**
 * vibe patterns — View emerging language constructs
 *
 * Shows frequent prompt patterns and suggests new commands.
 */

const prompts = require('../prompts');

const definition = {
  name: 'vibe_patterns',
  description: 'View emerging language patterns from how people use /vibe. Shows frequent prompts and suggests new commands.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Number of recent prompts to analyze (default: 50)'
      },
      raw: {
        type: 'boolean',
        description: 'Show raw prompts instead of patterns'
      }
    }
  }
};

async function handler({ limit = 50, raw = false }) {
  if (raw) {
    // Show raw recent prompts
    const recent = prompts.getRecent(limit);

    if (recent.length === 0) {
      return {
        display: `## Prompt Log\n\n_No prompts logged yet. Use /vibe and patterns will emerge._\n\nFile: \`${prompts.PROMPTS_FILE}\``
      };
    }

    let display = `## Recent Prompts (${recent.length})\n\n`;
    display += '| Time | Prompt | Tool |\n';
    display += '|------|--------|------|\n';

    for (const p of recent.slice(0, 20)) {
      const time = new Date(p.ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const prompt = p.prompt.slice(0, 40) + (p.prompt.length > 40 ? '...' : '');
      display += `| ${time} | ${prompt} | ${p.tool || '-'} |\n`;
    }

    display += `\n---\n_${recent.length} total logged · ${prompts.PROMPTS_FILE}_`;
    return { display };
  }

  // Show patterns and suggestions
  const patterns = prompts.extractPatterns();
  const suggestions = prompts.suggestConstructs();

  let display = '## Emerging Patterns\n\n';

  if (patterns.length === 0) {
    display += '_Not enough data yet. Keep using /vibe and patterns will emerge._\n';
  } else {
    display += '**Frequent patterns:**\n';
    for (const { pattern, count } of patterns.slice(0, 10)) {
      display += `- \`${pattern}\` (${count}x)\n`;
    }
  }

  if (suggestions.length > 0) {
    display += '\n**Suggested constructs:**\n';
    for (const { pattern, construct, count } of suggestions) {
      display += `- \`${construct}\` ← from "${pattern}" (${count}x)\n`;
    }
  }

  display += `\n---\n_Run \`vibe patterns --raw\` to see individual prompts_`;

  return { display };
}

module.exports = { definition, handler };
