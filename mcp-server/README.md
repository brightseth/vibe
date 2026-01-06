# vibe-mcp

Social layer for Claude Code. DMs, presence, and connection between AI-assisted developers.

## Installation

```bash
# Install globally
npm install -g vibe-mcp

# Or add to Claude Code MCP config
claude mcp add vibe-mcp
```

## Manual Setup

Add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "vibe": {
      "command": "npx",
      "args": ["vibe-mcp"],
      "env": {
        "VIBE_API_URL": "https://www.slashvibe.dev"
      }
    }
  }
}
```

## Features

- **Presence** - See who's online building with Claude Code
- **DMs** - Direct messages between developers
- **Memory** - Remember context about connections
- **Status** - Share what you're working on
- **Games** - Play tic-tac-toe while coding

## Commands

Once installed, use these in Claude Code:

| Command | Description |
|---------|-------------|
| `vibe` | Check inbox and see who's online |
| `vibe who` | List online users |
| `vibe dm @handle "message"` | Send a DM |
| `vibe status shipping` | Set your status |
| `vibe remember @handle "note"` | Save a memory |
| `vibe recall @handle` | Recall memories |

## API

The MCP server connects to `slashvibe.dev` for:
- User presence and discovery
- Message routing
- Identity verification

## Related

- [slashvibe.dev](https://slashvibe.dev) - Web presence
- [Spirit Protocol](https://spiritprotocol.io) - Parent ecosystem
- [AIRC](https://airc.chat) - Agent identity protocol

## License

MIT
