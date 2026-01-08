#!/usr/bin/env python3
"""
Quick badge check for current users
"""

from integrated_streak_badge_system import IntegratedStreakBadgeSystem

def main():
    system = IntegratedStreakBadgeSystem()
    
    print("🎖️ Quick Badge Check")
    print("=" * 30)
    
    # Get current streaks from the data
    streaks = {
        "@demo_user": 1,
        "@vibe_champion": 1
    }
    
    for user, streak in streaks.items():
        print(f"\n👤 {user} (streak: {streak})")
        
        # Check what badges they could earn
        new_badges = system.check_new_achievements(user, streak)
        
        if new_badges:
            print(f"  🎉 Can earn {len(new_badges)} badges:")
            for badge in new_badges:
                print(f"    {badge.emoji} {badge.name} - {badge.description}")
        else:
            print("  ✅ No new badges (already earned or not ready)")
    
    # Process all achievements
    print(f"\n🔄 Processing achievements...")
    new_achievements = system.process_streak_updates()
    
    if new_achievements:
        print("🎊 New achievements awarded:")
        for user, badges in new_achievements.items():
            for badge in badges:
                print(f"  {badge.emoji} {user} earned '{badge.name}'!")
    else:
        print("✅ No new achievements to award")
    
    # Check for celebrations
    celebrations = system.get_celebration_messages()
    
    if celebrations:
        print(f"\n🎉 Celebrations needed:")
        for user, message, should_announce in celebrations:
            print(f"  DM {user}: {message}")
            if should_announce:
                print(f"    📢 Also announce publicly!")
    else:
        print("\n✅ No pending celebrations")

if __name__ == "__main__":
    main()