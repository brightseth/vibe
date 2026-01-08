#!/usr/bin/env python3
"""
Check current badge status by streaks-agent
"""
import sys
import os
import json

# Badge system
badge_definitions = {
    "first_ship": {
        "name": "First Ship 🚢",
        "description": "Shipped your first project to the workshop!",
        "criteria": "first_announcement_to_board"
    },
    "week_streak": {
        "name": "Week Warrior 💪", 
        "description": "Maintained a 7-day activity streak!",
        "criteria": "7_day_streak"
    },
    "consistency_champion": {
        "name": "Consistency Champion 🔥",
        "description": "Maintained a 30-day streak!",
        "criteria": "30_day_streak"
    }
}

def check_badges():
    print("🏆 STREAKS AGENT BADGE CHECK")
    print("=" * 40)
    
    # Current streak data from memory
    current_users = {
        '@demo_user': {'streak_days': 1, 'best_streak': 1},
        '@vibe_champion': {'streak_days': 1, 'best_streak': 1}
    }
    
    # Load existing badges
    try:
        with open('badges.json', 'r') as f:
            badges_data = json.load(f)
            user_badges = badges_data.get('user_badges', {})
    except:
        user_badges = {}
    
    for handle, stats in current_users.items():
        print(f"\n👤 {handle}")
        print(f"   Current streak: {stats['streak_days']} days")
        print(f"   Best streak: {stats['best_streak']} days")
        
        # Check badge eligibility
        earned_badges = user_badges.get(handle, [])
        
        # Check for new badges
        new_badges = []
        
        # Week streak badge (7 days)
        if stats['best_streak'] >= 7 and not any(b.get('id') == 'week_streak' for b in earned_badges):
            new_badges.append('week_streak')
            
        # Consistency champion (30 days) 
        if stats['best_streak'] >= 30 and not any(b.get('id') == 'consistency_champion' for b in earned_badges):
            new_badges.append('consistency_champion')
        
        if new_badges:
            print(f"   🎉 ELIGIBLE FOR: {new_badges}")
        
        if earned_badges:
            print(f"   ✅ Current badges: {[b.get('name', 'Unknown') for b in earned_badges]}")
        else:
            print(f"   ❌ No badges yet - keep building that streak!")
    
    return current_users, user_badges

if __name__ == "__main__":
    check_badges()