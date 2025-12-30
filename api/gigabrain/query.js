/**
 * Gigabrain Query API
 *
 * Semantic search across collective memory.
 * Uses embeddings for understanding, not just keyword matching.
 * Falls back to keywords if embeddings unavailable.
 */

import { kv } from '@vercel/kv';

// Generate embedding for query
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

    if (!response.ok) return null;
    const data = await response.json();
    return data.data[0].embedding;
  } catch (e) {
    return null;
  }
}

// Cosine similarity between two vectors
function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query, user, limit = 5, tech: filterTech, semantic = true } =
    req.method === 'POST' ? req.body : req.query;

  if (!query) {
    return res.status(400).json({ error: 'query required' });
  }

  // Get session IDs to search
  let sessionIds;
  if (filterTech) {
    sessionIds = await kv.smembers(`gigabrain:tech:${filterTech.toLowerCase()}`);
  } else {
    sessionIds = await kv.lrange('gigabrain:all', 0, 500);
  }

  // Generate query embedding for semantic search
  const queryEmbedding = semantic !== 'false' ? await generateEmbedding(query) : null;
  const useSemanticSearch = !!queryEmbedding;

  const results = [];
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

  for (const id of sessionIds) {
    const session = await kv.hgetall(`gigabrain:${id}`);
    if (!session) continue;

    // Parse stored data
    let tech = [];
    let embedding = null;
    try {
      tech = Array.isArray(session.tech) ? session.tech : JSON.parse(session.tech || '[]');
      // Embedding might already be parsed by KV, or might be a string
      if (session.embedding) {
        embedding = Array.isArray(session.embedding)
          ? session.embedding
          : JSON.parse(session.embedding);
      }
    } catch (e) {}

    let similarity = 0;
    let keywordScore = 0;

    // Semantic similarity (if both query and session have embeddings)
    if (useSemanticSearch && embedding) {
      similarity = cosineSimilarity(queryEmbedding, embedding);
    }

    // Keyword matching (fallback or boost)
    const searchText = [
      session.summary,
      session.content,
      session.project,
      tech.join(' ')
    ].filter(Boolean).join(' ').toLowerCase();

    keywordScore = queryTerms.reduce((count, term) => {
      return count + (searchText.includes(term) ? 1 : 0);
    }, 0);

    // Full query match bonus
    if (searchText.includes(queryLower)) {
      keywordScore += 2;
    }

    // Skip if no match at all
    if (similarity < 0.3 && keywordScore === 0) continue;

    // Combined score: semantic + keyword boost
    const baseScore = useSemanticSearch && embedding
      ? similarity * 10 + (keywordScore * 0.5)  // Semantic primary
      : keywordScore;                            // Keyword fallback

    // Recency boost
    const ageInDays = (Date.now() - session.timestamp) / (1000 * 60 * 60 * 24);
    const recencyMultiplier = Math.max(0.5, 2 - (ageInDays / 30));
    const finalScore = baseScore * recencyMultiplier;

    results.push({
      id: session.id,
      user: session.user,
      summary: session.summary,
      tech,
      project: session.project,
      category: session.category,
      timeAgo: formatTimeAgo(session.timestamp),
      timestamp: session.timestamp,
      score: finalScore,
      similarity: similarity.toFixed(3),
      semantic: !!embedding
    });
  }

  // Sort by score
  results.sort((a, b) => b.score - a.score);

  // Return top N
  const topResults = results.slice(0, parseInt(limit)).map(r => ({
    id: r.id,
    user: r.user,
    summary: r.summary,
    tech: r.tech,
    project: r.project,
    category: r.category,
    timeAgo: r.timeAgo,
    similarity: r.similarity,
    semantic: r.semantic
  }));

  res.json({
    success: true,
    query,
    mode: useSemanticSearch ? 'semantic' : 'keyword',
    results: topResults,
    total: results.length
  });
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}
