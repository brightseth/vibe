#!/usr/bin/env python3
"""
🎖️ Current Badge Check for Streaks Agent
Real-time badge checking for active users
"""

import json
import datetime
from streaks_agent_badge_integration import StreaksBadgeIntegration

def main():
    """Check current users for badge eligibility"""
    print("🎖️ @streaks-agent Badge Check")
    print("=" * 40)
    
    # Current streak data (from memory)
    current_streaks = {
        "demo_user": {"current": 1, "best": 1},
        "vibe_champion": {"current": 1, "best": 1}
    }
    
    integration = StreaksBadgeIntegration()
    
    updates = []
    celebrations = []
    
    for handle, streak_data in current_streaks.items():
        print(f"\n📊 Checking {handle}:")
        print(f"   Current streak: {streak_data['current']} days")
        print(f"   Best streak: {streak_data['best']} days")
        
        # Check for new badges
        result = integration.check_new_badges(
            handle, 
            streak_data['current'], 
            streak_data['best']
        )
        
        if result['has_new_achievements']:
            print(f"   🎉 NEW BADGES: {result['new_badges']}")
            print(f"   📢 Message: {result['celebration_message']}")
            print(f"   📣 Public: {result['should_announce_publicly']}")
            
            updates.append({
                'handle': handle,
                'new_badges': result['new_badges'],
                'message': result['celebration_message'],
                'public': result['should_announce_publicly']
            })
            
        else:
            print("   ✅ No new badges (already awarded)")
        
        # Show progress to next
        progress = result['progress_to_next']
        if progress.get('next_badge'):
            next_badge = progress['next_badge']
            print(f"   🎯 Next: {next_badge['name']} in {next_badge['days_needed']} days")
        else:
            print("   🏆 All current badges earned!")
    
    # Summary
    print(f"\n📈 Summary:")
    print(f"   Users checked: {len(current_streaks)}")
    print(f"   Badge updates: {len(updates)}")
    
    if updates:
        print(f"\n🎊 Celebration Queue:")
        for update in updates:
            print(f"   DM {update['handle']}: {update['message'][:50]}...")
            if update['public']:
                print(f"   📢 PUBLIC ANNOUNCEMENT for {update['handle']}")
    
    # Show current leaderboard
    print(f"\n🏆 Current Badge Leaderboard:")
    leaderboard = integration.get_leaderboard()
    for i, user in enumerate(leaderboard[:5], 1):
        latest = user.get('latest_badge', {})
        latest_name = latest.get('name', 'None') if latest else 'None'
        print(f"   {i}. {user['handle']}: {user['badge_count']} badges (latest: {latest_name})")
    
    return updates

if __name__ == "__main__":
    main()