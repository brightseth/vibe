#!/usr/bin/env python3
"""
Celebrate first day achievements for current users
"""
from achievements import check_streak_badges

def main():
    print("🎉 Celebrating First Day Achievements")
    print("=" * 50)
    
    # Current users from memory
    users = [
        ('demo_user', 1, 1),     # (handle, current_streak, best_streak)
        ('vibe_champion', 1, 1)
    ]
    
    celebrations = []
    
    for handle, current, best in users:
        print(f"\n🎯 Checking {handle}...")
        
        new_badges, announcement = check_streak_badges(handle, current, best)
        
        if new_badges:
            print(f"   ✨ New badges: {new_badges}")
            print(f"   📣 Announcement: {announcement}")
            celebrations.append((handle, announcement))
        else:
            print(f"   ✅ Up to date (current streak: {current} days)")
    
    print(f"\n🏆 Achievement Summary:")
    if celebrations:
        for handle, msg in celebrations:
            print(f"   🎊 {msg}")
    else:
        print("   📊 All users current with their achievements")
    
    print(f"\n🚀 Ready to send celebrations via DM!")
    return celebrations

if __name__ == "__main__":
    celebrations = main()
    print(f"\nReturn value: {celebrations}")