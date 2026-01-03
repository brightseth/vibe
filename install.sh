#!/bin/bash
# /vibe installer for Claude Code
# Uses git clone for easy updates

set -e

VIBE_DIR="$HOME/.vibe"
REPO_DIR="$VIBE_DIR/vibe-repo"
MCP_DIR="$VIBE_DIR/mcp-server"
REPO_URL="https://github.com/brightseth/vibe.git"

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

# Check git
if ! command -v git &> /dev/null; then
  echo "Error: git is required but not installed."
  exit 1
fi

echo "git ✓"
echo ""

# Create base directory
mkdir -p "$VIBE_DIR/memory"

# Clone or update repo
if [ -d "$REPO_DIR/.git" ]; then
  echo "Updating existing installation..."
  cd "$REPO_DIR"
  git pull --quiet
  echo "Updated from git"
else
  # Remove old non-git install if exists
  if [ -d "$MCP_DIR" ] && [ ! -L "$MCP_DIR" ]; then
    echo "Migrating from old install..."
    rm -rf "$MCP_DIR"
  fi

  # Fresh clone
  echo "Cloning /vibe..."
  rm -rf "$REPO_DIR"
  git clone --quiet --depth 1 "$REPO_URL" "$REPO_DIR"
  echo "Cloned to $REPO_DIR"
fi

# Create/update symlink
rm -f "$MCP_DIR"
ln -sf "$REPO_DIR/mcp-server" "$MCP_DIR"
echo "Linked $MCP_DIR → $REPO_DIR/mcp-server"

# Show version
if [ -f "$MCP_DIR/version.json" ]; then
  VERSION=$(node -e "console.log(require('$MCP_DIR/version.json').version)")
  echo "Version: $VERSION"
fi

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
        "VIBE_API_URL": "https://www.slashvibe.dev"
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
      env: { VIBE_API_URL: 'https://www.slashvibe.dev' }
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
echo "Restart Claude Code, then say:"
echo ""
echo '  "let'"'"'s vibe"'
echo ""
echo "To update later:"
echo "  cd ~/.vibe/vibe-repo && git pull"
echo "  Then restart Claude Code"
echo ""
