/**
 * vibe suggest-tags — Get smart tag suggestions based on what you're building
 * 
 * Analyzes your project description and suggests:
 * - Tech tags (react, python, ai)
 * - Interest categories (startups, open source)
 * - Similar builders to connect with
 */

const config = require('../config');
const tagSuggestions = require('./tag-suggestions');
const { requireInit, formatTimeAgo } = require('./_shared');

const definition = {
  name: 'vibe_suggest_tags',
  description: 'Get smart tag and interest suggestions based on what you\'re building.',
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        enum: ['suggest', 'trending', 'complete'],
        description: 'Type of suggestions to get'
      },
      query: {
        type: 'string', 
        description: 'Partial tag to complete (for complete command)'
      }
    }
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const myHandle = config.getHandle();
  const command = args.command || 'suggest';

  try {
    switch (command) {
      case 'suggest': {
        const result = await tagSuggestions.generateSuggestions(myHandle);
        
        if (result.error) {
          return { display: `## Tag Suggestions\n\n${result.error}` };
        }
        
        let display = `## Smart Tag Suggestions\n\n`;
        display += `**What you're building:**\n`;
        display += `"${result.building}"\n\n`;
        
        // Current tags
        if (result.currentTags.length > 0 || result.currentInterests.length > 0) {
          display += `**Current tags:**\n`;
          const all = [...result.currentTags, ...result.currentInterests];
          display += all.map(t => `\`${t}\``).join(', ') + '\n\n';
        }
        
        // Tech suggestions
        if (result.suggested.tech.length > 0) {
          display += `**🔧 Suggested tech tags:**\n`;
          for (const tag of result.suggested.tech) {
            display += `- \`${tag}\` — Add with: \`vibe update tags add "${tag}"\`\n`;
          }
          display += '\n';
        }
        
        // Interest suggestions  
        if (result.suggested.interests.length > 0) {
          display += `**💡 Suggested interests:**\n`;
          for (const interest of result.suggested.interests) {
            display += `- \`${interest}\` — Add with: \`vibe update interests add "${interest}"\`\n`;
          }
          display += '\n';
        }
        
        // No suggestions
        if (result.suggested.tech.length === 0 && result.suggested.interests.length === 0) {
          display += `**✅ Looking good!**\n`;
          display += `Your tags seem complete. Try \`suggest-tags trending\` to see what's popular.\n\n`;
        }
        
        // Similar builders
        if (result.similarBuilders.length > 0) {
          display += `**👥 Similar builders you might connect with:**\n`;
          for (const builder of result.similarBuilders) {
            display += `- **@${builder.handle}** — ${builder.overlappingTags.join(', ')}\n`;
            display += `  ${builder.building || 'Building something interesting'}\n`;
            if (builder.lastSeen) {
              display += `  _Last seen: ${formatTimeAgo(builder.lastSeen)}_\n`;
            }
            display += '\n';
          }
          
          display += `**Connect:** \`message @handle "Hey! Saw we both work with ${result.similarBuilders[0].overlappingTags[0]}..."\`\n\n`;
        }
        
        // Confidence indicator
        if (result.confidence > 0) {
          display += `---\n`;
          display += `_Confidence: ${result.confidence}% (${result.matches.length} patterns matched)_`;
        }
        
        break;
      }
      
      case 'trending': {
        const trends = await tagSuggestions.getTrendingTags();
        
        let display = `## Trending Tags & Interests\n\n`;
        
        if (trends.popularTags.length > 0) {
          display += `**🔥 Popular tech tags:**\n`;
          for (const { tag, count } of trends.popularTags) {
            display += `- \`${tag}\` (${count} ${count === 1 ? 'person' : 'people'})\n`;
          }
          display += '\n';
        }
        
        if (trends.popularInterests.length > 0) {
          display += `**💭 Popular interests:**\n`;
          for (const { interest, count } of trends.popularInterests) {
            display += `- \`${interest}\` (${count} ${count === 1 ? 'person' : 'people'})\n`;
          }
          display += '\n';
        }
        
        if (trends.popularTags.length === 0 && trends.popularInterests.length === 0) {
          display = `## No Trending Data Yet\n\n`;
          display += `Not enough people have set tags yet.\n\n`;
          display += `**Be a trendsetter:**\n`;
          display += `- \`suggest-tags suggest\` — Get personalized suggestions\n`;
          display += `- \`vibe update tags "react,typescript,ai"\` — Set your tech stack\n`;
          display += `- \`vibe update interests "startups,open source"\` — Share your interests`;
        } else {
          display += `**Find people:** \`discover search "tag_name"\`\n`;
          display += `**Add tags:** \`vibe update tags add "tag_name"\``;
        }
        
        break;
      }
      
      case 'complete': {
        if (!args.query) {
          return { 
            display: `## Tag Completion\n\n**Usage:** \`suggest-tags complete "partial_tag"\`\n\n**Example:** \`suggest-tags complete "rea"\` → suggests "react"`
          };
        }
        
        const suggestions = tagSuggestions.suggestSimilarTags(args.query);
        
        if (suggestions.length === 0) {
          return {
            display: `## No Matches for "${args.query}"\n\nTry a different search term or browse trending tags: \`suggest-tags trending\``
          };
        }
        
        let display = `## Tag Completions for "${args.query}"\n\n`;
        for (const tag of suggestions) {
          display += `- \`${tag}\`\n`;
        }
        
        display += `\n**Add any tag:**\n`;
        display += `\`vibe update tags add "tag_name"\` or \`vibe update interests add "interest_name"\``;
        
        break;
      }
      
      default: {
        return {
          display: `## Tag Suggestion Commands\n\n**\`suggest-tags suggest\`** — Get personalized tag suggestions\n**\`suggest-tags trending\`** — See what tags are popular\n**\`suggest-tags complete "partial"\`** — Auto-complete tag names\n\n**Set up your profile:**\n- \`vibe update building "what you're working on"\`\n- \`vibe update tags "react,python,ai"\`\n- \`vibe update interests "startups,gaming,music"\``
        };
      }
    }
    
    return { display };
    
  } catch (error) {
    return {
      display: `## Tag Suggestion Error\n\n${error.message}\n\nTry: \`suggest-tags\` for available commands`
    };
  }
}

module.exports = { definition, handler };