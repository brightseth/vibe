#!/usr/bin/env python3
"""
Quick milestone check for streaks-agent workflow
"""
from streaks_milestone_auto_celebration import MilestoneCelebrator

def check_milestones_for_streaks_agent():
    """Check current users for milestone celebrations needed"""
    
    # Current streak data from agent memory
    current_streak_data = {
        '@demo_user': {'current': 1, 'best': 1},
        '@vibe_champion': {'current': 1, 'best': 1}
    }
    
    celebrator = MilestoneCelebrator()
    
    print("🎯 STREAKS AGENT MILESTONE CHECK")
    print("=" * 40)
    
    # Check for celebrations needed
    celebrations = celebrator.check_and_celebrate_milestones(current_streak_data)
    
    if celebrations:
        print(f"🎉 Found {len(celebrations)} milestones to celebrate!")
        
        # Return celebration instructions for streaks-agent
        celebration_actions = []
        
        for celebration in celebrations:
            handle = celebration['handle']
            
            # DM message
            dm_message = celebrator.format_celebration_dm(celebration)
            
            # Board announcement 
            board_message = celebrator.format_board_announcement(celebration)
            
            celebration_actions.append({
                'type': 'dm',
                'to': handle,
                'message': dm_message
            })
            
            # Only announce major milestones to board
            if celebration['milestone_days'] >= 7:
                celebration_actions.append({
                    'type': 'board',
                    'message': board_message
                })
            
            print(f"\n✅ PREPARED CELEBRATION for @{handle}")
            print(f"   Milestone: {celebration['milestone_days']} days")
            print(f"   Actions: {len([a for a in celebration_actions if a.get('to') == handle or a.get('type') == 'board'])} messages")
        
        return celebration_actions
        
    else:
        print("✨ No new milestones to celebrate right now.")
        print("   Users need to build bigger streaks to unlock celebrations!")
        return []

def main():
    actions = check_milestones_for_streaks_agent()
    
    print(f"\n📋 ACTIONS FOR STREAKS AGENT:")
    for i, action in enumerate(actions, 1):
        if action['type'] == 'dm':
            print(f"   {i}. Send DM to @{action['to']}")
        elif action['type'] == 'board':
            print(f"   {i}. Announce to board")
    
    return actions

if __name__ == "__main__":
    main()