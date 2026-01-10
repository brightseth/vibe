/**
 * GET /artifacts - Browse artifacts page
 * Returns HTML page showing all artifacts in the network
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  try {
    // Read the HTML template
    const htmlPath = path.join(__dirname, 'artifacts-browse.html');
    const html = await fs.readFile(htmlPath, 'utf-8');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error serving artifacts browse page:', error);
    return res.status(500).send('Failed to load artifacts page');
  }
}
