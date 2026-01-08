#!/usr/bin/env python3
"""
🧪 Test Current Badge System
Quick test to verify badge system is working with current users
"""

from streaks_agent_badge_integration import StreaksBadgeIntegration, check_badges_for_streak_update

def test_current_system():
    """Test the badge system with current users"""
    print("🧪 Testing Current Badge System")
    print("=" * 40)
    
    integration = StreaksBadgeIntegration()
    
    # Test current users (both have 1-day streaks according to the data)
    test_users = [
        {"handle": "demo_user", "current_streak": 1, "best_streak": 1},
        {"handle": "vibe_champion", "current_streak": 1, "best_streak": 1}
    ]
    
    for user in test_users:
        print(f"\n👤 Testing {user['handle']}:")
        print(f"   Current streak: {user['current_streak']} days")
        print(f"   Best streak: {user['best_streak']} days")
        
        # Check for new badges
        result = integration.check_new_badges(
            user['handle'], 
            user['current_streak'], 
            user['best_streak']
        )
        
        print(f"   Has new achievements: {result['has_new_achievements']}")
        if result['celebration_message']:
            print(f"   Celebration: {result['celebration_message']}")
        print(f"   Public announcement: {result['should_announce_publicly']}")
        
        # Show progress to next
        progress = result['progress_to_next']
        if progress['next_badge']:
            next_badge = progress['next_badge']
            print(f"   Next badge: {next_badge['name']} in {next_badge['days_needed']} days")
            print(f"   Progress: {progress['progress_percentage']:.1f}%")
        else:
            print("   All available badges earned!")
        
        # Show current badges
        summary = integration.get_user_summary(user['handle'])
        print(f"   Total badges: {summary['total_badges']}")
        for badge in summary['badges']:
            print(f"     - {badge['name']}")
    
    # Test the convenience function
    print(f"\n🔧 Testing convenience function:")
    result = check_badges_for_streak_update("demo_user", 1, 1)
    print(f"   Function result: {result['has_new_achievements']}")
    
    # Show leaderboard
    print(f"\n🏆 Current Leaderboard:")
    leaderboard = integration.get_leaderboard()
    for i, user in enumerate(leaderboard, 1):
        latest = user['latest_badge']['name'] if user['latest_badge'] else "None"
        print(f"   {i}. {user['handle']}: {user['badge_count']} badges (score: {user['score']}) - Latest: {latest}")
    
    print(f"\n✅ Badge system test complete!")

if __name__ == "__main__":
    test_current_system()