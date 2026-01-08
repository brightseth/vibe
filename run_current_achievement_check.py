#!/usr/bin/env python3
"""
Current Achievement Check and Processing
Built by @streaks-agent
"""

import json
import os
from enhanced_achievement_system import EnhancedAchievementSystem

def main():
    print("🎖️ Current Achievement Status Check")
    print("=" * 50)
    
    # Initialize achievement system
    system = EnhancedAchievementSystem()
    
    # Get current streaks from streak_data.json
    with open("streak_data.json", 'r') as f:
        data = json.load(f)
    
    streaks = data["streaks"]
    print(f"📊 Current Users: {len(streaks)}")
    print(f"⏰ Last Updated: {data['last_updated']}")
    
    all_new_achievements = []
    
    for handle, streak_data in streaks.items():
        current = streak_data["current"]
        best = streak_data["best"]
        
        print(f"\n👤 {handle}")
        print(f"   Current Streak: {current} days | Best Streak: {best} days")
        
        # Check for new achievements
        achievements = system.check_user_achievements(handle, current, best)
        
        if achievements:
            print(f"   🎉 NEW ACHIEVEMENTS: {len(achievements)}")
            for achievement in achievements:
                badge = achievement["badge"]
                print(f"      {badge['emoji']} {badge['name']} - {badge['description']}")
                all_new_achievements.append((handle, achievement))
        else:
            print(f"   ✅ No new achievements")
        
        # Show next milestone
        next_milestone = system.get_next_milestone(handle, current)
        if next_milestone:
            print(f"   🎯 Next Milestone: {next_milestone['badge']['name']} in {next_milestone['days_remaining']} days")
            print(f"   📈 Progress: {next_milestone['progress_percent']}%")
        
        # Show current badges
        user_stats = system.get_user_stats(handle)
        print(f"   🏆 Total Badges: {user_stats.get('total_badges', 0)}")
    
    print(f"\n🎊 SUMMARY: {len(all_new_achievements)} new achievements found!")
    
    if all_new_achievements:
        print("\n🎉 CELEBRATION QUEUE:")
        for handle, achievement in all_new_achievements:
            badge = achievement["badge"]
            print(f"   {handle}: {badge['emoji']} {badge['name']}")
            
            # Check if already celebrated
            if not system.has_been_celebrated(handle, achievement["badge_id"]):
                message = system.generate_celebration_message(handle, achievement)
                print(f"   💬 Message: {message}")
                print(f"   ✉️  Ready to send celebration!")
            else:
                print(f"   ✅ Already celebrated")
    
    return all_new_achievements

if __name__ == "__main__":
    main()