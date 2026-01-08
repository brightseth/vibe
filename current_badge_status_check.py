#!/usr/bin/env python3
"""
Check current badge status for our active users
"""
import sys
import os
sys.path.append('.')

from achievements import AchievementTracker
import json

def main():
    print("🏆 Current Badge Status Check")
    print("=" * 50)
    
    # Initialize tracker
    tracker = AchievementTracker()
    
    # Current users with streaks from memory
    current_users = {
        'demo_user': {'streak_days': 1, 'ships': 0, 'games': 0},
        'vibe_champion': {'streak_days': 1, 'ships': 0, 'games': 0}
    }
    
    for handle, stats in current_users.items():
        print(f"\n👤 {handle}")
        print(f"   Current streak: {stats['streak_days']} days")
        
        # Check for new badges
        new_badges = tracker.check_new_badges(handle, stats)
        
        if new_badges:
            msg = tracker.format_badge_announcement(handle, new_badges)
            print(f"   🎉 NEW BADGES: {new_badges}")
            print(f"   📣 Message: {msg}")
        
        # Show current badges
        current_badges = tracker.get_user_badges(handle)
        if current_badges:
            print(f"   ✅ Current badges: {[b['name'] for b in current_badges]}")
        else:
            print(f"   ❌ No badges yet")
    
    print(f"\n📊 Leaderboard:")
    leaderboard = tracker.get_leaderboard()
    for i, entry in enumerate(leaderboard, 1):
        print(f"   {i}. {entry['handle']}: {entry['badge_count']} badges")
    
    print(f"\n💾 Achievements saved to: {tracker.data_file}")

if __name__ == "__main__":
    main()