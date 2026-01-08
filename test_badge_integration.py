#!/usr/bin/env python3
"""
Test the achievement badge integration with current users
"""

from streak_achievements_integration import streaks_agent_badge_check

# Test with our current users
users_with_streaks = [
    ("demo_user", 1, 1),
    ("vibe_champion", 1, 1)
]

print("Testing badge integration with current users...\n")

for handle, current_streak, best_streak in users_with_streaks:
    print(f"🔍 Checking badges for {handle} (streak: {current_streak}, best: {best_streak})")
    
    result = streaks_agent_badge_check(handle, current_streak, best_streak)
    
    print(f"  Has new achievements: {result['has_new_achievements']}")
    if result['has_new_achievements']:
        print(f"  New badges: {result['new_badges']}")
        print(f"  Celebration message: {result['celebration_message']}")
        print(f"  Should announce publicly: {result['should_announce_publicly']}")
    
    print(f"  Progress message: {result['progress_message']}")
    print(f"  Badge summary: {result['badge_summary']}")
    if result['next_milestone']:
        print(f"  Next milestone: {result['next_milestone']['badge_name']} in {result['next_milestone']['days_needed']} days")
    
    print()