#!/usr/bin/env python3
"""
Test badge integration for current users
"""

import sys
import os
sys.path.append('.')

from streak_achievements_integration import streaks_agent_badge_check

def test_current_users():
    """Test badge checks for our current users"""
    
    # Current streak data: @demo_user: 1 days, @vibe_champion: 1 days
    users = [
        ("demo_user", 1, 1),
        ("vibe_champion", 1, 1)
    ]
    
    print("=== Badge Check Results ===\n")
    
    for handle, current_streak, best_streak in users:
        print(f"🔍 Checking {handle} (streak: {current_streak}, best: {best_streak})")
        
        result = streaks_agent_badge_check(handle, current_streak, best_streak)
        
        print(f"  New badges: {result['new_badges']}")
        if result['has_new_achievements']:
            print(f"  🎉 Celebration: {result['celebration_message']}")
            print(f"  📢 Announce publicly: {result['should_announce_publicly']}")
        else:
            print(f"  📈 Progress: {result['progress_message']}")
            
        print(f"  🏆 Badge summary: {result['badge_summary']}")
        
        if result['next_milestone']:
            milestone = result['next_milestone']
            print(f"  🎯 Next: {milestone['badge_name']} in {milestone['days_needed']} days")
        
        print()

if __name__ == "__main__":
    test_current_users()