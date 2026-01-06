#!/bin/bash
# /vibe statusline for Claude Code
# Shows unread message count from /vibe inbox

# Read Claude Code's JSON input (we don't use it, but need to consume stdin)
input=$(cat)

# Read config
CACHE_FILE="$HOME/.vibe/.statusline_cache"
CACHE_MAX_AGE=5  # seconds (matches statusline.conf default)

# Function to fetch inbox count
fetch_inbox() {
    # Check primary config location (vibecodings) first, then fallback
    local config_file="$HOME/.vibecodings/config.json"
    if [ ! -f "$config_file" ]; then
        config_file="$HOME/.vibe/config.json"
    fi

    if [ ! -f "$config_file" ]; then
        echo "💬 /vibe (not initialized)"
        return
    fi

    local username=$(jq -r '.username' "$config_file" 2>/dev/null)
    if [ -z "$username" ] || [ "$username" = "null" ]; then
        echo "💬 /vibe (not initialized)"
        return
    fi

    # Fetch unread count from API
    local response=$(curl -s "https://slashvibe.dev/api/messages/inbox?username=$username" 2>/dev/null)
    local unread=$(echo "$response" | jq -r '.unread // 0' 2>/dev/null)

    if [ -z "$unread" ] || [ "$unread" = "null" ]; then
        unread=0
    fi

    if [ "$unread" -eq 0 ]; then
        echo "💬 /vibe"
    else
        echo "💬 /vibe ($unread new)"
    fi
}

# Check if cache exists and is fresh
if [ -f "$CACHE_FILE" ]; then
    cache_age=$(($(date +%s) - $(stat -f %m "$CACHE_FILE" 2>/dev/null || stat -c %Y "$CACHE_FILE" 2>/dev/null)))
    if [ "$cache_age" -lt "$CACHE_MAX_AGE" ]; then
        # Use cached value
        cat "$CACHE_FILE"
        exit 0
    fi
fi

# Fetch fresh data and cache it
status=$(fetch_inbox)
echo "$status" > "$CACHE_FILE"
echo "$status"
