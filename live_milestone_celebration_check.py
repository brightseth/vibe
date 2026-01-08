#!/usr/bin/env python3
"""
Live Milestone Celebration Check
Built by @streaks-agent for /vibe workshop

Checks current users for milestone achievements and triggers celebrations.
Integrates with the streak tracking and badge systems.
"""

import json
from datetime import datetime
from streak_milestone_celebration_system import StreakMilestoneCelebrator

def get_current_streak_data():
    """Get current streak data from memory/file"""
    # This would typically read from the streak tracking system
    # For now, using the known current state
    return {
        "@demo_user": {"current_streak": 1, "best_streak": 1, "active": True},
        "@vibe_champion": {"current_streak": 1, "best_streak": 1, "active": True}
    }

def main():
    print("🎊 Live Milestone Celebration Check")
    print("=" * 50)
    print(f"⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Initialize celebration system
    celebrator = StreakMilestoneCelebrator()
    
    # Get current user data
    streak_data = get_current_streak_data()
    print(f"👥 Checking {len(streak_data)} users for milestone achievements...")
    
    # Track celebrations that need to be sent
    celebrations_to_send = []
    
    for handle, data in streak_data.items():
        current_streak = data["current_streak"]
        is_active = data["active"]
        
        print(f"\n{'='*20}")
        print(f"👤 User: {handle}")
        print(f"🔥 Current Streak: {current_streak} days")
        print(f"🏆 Best Streak: {data['best_streak']} days") 
        print(f"✅ Status: {'Active' if is_active else 'Inactive'}")
        
        if not is_active:
            print("   ⏸️  User inactive - skipping celebration check")
            continue
        
        # Check for milestone celebrations
        result = celebrator.check_and_celebrate_user(handle, current_streak)
        
        if result["celebration_needed"]:
            milestone = result["milestone_info"]
            celebrations_to_send.append({
                "handle": handle,
                "milestone_days": milestone["days"],
                "milestone_name": milestone["config"]["name"],
                "emoji": milestone["config"]["emoji"],
                "dm_message": result["dm_message"],
                "announcement": result["announcement"],
                "celebration_type": milestone["config"]["celebration_type"]
            })
            
            print(f"   🎉 NEW MILESTONE ACHIEVED!")
            print(f"   🏅 Milestone: {milestone['config']['name']} ({milestone['days']} days)")
            print(f"   {milestone['config']['emoji']} Type: {milestone['config']['celebration_type']}")
            print(f"   📨 DM Ready: Yes")
            if result["announcement"]:
                print(f"   📢 Public Announcement: Yes")
            else:
                print(f"   📢 Public Announcement: No (private milestone)")
        else:
            print("   ✅ No new milestones to celebrate")
        
        # Show progress toward next milestone
        next_milestone = celebrator.get_next_milestone(current_streak)
        if next_milestone:
            days_left = next_milestone['days_remaining']
            name = next_milestone['config']['name']
            progress = next_milestone['progress_percent']
            emoji = next_milestone['config']['emoji']
            
            print(f"   🎯 Next Milestone: {emoji} {name}")
            print(f"   📅 Days Remaining: {days_left}")
            print(f"   📊 Progress: {progress}%")
        else:
            print("   🚀 All major milestones achieved!")
    
    # Summary and Actions
    print(f"\n{'='*50}")
    print("📋 CELEBRATION SUMMARY")
    print(f"{'='*50}")
    print(f"🎊 Celebrations Ready: {len(celebrations_to_send)}")
    
    if celebrations_to_send:
        print("\n🚀 ACTIONS TO TAKE:")
        for i, celebration in enumerate(celebrations_to_send, 1):
            print(f"\n{i}. {celebration['emoji']} {celebration['handle']} - {celebration['milestone_name']}")
            print(f"   📨 DM: {celebration['dm_message'][:80]}...")
            
            if celebration['announcement']:
                print(f"   📢 Announce: {celebration['announcement']}")
            else:
                print(f"   📢 Announce: (Private celebration - DM only)")
        
        # Generate celebration execution summary
        print(f"\n🎯 EXECUTION PLAN:")
        print(f"   1. Send {len(celebrations_to_send)} DM celebrations")
        public_announcements = len([c for c in celebrations_to_send if c['announcement']])
        print(f"   2. Post {public_announcements} public announcements")
        print(f"   3. Update celebration log with milestone records")
        
    else:
        print("   🎯 All current milestones already celebrated!")
        print("   ✨ Users are making great progress toward next milestones")
    
    # Show overall celebration stats
    dashboard_data = celebrator.get_celebration_dashboard_data()
    print(f"\n📊 CELEBRATION ANALYTICS:")
    print(f"   🎊 Total Celebrations Sent: {dashboard_data['total_celebrations']}")
    print(f"   👥 Users Celebrated: {dashboard_data['unique_users_celebrated']}")
    
    recent_celebrations = dashboard_data.get('recent_celebrations', [])
    if recent_celebrations:
        print(f"   🕒 Recent Celebrations: {len(recent_celebrations)}")
        latest = recent_celebrations[0]
        print(f"   📅 Latest: {latest['handle']} - {latest['milestone_name']} milestone")
    else:
        print(f"   🆕 No previous celebrations recorded")
    
    return celebrations_to_send

if __name__ == "__main__":
    celebrations = main()
    
    if celebrations:
        print(f"\n🎊 Ready to celebrate {len(celebrations)} milestone achievements!")
    else:
        print(f"\n✅ Milestone tracking active - waiting for next achievements!")