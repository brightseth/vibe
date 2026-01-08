/**
 * vibe run-bootstrap — Run all bootstrap scripts to populate discovery systems
 *
 * Ensures the Skills Exchange and other discovery systems have sample data
 * for testing and demonstration purposes.
 */

const { handler: bootstrapSkills } = require('./bootstrap-skills');
const { requireInit } = require('./_shared');

const definition = {
  name: 'vibe_run_bootstrap',
  description: 'Run all bootstrap scripts to populate discovery systems.',
  inputSchema: {
    type: 'object',
    properties: {
      force: {
        type: 'boolean',
        description: 'Force bootstrap even if data exists',
        default: false
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  let display = `## Running Discovery System Bootstrap 🚀\n\n`;

  try {
    // Bootstrap Skills Exchange
    display += `### Skills Exchange Bootstrap\n`;
    const skillsResult = await bootstrapSkills({ force: args.force });
    
    if (skillsResult.error) {
      display += `❌ **Error:** ${skillsResult.error}\n\n`;
    } else {
      // Extract key info from skills bootstrap result
      if (skillsResult.display.includes('Already Active')) {
        display += `✅ **Skills Exchange already populated**\n\n`;
      } else if (skillsResult.display.includes('Successfully created')) {
        display += `✅ **Skills Exchange populated with sample data**\n\n`;
      }
    }

    display += `### Discovery Systems Ready! 🎯\n\n`;
    display += `**Available Discovery Tools:**\n`;
    display += `• \`skills-exchange browse\` — Browse skill marketplace\n`;
    display += `• \`workshop-buddy find\` — Find collaboration partners\n`;
    display += `• \`discovery-analytics overview\` — Community insights\n`;
    display += `• \`discover search <term>\` — Search people by interests\n\n`;
    
    display += `**For Users:**\n`;
    display += `• \`skills-exchange post --type offer --skill "your expertise"\`\n`;
    display += `• \`skills-exchange match\` — Find skill exchange matches\n`;
    display += `• \`workshop-buddy find\` — Find your perfect coding partner\n\n`;
    
    display += `🔗 **The discovery ecosystem is now live and ready for connections!**`;

  } catch (error) {
    display += `## Bootstrap Error\n\n${error.message}\n\nTry individual bootstrap commands.`;
  }

  return { display };
}

module.exports = { definition, handler };