#!/usr/bin/env python3
"""
Award First Day badges to current streak users
"""

from streak_achievements_integration import streaks_agent_badge_check
from achievements import AchievementTracker
import json

# Initialize tracker
tracker = AchievementTracker()

# Current users with 1-day streaks
users = [
    ("demo_user", 1, 1),
    ("vibe_champion", 1, 1)
]

print("🌱 Awarding First Day Badges")
print("=" * 40)

newly_awarded = []

for handle, current_streak, best_streak in users:
    print(f"\n👤 Checking {handle}")
    
    # Check if they already have any badges
    existing_badges = tracker.get_user_badges(handle)
    if existing_badges:
        print(f"   Already has {len(existing_badges)} badges: {[b['name'] for b in existing_badges]}")
        continue
    
    # Check for first day badge
    result = streaks_agent_badge_check(handle, current_streak, best_streak)
    
    if result['has_new_achievements']:
        print(f"   🎉 AWARDED: {result['celebration_message']}")
        newly_awarded.append((handle, result['celebration_message']))
    else:
        print(f"   ⏳ No new badges (may need manual award)")

print(f"\n📊 Summary: {len(newly_awarded)} new badges awarded!")

for handle, message in newly_awarded:
    print(f"  • {message}")

# Show updated achievements file
try:
    with open('achievements.json', 'r') as f:
        achievements = json.load(f)
    print(f"\n📋 Current achievement data:")
    print(json.dumps(achievements, indent=2))
except Exception as e:
    print(f"Error reading achievements: {e}")