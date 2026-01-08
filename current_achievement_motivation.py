#!/usr/bin/env python3
"""
Current Achievement Motivation Check
Quick motivation check for tracked users
"""

import json
from datetime import datetime

def main():
    print("🌟 CURRENT STREAK MOTIVATION CHECK")
    print("=" * 45)
    
    # Load data
    try:
        with open('streak_data.json', 'r') as f:
            streak_data = json.load(f)
    except FileNotFoundError:
        print("No streak data found")
        return
    
    try:
        with open('badges.json', 'r') as f:
            badges_data = json.load(f)
    except FileNotFoundError:
        badges_data = {"user_badges": {}}
    
    print(f"👥 Users tracked: {len(streak_data)}")
    print()
    
    for handle, user_data in streak_data.items():
        current_streak = user_data.get('current', 0)
        best_streak = user_data.get('best', 0)
        ships = user_data.get('ships', 0)
        
        # Get badge count
        user_badges = badges_data.get('user_badges', {}).get(handle, {}).get('earned', [])
        badge_count = len(user_badges)
        
        print(f"🎯 {handle}")
        print(f"   Current streak: {current_streak} days")
        print(f"   Best streak: {best_streak} days")
        print(f"   Ships: {ships}")
        print(f"   Badges earned: {badge_count}")
        
        # Next milestone motivation
        if current_streak == 1:
            print(f"   🌱 Just getting started! 2 more days to Three Day Thunder!")
        elif current_streak == 2:
            print(f"   ⚡ Almost there! 1 more day for Three Day Thunder!")
        elif current_streak < 7:
            days_to_week = 7 - current_streak
            print(f"   🔥 {days_to_week} more days to Week Warrior status!")
        elif current_streak < 30:
            days_to_month = 30 - current_streak
            print(f"   👑 {days_to_month} more days to Monthly Legend!")
        elif current_streak < 100:
            days_to_century = 100 - current_streak
            print(f"   💎 {days_to_century} more days to Century Club!")
        else:
            print(f"   🏆 LEGENDARY STATUS ACHIEVED!")
        
        # Badge display
        if user_badges:
            latest_badges = user_badges[-2:] if len(user_badges) > 1 else user_badges
            badge_names = []
            for badge in latest_badges:
                badge_key = badge['badge_key']
                if badge_key == 'first_day':
                    badge_names.append('🌱')
                elif badge_key == 'early_adopter':
                    badge_names.append('🌱')
                elif badge_key == 'first_ship':
                    badge_names.append('🚢')
                elif badge_key == 'week_streak':
                    badge_names.append('🔥')
                elif badge_key == 'month_streak':
                    badge_names.append('👑')
                else:
                    badge_names.append('🏅')
            
            print(f"   Recent badges: {' '.join(badge_names)}")
        
        print()
    
    print("🎖️ System Status: ✅ Active and tracking!")
    print("Next milestone celebrations ready for:")
    print("• Three Day Thunder at 3 days ⚡")
    print("• Week Warrior at 7 days 🔥")
    print("• Monthly Legend at 30 days 👑")

if __name__ == "__main__":
    main()