#!/usr/bin/env python3
"""
Check current achievements for all active users
Used by @streaks-agent to see if anyone has earned new badges
"""

from streak_achievements_integration import streaks_agent_badge_check
import json

def check_all_users():
    # Load current streak data
    try:
        with open('streak_data.json', 'r') as f:
            streak_data = json.load(f)
    except FileNotFoundError:
        print("No streak data found")
        return {}

    results = {}
    
    for handle, data in streak_data.items():
        if handle.startswith('@'):
            handle = handle[1:]  # Remove @ prefix
        
        current_streak = data.get('current', 0)
        best_streak = data.get('best', 0)
        
        # Check badges for this user
        result = streaks_agent_badge_check(handle, current_streak, best_streak)
        
        if result['has_new_achievements'] or current_streak > 0:
            results[handle] = result
    
    return results

if __name__ == "__main__":
    results = check_all_users()
    
    print("🏆 ACHIEVEMENT STATUS REPORT")
    print("=" * 40)
    
    for handle, result in results.items():
        print(f"\n{handle}:")
        
        if result['has_new_achievements']:
            print(f"  🎉 NEW: {result['celebration_message']}")
            if result['should_announce_publicly']:
                print(f"  📢 PUBLIC WORTHY!")
        
        print(f"  📊 {result['badge_summary']}")
        print(f"  📈 {result['progress_message']}")
        
        if result['next_milestone']:
            milestone = result['next_milestone']
            print(f"  🎯 Next: {milestone['badge_name']} in {milestone['days_needed']} days")
    
    if not results:
        print("No active users to check")