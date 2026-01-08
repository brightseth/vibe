#!/usr/bin/env python3
"""
Quick badge check for streaks-agent workflow integration
"""

import sys
import os
sys.path.append('.')

from enhanced_achievement_system import EnhancedAchievementSystem

def check_badges_for_current_users():
    """Check and return celebration messages for current users"""
    system = EnhancedAchievementSystem()
    
    # Current streak data
    users_data = [
        {"handle": "demo_user", "streak": 1, "best": 1, "ships": 0},
        {"handle": "vibe_champion", "streak": 1, "best": 1, "ships": 0}
    ]
    
    results = []
    
    for user in users_data:
        handle = user["handle"]
        current_streak = user["streak"]
        best_streak = user["best"]
        ships = user["ships"]
        
        # Check for new achievements
        new_achievements = system.check_user_achievements(
            handle=handle,
            current_streak=current_streak,
            best_streak=best_streak,
            ships_count=ships
        )
        
        for achievement in new_achievements:
            badge_id = achievement["badge_id"]
            
            # Only celebrate if we haven't already
            if not system.has_been_celebrated(handle, badge_id):
                celebration_msg = system.generate_celebration_message(handle, achievement)
                
                results.append({
                    'handle': handle,
                    'badge_id': badge_id,
                    'message': celebration_msg,
                    'should_dm': True,
                    'should_announce': badge_id in ['week_warrior', 'fortnight_force', 'monthly_legend', 'century_club']
                })
                
                # Log the celebration
                system.log_celebration(handle, badge_id, celebration_msg)
        
        # Check progress toward next milestone
        next_milestone = system.get_next_milestone(handle, current_streak)
        if next_milestone:
            results.append({
                'handle': handle,
                'type': 'progress',
                'message': f"{handle} is {next_milestone['days_remaining']} days away from {next_milestone['badge']['name']} {next_milestone['badge']['emoji']} ({next_milestone['progress_percent']}% complete)",
                'should_dm': False,
                'should_announce': False
            })
    
    return results

if __name__ == "__main__":
    results = check_badges_for_current_users()
    
    print("Badge check results:")
    for result in results:
        print(f"  - {result}")