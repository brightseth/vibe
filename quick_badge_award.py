import json
import os
from datetime import datetime

# Load streak data
print("Loading streak data...")
with open("agents/streaks-agent/memory.json", "r") as f:
    memory = json.load(f)
    streaks = memory.get("userStreaks", {})

print(f"Found {len(streaks)} users:")
for user, data in streaks.items():
    print(f"  @{user}: {data.get('current', 0)} day streak")

# Load and update badge system
print("\nLoading badge system...")
with open("badges.json", "r") as f:
    badge_data = json.load(f)

if "user_badges" not in badge_data:
    badge_data["user_badges"] = {}

# Add First Day badge if missing
if "first_day" not in badge_data.get("achievement_badges", {}):
    badge_data["achievement_badges"]["first_day"] = {
        "name": "First Day 🌱",
        "description": "Started your workshop journey!",
        "tier": "bronze",
        "criteria": "1_day_streak", 
        "icon": "🌱"
    }
    print("Added First Day badge definition")

# Award badges
awarded = 0
for username, streak_info in streaks.items():
    current_streak = streak_info.get("current", 0)
    handle = f"@{username}"
    
    if current_streak >= 1:
        if handle not in badge_data["user_badges"]:
            badge_data["user_badges"][handle] = []
        
        if "first_day" not in badge_data["user_badges"][handle]:
            badge_data["user_badges"][handle].append("first_day")
            awarded += 1
            print(f"🎉 {handle} earned First Day 🌱")

# Save
with open("badges.json", "w") as f:
    json.dump(badge_data, f, indent=2)

print(f"\n✅ Awarded {awarded} badges!")
print("Badge system updated successfully!")