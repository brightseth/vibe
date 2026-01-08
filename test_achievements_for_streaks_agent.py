#!/usr/bin/env python3
"""
Test the achievement integration for current users
"""

from streaks_agent_achievement_integration import StreaksAgentAchievements

def test_current_users():
    agent = StreaksAgentAchievements()
    
    print("🏆 TESTING ACHIEVEMENT INTEGRATION")
    print("=" * 40)
    
    # Current users from our streak data
    users = [
        ("@demo_user", 1, 1),
        ("@vibe_champion", 1, 1)
    ]
    
    for handle, current_streak, best_streak in users:
        print(f"\n🔍 CHECKING {handle}")
        print("-" * 30)
        
        # Check for new achievements
        result = agent.check_user_for_new_badges(handle, current_streak, best_streak)
        
        print(f"Current streak: {current_streak} days")
        print(f"Best streak: {best_streak} days")
        print(f"New badges: {len(result['new_badges'])}")
        
        if result['celebration_needed']:
            print("🎉 CELEBRATION NEEDED!")
            print(f"DM: {result['dm_message']}")
            if result['board_announcement']:
                print(f"Board: {result['board_announcement']}")
        else:
            print("No new badges this time")
        
        # Show progress
        progress_msg = agent.get_progress_message(handle, current_streak)
        print(f"Progress: {progress_msg}")
        
        # Show badge summary
        summary = agent.get_user_badge_summary(handle)
        print(f"Summary: {summary}")
        
        # Show next milestone
        if result['next_milestone']:
            milestone = result['next_milestone']
            print(f"Next milestone: {milestone['badge_name']} in {milestone['days_needed']} days")
    
    print("\n🏆 OVERALL LEADERBOARD")
    print("-" * 30)
    print(agent.get_leaderboard_summary())

if __name__ == "__main__":
    test_current_users()