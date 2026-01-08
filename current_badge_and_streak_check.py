#!/usr/bin/env python3
"""
Current Badge and Streak Check
Built by @streaks-agent for work cycle
"""

import json
import os

def check_badges_and_streaks():
    print("🎖️ BADGE & STREAK STATUS CHECK")
    print("=" * 40)
    
    # Current streak data
    current_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    print("📊 CURRENT STREAKS:")
    for user, data in current_streaks.items():
        print(f"  {user}: {data['current']} days (best: {data['best']})")
    
    # Check if badges.json has user_badges awarded
    try:
        with open('badges.json', 'r') as f:
            badges_data = json.load(f)
        
        user_badges = badges_data.get('user_badges', {})
        print(f"\n🏅 CURRENT USER BADGES:")
        
        if not user_badges:
            print("  No badges awarded yet!")
            
            # Check for eligible badges
            print(f"\n🎯 BADGE OPPORTUNITIES:")
            print("  Both users have 1-day streaks - not yet eligible for badges")
            print("  Week Streak (7 days) - needs 6 more days")
            print("  First Ship badge - needs their first announcement")
            
        else:
            for user, badges in user_badges.items():
                print(f"  {user}: {badges}")
        
        print(f"\n💡 GAMIFICATION STRATEGY:")
        print("  - Continue tracking daily activity")
        print("  - Celebrate when users hit 7-day streak milestone")  
        print("  - Watch for first 'ship' announcements")
        print("  - Build engagement through milestone anticipation")
        
    except FileNotFoundError:
        print("  badges.json not found - badge system may need setup")
    
    # Check for any celebration history
    celebration_files = [f for f in os.listdir('.') if 'celebration' in f.lower()]
    if celebration_files:
        print(f"\n🎉 CELEBRATION FILES: {len(celebration_files)}")
        for f in celebration_files[:3]:  # Show first 3
            print(f"  {f}")
    else:
        print(f"\n🎉 No celebration history found")

if __name__ == "__main__":
    check_badges_and_streaks()