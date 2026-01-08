#!/usr/bin/env python3
"""
Integration script for @streaks-agent to automatically handle milestone celebrations
This can be called during the agent's workflow to check for and trigger celebrations.
"""

import json
from streak_milestone_celebration_system import StreakMilestoneCelebrator

def check_and_celebrate_milestones(streak_data):
    """
    Main function for @streaks-agent to check milestones and get celebration actions
    
    Args:
        streak_data: Dictionary in format {"@user": "X days (best: Y)", ...}
    
    Returns:
        Dictionary with celebration actions needed
    """
    celebrator = StreakMilestoneCelebrator()
    celebrations = celebrator.check_milestones(streak_data)
    
    result = {
        "celebrations_needed": len(celebrations),
        "actions": [],
        "board_post": None,
        "summary": ""
    }
    
    if celebrations:
        # Generate DM actions for each user
        for cel in celebrations:
            message = celebrator.generate_celebration_message(cel)
            result["actions"].append({
                "type": "dm_user", 
                "user": cel["user"],
                "message": message,
                "milestone": cel["milestone"]
            })
            
            # Record that we're celebrating this
            celebrator.record_celebration(cel["user"], cel["milestone"])
        
        # Generate board post
        result["board_post"] = celebrator.create_motivation_board_post(celebrations)
        
        # Summary
        users = [cel["user"] for cel in celebrations]
        milestones = [cel["milestone"] for cel in celebrations]
        result["summary"] = f"Celebrated milestones for {len(users)} users: {', '.join(users)} (days: {', '.join(map(str, milestones))})"
    else:
        result["summary"] = "No new milestones to celebrate"
    
    return result

def get_motivation_insights(streak_data):
    """
    Get insights about upcoming milestones and motivation opportunities
    """
    celebrator = StreakMilestoneCelebrator()
    insights = {
        "next_milestones": [],
        "encouragement_opportunities": []
    }
    
    for user, streak_str in streak_data.items():
        if isinstance(streak_str, str) and "days" in streak_str:
            current = int(streak_str.split(" days")[0])
            next_milestone = celebrator.get_next_milestone(current)
            
            if next_milestone:
                insights["next_milestones"].append({
                    "user": user,
                    "current_streak": current,
                    "next_milestone": next_milestone
                })
                
                # Suggest encouragement if close to milestone
                if next_milestone["days_to_milestone"] <= 2:
                    insights["encouragement_opportunities"].append({
                        "user": user,
                        "message": f"Only {next_milestone['days_to_milestone']} days until {next_milestone['title']}! Keep it up! {next_milestone['emoji']}"
                    })
    
    return insights

# Example integration workflow for @streaks-agent
def streaks_agent_workflow_example():
    """
    Example of how @streaks-agent could integrate this into their workflow
    """
    print("🤖 @streaks-agent Workflow Example")
    print("=" * 40)
    
    # This would come from agent's get_streaks() function
    current_streaks = {
        "@demo_user": "1 days (best: 1)",
        "@vibe_champion": "1 days (best: 1)"
    }
    
    print("1. Check for milestone celebrations...")
    celebration_result = check_and_celebrate_milestones(current_streaks)
    
    if celebration_result["celebrations_needed"] > 0:
        print(f"   🎉 {celebration_result['celebrations_needed']} celebrations needed!")
        
        # Agent would call these actions:
        for action in celebration_result["actions"]:
            if action["type"] == "dm_user":
                print(f"   📨 DM {action['user']}: {action['milestone']} day milestone!")
                # Agent would call: dm_user(action["user"], action["message"])
        
        if celebration_result["board_post"]:
            print(f"   📢 Board post: {celebration_result['board_post']}")
            # Agent would call: announce_ship(celebration_result["board_post"])
    else:
        print("   ✅ No new celebrations needed")
    
    print("\n2. Check motivation insights...")
    insights = get_motivation_insights(current_streaks)
    
    if insights["next_milestones"]:
        print("   📈 Upcoming milestones:")
        for milestone in insights["next_milestones"]:
            print(f"      {milestone['user']}: {milestone['next_milestone']['days_to_milestone']} days to {milestone['next_milestone']['title']}")
    
    if insights["encouragement_opportunities"]:
        print("   💪 Encouragement opportunities:")
        for opp in insights["encouragement_opportunities"]:
            print(f"      {opp['user']}: {opp['message']}")
    
    print(f"\n3. Summary: {celebration_result['summary']}")

if __name__ == "__main__":
    streaks_agent_workflow_example()