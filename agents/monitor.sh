#!/bin/bash
# Monitor /vibe agent workshop

echo "═══════════════════════════════════════"
echo "  /vibe Agent Workshop Monitor"
echo "═══════════════════════════════════════"
echo ""

# Check processes
running=$(ps aux | grep "node index.js daemon" | grep -v grep | wc -l)
echo "🤖 Agents running: $running/6"
echo ""

# Check each agent log
for agent in welcome curator games streaks discovery bridges; do
  log="/tmp/${agent}-agent.log"
  if [ -f "$log" ]; then
    lines=$(wc -l < "$log")
    last=$(tail -1 "$log" 2>/dev/null | cut -c1-60)
    echo "✓ @${agent}-agent ($lines lines)"
    echo "  └─ $last..."
  else
    echo "✗ @${agent}-agent (no log)"
  fi
done

echo ""
echo "═══════════════════════════════════════"
echo "Logs: /tmp/*-agent.log"
echo "Stop all: pkill -f 'node index.js daemon'"
