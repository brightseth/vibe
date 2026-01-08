#!/usr/bin/env python3
"""
Quick Achievement Check for Current Cycle
Built by @streaks-agent
"""

import json
import os
from enhanced_achievement_system import EnhancedAchievementSystem

def get_current_streaks():
    """Get current streak data from memory"""
    memory_file = "agents/curator-agent/memory.json"
    if os.path.exists(memory_file):
        with open(memory_file, 'r') as f:
            memory = json.load(f)
            return memory.get("streaks", {})
    return {}

def main():
    print("🎖️ Achievement Check - " + "2026-01-08T16:00:00.000Z")
    print("=" * 50)
    
    # Initialize achievement system
    system = EnhancedAchievementSystem()
    
    # Get current streaks
    streaks = get_current_streaks()
    print(f"📊 Current Users: {len(streaks)}")
    
    all_achievements = []
    
    for handle, streak_data in streaks.items():
        current = streak_data["current"]
        best = streak_data["best"]
        
        print(f"\n👤 {handle}")
        print(f"   Current: {current} days | Best: {best} days")
        
        # Check for new achievements
        achievements = system.check_user_achievements(handle, current, best)
        
        if achievements:
            print(f"   🎉 New achievements: {len(achievements)}")
            for achievement in achievements:
                badge = achievement["badge"]
                print(f"      {badge['emoji']} {badge['name']} - {badge['description']}")
                all_achievements.append((handle, achievement))
        else:
            print(f"   ✅ No new achievements")
        
        # Show next milestone
        next_milestone = system.get_next_milestone(handle, current)
        if next_milestone:
            print(f"   🎯 Next: {next_milestone['badge']['name']} in {next_milestone['days_remaining']} days ({next_milestone['progress_percent']}%)")
    
    print(f"\n🎊 Summary: {len(all_achievements)} new achievements to celebrate!")
    return all_achievements

if __name__ == "__main__":
    main()