/**
 * Gigabrain Ingest API
 *
 * Stores sessions into collective memory with semantic embeddings.
 * Sessions are indexed by user, tech stack, and globally.
 * Embeddings enable semantic search across all sessions.
 */

import { kv } from '@vercel/kv';

// Generate embedding using OpenAI
async function generateEmbedding(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('No OPENAI_API_KEY, skipping embedding');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000) // Model limit
      })
    });

    if (!response.ok) {
      console.error('Embedding API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (e) {
    console.error('Embedding generation failed:', e.message);
    return null;
  }
}

export default async function handler(req, res) {
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

  const {
    user,
    summary,
    content,
    tech,
    category,
    project,
    date,
    source,
    type,
    auto // Flag for auto-captured vs intentional
  } = req.body;

  if (!user || !content) {
    return res.status(400).json({ error: 'user and content required' });
  }

  // Generate unique ID
  const id = `gb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

  // Parse date or use now
  const timestamp = date ? new Date(date).getTime() : Date.now();

  // Normalize tech array
  const techArray = Array.isArray(tech) ? tech : [];

  // Build text for embedding (summary + content + tech context)
  const embeddingText = [
    summary || '',
    content,
    project ? `Project: ${project}` : '',
    techArray.length > 0 ? `Tech: ${techArray.join(', ')}` : ''
  ].filter(Boolean).join('\n\n');

  // Generate semantic embedding
  const embedding = await generateEmbedding(embeddingText);

  // Store session
  const sessionData = {
    id,
    user: user.toLowerCase(),
    summary: (summary || 'Untitled session').slice(0, 200),
    content: content.slice(0, 10000), // Cap at 10k chars
    tech: JSON.stringify(techArray),
    category: category || 'general',
    project: project || null,
    source: source || null,
    type: type || 'session',
    auto: auto || false,
    timestamp
  };

  // Add embedding if generated (stored as JSON string)
  if (embedding) {
    sessionData.embedding = JSON.stringify(embedding);
  }

  await kv.hset(`gigabrain:${id}`, sessionData);

  // Add to user's session list (most recent first)
  await kv.lpush(`gigabrain:user:${user.toLowerCase()}`, id);

  // Trim user list to last 500 sessions
  await kv.ltrim(`gigabrain:user:${user.toLowerCase()}`, 0, 499);

  // Add to global index (most recent first)
  await kv.lpush('gigabrain:all', id);

  // Trim global list to last 2000 sessions
  await kv.ltrim('gigabrain:all', 0, 1999);

  // Index by tech for faster queries
  for (const t of techArray) {
    await kv.sadd(`gigabrain:tech:${t.toLowerCase()}`, id);
  }

  // Index by category
  if (category) {
    await kv.sadd(`gigabrain:category:${category.toLowerCase()}`, id);
  }

  res.json({
    success: true,
    id,
    embedded: !!embedding,
    indexed: {
      user: user.toLowerCase(),
      tech: techArray,
      category: category || 'general'
    }
  });
}
