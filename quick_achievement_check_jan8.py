#!/usr/bin/env python3
"""
Quick achievement check for current users
"""

import json
from datetime import datetime

def load_json(filename):
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def save_json(filename, data):
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

def check_streak_achievements():
    # Current streak data
    streaks = {
        '@demo_user': {'current': 1, 'best': 1},
        '@vibe_champion': {'current': 1, 'best': 1}
    }
    
    # Load existing achievements
    achievements = load_json('achievements.json')
    
    # Define achievement criteria
    streak_achievements = {
        'first_day': 1,
        'early_bird': 3,
        'week_warrior': 7,
        'consistency_king': 14,
        'month_streak': 30,
        'century_club': 100
    }
    
    new_achievements = []
    
    for handle, data in streaks.items():
        clean_handle = handle.replace('@', '')
        current_achievements = achievements.get('user_achievements', {}).get(clean_handle, [])
        current_ids = [a['id'] for a in current_achievements]
        
        # Check each achievement
        for achievement_id, required_days in streak_achievements.items():
            if achievement_id not in current_ids and data['current'] >= required_days:
                new_achievements.append({
                    'handle': clean_handle,
                    'achievement_id': achievement_id,
                    'required_days': required_days,
                    'current_streak': data['current']
                })
    
    return new_achievements

if __name__ == '__main__':
    print("🏆 Checking achievements for current users...")
    print()
    
    new_achievements = check_streak_achievements()
    
    if new_achievements:
        print("✨ New achievements found:")
        for achievement in new_achievements:
            print(f"  - {achievement['handle']}: {achievement['achievement_id']} ({achievement['current_streak']} days)")
    else:
        print("📋 No new achievements at this time.")
        print("   Both users are at 1-day streaks and already have their First Day badge.")
    
    print()
    print("📊 Current Status:")
    print("  @demo_user: 1 days (has: First Day)")
    print("  @vibe_champion: 1 days (has: First Day)")
    print()
    print("🎯 Next Milestones:")
    print("  - Early Bird (3 days)")
    print("  - Week Warrior (7 days)")