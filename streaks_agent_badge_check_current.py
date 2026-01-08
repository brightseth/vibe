#!/usr/bin/env python3
"""
Streaks Agent Badge Check - Current Status
Check and award streak badges for current users
"""

import json
from badge_system import BadgeSystem

def main():
    # Load current streak data
    streak_data = {
        '@demo_user': 1,  # 1 days (best: 1)
        '@vibe_champion': 1  # 1 days (best: 1)
    }
    
    print("🏆 BADGE SYSTEM STATUS CHECK")
    print("=" * 50)
    
    badge_system = BadgeSystem()
    
    print("\n📊 Current Streak Data:")
    for user, streak in streak_data.items():
        print(f"  {user}: {streak} days")
    
    print("\n🎯 Badge Eligibility Check:")
    
    # Check each user for streak badges
    for user, streak_days in streak_data.items():
        print(f"\n{user}:")
        print(f"  Current streak: {streak_days} days")
        
        # Check current badges
        current_badges = badge_system.get_user_badges(user)
        if current_badges:
            print(f"  Current badges: {', '.join([b['icon'] + ' ' + b['name'] for b in current_badges])}")
        else:
            print(f"  Current badges: None")
        
        # Check for new streak badges
        new_badges = badge_system.check_streak_badges(user, streak_days)
        if new_badges:
            print(f"  🎉 NEW BADGES AWARDED: {', '.join(new_badges)}")
        else:
            print(f"  📈 Next badge: Week Warrior 💪 (need 7-day streak)")
    
    print("\n🏅 Badge Leaderboard:")
    leaderboard = badge_system.get_leaderboard()
    if leaderboard:
        for i, entry in enumerate(leaderboard, 1):
            badge_icons = " ".join([b['icon'] for b in entry['badges']])
            print(f"  #{i} {entry['user']}: {badge_icons} ({entry['badge_count']} badges)")
    else:
        print("  No badges awarded yet!")
    
    print("\n🎯 Badge System Ready!")
    print("Both users are on 1-day streaks - building momentum!")
    print("Next milestone: 7-day streak for Week Warrior badge 💪")

if __name__ == "__main__":
    main()