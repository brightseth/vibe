/**
 * File Operations Skills — Shared across builder agents
 *
 * Read, write, and navigate the codebase.
 */

import fs from 'fs';
import path from 'path';

const VIBE_REPO = process.env.VIBE_REPO || '/Users/seth/vibe-public';

// ============ CORE FILE OPERATIONS ============

export function listFiles(dirPath, basePath = VIBE_REPO) {
  const fullPath = path.join(basePath, dirPath);
  try {
    if (!fs.existsSync(fullPath)) {
      return `Directory not found: ${dirPath}`;
    }
    const files = fs.readdirSync(fullPath);
    return files.join('\n') || 'Empty directory';
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

export function readFile(filePath, basePath = VIBE_REPO) {
  const fullPath = path.join(basePath, filePath);
  try {
    if (!fs.existsSync(fullPath)) {
      return `File not found: ${filePath}`;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    // Truncate large files
    if (content.length > 10000) {
      return content.substring(0, 10000) + '\n\n... [truncated]';
    }
    return content;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

export function writeFile(filePath, content, basePath = VIBE_REPO) {
  const fullPath = path.join(basePath, filePath);
  try {
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content);
    return `Wrote ${filePath} (${content.length} bytes)`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

export function appendFile(filePath, content, basePath = VIBE_REPO) {
  const fullPath = path.join(basePath, filePath);
  try {
    fs.appendFileSync(fullPath, content);
    return `Appended to ${filePath}`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

export function deleteFile(filePath, basePath = VIBE_REPO) {
  const fullPath = path.join(basePath, filePath);
  try {
    if (!fs.existsSync(fullPath)) {
      return `File not found: ${filePath}`;
    }
    fs.unlinkSync(fullPath);
    return `Deleted ${filePath}`;
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

export function fileExists(filePath, basePath = VIBE_REPO) {
  const fullPath = path.join(basePath, filePath);
  return fs.existsSync(fullPath);
}

// ============ TOOL DEFINITIONS ============

export const FILE_TOOLS = [
  {
    name: 'list_files',
    description: 'List files in a directory',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path relative to repo root' }
      },
      required: ['path']
    }
  },
  {
    name: 'read_file',
    description: 'Read contents of a file',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to repo root' }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file (creates if not exists)',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to repo root' },
        content: { type: 'string', description: 'Content to write' }
      },
      required: ['path', 'content']
    }
  }
];

// ============ TOOL HANDLER FACTORY ============

export function createFileToolHandler(basePath = VIBE_REPO) {
  return async function handleFileTool(name, input) {
    switch (name) {
      case 'list_files':
        return listFiles(input.path, basePath);
      case 'read_file':
        return readFile(input.path, basePath);
      case 'write_file':
        return writeFile(input.path, input.content, basePath);
      default:
        return null; // Not a file tool
    }
  };
}

export default {
  listFiles,
  readFile,
  writeFile,
  appendFile,
  deleteFile,
  fileExists,
  FILE_TOOLS,
  createFileToolHandler
};
