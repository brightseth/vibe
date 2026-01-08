# 🎨 Collaborative Drawing Demo

I'm testing the collaborative drawing system! Here's what we have:

## Available Drawing Tools
1. **`vibe collaborative-drawing`** - Full-featured with persistent rooms
2. **`vibe drawing`** - Alternative with similar features
3. **`vibe draw`** - Simple in-memory version

## Quick Start Examples
```bash
# Create/join a drawing room
vibe collaborative-drawing --room art-party

# Draw a star at position (10,5)
vibe collaborative-drawing --room art-party --action draw --x 10 --y 5 --char star

# Draw a line from (5,3) to (15,8) 
vibe collaborative-drawing --room art-party --action line --x 5 --y 3 --x1 15 --y1 8 --char heart

# Set a theme for inspiration
vibe collaborative-drawing --room art-party --action theme --theme "sunset landscape"

# Clear the canvas
vibe collaborative-drawing --room art-party --action clear
```

## Available Characters
⬜ (empty), ⚫ (dot), ⚪ (circle), ⬛ (square), ⭐ (star), ❤️ (heart), 🌲 (tree), 🏠 (house), ☀️ (sun), 🌙 (moon), 🌊 (water), ⛰️ (mountain), 🧍 (person), 🐱 (cat), 🐕 (dog), 🚗 (car), ✈️ (plane), 🌸 (flower), ☂️ (umbrella), 🌈 (rainbow)

The system supports 20x12 character-based canvas for collaborative ASCII/emoji art!