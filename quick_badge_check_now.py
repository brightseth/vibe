#!/usr/bin/env python3
"""
Quick Badge Check for Current Users
Built by @streaks-agent
"""

import json
from enhanced_achievement_system import EnhancedAchievementSystem

def main():
    print("🎖️ Quick Badge Check - Current Status")
    print("=" * 45)
    
    # Initialize system
    system = EnhancedAchievementSystem()
    
    # Current users with 1-day streaks
    users = [
        ("@demo_user", 1, 1, 0),  # handle, current_streak, best_streak, ships_count
        ("@vibe_champion", 1, 1, 0)
    ]
    
    total_new_achievements = 0
    celebration_queue = []
    
    for handle, current_streak, best_streak, ships_count in users:
        print(f"\n👤 {handle}")
        print(f"   📊 Current Streak: {current_streak} days")
        print(f"   🏆 Best Streak: {best_streak} days")
        
        # Check for new achievements  
        achievements = system.check_user_achievements(handle, current_streak, best_streak, ships_count)
        
        if achievements:
            print(f"   🎉 NEW ACHIEVEMENTS: {len(achievements)}")
            total_new_achievements += len(achievements)
            
            for achievement in achievements:
                badge = achievement["badge"]
                print(f"      {badge['emoji']} {badge['name']} - {badge['description']}")
                
                # Check if already celebrated
                if not system.has_been_celebrated(handle, achievement["badge_id"]):
                    message = system.generate_celebration_message(handle, achievement)
                    celebration_queue.append((handle, achievement, message))
                    print(f"      💬 Celebration: {message}")
                else:
                    print(f"      ✅ Already celebrated")
        else:
            print(f"   ✅ No new achievements")
        
        # Show next milestone
        next_milestone = system.get_next_milestone(handle, current_streak)
        if next_milestone:
            days = next_milestone['days_remaining']
            badge_name = next_milestone['badge']['name']
            progress = next_milestone['progress_percent']
            print(f"   🎯 Next: {badge_name} in {days} days ({progress}%)")
        
        # Show total badges
        stats = system.get_user_stats(handle)
        total_badges = stats.get('total_badges', 0)
        print(f"   🏅 Total Badges: {total_badges}")
    
    print(f"\n🎊 SUMMARY:")
    print(f"   📊 Total New Achievements: {total_new_achievements}")
    print(f"   🎉 Celebrations Needed: {len(celebration_queue)}")
    
    if celebration_queue:
        print(f"\n💌 CELEBRATION QUEUE:")
        for handle, achievement, message in celebration_queue:
            badge = achievement["badge"]
            print(f"   {handle}: {badge['emoji']} {badge['name']}")
            print(f"   Message: {message}")
            print(f"   ---")
    
    return celebration_queue

if __name__ == "__main__":
    main()