/**
 * GET /api/shared/:slug
 *
 * Serve a shared page created via /api/share-page
 */

const { sql, isPostgresEnabled } = require('../lib/db.js');
const { kv } = require('@vercel/kv');
const marked = require('marked');

// Simple markdown parser fallback if marked isn't available
function simpleMarkdown(md) {
  return md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n/gim, '<br>');
}

function renderHTML(title, content, contentType, from, createdAt) {
  let body = content;

  // Convert markdown to HTML if needed
  if (contentType === 'markdown') {
    try {
      body = marked ? marked.parse(content) : simpleMarkdown(content);
    } catch (e) {
      body = simpleMarkdown(content);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            line-height: 1.6;
            padding: 20px;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
        }

        .header {
            border-bottom: 1px solid #333;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
        }

        h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            color: #6b8fff;
        }

        .meta {
            color: #888;
            font-size: 0.9rem;
        }

        .content {
            margin-bottom: 3rem;
        }

        .content h2 {
            color: #ff6b6b;
            margin-top: 2rem;
            margin-bottom: 1rem;
        }

        .content h3 {
            color: #4ecdc4;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
        }

        .content p {
            margin-bottom: 1rem;
        }

        .content a {
            color: #6b8fff;
            text-decoration: none;
        }

        .content a:hover {
            text-decoration: underline;
        }

        .footer {
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #333;
            color: #666;
            text-align: center;
            font-size: 0.9rem;
        }

        .footer a {
            color: #6b8fff;
            text-decoration: none;
        }

        code {
            background: #1a1a1a;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }

        pre {
            background: #1a1a1a;
            padding: 1rem;
            border-radius: 8px;
            overflow-x: auto;
            margin: 1rem 0;
        }

        pre code {
            background: none;
            padding: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <div class="meta">
                Shared by @${from} • ${new Date(createdAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
            </div>
        </div>
        <div class="content">
            ${body}
        </div>
        <div class="footer">
            <p>Shared via <a href="https://slashvibe.dev">/vibe</a> • <a href="https://slashvibe.dev">Create your own</a></p>
        </div>
    </div>
</body>
</html>`;
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract slug from URL
    const slug = req.query.slug || req.url.split('/').pop().split('?')[0];

    if (!slug) {
      return res.status(400).json({ error: 'Slug required' });
    }

    let pageData = null;

    // Try Postgres first
    if (isPostgresEnabled() && sql) {
      try {
        const result = await sql`
          SELECT slug, from_user, to_user, title, content, content_type, unlisted, expires_at, created_at
          FROM shared_pages
          WHERE slug = ${slug}
          AND (expires_at IS NULL OR expires_at > NOW())
          LIMIT 1
        `;

        if (result && result.length > 0) {
          const row = result[0];
          pageData = {
            slug: row.slug,
            from: row.from_user,
            to: row.to_user,
            title: row.title,
            content: row.content,
            contentType: row.content_type,
            unlisted: row.unlisted,
            expiresAt: row.expires_at,
            createdAt: row.created_at
          };
        }
      } catch (pgErr) {
        console.error('[SHARED] Postgres failed:', pgErr.message);
      }
    }

    // Fallback to KV
    if (!pageData) {
      try {
        const kvData = await kv.get(`shared:${slug}`);
        if (kvData) {
          pageData = typeof kvData === 'string' ? JSON.parse(kvData) : kvData;
        }
      } catch (kvErr) {
        console.error('[SHARED] KV failed:', kvErr.message);
      }
    }

    if (!pageData) {
      return res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
        }
        h1 { color: #ff6b6b; }
        a { color: #6b8fff; text-decoration: none; }
    </style>
</head>
<body>
    <div>
        <h1>404 - Page Not Found</h1>
        <p>This shared page doesn't exist or has expired.</p>
        <p><a href="https://slashvibe.dev">Back to /vibe</a></p>
    </div>
</body>
</html>`);
    }

    // Check if expired
    if (pageData.expiresAt && new Date(pageData.expiresAt) < new Date()) {
      return res.status(410).send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Expired</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            text-align: center;
        }
        h1 { color: #ff6b6b; }
        a { color: #6b8fff; text-decoration: none; }
    </style>
</head>
<body>
    <div>
        <h1>Page Expired</h1>
        <p>This shared page has expired.</p>
        <p><a href="https://slashvibe.dev">Back to /vibe</a></p>
    </div>
</body>
</html>`);
    }

    // Render and return HTML
    const html = renderHTML(
      pageData.title,
      pageData.content,
      pageData.contentType,
      pageData.from,
      pageData.createdAt
    );

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 min cache
    return res.status(200).send(html);

  } catch (error) {
    console.error('[SHARED] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};
