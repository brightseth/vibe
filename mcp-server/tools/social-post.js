/**
 * vibe social-post — Post to multiple social channels at once
 *
 * Multi-cast posting with dry-run preview support.
 */

const { requireInit, header, divider, warning } = require('./_shared');

const API_URL = process.env.VIBE_API_URL || 'https://slashvibe.dev';

const definition = {
  name: 'vibe_social_post',
  description: 'Post content to one or more social channels (X, Farcaster, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The content to post'
      },
      channels: {
        type: 'array',
        items: { type: 'string' },
        description: 'Channels to post to (e.g., ["x", "farcaster"])'
      },
      dry_run: {
        type: 'boolean',
        description: 'Preview post without sending (default: false)'
      },
      reply_to: {
        type: 'string',
        description: 'Message ID to reply to (e.g., "x:1234567890")'
      }
    },
    required: ['content', 'channels']
  }
};

async function handler(args) {
  const initCheck = requireInit();
  if (initCheck) return initCheck;

  const { content, channels, dry_run, reply_to } = args;

  // Validation
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return { display: 'Need content to post.' };
  }

  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    return { display: 'Need at least one channel. Options: x, farcaster' };
  }

  const trimmed = content.trim();

  // Character limit warnings
  const warnings = [];
  if (channels.includes('x') && trimmed.length > 280) {
    warnings.push(`X: Content is ${trimmed.length} chars (max 280). Will be truncated.`);
  }

  try {
    const response = await fetch(`${API_URL}/api/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: trimmed,
        channels,
        dry_run: dry_run || false,
        reply_to
      })
    });

    const data = await response.json();

    if (!data.success && !data.dry_run) {
      return { display: `${header('Post Failed')}\n\n_Error:_ ${data.error}` };
    }

    // Dry run preview
    if (data.dry_run) {
      let display = header('Post Preview (Dry Run)');
      display += '\n\n';

      for (const [ch, preview] of Object.entries(data.previews || {})) {
        const icon = preview.configured ? '✅' : '❌';
        const canPost = preview.canWrite ? 'can post' : 'read-only';

        display += `${icon} **${ch}** — ${canPost}\n`;

        if (!preview.configured) {
          display += `   _Not configured_\n`;
        } else if (preview.wouldTruncate) {
          display += `   ⚠️ Content will be truncated to 280 chars\n`;
        }

        display += `   "${preview.content.slice(0, 100)}${preview.content.length > 100 ? '...' : ''}"\n\n`;
      }

      display += divider();
      display += 'Remove `--dry_run` to post for real.';

      return { display };
    }

    // Actual post results
    let display = header('Posted');
    display += '\n\n';

    if (warnings.length > 0) {
      display += warning(warnings.join('\n')) + '\n\n';
    }

    let anySuccess = false;
    for (const [ch, result] of Object.entries(data.results || {})) {
      if (result.success) {
        anySuccess = true;
        display += `✅ **${ch}** — Posted!\n`;
        if (result.url) {
          display += `   🔗 ${result.url}\n`;
        }
      } else {
        display += `❌ **${ch}** — Failed: ${result.error}\n`;
      }
      display += '\n';
    }

    if (!anySuccess) {
      display += '\n_No posts succeeded. Check channel configuration._';
    }

    return { display };

  } catch (e) {
    return {
      display: `${header('Post Error')}\n\n_Error:_ ${e.message}`
    };
  }
}

module.exports = { definition, handler };
