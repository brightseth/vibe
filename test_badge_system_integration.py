#!/usr/bin/env python3
"""
Test Badge System Integration
Built by @streaks-agent
"""

from integrated_achievement_badges import streaks_agent_badge_check, IntegratedAchievementSystem

def test_current_users():
    print("🧪 Testing Achievement Badge System")
    print("=" * 40)
    
    # Current users from streak data
    users = [
        ("@demo_user", 1, 1, 0, 0, 0),  # handle, current_streak, best_streak, ships, games, dms
        ("@vibe_champion", 1, 1, 0, 0, 0)
    ]
    
    celebration_queue = []
    
    for handle, current_streak, best_streak, ships, games, dms in users:
        print(f"\n👤 Testing {handle}")
        print(f"   Current streak: {current_streak} days")
        
        result = streaks_agent_badge_check(handle, current_streak, best_streak, ships, games, dms)
        
        if result["has_new_achievements"]:
            print(f"   🎉 NEW BADGES: {len(result['new_badges'])}")
            print(f"   Message: {result['celebration_message']}")
            print(f"   Public: {result['should_announce_publicly']}")
            
            celebration_queue.append((handle, result))
            
            for badge in result["new_badges"]:
                print(f"      {badge['emoji']} {badge['name']}")
        else:
            print(f"   ✅ No new badges")
        
        # Show next milestone
        progress = result["user_progress"]
        if progress["next_milestone"]:
            milestone = progress["next_milestone"]
            badge = milestone["badge"]
            print(f"   🎯 Next: {badge['emoji']} {badge['name']} ({milestone['progress_percent']}%)")
    
    print(f"\n🎊 RESULTS SUMMARY:")
    print(f"   Users tested: {len(users)}")
    print(f"   New achievements: {sum(len(r['new_badges']) for _, r in celebration_queue)}")
    print(f"   Celebrations needed: {len(celebration_queue)}")
    
    return celebration_queue

def test_milestone_scenarios():
    print("\n🔮 Testing Milestone Scenarios")
    print("=" * 30)
    
    # Test various scenarios
    scenarios = [
        ("@test_week_warrior", 7, 7, 1, 0, 0),  # Week streak + first ship
        ("@test_game_master", 3, 3, 2, 1, 0),   # Game master
        ("@test_social_butterfly", 5, 5, 1, 0, 5)  # Community engagement
    ]
    
    for handle, current_streak, best_streak, ships, games, dms in scenarios:
        result = streaks_agent_badge_check(handle, current_streak, best_streak, ships, games, dms)
        
        print(f"\n🎭 {handle}:")
        if result["has_new_achievements"]:
            badges = [f"{b['emoji']} {b['name']}" for b in result["new_badges"]]
            print(f"   Would earn: {', '.join(badges)}")
        else:
            print(f"   No achievements")

def show_system_status():
    print("\n📊 System Status")
    print("=" * 20)
    
    system = IntegratedAchievementSystem()
    report = system.generate_status_report()
    print(report)

if __name__ == "__main__":
    # Test with current users
    celebrations = test_current_users()
    
    # Test milestone scenarios
    test_milestone_scenarios()
    
    # Show final status
    show_system_status()
    
    print("\n✅ Badge system integration test complete!")
    print("🎖️ Ready for @streaks-agent integration")