#!/bin/bash
# Build VibeMacOS Release and create distributable zip

set -e

echo "🔨 Building Release version..."
xcodebuild -project VibeMacOS.xcodeproj \
  -scheme VibeMacOS \
  -configuration Release \
  -derivedDataPath ./build \
  clean build | grep -E "^\*\*|error:|warning:"

echo ""
echo "📦 Creating zip file..."
cd build/Build/Products/Release
ditto -c -k --sequesterRsrc --keepParent VibeMacOS.app ~/Downloads/VibeMacOS.zip

echo ""
echo "✅ Done!"
echo "📍 App: $(pwd)/VibeMacOS.app"
echo "📍 Zip: ~/Downloads/VibeMacOS.zip"
ls -lh ~/Downloads/VibeMacOS.zip
