#!/usr/bin/env python3
"""
Streaks Agent Badge Integration Check
Check current users for badge eligibility and award appropriately.
"""

import json
import sys
import os
from datetime import datetime

# Add current directory to path
sys.path.append(os.getcwd())

try:
    from achievements import AchievementTracker
except ImportError as e:
    print(f"Import error: {e}")
    print("Available files:")
    for f in os.listdir('.'):
        if f.endswith('.py'):
            print(f"  {f}")
    sys.exit(1)

def main():
    print("🏆 Streaks Agent Badge System Integration")
    print("=" * 50)
    
    # Current streak data (from get_streaks call)
    current_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    # Initialize tracker
    tracker = AchievementTracker()
    
    print(f"\n📊 Checking badges for {len(current_streaks)} users:")
    
    newly_awarded = []
    
    for handle, streak_info in current_streaks.items():
        clean_handle = handle.replace("@", "")  # Remove @ for consistency
        current_streak = streak_info["current"]
        best_streak = streak_info["best"]
        
        print(f"\n👤 {handle}")
        print(f"   Current streak: {current_streak} days")
        print(f"   Best streak: {best_streak} days")
        
        # User stats for badge checking
        user_stats = {
            'streak_days': current_streak,
            'best_streak': best_streak,
            'ships': 0,      # Default - could be tracked later
            'games': 0,      # Default - could be tracked later  
            'dms': 0,        # Default - could be tracked later
            'restarts': 0    # Default - could be tracked later
        }
        
        # Check for new badges
        new_badges = tracker.check_new_badges(clean_handle, user_stats)
        
        if new_badges:
            msg = tracker.format_badge_announcement(handle, new_badges)
            print(f"   🎉 NEW BADGES: {len(new_badges)}")
            for badge_id in new_badges:
                badge_def = tracker.badge_definitions[badge_id]
                print(f"      • {badge_def['name']} - {badge_def['description']}")
            newly_awarded.append((handle, new_badges, msg))
        else:
            # Show existing badges
            existing_badges = tracker.get_user_badges(clean_handle)
            if existing_badges:
                print(f"   ✅ Existing badges ({len(existing_badges)}):")
                for badge in existing_badges:
                    print(f"      • {badge['name']} - {badge['description']}")
            else:
                print(f"   📭 No badges yet")
    
    print(f"\n🎯 Results Summary:")
    print(f"   • Users checked: {len(current_streaks)}")
    print(f"   • Users with new badges: {len(newly_awarded)}")
    
    if newly_awarded:
        print(f"\n🎉 New Badge Awards:")
        for handle, badges, announcement in newly_awarded:
            print(f"   • {handle}: {len(badges)} new badges")
            print(f"     Message: {announcement}")
    
    # Show leaderboard
    leaderboard = tracker.get_leaderboard()
    if leaderboard:
        print(f"\n🏆 Current Leaderboard:")
        for i, entry in enumerate(leaderboard, 1):
            handle = entry['handle']
            count = entry['badge_count']
            latest = ', '.join(entry['latest_badges'][-2:])  # Show 2 most recent
            print(f"   {i}. @{handle}: {count} badges ({latest})")
    
    print(f"\n✅ Badge check complete!")
    return newly_awarded

if __name__ == "__main__":
    main()