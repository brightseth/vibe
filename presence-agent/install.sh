#!/bin/bash
# Install /vibe presence agent
#
# Creates ambient presence in your terminal:
# - Background daemon writes ~/.vibe/state.json
# - zsh RPROMPT shows who's online
# - Terminal title updates with presence
#
# Usage: ./install.sh

set -e

VIBE_DIR="$HOME/.vibe"
AGENT_DIR="$VIBE_DIR/presence-agent"
PLIST_SRC="$(dirname "$0")/com.vibe.presence-agent.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.vibe.presence-agent.plist"
ZSH_SRC="$(dirname "$0")/vibe.zsh"
ZSH_DST="$VIBE_DIR/vibe.zsh"

echo ""
echo "/vibe presence agent installer"
echo "==============================="
echo ""

# Check Node
if ! command -v node &> /dev/null; then
  echo "Error: Node.js required"
  exit 1
fi
echo "Node $(node -v) ✓"

# Create directories
mkdir -p "$AGENT_DIR"
mkdir -p "$HOME/Library/LaunchAgents"

# Copy agent
cp "$(dirname "$0")/index.js" "$AGENT_DIR/"
echo "Installed agent to $AGENT_DIR"

# Copy zsh integration
cp "$ZSH_SRC" "$ZSH_DST"
echo "Installed zsh integration to $ZSH_DST"

# Update plist with correct paths
NODE_PATH=$(which node)
sed "s|/usr/local/bin/node|$NODE_PATH|g" "$PLIST_SRC" | \
sed "s|/Users/seth|$HOME|g" > "$PLIST_DST"
echo "Installed launchd plist"

# Unload if already running
launchctl unload "$PLIST_DST" 2>/dev/null || true

# Load the agent
launchctl load "$PLIST_DST"
echo "Started presence agent"

echo ""
echo "==============================="
echo "/vibe presence agent installed"
echo ""
echo "Add to your .zshrc:"
echo ""
echo "  source ~/.vibe/vibe.zsh"
echo ""
echo "Then restart your shell or run:"
echo ""
echo "  source ~/.vibe/vibe.zsh"
echo ""
echo "Your RPROMPT will now show:"
echo "  ●3 ✉1 @stan"
echo ""
