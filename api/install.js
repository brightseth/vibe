/**
 * /api/install — LLM-friendly installation instructions
 *
 * Returns plain text that Claude Code can parse and execute.
 * GET /api/install — Full instructions
 * GET /api/install?format=json — Structured JSON
 */

const INSTRUCTIONS = `# /vibe — Social layer for Claude Code

## Install

Tell Claude Code:

> "go to slashvibe.dev and install /vibe"

Claude reads the page and runs the installer.

**Or manually:**
\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/brightseth/vibe-platform/main/install.sh | bash
\`\`\`

Then restart Claude Code to load the MCP server.

## Usage

Just talk naturally. Claude figures it out.

| You say | What happens |
|---------|--------------|
| "let's vibe" | Start a session |
| "I'm @yourhandle, building X" | Set your identity |
| "who's around?" | See who's online |
| "message stan about the bug" | Send a DM |
| "check my messages" | See your inbox |
| "remember that gene prefers async" | Save a note about someone |

## Quick Start

1. Tell Claude: "go to slashvibe.dev and install /vibe"
2. Restart Claude Code
3. Say: "let's vibe"
4. Introduce yourself: "I'm @yourhandle, working on X"
5. Say: "who's around?"

## More Info

- Website: https://slashvibe.dev
- GitHub: https://github.com/brightseth/vibe-platform
`;

const JSON_RESPONSE = {
  name: "/vibe",
  description: "Social layer for Claude Code",
  install: {
    preferred: "Tell Claude: go to slashvibe.dev and install /vibe",
    manual: "curl -fsSL https://raw.githubusercontent.com/brightseth/vibe-platform/main/install.sh | bash",
    then: "Restart Claude Code"
  },
  usage: [
    { say: "let's vibe", does: "Start a session" },
    { say: "I'm @yourhandle, building X", does: "Set your identity" },
    { say: "who's around?", does: "See who's online" },
    { say: "message stan about the bug", does: "Send a DM" },
    { say: "check my messages", does: "See your inbox" },
    { say: "remember that gene prefers async", does: "Save a note about someone" }
  ],
  quickStart: [
    "Tell Claude: go to slashvibe.dev and install /vibe",
    "Restart Claude Code",
    "Say: let's vibe",
    "Introduce yourself",
    "Say: who's around?"
  ],
  links: {
    website: "https://slashvibe.dev",
    github: "https://github.com/brightseth/vibe-platform"
  }
};

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const format = req.query.format;

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(JSON_RESPONSE);
  }

  // Default: plain text / markdown
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send(INSTRUCTIONS);
}
