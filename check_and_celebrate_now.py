#!/usr/bin/env python3
"""
Check for achievements and send celebrations
Run by @streaks-agent to handle milestone celebrations
"""

import json
from datetime import datetime, timezone

def load_json(filepath, default=None):
    """Load JSON with fallback"""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default if default is not None else {}

def save_json(filepath, data):
    """Save JSON with pretty formatting"""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

def get_celebration_message(badge_id, badge_name):
    """Get celebration message for a badge"""
    messages = {
        'first_day': "Welcome to the streak journey! 🌱 You've taken the first step toward building consistent habits. Every great journey starts with day one!",
        'early_bird': "Three days strong! 🌅 You're building real momentum. Consistency is becoming a habit. Keep it up!",
        'week_streak': "A FULL WEEK! 💪 This is huge - you've proven you can maintain consistency. You're in the top tier of committed workshop members!",
        'consistency_king': "TWO WEEKS! 🔥 You're not just consistent, you're LEGENDARY. This level of dedication is rare and inspiring!",
        'month_streak': "THIRTY DAYS! 🏆 You've achieved monthly legend status! This is incredible dedication that deserves celebration!",
        'century_club': "ONE HUNDRED DAYS! 👑 You are workshop ROYALTY! This achievement puts you in the hall of fame!"
    }
    
    return messages.get(badge_id, f"Congratulations on earning {badge_name}! Your dedication is inspiring! 🎉")

def main():
    """Check for new achievements and create celebration plan"""
    
    # Load streak data to see who should have badges
    streak_data = load_json('streak_data.json', {})
    achievements = load_json('achievements.json', {
        'user_achievements': {},
        'achievement_history': []
    })
    
    print("🎊 CHECKING FOR CELEBRATIONS NEEDED")
    print("=" * 40)
    
    streaks = streak_data.get('streaks', {})
    celebrations_needed = []
    
    for user, user_data in streaks.items():
        current_streak = user_data['current']
        
        # Get already earned badges
        user_achievements = achievements.get('user_achievements', {}).get(user, [])
        earned_badge_ids = [badge.get('id', '') for badge in user_achievements]
        
        print(f"\n👤 {user} (streak: {current_streak} days)")
        print(f"   Earned badges: {len(earned_badge_ids)}")
        
        # Check what should be celebrated
        should_have_badges = []
        
        if current_streak >= 1:
            should_have_badges.append('first_day')
        if current_streak >= 3:
            should_have_badges.append('early_bird')
        if current_streak >= 7:
            should_have_badges.append('week_streak')
        if current_streak >= 14:
            should_have_badges.append('consistency_king')
        if current_streak >= 30:
            should_have_badges.append('month_streak')
        if current_streak >= 100:
            should_have_badges.append('century_club')
        
        # Find badges that should exist but aren't celebrated
        for badge_id in should_have_badges:
            if badge_id in earned_badge_ids:
                print(f"   ✅ {badge_id} - already has badge")
            else:
                badge_names = {
                    'first_day': '🌱 First Day',
                    'early_bird': '🌅 Early Bird', 
                    'week_streak': '💪 Week Warrior',
                    'consistency_king': '🔥 Consistency King',
                    'month_streak': '🏆 Monthly Legend',
                    'century_club': '👑 Century Club'
                }
                
                badge_name = badge_names.get(badge_id, badge_id)
                celebration_msg = get_celebration_message(badge_id, badge_name)
                
                celebrations_needed.append({
                    'user': user,
                    'badge_id': badge_id,
                    'badge_name': badge_name,
                    'message': celebration_msg,
                    'should_announce': badge_id in ['week_streak', 'consistency_king', 'month_streak', 'century_club']
                })
                
                print(f"   🎉 NEEDS CELEBRATION: {badge_name}")
    
    print(f"\n📋 CELEBRATION SUMMARY")
    print(f"   Total celebrations needed: {len(celebrations_needed)}")
    
    if celebrations_needed:
        print(f"\n🎊 CELEBRATION PLAN:")
        for celebration in celebrations_needed:
            print(f"\n   📨 DM {celebration['user']}:")
            print(f"       {celebration['message']}")
            
            if celebration['should_announce']:
                print(f"   📢 BOARD ANNOUNCEMENT:")
                print(f"       🎉 {celebration['user']} achieved {celebration['badge_name']}! Incredible dedication! 🎉")
    
    return celebrations_needed

if __name__ == "__main__":
    main()