#!/bin/bash

# /vibe Installer — The Social Network for Claude Code
# Invite friends. Build together. Your sessions make everyone smarter.

set -e

# Colors
GREEN='\033[0;32m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

VIBE_DIR="$HOME/.vibe"
CONFIG_FILE="$VIBE_DIR/config.json"
MCP_SERVER="$VIBE_DIR/mcp-server/index.js"

# Claude Code settings locations
CLAUDE_SETTINGS_1="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
CLAUDE_SETTINGS_2="$HOME/.claude/settings/claude_desktop_config.json"

clear
echo ""
echo -e "  ${BOLD}⚡ /vibe${NC}"
echo -e "  ${GREEN}The social network for Claude Code.${NC}"
echo -e "  ${DIM}Invite friends. Build together.${NC}"
echo ""
echo "  ─────────────────────────────────────────────"
echo ""

# Create directories
mkdir -p "$VIBE_DIR/mcp-server"

# Get username
echo -e "  ${BOLD}Pick a handle:${NC}"
read -p "  @" HANDLE

if [ -z "$HANDLE" ]; then
  echo ""
  echo -e "  ${DIM}Handle required. Try again.${NC}"
  exit 1
fi

HANDLE=$(echo "$HANDLE" | tr '[:upper:]' '[:lower:]' | tr -d ' @')

echo ""
echo -e "  ${BOLD}What are you building?${NC} ${DIM}(one line)${NC}"
read -p "  building: " BUILDING

if [ -z "$BUILDING" ]; then
  BUILDING="something cool"
fi

# Save config
cat > "$CONFIG_FILE" << EOF
{
  "username": "$HANDLE",
  "building": "$BUILDING",
  "installedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo ""
echo -e "  Welcome, ${GREEN}@$HANDLE${NC}!"
echo -e "  ${DIM}Building: $BUILDING${NC}"
echo ""

# Download MCP server
echo -e "  ${DIM}Downloading MCP server...${NC}"
curl -sL "https://slashvibe.dev/mcp-server/index.js" -o "$MCP_SERVER"
chmod +x "$MCP_SERVER"

# Register on network
echo -e "  ${DIM}Registering @$HANDLE...${NC}"
curl -sL -X POST "https://slashvibe.dev/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$HANDLE\", \"building\": \"$BUILDING\"}" \
  > /dev/null 2>&1 || true

curl -sL -X POST "https://slashvibe.dev/api/presence" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$HANDLE\", \"workingOn\": \"$BUILDING\"}" \
  > /dev/null 2>&1 || true

# Configure Claude Code
MCP_CONFIG=$(cat << EOF
{
  "mcpServers": {
    "vibe": {
      "command": "node",
      "args": ["$MCP_SERVER"]
    }
  }
}
EOF
)

configure_claude() {
  local settings_file="$1"

  if [ -f "$settings_file" ]; then
    # Check if vibe already configured
    if grep -q '"vibe"' "$settings_file" 2>/dev/null; then
      echo -e "  ${DIM}/vibe already in Claude Code config${NC}"
      return 0
    fi

    # Backup existing config
    cp "$settings_file" "${settings_file}.backup.$(date +%s)"

    # Try to merge with existing config
    if command -v jq &> /dev/null; then
      jq -s '.[0] * .[1]' "$settings_file" <(echo "$MCP_CONFIG") > "${settings_file}.tmp" 2>/dev/null && \
        mv "${settings_file}.tmp" "$settings_file" && \
        echo -e "  ${GREEN}✓${NC} Claude Code configured" && \
        return 0
    fi
  fi

  return 1
}

CONFIGURED=false

if configure_claude "$CLAUDE_SETTINGS_1"; then
  CONFIGURED=true
elif configure_claude "$CLAUDE_SETTINGS_2"; then
  CONFIGURED=true
fi

if [ "$CONFIGURED" = false ]; then
  echo ""
  echo -e "  ${BOLD}Add this to your Claude Code settings:${NC}"
  echo ""
  echo "$MCP_CONFIG" | sed 's/^/  /'
  echo ""
fi

# Success message
echo ""
echo "  ─────────────────────────────────────────────"
echo ""
echo -e "  ${GREEN}✅ /vibe installed!${NC}"
echo ""
echo -e "  ${BOLD}What happens now:${NC}"
echo -e "  • Restart Claude Code to activate"
echo -e "  • Say \"who's online?\" or \"vibe status\""
echo -e "  • Invite friends with \"vibe invite\""
echo ""
echo -e "  ${BOLD}Commands:${NC}"
echo -e "  ${DIM}vibe status${NC}      — see your network"
echo -e "  ${DIM}vibe ping @user${NC}  — message a friend"
echo -e "  ${DIM}vibe inbox${NC}       — check messages"
echo -e "  ${DIM}vibe invite${NC}      — bring in a friend"
echo ""
echo -e "  ${GREEN}@$HANDLE${NC} is now vibing. ⚡"
echo ""
