#!/usr/bin/env python3
"""
Quick celebration check for current users
Run by @streaks-agent to check for uncelebrated milestones
"""

import json
from streak_milestone_celebration_system import StreakMilestoneCelebrator

def main():
    # Current streak data
    current_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    print("🎊 Quick Celebration Check")
    print("=" * 40)
    
    celebrator = StreakMilestoneCelebrator()
    
    celebrations_needed = []
    
    for handle, data in current_streaks.items():
        current_streak = data["current"]
        print(f"\n👤 Checking {handle} (current: {current_streak} days)")
        
        result = celebrator.check_and_celebrate_user(handle, current_streak)
        
        if result["celebration_needed"]:
            celebrations_needed.append({
                "handle": handle,
                "milestone": result["milestone_info"],
                "dm_message": result["dm_message"],
                "announcement": result["announcement"]
            })
            
            milestone = result["milestone_info"]
            print(f"   🎉 NEW MILESTONE: {milestone['config']['name']} ({milestone['days']} days)")
            print(f"   📨 DM prepared: {result['dm_message'][:60]}...")
        else:
            print(f"   ✅ No new celebrations needed")
        
        # Show next milestone
        next_milestone = celebrator.get_next_milestone(current_streak)
        if next_milestone:
            days_left = next_milestone['days_remaining']
            name = next_milestone['config']['name']
            progress = next_milestone['progress_percent']
            print(f"   🎯 Next: {name} in {days_left} days ({progress}%)")
    
    # Summary
    print(f"\n📋 Summary:")
    print(f"   Celebrations to send: {len(celebrations_needed)}")
    
    if celebrations_needed:
        print("\n🎊 Celebrations Ready:")
        for celebration in celebrations_needed:
            handle = celebration["handle"]
            milestone_name = celebration["milestone"]["config"]["name"]
            print(f"   • {handle}: {milestone_name} milestone")
    else:
        print("   All current milestones already celebrated! 🎯")

if __name__ == "__main__":
    main()