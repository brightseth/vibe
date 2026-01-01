/**
 * /api/install — LLM-friendly installation instructions
 *
 * Returns plain text that Claude Code can parse and execute.
 * GET /api/install — Full instructions
 * GET /api/install?format=json — Structured JSON
 */

const INSTRUCTIONS = `# /vibe — Communication layer for Claude Code

## Install

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/brightseth/vibe/main/install.sh | bash
\`\`\`

Then restart Claude Code to load the MCP server.

## Commands

| Command | Description |
|---------|-------------|
| vibe init @handle "what you're building" | Set your identity |
| vibe who | See who's online |
| vibe dm @handle "message" | Send a message |
| vibe inbox | Check your messages |
| vibe open @handle | Open a thread |
| vibe status shipping | Set your mood (shipping, thinking, debugging, afk) |
| vibe context --file "auth.js" | Share what you're working on |
| vibe summarize | Summarize your session |
| vibe bye | End your session |

## Quick Start

1. Install with the curl command above
2. Restart Claude Code
3. Run: vibe init @yourhandle "what you're building"
4. Run: vibe who (to see who's online)
5. Run: vibe dm @someone "hey!" (to message someone)

## Natural Language

After install, you can use natural language:
- "message stan about the auth bug"
- "who's online right now"
- "set my status to shipping"
- "share that I'm working on auth.js"

## More Info

- Website: https://slashvibe.dev
- GitHub: https://github.com/brightseth/vibe-public
`;

const JSON_RESPONSE = {
  name: "/vibe",
  description: "Communication layer for Claude Code",
  install: {
    command: "curl -fsSL https://raw.githubusercontent.com/brightseth/vibe/main/install.sh | bash",
    then: "Restart Claude Code"
  },
  commands: [
    { name: "vibe init", args: "@handle \"description\"", description: "Set your identity" },
    { name: "vibe who", args: null, description: "See who's online" },
    { name: "vibe dm", args: "@handle \"message\"", description: "Send a message" },
    { name: "vibe inbox", args: null, description: "Check your messages" },
    { name: "vibe open", args: "@handle", description: "Open a thread" },
    { name: "vibe status", args: "mood", description: "Set mood (shipping, thinking, debugging, afk)" },
    { name: "vibe context", args: "--file \"filename\"", description: "Share what you're working on" },
    { name: "vibe summarize", args: null, description: "Summarize your session" },
    { name: "vibe bye", args: null, description: "End your session" }
  ],
  quickStart: [
    "Install with curl command",
    "Restart Claude Code",
    "vibe init @yourhandle \"what you're building\"",
    "vibe who",
    "vibe dm @someone \"hey!\""
  ],
  links: {
    website: "https://slashvibe.dev",
    github: "https://github.com/brightseth/vibe-public"
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
