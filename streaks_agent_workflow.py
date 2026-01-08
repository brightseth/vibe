#!/usr/bin/env python3
"""
@streaks-agent Workflow Integration
Uses agent tools to check streaks, celebrate milestones, and track engagement

This integrates with the celebration system to provide real gamification
"""

from streaks_agent_integrated_celebration_system import StreaksAgentCelebrationSystem

def process_current_streaks():
    """Process current streaks from agent memory and handle celebrations"""
    
    # Current streak data from get_streaks tool output
    current_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    print("🎖️ @STREAKS-AGENT WORKFLOW")
    print("=" * 40)
    print("📊 Current Streaks:")
    for handle, data in current_streaks.items():
        print(f"  {handle}: {data['current']} days (best: {data['best']})")
    
    # Initialize celebration system
    celebration_system = StreaksAgentCelebrationSystem()
    
    # Check for celebrations needed
    celebrations_needed = celebration_system.check_celebrations_needed(current_streaks)
    
    print(f"\n🎊 Celebrations to Process: {len(celebrations_needed)}")
    
    # Process celebrations
    celebration_actions = []
    
    for celebration in celebrations_needed:
        handle = celebration["handle"]
        achievement = celebration["achievement"]
        message = celebration["message"]
        
        print(f"\n🎉 {handle} - {achievement['name']} {achievement['emoji']}")
        print(f"   Message: {message}")
        
        # Create action plan for agent tools
        if celebration["dm_needed"]:
            celebration_actions.append({
                "type": "dm",
                "handle": handle,
                "message": message,
                "achievement": achievement["name"]
            })
            print(f"   ✅ DM queued")
        
        if celebration["announce_needed"]:
            board_message = f"{achievement['emoji']} {handle} achieved {achievement['name']}! {achievement['description']}"
            celebration_actions.append({
                "type": "announce",
                "message": board_message,
                "achievement": achievement["name"]
            })
            print(f"   📢 Board announcement queued")
    
    # Generate next milestone insights
    next_milestones = celebration_system.get_next_milestones(current_streaks)
    
    print(f"\n🎯 NEXT MILESTONES:")
    for handle, milestone in next_milestones.items():
        achievement = milestone["achievement"]
        days = milestone["days_remaining"]
        progress = milestone["progress_percent"]
        print(f"  {handle}: {achievement['name']} in {days} days ({progress}%)")
    
    # Generate engagement insights
    insights = celebration_system.get_engagement_insights(current_streaks)
    print(f"\n{insights}")
    
    # Create summary for done() call
    summary_parts = []
    
    if celebrations_needed:
        dm_count = len([c for c in celebration_actions if c["type"] == "dm"])
        announce_count = len([c for c in celebration_actions if c["type"] == "announce"])
        summary_parts.append(f"🎊 Processed {len(celebrations_needed)} milestone celebrations")
        if dm_count > 0:
            summary_parts.append(f"💌 Sent {dm_count} celebration DMs")
        if announce_count > 0:
            summary_parts.append(f"📢 Made {announce_count} board announcements")
    else:
        summary_parts.append("📊 Tracked streaks, no new milestones")
    
    summary_parts.append(f"🎯 Next milestones: {len(next_milestones)} users progressing")
    
    workflow_summary = {
        "celebration_actions": celebration_actions,
        "next_milestones": next_milestones,
        "summary": " | ".join(summary_parts),
        "insights": insights
    }
    
    return workflow_summary

def generate_agent_tool_calls(workflow_result):
    """Generate the actual tool calls for the agent"""
    tool_calls = []
    
    # Add DM tool calls
    for action in workflow_result["celebration_actions"]:
        if action["type"] == "dm":
            tool_calls.append({
                "tool": "dm_user",
                "params": {
                    "to": action["handle"],
                    "message": action["message"]
                }
            })
        elif action["type"] == "announce":
            tool_calls.append({
                "tool": "announce_ship", 
                "params": {
                    "what": action["message"]
                }
            })
    
    # Add final done call
    tool_calls.append({
        "tool": "done",
        "params": {
            "summary": workflow_result["summary"]
        }
    })
    
    return tool_calls

if __name__ == "__main__":
    # Run workflow  
    result = process_current_streaks()
    
    print(f"\n📋 WORKFLOW COMPLETE")
    print(f"Summary: {result['summary']}")
    
    # Show tool calls that would be made
    tool_calls = generate_agent_tool_calls(result)
    print(f"\n🔧 AGENT TOOL CALLS:")
    for i, call in enumerate(tool_calls, 1):
        print(f"  {i}. {call['tool']}({call['params']})")