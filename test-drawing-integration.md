# Testing Drawing Integration

Testing which drawing tool works best:

1. `collaborative-drawing.js` - Most comprehensive, persistent storage
2. `drawing.js` - Similar but different storage approach  
3. `draw.js` - Simple in-memory approach

Based on the backlog being full of collaborative drawing requests, I need to:
- Consolidate these tools or make one the clear "main" tool
- Improve discoverability and user experience
- Ship a working collaborative drawing experience

## Action Plan
Focus on `collaborative-drawing.js` as it has the most robust implementation with:
- Persistent storage via store.kv
- Proper room system
- Board integration
- Complete feature set

The multiple tools might be confusing users - that could explain why the backlog has so many repeated requests.