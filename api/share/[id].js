/**
 * Ship Share Card Generator
 *
 * GET /api/share/:id - Generate shareable card for a ship/board entry
 *
 * Returns HTML with OG tags for beautiful Twitter/social cards.
 * This is THE viral mechanic - make ships shareable.
 */

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing id' });
  }

  try {
    // Get the board entry
    const entry = await kv.get(`board:entry:${id}`);

    if (!entry) {
      return res.status(404).send('Ship not found');
    }

    const author = entry.author || 'anonymous';
    const content = entry.content || '';
    const category = entry.category || 'shipped';
    const timestamp = entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : '';

    // Truncate content for OG description
    const description = content.length > 200
      ? content.substring(0, 197) + '...'
      : content;

    // Category emoji
    const categoryEmoji = {
      shipped: '🚀',
      idea: '💡',
      request: '🙏',
      riff: '🎵',
      claim: '📢',
      observation: '👁️'
    }[category] || '✨';

    // Generate OG image URL (using a simple text-based approach)
    // In production, you'd use @vercel/og or similar
    const ogTitle = `${categoryEmoji} @${author} ${category === 'shipped' ? 'shipped' : 'shared'}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ogTitle} on /vibe</title>

  <!-- Open Graph / Twitter -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://slashvibe.dev/api/share/${id}">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">
  <meta property="og:site_name" content="/vibe">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${description.replace(/"/g, '&quot;')}">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
      background: #0a0a0a;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      max-width: 600px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 1px solid #333;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #333;
    }
    .emoji { font-size: 2.5rem; }
    .meta { flex: 1; }
    .author {
      font-size: 1.25rem;
      color: #6B8FFF;
      font-weight: bold;
    }
    .category {
      font-size: 0.875rem;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .content {
      font-size: 1.1rem;
      line-height: 1.6;
      color: #e0e0e0;
      white-space: pre-wrap;
      margin-bottom: 1.5rem;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 1rem;
      border-top: 1px solid #333;
      font-size: 0.875rem;
      color: #666;
    }
    .vibe-link {
      color: #6B8FFF;
      text-decoration: none;
    }
    .vibe-link:hover { text-decoration: underline; }
    .cta {
      display: block;
      margin-top: 1.5rem;
      padding: 1rem 2rem;
      background: #6B8FFF;
      color: #000;
      text-align: center;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      transition: background 0.2s;
    }
    .cta:hover { background: #8BA4FF; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="emoji">${categoryEmoji}</span>
      <div class="meta">
        <div class="author">@${author}</div>
        <div class="category">${category} on /vibe</div>
      </div>
    </div>
    <div class="content">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    <div class="footer">
      <span>${timestamp}</span>
      <a href="https://slashvibe.dev" class="vibe-link">/vibe</a>
    </div>
    <a href="https://slashvibe.dev" class="cta">Join /vibe → 54 genesis spots left</a>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);

  } catch (e) {
    console.error('Share card error:', e);
    return res.status(500).json({ error: e.message });
  }
}
