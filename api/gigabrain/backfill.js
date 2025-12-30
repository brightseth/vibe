/**
 * Gigabrain Backfill API
 *
 * Generates embeddings for existing sessions that don't have them.
 * Run with: curl -X POST https://slashvibe.dev/api/gigabrain/backfill
 */

import { kv } from '@vercel/kv';

async function generateEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000)
      })
    });

    if (!response.ok) {
      console.error('Embedding API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (e) {
    console.error('Embedding failed:', e.message);
    return null;
  }
}

export default async function handler(req, res) {
  // Only POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const { batch = 20 } = req.body || {};

  // Get all session IDs
  const sessionIds = await kv.lrange('gigabrain:all', 0, 500);

  let embedded = 0;
  let skipped = 0;
  let failed = 0;
  const processed = [];

  for (const id of sessionIds) {
    // Stop after batch limit to avoid timeout
    if (embedded >= batch) break;

    const session = await kv.hgetall(`gigabrain:${id}`);
    if (!session) {
      skipped++;
      continue;
    }

    // Skip if already has embedding
    if (session.embedding) {
      skipped++;
      continue;
    }

    // Parse tech
    let tech = [];
    try {
      tech = JSON.parse(session.tech || '[]');
    } catch (e) {}

    // Build text for embedding
    const embeddingText = [
      session.summary || '',
      session.content || '',
      session.project ? `Project: ${session.project}` : '',
      tech.length > 0 ? `Tech: ${tech.join(', ')}` : ''
    ].filter(Boolean).join('\n\n');

    // Generate embedding
    const embedding = await generateEmbedding(embeddingText);

    if (embedding) {
      // Store embedding
      await kv.hset(`gigabrain:${id}`, {
        embedding: JSON.stringify(embedding)
      });
      embedded++;
      processed.push({
        id,
        summary: (session.summary || '').slice(0, 50)
      });
    } else {
      failed++;
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 100));
  }

  // Count remaining
  let remaining = 0;
  for (const id of sessionIds) {
    const session = await kv.hgetall(`gigabrain:${id}`);
    if (session && !session.embedding) remaining++;
  }

  res.json({
    success: true,
    embedded,
    skipped,
    failed,
    remaining,
    total: sessionIds.length,
    processed
  });
}
