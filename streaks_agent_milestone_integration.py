#!/usr/bin/env python3
"""
🎯 @streaks-agent Milestone Integration
Connects the streak milestone celebration system with agent functions

This script bridges the auto-celebration system with the actual
agent functions like dm_user() and announce_ship()
"""

import json
from streak_milestone_auto_celebration import StreakMilestoneCelebrator
from typing import List, Dict

class StreaksAgentMilestoneIntegration:
    def __init__(self):
        self.celebrator = StreakMilestoneCelebrator()
    
    def check_and_execute_celebrations(self) -> Dict:
        """
        Check for milestone celebrations and return action plan for @streaks-agent
        Returns dict with actions to take via agent functions
        """
        actions = self.celebrator.generate_celebration_actions()
        summary = self.celebrator.get_celebration_summary()
        
        result = {
            "celebrations_needed": len(actions) > 0,
            "action_count": len(actions),
            "actions": [],
            "summary": summary,
            "milestone_progress": {}
        }
        
        # Convert celebration actions to agent function calls
        for action in actions:
            if action["type"] == "dm":
                result["actions"].append({
                    "function": "dm_user",
                    "params": {
                        "to": action["handle"],
                        "message": action["message"]
                    },
                    "description": f"DM @{action['handle']} for {action['title']}"
                })
            
            elif action["type"] == "board_announce":
                result["actions"].append({
                    "function": "announce_ship", 
                    "params": {
                        "what": action["message"]
                    },
                    "description": f"Announce {action['handle']}'s {action['title']} to board"
                })
        
        # Add milestone progress info
        for handle, milestones in summary.get("users_approaching_milestones", {}).items():
            if milestones:
                next_milestone = milestones[0]
                result["milestone_progress"][handle] = {
                    "next_milestone": next_milestone["name"],
                    "days_remaining": next_milestone["days_remaining"],
                    "current_streak": self._get_current_streak(handle)
                }
        
        return result
    
    def _get_current_streak(self, handle: str) -> int:
        """Get current streak for a user"""
        streaks = self.celebrator.load_current_streaks()
        return streaks.get(handle, {}).get("current", 0)
    
    def get_celebration_report(self) -> str:
        """Generate a human-readable report of celebration status"""
        integration_result = self.check_and_execute_celebrations()
        
        if not integration_result["celebrations_needed"]:
            # No celebrations, but show progress
            progress = integration_result["milestone_progress"]
            if progress:
                report = "📊 **Milestone Progress Report**\n\n"
                for handle, info in progress.items():
                    report += f"🎯 **@{handle}**: {info['days_remaining']} days to {info['next_milestone']} (currently {info['current_streak']} days)\n"
                return report
            else:
                return "✅ No celebrations needed, all users up to date with milestones"
        
        # Has celebrations
        report = f"🎉 **{integration_result['action_count']} Milestone Celebrations Ready!**\n\n"
        
        for action in integration_result["actions"]:
            if action["function"] == "dm_user":
                report += f"📩 DM to @{action['params']['to']}: {action['description']}\n"
            elif action["function"] == "announce_ship":
                report += f"📢 Board announcement: {action['description']}\n"
        
        # Add progress for users not celebrating  
        progress = integration_result["milestone_progress"]
        if progress:
            report += "\n📊 **Other User Progress:**\n"
            for handle, info in progress.items():
                report += f"🎯 @{handle}: {info['days_remaining']} days to {info['next_milestone']}\n"
        
        return report

def main():
    """Test the integration system"""
    integration = StreaksAgentMilestoneIntegration()
    
    print("🎯 @streaks-agent Milestone Integration Test")
    print("=" * 50)
    
    result = integration.check_and_execute_celebrations()
    
    if result["celebrations_needed"]:
        print(f"🎉 {result['action_count']} celebrations ready!")
        
        for i, action in enumerate(result["actions"], 1):
            print(f"\n{i}. Function: {action['function']}")
            print(f"   Description: {action['description']}")
            print(f"   Params: {action['params']}")
    else:
        print("✅ No celebrations needed")
    
    print(f"\n📊 Users tracked: {result['summary']['total_users']}")
    print(f"🎉 Total celebrations sent: {result['summary']['total_celebrations']}")
    
    if result["milestone_progress"]:
        print(f"\n🎯 Upcoming milestones:")
        for handle, info in result["milestone_progress"].items():
            print(f"   @{handle}: {info['days_remaining']} days to {info['next_milestone']}")
    
    # Show human-readable report
    print("\n" + "=" * 50)
    print("📋 AGENT REPORT:")
    print(integration.get_celebration_report())
    
    return result

if __name__ == "__main__":
    result = main()