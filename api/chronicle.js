/**
 * /api/chronicle — Serve chronicle entries
 *
 * GET /api/chronicle — List all entries
 * GET /api/chronicle?slug=the-workshop-awakens — Get specific entry
 * GET /api/chronicle?type=narrative — Filter by type
 */

import fs from 'fs';
import path from 'path';

const CHRONICLE_DIR = path.join(process.cwd(), 'chronicle');

function parseEntry(filename, content) {
  // Parse frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) return null;

  const frontmatter = {};
  frontmatterMatch[1].split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      let value = valueParts.join(':').trim();
      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(s => s.trim());
      }
      frontmatter[key.trim()] = value;
    }
  });

  const body = content.slice(frontmatterMatch[0].length);
  const titleMatch = body.match(/^# (.+)/m);
  const title = titleMatch ? titleMatch[1] : filename;

  // Extract slug from filename: 2026-01-07-narrative-the-workshop-awakens.md
  const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-\w+-/, '').replace('.md', '');

  return {
    slug,
    filename,
    title,
    type: frontmatter.type || 'general',
    date: frontmatter.date || null,
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
    author: frontmatter.author || '@scribe-agent',
    body,
    excerpt: body.split('\n').find(l => l.trim() && !l.startsWith('#'))?.slice(0, 200) || ''
  };
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { slug, type, limit = '20' } = req.query;

    if (!fs.existsSync(CHRONICLE_DIR)) {
      return res.status(200).json({ entries: [], total: 0 });
    }

    const files = fs.readdirSync(CHRONICLE_DIR)
      .filter(f => f.endsWith('.md') && f !== 'CHANGELOG.md')
      .sort()
      .reverse();

    // Single entry request
    if (slug) {
      const file = files.find(f => f.includes(slug));
      if (!file) {
        return res.status(404).json({ error: 'Entry not found' });
      }
      const content = fs.readFileSync(path.join(CHRONICLE_DIR, file), 'utf8');
      const entry = parseEntry(file, content);
      return res.status(200).json({ entry });
    }

    // List entries
    let entries = files.map(f => {
      const content = fs.readFileSync(path.join(CHRONICLE_DIR, f), 'utf8');
      return parseEntry(f, content);
    }).filter(Boolean);

    // Filter by type
    if (type) {
      entries = entries.filter(e => e.type === type);
    }

    // Apply limit
    const limitNum = parseInt(limit, 10);
    const total = entries.length;
    entries = entries.slice(0, limitNum);

    // Get changelog
    let changelog = null;
    const changelogPath = path.join(CHRONICLE_DIR, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      changelog = fs.readFileSync(changelogPath, 'utf8');
    }

    return res.status(200).json({
      entries,
      total,
      changelog: changelog ? changelog.slice(0, 2000) : null
    });

  } catch (error) {
    console.error('[chronicle] Error:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
