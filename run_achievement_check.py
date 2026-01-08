#!/usr/bin/env python3
"""
Achievement Check and Award Script
Built by @streaks-agent to check badges for current users
"""

import sys
import os
sys.path.append('.')

from enhanced_achievement_system import EnhancedAchievementSystem

def main():
    print("🏆 ACHIEVEMENT CHECK SYSTEM")
    print("=" * 40)
    
    system = EnhancedAchievementSystem()
    
    # Current users with their streak data
    users = [
        {"handle": "demo_user", "streak": 1, "best": 1, "ships": 0},
        {"handle": "vibe_champion", "streak": 1, "best": 1, "ships": 0}
    ]
    
    all_new_achievements = []
    
    for user in users:
        handle = user["handle"]
        current_streak = user["streak"]
        best_streak = user["best"]
        ships_count = user["ships"]
        
        print(f"\n👤 Checking {handle}")
        print(f"   Current streak: {current_streak} days")
        print(f"   Best streak: {best_streak} days")
        print(f"   Ships count: {ships_count}")
        
        # Check for new achievements
        new_achievements = system.check_user_achievements(
            handle, current_streak, best_streak, ships_count
        )
        
        if new_achievements:
            all_new_achievements.extend(new_achievements)
            print(f"   🎉 NEW ACHIEVEMENTS: {len(new_achievements)}")
            for achievement in new_achievements:
                badge = achievement['badge']
                print(f"     • {badge['name']} {badge['emoji']} - {badge['description']}")
                print(f"       Earned: {achievement['earned_at']}")
                print(f"       Trigger: {achievement['trigger']}")
            
            # Generate celebration message for each new achievement
            for achievement in new_achievements:
                message = system.generate_celebration_message(handle, achievement)
                print(f"   📢 Celebration: {message}")
        else:
            print(f"   ℹ️  No new achievements")
        
        # Show current stats
        stats = system.get_user_stats(handle)
        print(f"   🏅 Total badges: {stats.get('total_badges', 0)}")
        
        # Show next milestone
        next_milestone = system.get_next_milestone(handle, current_streak)
        if next_milestone:
            print(f"   🎯 Next milestone: {next_milestone['badge']['name']} {next_milestone['badge']['emoji']}")
            print(f"      Days remaining: {next_milestone['days_remaining']}")
            print(f"      Progress: {next_milestone['progress_percent']}%")
    
    # Show leaderboard
    print(f"\n🏆 LEADERBOARD")
    print("=" * 40)
    leaderboard = system.get_leaderboard()
    
    if leaderboard:
        for i, entry in enumerate(leaderboard, 1):
            print(f"{i}. {entry['handle']}")
            print(f"   Badges: {entry['total_badges']}")
            print(f"   Rarity Score: {entry['rarity_score']}")
            if entry['recent_badges']:
                print(f"   Recent: {', '.join(entry['recent_badges'])}")
    else:
        print("No achievements yet")
    
    # Summary
    print(f"\n📊 SUMMARY")
    print("=" * 40)
    print(f"Users checked: {len(users)}")
    print(f"New achievements found: {len(all_new_achievements)}")
    
    if all_new_achievements:
        print("\n🎯 ACHIEVEMENTS TO CELEBRATE:")
        for achievement in all_new_achievements:
            handle = achievement.get('handle', 'Unknown')  # This might not exist in the achievement dict
            badge = achievement['badge']
            print(f"  • {handle}: {badge['name']} {badge['emoji']}")
    
    return all_new_achievements

if __name__ == "__main__":
    achievements = main()
    if achievements:
        print(f"\n✅ Found {len(achievements)} new achievements to celebrate!")
    else:
        print(f"\n✅ All achievements up to date")