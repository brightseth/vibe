#!/bin/bash

# Test Claude Activity API
# Usage: ./test-claude-activity.sh

API_URL="http://localhost:3000/api/claude-activity"
# API_URL="https://slashvibe.dev/api/claude-activity"  # Uncomment for production

echo "🧪 Testing Claude Activity API..."
echo ""

# Test 1: POST activity (will fail without auth, but shows endpoint works)
echo "📝 Test 1: POST activity event"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "handle": "test_user",
    "type": "reading",
    "content": "src/App.tsx",
    "details": "Test activity event"
  }' | jq '.'

echo ""
echo ""

# Test 2: GET activity feed
echo "📖 Test 2: GET activity feed"
curl "$API_URL" | jq '.activities | length'

echo ""
echo ""

# Test 3: GET with filter
echo "🔍 Test 3: GET filtered by user"
curl "$API_URL?handle=test_user&limit=5" | jq '.'

echo ""
echo ""

# Test 4: Stats
echo "📊 Test 4: GET stats"
curl "$API_URL?stats=true" | jq '.'

echo ""
echo "✅ Tests complete!"
