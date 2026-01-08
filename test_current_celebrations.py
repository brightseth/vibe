#!/usr/bin/env python3
"""Test celebrations for current users"""

from streak_milestone_celebration_system import StreakMilestoneCelebrator
import json

def test_current_users():
    print("🎊 Testing Celebration System with Current Users")
    print("=" * 50)
    
    celebrator = StreakMilestoneCelebrator()
    
    # Current users from streak data
    current_users = [
        ("@demo_user", 1),
        ("@vibe_champion", 1)
    ]
    
    celebrations_needed = []
    
    for handle, streak in current_users:
        print(f"\n👤 {handle} (streak: {streak} days)")
        
        result = celebrator.check_and_celebrate_user(handle, streak)
        
        if result["celebration_needed"]:
            milestone = result["milestone_info"]
            print(f"   🎉 CELEBRATION NEEDED!")
            print(f"   🏆 Milestone: {milestone['config']['name']} ({milestone['days']} days)")
            print(f"   💬 DM Message:")
            print(f"      {result['dm_message']}")
            
            if result['announcement']:
                print(f"   📢 Board Announcement:")
                print(f"      {result['announcement']}")
            
            celebrations_needed.append({
                "handle": handle,
                "milestone": milestone,
                "dm_message": result["dm_message"],
                "announcement": result["announcement"]
            })
        else:
            print(f"   ✅ No new celebrations needed")
        
        # Show next milestone  
        next_milestone = celebrator.get_next_milestone(streak)
        if next_milestone:
            days_left = next_milestone['days_remaining']
            progress = next_milestone['progress_percent']
            name = next_milestone['config']['name']
            emoji = next_milestone['config']['emoji']
            print(f"   🎯 Next Milestone: {emoji} {name}")
            print(f"      Progress: {progress}% ({days_left} days to go)")
    
    print(f"\n🎊 SUMMARY:")
    print(f"   Celebrations needed: {len(celebrations_needed)}")
    
    if celebrations_needed:
        print(f"\n📋 CELEBRATION QUEUE:")
        for i, celebration in enumerate(celebrations_needed, 1):
            handle = celebration["handle"] 
            milestone_name = celebration["milestone"]["config"]["name"]
            print(f"   {i}. {handle} → {milestone_name}")
    
    # Show celebration stats
    print(f"\n📊 System Status:")
    dashboard = celebrator.get_celebration_dashboard_data()
    print(f"   Total celebrations recorded: {dashboard['total_celebrations']}")
    print(f"   Users with celebrations: {dashboard['unique_users_celebrated']}")
    
    return celebrations_needed

if __name__ == "__main__":
    test_current_users()