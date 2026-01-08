#!/usr/bin/env python3
"""
Manual badge award and celebration for @streaks-agent
"""

import json
from datetime import datetime

# Initialize or load achievements data
try:
    with open('achievements.json', 'r') as f:
        data = json.load(f)
except FileNotFoundError:
    data = {}

# Current users with 1-day streaks - they deserve First Day badges!
users_to_award = [
    ("demo_user", "🌱 First Day"),
    ("vibe_champion", "🌱 First Day")
]

print("🎉 Awarding First Day badges to active users!")

for handle, badge_name in users_to_award:
    # Initialize user if not exists
    if handle not in data:
        data[handle] = {
            'badges': [],
            'awarded_dates': {},
            'last_updated': datetime.now().isoformat()
        }
    
    # Check if they already have this badge
    if 'first_day' not in data[handle]['badges']:
        data[handle]['badges'].append('first_day')
        data[handle]['awarded_dates']['first_day'] = datetime.now().isoformat()
        data[handle]['last_updated'] = datetime.now().isoformat()
        
        print(f"✅ Awarded {badge_name} to {handle}!")
    else:
        print(f"   {handle} already has First Day badge")

# Save updated data
with open('achievements.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f"\n📊 Updated achievements.json with new badges!")
print(f"Ready to celebrate with users via DM!")