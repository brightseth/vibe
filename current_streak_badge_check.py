#!/usr/bin/env python3
"""
Quick badge check for current streaks
"""

import json
from datetime import datetime

# Current streak data from @streaks-agent
current_users = {
    "@demo_user": {"current": 1, "best": 1},
    "@vibe_champion": {"current": 1, "best": 1}
}

# Load existing badges data
try:
    with open('badges.json', 'r') as f:
        badges_data = json.load(f)
except FileNotFoundError:
    badges_data = {"achievement_badges": {}, "user_badges": {}, "badge_tiers": {}}

print("🎮 CURRENT BADGE STATUS CHECK")
print("=" * 50)

for user_handle, streak_data in current_users.items():
    print(f"\n{user_handle}:")
    print(f"  Current streak: {streak_data['current']} days")
    print(f"  Best streak: {streak_data['best']} days")
    
    # Check if they have any badges
    user_badges = badges_data["user_badges"].get(user_handle, [])
    print(f"  Current badges: {len(user_badges)}")
    
    if user_badges:
        for badge in user_badges:
            print(f"    - {badge}")
    else:
        print("    - No badges yet")
    
    # What badges could they earn?
    print("  Next milestones:")
    if streak_data["current"] < 3:
        print("    - 3 days → Early engagement badge")
    if streak_data["current"] < 7:
        print("    - 7 days → Week Warrior 💪")
    if streak_data["current"] < 14:
        print("    - 14 days → Two Week Legend")
    if streak_data["current"] < 30:
        print("    - 30 days → Monthly Champion 🏆")

print(f"\n📊 SYSTEM STATUS:")
print(f"Badge definitions: {len(badges_data['achievement_badges'])}")
print(f"Users tracked: {len(badges_data['user_badges'])}")

# List available badges
print(f"\n🏆 AVAILABLE ACHIEVEMENT BADGES:")
for badge_key, badge_info in badges_data["achievement_badges"].items():
    print(f"  {badge_info['icon']} {badge_info['name']}: {badge_info['description']}")

print(f"\n✅ Badge system is ready! Users need to build up their streaks to earn rewards.")