#!/usr/bin/env python3

import sys
import os
sys.path.append('.')

from achievements import AchievementTracker

def main():
    tracker = AchievementTracker()
    
    print("🏆 Checking badge eligibility for current users\n")
    
    # Check both users with 1-day streaks
    users = ["demo_user", "vibe_champion"]
    
    for handle in users:
        print(f"User: {handle}")
        
        # Stats for 1-day streak
        user_stats = {
            'streak_days': 1,
            'best_streak': 1
        }
        
        # Check for new badges
        new_badges = tracker.check_new_badges(handle, user_stats)
        
        if new_badges:
            print(f"  ✅ New badges earned: {new_badges}")
            msg = tracker.format_badge_announcement(handle, new_badges)
            print(f"  🎉 Celebration: {msg}")
        else:
            print(f"  ℹ️  No new badges")
            
        # Show current badges
        current_badges = tracker.get_user_badges(handle)
        if current_badges:
            badge_names = [b['name'] for b in current_badges]
            print(f"  🏅 Current badges: {badge_names}")
        
        print()

if __name__ == "__main__":
    main()