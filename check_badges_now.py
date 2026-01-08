#!/usr/bin/env python3
import json

try:
    with open('badges.json', 'r') as f:
        data = json.load(f)
    
    print("🎖️ Badge Status Summary:")
    print("=" * 30)
    
    users = data.get('user_badges', {})
    for handle, user_data in users.items():
        badges = user_data.get('earned', [])
        points = user_data.get('total_points', 0)
        print(f"\n👤 {handle}")
        print(f"   🏅 Badges: {len(badges)}")
        print(f"   ⭐ Points: {points}")
        for badge in badges:
            print(f"   • {badge['badge_key']}: {badge.get('reason', 'N/A')}")
    
    # Check what new badges current users should get
    current_users = {"@demo_user": 1, "@vibe_champion": 1}  # current streaks
    
    print(f"\n🔍 Streak Analysis:")
    for handle, streak in current_users.items():
        print(f"{handle} (streak: {streak}) should have:")
        
        # Check first_day badge (1 day)
        if streak >= 1:
            print(f"  ✅ first_day (need 1 day)")
        
        # Check week_streak badge (7 days) 
        if streak >= 7:
            print(f"  ✅ week_streak (need 7 days)")
        else:
            print(f"  ⏳ week_streak (need 7 days, {7-streak} to go)")
            
        # Check month_streak badge (30 days)
        if streak >= 30:
            print(f"  ✅ month_streak (need 30 days)")
        else:
            print(f"  ⏳ month_streak (need 30 days, {30-streak} to go)")
    
    print(f"\n📊 System Status: ✅ Badges loaded successfully")
    
except FileNotFoundError:
    print("❌ badges.json not found!")
except Exception as e:
    print(f"❌ Error: {e}")