import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  // Read the HTML file
  const htmlPath = join(process.cwd(), 'internal-deck-vibe-entity-formation.html');
  const html = readFileSync(htmlPath, 'utf8');

  // Set headers
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  // Return HTML
  res.status(200).send(html);
}
