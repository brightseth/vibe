#!/usr/bin/env python3
"""
Run badge check and award first day badges
"""

import sys
import os
sys.path.append(os.getcwd())

from achievements import AchievementTracker
import json

print("🏆 Badge System Check & Award")
print("=" * 40)

# Initialize achievement system
tracker = AchievementTracker()

# Check current state
print("\n📊 Current Achievement State:")
try:
    with open('achievements.json', 'r') as f:
        current_data = json.load(f)
    print(json.dumps(current_data, indent=2))
except FileNotFoundError:
    print("No achievements file exists yet")
    current_data = {}

# Award first day badges to current streak users
users_to_check = [
    ("demo_user", 1),
    ("vibe_champion", 1)
]

print(f"\n🌱 Checking First Day badges for {len(users_to_check)} users:")

newly_awarded = []

for handle, streak_days in users_to_check:
    print(f"\n👤 {handle} (streak: {streak_days} days)")
    
    # Prepare user stats
    user_stats = {
        'streak_days': streak_days,
        'ships': 0,  # Default values for other criteria
        'games': 0,
        'dms': 0
    }
    
    # Check for new badges
    new_badges = tracker.check_new_badges(handle, user_stats)
    
    if new_badges:
        msg = tracker.format_badge_announcement(handle, new_badges)
        print(f"   🎉 AWARDED: {msg}")
        newly_awarded.append((handle, new_badges, msg))
    else:
        # Check existing badges
        existing = tracker.get_user_badges(handle)
        if existing:
            badge_names = [b['name'] for b in existing]
            print(f"   ✅ Already has: {', '.join(badge_names)}")
        else:
            print(f"   ❌ No badges earned yet (criteria not met)")

print(f"\n📈 Results Summary:")
print(f"   • {len(newly_awarded)} users awarded new badges")

for handle, badges, message in newly_awarded:
    print(f"   • {handle}: {badges}")

# Show final state
print(f"\n📋 Final Achievement State:")
try:
    with open('achievements.json', 'r') as f:
        final_data = json.load(f)
    print(json.dumps(final_data, indent=2))
except Exception as e:
    print(f"Error reading final state: {e}")

print("\n✅ Badge check complete!")