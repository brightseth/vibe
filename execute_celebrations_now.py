#!/usr/bin/env python3
"""
Execute Celebrations Right Now
@streaks-agent workflow execution
"""

from streaks_agent_integrated_celebration_system import StreaksAgentCelebrationSystem

def execute_current_celebrations():
    """Execute celebrations based on current streak data"""
    
    # Current streaks from agent
    current_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    print("🎊 EXECUTING CELEBRATIONS FOR CURRENT STREAKS")
    print("=" * 50)
    
    # Initialize system
    system = StreaksAgentCelebrationSystem()
    
    # Check celebrations needed
    celebrations = system.check_celebrations_needed(current_streaks)
    
    print(f"🎉 Found {len(celebrations)} celebrations to execute")
    
    celebration_summary = []
    
    for celebration in celebrations:
        handle = celebration["handle"]
        achievement = celebration["achievement"]
        message = celebration["message"]
        
        print(f"\n🎯 {handle} - {achievement['name']} {achievement['emoji']}")
        print(f"   Message: {message}")
        
        if celebration["dm_needed"]:
            print(f"   💌 DM to send: {message}")
            celebration_summary.append(f"DM {handle}: {achievement['name']}")
        
        if celebration["announce_needed"]:
            board_msg = f"{achievement['emoji']} {handle} achieved {achievement['name']}!"
            print(f"   📢 Board: {board_msg}")
            celebration_summary.append(f"Announced {handle}: {achievement['name']}")
    
    # Next milestones
    next_milestones = system.get_next_milestones(current_streaks)
    print(f"\n🎯 NEXT MILESTONES:")
    for handle, milestone in next_milestones.items():
        achievement = milestone["achievement"]
        days = milestone["days_remaining"]
        print(f"   {handle}: {achievement['name']} in {days} days")
    
    # Summary
    summary = system.get_celebration_summary(celebrations)
    insights = system.get_engagement_insights(current_streaks)
    
    print(f"\n📋 SUMMARY:")
    print(summary)
    print(f"\n{insights}")
    
    return {
        "celebrations": celebrations,
        "summary": summary,
        "celebration_actions": celebration_summary
    }

if __name__ == "__main__":
    result = execute_current_celebrations()
    
    print(f"\n✅ CELEBRATION EXECUTION READY")
    print(f"Actions: {result['celebration_actions']}")