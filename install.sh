#!/bin/bash
# /vibe installer for Claude Code
# Tier 1: identity, presence, DM, status, context, memory

set -e

VIBE_DIR="$HOME/.vibe"
MCP_DIR="$VIBE_DIR/mcp-server"
REPO_URL="https://raw.githubusercontent.com/brightseth/vibe/main"

echo ""
echo "/vibe installer"
echo "==============="
echo ""

# Check Node version (need 18+ for native fetch)
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required but not installed."
  echo "Install Node 18+ from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Error: Node 18+ required (you have $(node -v))"
  echo "Update from https://nodejs.org"
  exit 1
fi

echo "Node $(node -v) ✓"
echo ""

# Create directories
mkdir -p "$MCP_DIR/tools" "$MCP_DIR/store" "$VIBE_DIR/memory"

# Download MCP server files
echo "Downloading MCP server..."

# Core files
curl -fsSL "$REPO_URL/mcp-server/index.js" -o "$MCP_DIR/index.js"
curl -fsSL "$REPO_URL/mcp-server/config.js" -o "$MCP_DIR/config.js"
curl -fsSL "$REPO_URL/mcp-server/presence.js" -o "$MCP_DIR/presence.js"
curl -fsSL "$REPO_URL/mcp-server/memory.js" -o "$MCP_DIR/memory.js"

# Store
curl -fsSL "$REPO_URL/mcp-server/store/index.js" -o "$MCP_DIR/store/index.js"
curl -fsSL "$REPO_URL/mcp-server/store/local.js" -o "$MCP_DIR/store/local.js"
curl -fsSL "$REPO_URL/mcp-server/store/api.js" -o "$MCP_DIR/store/api.js"

# Tools - Phase 1 (identity, presence, DM)
curl -fsSL "$REPO_URL/mcp-server/tools/init.js" -o "$MCP_DIR/tools/init.js"
curl -fsSL "$REPO_URL/mcp-server/tools/who.js" -o "$MCP_DIR/tools/who.js"
curl -fsSL "$REPO_URL/mcp-server/tools/ping.js" -o "$MCP_DIR/tools/ping.js"
curl -fsSL "$REPO_URL/mcp-server/tools/dm.js" -o "$MCP_DIR/tools/dm.js"
curl -fsSL "$REPO_URL/mcp-server/tools/inbox.js" -o "$MCP_DIR/tools/inbox.js"
curl -fsSL "$REPO_URL/mcp-server/tools/open.js" -o "$MCP_DIR/tools/open.js"

# Tools - Tier 1 (status, context, summary, memory)
curl -fsSL "$REPO_URL/mcp-server/tools/status.js" -o "$MCP_DIR/tools/status.js"
curl -fsSL "$REPO_URL/mcp-server/tools/context.js" -o "$MCP_DIR/tools/context.js"
curl -fsSL "$REPO_URL/mcp-server/tools/summarize.js" -o "$MCP_DIR/tools/summarize.js"
curl -fsSL "$REPO_URL/mcp-server/tools/bye.js" -o "$MCP_DIR/tools/bye.js"
curl -fsSL "$REPO_URL/mcp-server/tools/remember.js" -o "$MCP_DIR/tools/remember.js"
curl -fsSL "$REPO_URL/mcp-server/tools/recall.js" -o "$MCP_DIR/tools/recall.js"
curl -fsSL "$REPO_URL/mcp-server/tools/forget.js" -o "$MCP_DIR/tools/forget.js"
curl -fsSL "$REPO_URL/mcp-server/tools/test.js" -o "$MCP_DIR/tools/test.js"

echo "Downloaded to $MCP_DIR"

# Update Claude Code config
CLAUDE_CONFIG="$HOME/.claude.json"

echo ""
echo "Configuring Claude Code..."

if [ ! -f "$CLAUDE_CONFIG" ]; then
  cat > "$CLAUDE_CONFIG" << EOF
{
  "mcpServers": {
    "vibe": {
      "command": "node",
      "args": ["$MCP_DIR/index.js"],
      "env": {
        "VIBE_API_URL": "https://vibe-public-topaz.vercel.app"
      }
    }
  }
}
EOF
  echo "Created $CLAUDE_CONFIG"
else
  # Use Node to update config (no jq dependency)
  node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('$CLAUDE_CONFIG', 'utf8'));
    if (!config.mcpServers) config.mcpServers = {};
    config.mcpServers.vibe = {
      command: 'node',
      args: ['$MCP_DIR/index.js'],
      env: { VIBE_API_URL: 'https://vibe-public-topaz.vercel.app' }
    };
    fs.writeFileSync('$CLAUDE_CONFIG', JSON.stringify(config, null, 2));
  "
  echo "Updated $CLAUDE_CONFIG"
fi

# Done
echo ""
echo "==============="
echo "/vibe installed"
echo ""
echo "Restart Claude Code, then just talk:"
echo ""
echo "  \"I'm @yourxhandle, working on [your project]\""
echo "  \"who's around?\""
echo "  \"message seth about the thing\""
echo ""
echo "Use your X handle — it's how people will find you."
echo ""
