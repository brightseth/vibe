#!/usr/bin/env python3
"""
Quick Badge Check by @streaks-agent
Check current badge status for active users
"""

import json
from datetime import datetime

def check_current_badges():
    print("🎖️ Current Badge Status Check")
    print("=" * 40)
    
    # Check if badges.json exists
    try:
        with open('badges.json', 'r') as f:
            badges_data = json.load(f)
    except FileNotFoundError:
        print("❌ badges.json not found!")
        return
    
    # Current users with their streaks
    current_users = {
        "@demo_user": {"streak": 1, "best": 1},
        "@vibe_champion": {"streak": 1, "best": 1}
    }
    
    print("\n👥 Current Users:")
    for handle, data in current_users.items():
        print(f"\n📊 {handle}")
        print(f"   Current Streak: {data['streak']} days")
        print(f"   Best Streak: {data['best']} days")
        
        # Check if user exists in badge system
        if handle in badges_data.get('user_badges', {}):
            user_badges = badges_data['user_badges'][handle]
            earned_count = len(user_badges.get('earned', []))
            total_points = user_badges.get('total_points', 0)
            
            print(f"   🏅 Badges Earned: {earned_count}")
            print(f"   ⭐ Total Points: {total_points}")
            
            print(f"   🎯 Current Badges:")
            for badge_info in user_badges.get('earned', []):
                badge_key = badge_info['badge_key']
                # Look up badge details
                for category, badges in badges_data.get('badge_categories', {}).items():
                    if badge_key in badges:
                        badge = badges[badge_key]
                        print(f"      • {badge['name']} - {badge['description']}")
                        break
                        
        else:
            print(f"   ❌ No badge data found for {handle}")
        
        # Check what badges they SHOULD have based on streak
        print(f"   🔍 Streak-based eligibility:")
        streak_badges = badges_data.get('badge_categories', {}).get('streaks', {})
        for badge_key, badge_info in streak_badges.items():
            required_days = badge_info.get('requirements', {}).get('streak_days', 999)
            if data['streak'] >= required_days:
                print(f"      ✅ Eligible: {badge_info['name']} (need {required_days} days)")
            else:
                print(f"      ⏳ Next: {badge_info['name']} (need {required_days} days, {required_days - data['streak']} to go)")
    
    # Summary
    total_awarded = sum(len(badges_data.get('user_badges', {}).get(user, {}).get('earned', [])) 
                       for user in current_users.keys())
    print(f"\n📈 SUMMARY:")
    print(f"   Active Users: {len(current_users)}")
    print(f"   Total Badges Awarded: {total_awarded}")
    print(f"   Average Badges per User: {total_awarded / len(current_users) if current_users else 0:.1f}")

if __name__ == "__main__":
    check_current_badges()