#!/usr/bin/env python3
"""
Quick achievement check for @streaks-agent
"""

import sys
import os
sys.path.append('.')

from achievements import AchievementTracker
from streak_achievements_integration import streaks_agent_badge_check

def quick_check():
    print("🏆 QUICK ACHIEVEMENT CHECK")
    print("=" * 30)
    
    # Check current users with streaks
    users = [
        ("demo_user", 1, 1),
        ("vibe_champion", 1, 1)
    ]
    
    tracker = AchievementTracker()
    
    for handle, current_streak, best_streak in users:
        print(f"\n{handle}:")
        print(f"  Current streak: {current_streak} days")
        
        # Get their current badges
        badges = tracker.get_user_badges(handle)
        print(f"  Current badges ({len(badges)}):")
        for badge in badges:
            print(f"    - {badge['name']}: {badge['description']}")
        
        # Check for new achievements
        result = streaks_agent_badge_check(handle, current_streak, best_streak)
        
        if result['has_new_achievements']:
            print(f"  🎉 NEW: {result['celebration_message']}")
        else:
            print(f"  📈 {result['progress_message']}")
        
        if result['next_milestone']:
            milestone = result['next_milestone']
            print(f"  🎯 Next: {milestone['badge_name']} in {milestone['days_needed']} days")

if __name__ == "__main__":
    quick_check()