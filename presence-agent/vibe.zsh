# /vibe zsh integration
# Source this in your .zshrc: source ~/.vibe/vibe.zsh
#
# Features:
# - RPROMPT shows presence (●3 ✉1 @stan)
# - Updates terminal title
# - Touches activity file for throttling

VIBE_STATE="$HOME/.vibe/state.json"
VIBE_ACTIVITY="$HOME/.vibe/.activity"

# Read presence state (fast, local file only)
_vibe_presence() {
  if [[ ! -f "$VIBE_STATE" ]]; then
    echo ""
    return
  fi

  # Parse JSON with simple grep/sed (no jq dependency)
  local online=$(grep -o '"online":[0-9]*' "$VIBE_STATE" 2>/dev/null | cut -d: -f2)
  local unread=$(grep -o '"unread":[0-9]*' "$VIBE_STATE" 2>/dev/null | cut -d: -f2)
  local last=$(grep -o '"lastActivity":"[^"]*"' "$VIBE_STATE" 2>/dev/null | cut -d'"' -f4)

  local parts=()

  if [[ -n "$online" && "$online" -gt 0 ]]; then
    parts+=("●$online")
  fi

  if [[ -n "$unread" && "$unread" -gt 0 ]]; then
    parts+=("✉$unread")
  fi

  if [[ -n "$last" ]]; then
    parts+=("$last")
  fi

  if [[ ${#parts[@]} -eq 0 ]]; then
    echo "%F{8}○%f"  # dim circle when quiet
  else
    echo "%F{green}${(j: :)parts}%f"
  fi
}

# Touch activity file (signals to agent that user is active)
_vibe_touch() {
  mkdir -p "$(dirname "$VIBE_ACTIVITY")"
  touch "$VIBE_ACTIVITY"
}

# precmd hook - runs before every prompt
_vibe_precmd() {
  # Touch activity (fast, no delay)
  _vibe_touch

  # Update RPROMPT with presence
  RPROMPT="$(_vibe_presence)"
}

# preexec hook - runs before every command
_vibe_preexec() {
  # Touch activity when running commands too
  _vibe_touch
}

# Install hooks
autoload -Uz add-zsh-hook
add-zsh-hook precmd _vibe_precmd
add-zsh-hook preexec _vibe_preexec

# Optional: Update terminal title from state
_vibe_update_title() {
  if [[ -f "$VIBE_STATE" ]]; then
    local online=$(grep -o '"online":[0-9]*' "$VIBE_STATE" 2>/dev/null | cut -d: -f2)
    local unread=$(grep -o '"unread":[0-9]*' "$VIBE_STATE" 2>/dev/null | cut -d: -f2)

    local parts=("vibe:")
    [[ -n "$online" && "$online" -gt 0 ]] && parts+=("${online} online")
    [[ -n "$unread" && "$unread" -gt 0 ]] && parts+=("📩 ${unread}")

    print -Pn "\e]0;${(j: · :)parts}\a"
  fi
}

# Uncomment to also update title from zsh (redundant if MCP does it)
# add-zsh-hook precmd _vibe_update_title

echo "[vibe] zsh integration loaded"
