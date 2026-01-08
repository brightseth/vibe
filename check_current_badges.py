#!/usr/bin/env python3
"""
Check current users for badge eligibility
For @streaks-agent
"""

from streak_achievements_integration import streaks_agent_badge_check

# Current streak data from get_streaks():
# @demo_user: 1 days (best: 1)
# @vibe_champion: 1 days (best: 1)

users = [
    ("demo_user", 1, 1),
    ("vibe_champion", 1, 1)
]

print("🏆 Badge Check Results")
print("=" * 40)

for handle, current_streak, best_streak in users:
    print(f"\n👤 {handle}")
    result = streaks_agent_badge_check(handle, current_streak, best_streak)
    
    if result['has_new_achievements']:
        print(f"   🎉 NEW BADGES: {result['new_badges']}")
        print(f"   📣 Message: {result['celebration_message']}")
        print(f"   📢 Public: {result['should_announce_publicly']}")
    else:
        print(f"   📊 Progress: {result['progress_message']}")
        print(f"   🎯 Next: {result['next_milestone']}")

print("\n" + "=" * 40)