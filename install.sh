#!/bin/bash

# /vibe Installer — The Social Layer for Claude Code
# See who's building. Message them. Search collective memory.

set -e

VIBE_DIR="$HOME/.vibe"
MCP_DIR="$VIBE_DIR/mcp-server"
CONFIG_FILE="$HOME/.vibecodings/config.json"
CLAUDE_SETTINGS="$HOME/Library/Application Support/Claude/claude_desktop_config.json"

echo ""
echo "  ⚡ /vibe — Claude Code is better with friends"
echo "  ─────────────────────────────────────────────"
echo ""

# Create directories
mkdir -p "$MCP_DIR"
mkdir -p "$HOME/.vibecodings"

# Get username
echo "Pick a username (lowercase, no spaces):"
read -p "  @" USERNAME

if [ -z "$USERNAME" ]; then
  echo "Username required. Try again."
  exit 1
fi

USERNAME=$(echo "$USERNAME" | tr '[:upper:]' '[:lower:]' | tr -d ' @')

# Save config
echo "{\"username\": \"$USERNAME\"}" > "$CONFIG_FILE"
echo ""
echo "  Welcome, @$USERNAME!"
echo ""

# Download MCP server
echo "  Downloading MCP server..."
curl -sL "https://slashvibe.dev/mcp-server/index.js" -o "$MCP_DIR/index.js"
chmod +x "$MCP_DIR/index.js"

# Check if Claude settings exist
if [ -f "$CLAUDE_SETTINGS" ]; then
  echo "  Configuring Claude Code..."

  # Check if vibe already configured
  if grep -q "vibe-mcp" "$CLAUDE_SETTINGS" 2>/dev/null; then
    echo "  /vibe already configured in Claude Code."
  else
    # Backup
    cp "$CLAUDE_SETTINGS" "$CLAUDE_SETTINGS.backup"

    # Add MCP server to config (simple approach - add to mcpServers)
    # This is a basic JSON manipulation - may need manual config for complex setups
    cat > /tmp/vibe_mcp_config.json << EOF
{
  "mcpServers": {
    "vibe-mcp": {
      "command": "node",
      "args": ["$MCP_DIR/index.js"]
    }
  }
}
EOF
    echo ""
    echo "  ⚠️  Add this to your Claude settings manually:"
    echo ""
    cat /tmp/vibe_mcp_config.json
    echo ""
  fi
else
  echo ""
  echo "  Claude settings not found at default location."
  echo "  Add this MCP server to your Claude config:"
  echo ""
  echo "  {\"mcpServers\": {\"vibe-mcp\": {\"command\": \"node\", \"args\": [\"$MCP_DIR/index.js\"]}}}"
  echo ""
fi

# Register presence
echo "  Registering @$USERNAME..."
curl -sL -X POST "https://slashvibe.dev/api/presence" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"workingOn\": \"just installed /vibe\"}" \
  > /dev/null 2>&1 || true

echo ""
echo "  ✅ /vibe installed!"
echo ""
echo "  Next steps:"
echo "  1. Restart Claude Code"
echo "  2. Say \"who's online?\""
echo ""
echo "  @$USERNAME is now vibing."
echo ""
