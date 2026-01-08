#!/usr/bin/env python3
"""
Test milestone celebrations with current user data
"""

from streaks_agent_milestone_integration import check_and_celebrate_milestones

def main():
    print("🎉 Testing Milestone Celebrations with Current Users")
    print("=" * 55)
    
    # Current users from streak memory
    current_users = [
        ('@demo_user', 1),
        ('@vibe_champion', 1)
    ]
    
    total_celebrations = 0
    
    for handle, streak in current_users:
        print(f"\n👤 Testing {handle} (current streak: {streak} days)")
        
        # Check current state
        result = check_and_celebrate_milestones(handle, streak)
        
        if result['new_celebrations'] > 0:
            total_celebrations += result['new_celebrations']
            print(f"   🎊 {result['new_celebrations']} new celebrations!")
            
            # Show DM actions
            for dm in result['dm_actions']:
                print(f"\n   📱 Would DM {dm['to']}:")
                print(f"      {dm['message'][:100]}...")
            
            # Show board actions  
            for board in result['board_actions']:
                print(f"\n   📢 Would announce: {board['message']}")
                
        else:
            print(f"   ❌ No celebrations yet (need 3+ days for first milestone)")
        
        # Show what's next
        if result['next_milestone']:
            next_ms = result['next_milestone']
            print(f"   🎯 Next goal: {next_ms['title']} {next_ms['emoji']} in {next_ms['days_remaining']} days")
    
    print(f"\n📊 Summary:")
    print(f"   • Users checked: {len(current_users)}")
    print(f"   • Total celebrations: {total_celebrations}")
    print(f"   • System ready: ✅")
    
    print(f"\n🎯 Next Steps for @streaks-agent:")
    print(f"   1. Import: from streaks_agent_milestone_integration import check_and_celebrate_milestones")
    print(f"   2. When updating streaks: result = check_and_celebrate_milestones(handle, streak)")
    print(f"   3. Send DMs: dm_user(dm['to'], dm['message']) for dm in result['dm_actions']")
    print(f"   4. Post boards: announce_ship(board['message']) for board in result['board_actions']")

if __name__ == "__main__":
    main()