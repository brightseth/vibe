#!/usr/bin/env python3
"""
Check for new badge achievements based on current streak data
"""

import sys
import os
sys.path.append(os.getcwd())

from achievements import AchievementTracker
import json

def check_badges_for_current_users():
    """Check badges for our current streak users"""
    print("🏆 Checking Achievement Badges")
    print("=" * 40)
    
    # Initialize achievement system
    tracker = AchievementTracker()
    
    # Current users and their streak data
    current_users = {
        "demo_user": {"streak_days": 1, "best_streak": 1},
        "vibe_champion": {"streak_days": 1, "best_streak": 1}
    }
    
    celebrations = []
    
    for handle, streak_data in current_users.items():
        print(f"\n👤 Checking {handle}...")
        
        # Prepare user stats for badge checking
        user_stats = {
            'streak_days': streak_data['streak_days'],
            'best_streak': streak_data['best_streak'],
            'ships': 0,  # Default values - could be enhanced later
            'games': 0,
            'dms': 0,
            'restarts': 0,
            'join_date': '2026-01-08'  # Early adopter eligible
        }
        
        # Check for new badges
        new_badges = tracker.check_new_badges(handle, user_stats)
        
        if new_badges:
            msg = tracker.format_badge_announcement(handle, new_badges)
            print(f"   🎉 NEW BADGES: {msg}")
            celebrations.append((handle, new_badges, msg))
        else:
            # Show existing badges
            existing = tracker.get_user_badges(handle)
            if existing:
                badge_names = [b['name'] for b in existing]
                print(f"   ✅ Has badges: {', '.join(badge_names)}")
            else:
                print(f"   📝 No badges yet (need more activity)")
    
    print(f"\n📊 Results Summary:")
    print(f"   • Checked {len(current_users)} users")
    print(f"   • {len(celebrations)} new badge celebrations")
    
    if celebrations:
        print(f"\n🎊 Celebrations to make:")
        for handle, badges, msg in celebrations:
            print(f"   • {msg}")
    
    # Show achievement leaderboard
    leaderboard = tracker.get_leaderboard()
    if leaderboard:
        print(f"\n🏆 Current Badge Leaderboard:")
        for i, entry in enumerate(leaderboard[:5], 1):
            latest = ', '.join(entry['latest_badges']) if entry['latest_badges'] else 'None'
            print(f"   {i}. {entry['handle']}: {entry['badge_count']} badges ({latest})")
    
    print(f"\n✅ Badge check complete!")
    return celebrations

if __name__ == "__main__":
    celebrations = check_badges_for_current_users()