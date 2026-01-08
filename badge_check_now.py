#!/usr/bin/env python3
"""
Live Badge Check and Award Script
Built by @streaks-agent for immediate badge checking
"""

import sys
import os
sys.path.append('.')

from achievements import AchievementTracker
import json

def main():
    print("🏆 BADGE CHECK AND AWARD SYSTEM")
    print("=" * 40)
    
    tracker = AchievementTracker()
    
    # Current users with 1-day streaks
    users = [
        {"handle": "demo_user", "streak": 1, "best": 1},
        {"handle": "vibe_champion", "streak": 1, "best": 1}
    ]
    
    new_achievements_found = False
    
    for user in users:
        handle = user["handle"]
        current_streak = user["streak"]
        best_streak = user["best"]
        
        print(f"\n👤 Checking {handle}")
        print(f"   Current streak: {current_streak} days")
        print(f"   Best streak: {best_streak} days")
        
        # Check for new badges
        user_stats = {
            'streak_days': current_streak,
            'best_streak': best_streak,
            'ships': 0,  # Will track this later
            'games': 0,  # Will track this later
            'dms': 0     # Will track this later
        }
        
        new_badges = tracker.check_new_badges(handle, user_stats)
        
        if new_badges:
            new_achievements_found = True
            print(f"   🎉 NEW BADGES EARNED: {len(new_badges)}")
            for badge_id in new_badges:
                badge = tracker.badge_definitions[badge_id]
                print(f"     • {badge['name']} - {badge['description']}")
            
            # Generate celebration message
            celebration = tracker.format_badge_announcement(handle, new_badges)
            print(f"   📢 Celebration: {celebration}")
        else:
            print(f"   ℹ️  No new badges at this time")
        
        # Show current badge collection
        current_badges = tracker.get_user_badges(handle)
        if current_badges:
            print(f"   🏅 Total badges: {len(current_badges)}")
            for badge in current_badges:
                print(f"     • {badge['name']}")
        else:
            print(f"   📥 No badges yet")
    
    print(f"\n🏆 LEADERBOARD")
    print("=" * 40)
    leaderboard = tracker.get_leaderboard()
    
    if leaderboard:
        for i, entry in enumerate(leaderboard, 1):
            print(f"{i}. {entry['handle']} - {entry['badge_count']} badges")
            if entry['latest_badges']:
                print(f"   Latest: {', '.join(entry['latest_badges'])}")
    else:
        print("No badges awarded yet")
    
    # Summary
    print(f"\n📊 SUMMARY")
    print("=" * 40)
    
    total_users = len(users)
    total_with_badges = len([u for u in users if len(tracker.get_user_badges(u['handle'])) > 0])
    
    print(f"Users tracked: {total_users}")
    print(f"Users with badges: {total_with_badges}")
    print(f"New achievements found: {'Yes' if new_achievements_found else 'No'}")
    
    if new_achievements_found:
        print("\n🎯 RECOMMENDED ACTIONS:")
        print("- Send personal DM celebrations to users with new badges")
        print("- Announce First Day achievements to encourage others")
        print("- Update achievement status documentation")
    
    return new_achievements_found

if __name__ == "__main__":
    main()