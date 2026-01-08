#!/usr/bin/env python3
"""
Check and award streak badges for current users
Integrates badge system with existing streak tracking
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from badge_manager import BadgeManager

def check_all_streak_badges():
    """Check streak badges for all users with current streak data"""
    
    # Current streak data (from get_streaks output)
    current_streaks = {
        "@demo_user": 1,
        "@vibe_champion": 1
    }
    
    bm = BadgeManager()
    celebrations = []
    
    for handle, streak_days in current_streaks.items():
        awarded_badges = bm.check_streak_badges(handle, streak_days)
        
        for badge_id in awarded_badges:
            badge_def = bm.data["badge_definitions"][badge_id]
            celebration = {
                "handle": handle,
                "badge_name": badge_def["name"],
                "badge_desc": badge_def["description"],
                "streak_days": streak_days
            }
            celebrations.append(celebration)
    
    return celebrations, bm

def format_celebration_message(celebration):
    """Format a celebration message for a new badge"""
    return f"🎉 Congratulations {celebration['handle']}! You've earned the {celebration['badge_name']} badge for {celebration['badge_desc']}! Your current streak: {celebration['streak_days']} days!"

if __name__ == "__main__":
    celebrations, badge_manager = check_all_streak_badges()
    
    if celebrations:
        print("🏆 NEW BADGES AWARDED!")
        for celebration in celebrations:
            print(f"  {format_celebration_message(celebration)}")
    else:
        print("No new badges to award at this time.")
    
    print(f"\nCurrent badge leaderboard:")
    for user in badge_manager.get_badge_leaderboard():
        print(f"  {badge_manager.format_user_badges(user['handle'])}")