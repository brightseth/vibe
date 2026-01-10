/**
 * POST /api/share-page
 *
 * Create a shareable web page that lives at /shared/:slug
 * Stores in Postgres, optionally sends via DM
 */

const { sql, isPostgresEnabled } = require('./lib/db.js');
const { kv } = require('@vercel/kv');

function generateSlug() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeSlug(input) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      from,
      to,
      title,
      content,
      contentType = 'html', // 'html' or 'markdown'
      slug,
      expiresInDays,
      unlisted = false,
      sendDM = true
    } = req.body;

    // Validation
    if (!from) {
      return res.status(400).json({ error: 'from (username) required' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content required' });
    }

    // Generate or sanitize slug
    const finalSlug = slug ? sanitizeSlug(slug) : generateSlug();

    // Calculate expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const pageData = {
      slug: finalSlug,
      from: from.toLowerCase().replace('@', ''),
      to: to ? to.toLowerCase().replace('@', '') : null,
      title,
      content,
      contentType,
      unlisted,
      expiresAt,
      createdAt: new Date()
    };

    // Store in Postgres (primary)
    let stored = false;
    if (isPostgresEnabled() && sql) {
      try {
        await sql`
          INSERT INTO shared_pages (slug, from_user, to_user, title, content, content_type, unlisted, expires_at, created_at)
          VALUES (
            ${finalSlug},
            ${pageData.from},
            ${pageData.to},
            ${title},
            ${content},
            ${contentType},
            ${unlisted},
            ${expiresAt},
            NOW()
          )
          ON CONFLICT (slug) DO UPDATE SET
            title = EXCLUDED.title,
            content = EXCLUDED.content,
            content_type = EXCLUDED.content_type,
            unlisted = EXCLUDED.unlisted,
            expires_at = EXCLUDED.expires_at
        `;
        stored = true;
      } catch (pgErr) {
        console.error('[SHARE-PAGE] Postgres failed:', pgErr.message);
      }
    }

    // Fallback to KV
    if (!stored) {
      try {
        await kv.set(`shared:${finalSlug}`, JSON.stringify(pageData), {
          ex: expiresInDays ? expiresInDays * 86400 : undefined
        });
        stored = true;
      } catch (kvErr) {
        console.error('[SHARE-PAGE] KV failed:', kvErr.message);
      }
    }

    if (!stored) {
      return res.status(503).json({ error: 'Storage unavailable' });
    }

    // Send DM with link if requested
    if (sendDM && to) {
      try {
        // Import the messages send handler
        const sendMessage = require('./messages/send.js');
        const dmBody = `${from} shared: ${title}\n\nhttps://slashvibe.dev/shared/${finalSlug}`;

        await sendMessage({
          method: 'POST',
          body: { from, to, body: dmBody }
        }, {
          setHeader: () => {},
          status: () => ({ json: () => {}, end: () => {} })
        });
      } catch (dmErr) {
        console.warn('[SHARE-PAGE] DM send failed:', dmErr.message);
        // Non-fatal - page still created
      }
    }

    const url = `https://slashvibe.dev/shared/${finalSlug}`;

    return res.status(200).json({
      success: true,
      slug: finalSlug,
      url,
      expiresAt,
      message: sendDM && to ? `Page created and sent to @${to}` : 'Page created'
    });

  } catch (error) {
    console.error('[SHARE-PAGE] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
