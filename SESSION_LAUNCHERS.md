# Claude Code Session Launchers

Context-aware aliases for different work streams. Each sets terminal title automatically.

## Quick Start

Open a new terminal and type:
```bash
airc          # AIRC protocol development
vibe-user     # /vibe user-facing
vibe-agents   # /vibe agent coordination
spirit        # Spirit Protocol
node          # NODE opening work
solienne      # Solienne manifesto
```

Type `sessions` to see all available launchers.

## Current Setup

| Alias | Title | Directory | Use Case |
|-------|-------|-----------|----------|
| `airc` | AIRC Development | ~/Projects/vibe | Protocol work, this repo |
| `vibe-user` | VIBE(USER) | ~/Projects/vibe | User-facing features |
| `vibe-agents` | VIBE(TEAMOFAGENTS) | ~/Projects/vibe | Agent coordination |
| `vibe-dev` | VIBE(DEV) | ~/Projects/vibe | General development |
| `spirit` | SPIRITPROTOCOL | ~/spiritprotocol.io | Spirit Protocol |
| `spirit-index` | SPIRITINDEX | ~/Projects/spirit-index | Spirit Index |
| `solienne` | SOLIENNE | ~/Projects/solienne-ai | Manifesto work |
| `nodeopening` | NODE | ~/Projects/node-artist-relations | NODE opening (20 days) |
| `vibestation` | VIBESTATION | ~/Projects/vibestation | Hardware guide |
| `seth` | @SETH(PERSONAL) | ~ | Personal work |
| `goldybox` | GOLDYBOX | (current dir) | Goldybox project |
| `kristiseth` | KRISTISETH | (current dir) | Work with Kristi |

## API Keys

- `airc` uses separate key from `.env.airc` (for cost tracking)
- Other sessions use default `ANTHROPIC_API_KEY` from `~/.zshrc`

## Customizing

Edit `~/.zshrc` to adjust:
- Directories
- Titles
- API keys per project

```bash
# Example: add API key to a specific session
alias solienne='cd ~/Projects/solienne-ai && export ANTHROPIC_API_KEY="sk-ant-..." && set_title "SOLIENNE" && claude'
```

## Tips

**Open multiple sessions side-by-side:**
```bash
# Terminal 1
airc

# Terminal 2
node

# Terminal 3
spirit
```

Titles persist so you always know which context you're in.

---

*Added Jan 8, 2026*
