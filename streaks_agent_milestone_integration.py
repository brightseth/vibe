#!/usr/bin/env python3
"""
@streaks-agent Milestone Integration
Easy integration for checking and celebrating streak milestones

Usage:
from streaks_agent_milestone_integration import check_and_celebrate_milestones
result = check_and_celebrate_milestones('@demo_user', 7)
"""

import json
from datetime import datetime
from streak_milestone_celebrations import StreakMilestoneCelebrations

class StreaksAgentMilestoneIntegration:
    def __init__(self):
        self.celebration_system = StreakMilestoneCelebrations()
    
    def check_and_celebrate_milestones(self, handle, current_streak):
        """
        Check for milestone celebrations and return action items for streaks agent
        
        Returns:
        {
            'new_celebrations': [...],
            'dm_actions': [...],
            'board_actions': [...], 
            'next_milestone': {...}
        }
        """
        # Clean handle (remove @ if present)
        clean_handle = handle.replace('@', '')
        
        # Check for new celebrations
        new_celebrations = self.celebration_system.check_for_celebrations(clean_handle, current_streak)
        
        result = {
            'new_celebrations': len(new_celebrations),
            'dm_actions': [],
            'board_actions': [],
            'next_milestone': None,
            'celebration_details': []
        }
        
        # Process each new celebration
        for celebration in new_celebrations:
            milestone_days = celebration['milestone']
            milestone_info = celebration['info']
            
            # Create DM message
            dm_message = self.celebration_system.create_celebration_message(clean_handle, celebration)
            result['dm_actions'].append({
                'to': clean_handle,
                'message': dm_message,
                'milestone': f"{milestone_days}_days"
            })
            
            # Create board announcement for major milestones
            board_msg = self.celebration_system.create_board_announcement(clean_handle, celebration)
            if board_msg:
                result['board_actions'].append({
                    'message': board_msg,
                    'milestone': f"{milestone_days}_days"
                })
            
            # Store details for logging
            result['celebration_details'].append({
                'milestone_days': milestone_days,
                'title': milestone_info['title'],
                'emoji': milestone_info['emoji'],
                'tier': milestone_info['tier']
            })
        
        # Get next milestone info
        next_milestone = self.celebration_system.get_next_milestone(current_streak)
        if next_milestone:
            result['next_milestone'] = {
                'days': next_milestone['days'],
                'title': next_milestone['info']['title'],
                'emoji': next_milestone['info']['emoji'],
                'days_remaining': next_milestone['days_remaining']
            }
        
        # Save any new celebrations
        if new_celebrations:
            self.celebration_system.save_celebrations()
        
        return result
    
    def get_all_user_milestones(self, handle):
        """Get all milestone progress for a user"""
        clean_handle = handle.replace('@', '')
        return self.celebration_system.get_user_milestone_progress(clean_handle)

# Convenience function for easy import
def check_and_celebrate_milestones(handle, current_streak):
    """Quick function for streaks agent to check milestones"""
    integration = StreaksAgentMilestoneIntegration()
    return integration.check_and_celebrate_milestones(handle, current_streak)

def main():
    """Test the integration"""
    print("🎯 @streaks-agent Milestone Integration Test")
    print("=" * 50)
    
    integration = StreaksAgentMilestoneIntegration()
    
    # Test scenarios
    test_cases = [
        ('@demo_user', 1),     # Should be no milestones
        ('@demo_user', 3),     # Should trigger "Getting Started"
        ('@demo_user', 7),     # Should trigger "One Week Strong"
        ('@vibe_champion', 14), # Should trigger "Two Week Warrior"
        ('@vibe_champion', 30), # Should trigger "Monthly Legend"
    ]
    
    for handle, streak in test_cases:
        print(f"\n👤 Testing {handle} with {streak} day streak:")
        
        result = integration.check_and_celebrate_milestones(handle, streak)
        
        print(f"   🎉 New celebrations: {result['new_celebrations']}")
        
        if result['dm_actions']:
            print(f"   📱 DM actions: {len(result['dm_actions'])}")
            for dm in result['dm_actions']:
                print(f"      → DM {dm['to']}: {dm['milestone']}")
        
        if result['board_actions']: 
            print(f"   📢 Board actions: {len(result['board_actions'])}")
            for board in result['board_actions']:
                print(f"      → Announce: {board['message']}")
        
        if result['next_milestone']:
            next_ms = result['next_milestone']
            print(f"   🎯 Next milestone: {next_ms['days']} days ({next_ms['days_remaining']} to go)")
        
        for detail in result['celebration_details']:
            print(f"   ✨ Celebrated: {detail['milestone_days']} days - {detail['title']} {detail['emoji']}")

if __name__ == "__main__":
    main()