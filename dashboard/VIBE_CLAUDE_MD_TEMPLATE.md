# /vibe CLAUDE.md Template

**Purpose:** This content is appended to user's CLAUDE.md when they install /vibe MCP server.

---

## Content to Inject

```markdown
## /vibe - Terminal-Native Social

You have /vibe installed - a social layer for Claude Code users.

### Dashboard Mode (default: enabled)

When interacting with /vibe, use structured AskUserQuestion flows:

**Compose Assistant** - When messaging someone:
1. Ask who (show online + recent threads)
2. Ask intent (follow up, collaborate, share, ping)
3. Ask tone (casual, playful, direct, hype)
4. Surface memory with `vibe_recall`
5. Draft message, get approval

**Inbox Triage** - When checking messages (especially 3+ unread):
1. Show unified inbox across platforms
2. Ask which to prioritize
3. Offer batch actions (draft all, quick react, one-by-one)

**Discovery Mode** - When user wants to find/reach people:
1. Ask interest area (AI, art, infra, expand network)
2. Ask goal (collaborate, feedback, grow /vibe)
3. Suggest targets with context
4. Draft personalized outreach

**Session Wrap** - When user says bye or ends session:
1. Summarize conversations
2. Suggest follow-ups to queue
3. Offer memories to save
4. Set status

### Magic Layers

**Surprise Suggestions:** When `vibe_who` shows someone interesting online, proactively alert:
"@handle just came online - [context from memory]"

**Memory Surfacing:** Before composing, always call `vibe_recall @handle` and include context in your draft.

**Serendipity:** When user says "vibe random" - pick someone unexpected from their network and suggest a conversation starter.

### Freeform Mode

If user says "vibe freeform" - disable structured flows, just execute raw commands.
Re-enable with "vibe dashboard" or "vibe guided".

### Key Commands

- `vibe` or `vibe inbox` - Check messages (triggers triage flow)
- `vibe who` - See who's online (triggers surprise suggestions)
- `vibe compose` - Start compose flow
- `vibe discover` - Find people to connect with
- `vibe random` - Serendipity mode
- `vibe bye` - Session wrap flow
- `vibe freeform` - Disable structured mode
- `vibe remember @handle "observation"` - Save memory
- `vibe recall @handle` - Surface memories
```

---

## Installation Hook

When /vibe MCP server is installed, the install script should:

1. Check if `~/.claude/CLAUDE.md` exists
2. Check if /vibe section already exists (avoid duplicates)
3. Append the above content
4. Notify user: "Dashboard mode enabled. Say 'vibe freeform' to disable structured navigation."

**Install script addition:**
```bash
# After MCP registration
CLAUDE_MD="$HOME/.claude/CLAUDE.md"
VIBE_MARKER="## /vibe - Terminal-Native Social"

if [ -f "$CLAUDE_MD" ]; then
  if ! grep -q "$VIBE_MARKER" "$CLAUDE_MD"; then
    echo "" >> "$CLAUDE_MD"
    cat ~/.vibe/claude-md-template.md >> "$CLAUDE_MD"
    echo "✓ Dashboard mode added to CLAUDE.md"
  fi
else
  cp ~/.vibe/claude-md-template.md "$CLAUDE_MD"
  echo "✓ Created CLAUDE.md with dashboard mode"
fi
```

---

## Uninstall Hook

When /vibe is uninstalled, remove the injected section:

```bash
# Remove /vibe section from CLAUDE.md
sed -i '' '/## \/vibe - Terminal-Native Social/,/^## /{ /^## [^\/]/!d; }' "$CLAUDE_MD"
```
