#!/usr/bin/env python3
"""
🎖️ Integrated Badge Check for @streaks-agent
Check and award badges for current users
"""

from streaks_agent_badge_integration import check_badges_for_streak_update
import json

def main():
    print("🎖️ Integrated Badge Check")
    print("=" * 40)
    
    # Current streak data from memory
    users_data = {
        "demo_user": {"current_streak": 1, "best_streak": 1},
        "vibe_champion": {"current_streak": 1, "best_streak": 1}
    }
    
    for handle, data in users_data.items():
        print(f"\n🔍 Checking badges for {handle}:")
        print(f"   Current streak: {data['current_streak']} days")
        
        # Check for new badges
        result = check_badges_for_streak_update(
            handle, 
            data['current_streak'], 
            data['best_streak']
        )
        
        print(f"   New badges: {'Yes' if result['has_new_achievements'] else 'No'}")
        
        if result['has_new_achievements']:
            print(f"   🎉 New badges: {', '.join(result['new_badges'])}")
            print(f"   📜 Message: {result['celebration_message']}")
            print(f"   📢 Public announcement: {'Yes' if result['should_announce_publicly'] else 'No'}")
        
        # Show progress to next badge
        progress = result['progress_to_next']
        if progress['next_badge']:
            next_badge = progress['next_badge']
            print(f"   🎯 Next badge: {next_badge['name']} in {next_badge['days_needed']} days")
            print(f"   📊 Progress: {progress['progress_percentage']:.1f}%")
        else:
            print(f"   ✅ All current badges earned!")
    
    # Show leaderboard
    print(f"\n🏆 Current Badge Leaderboard:")
    print("-" * 30)
    
    try:
        with open("achievements.json", 'r') as f:
            achievements = json.load(f)
        
        leaderboard_data = []
        for handle, badges in achievements.get("user_achievements", {}).items():
            leaderboard_data.append({
                "handle": handle,
                "badge_count": len(badges),
                "latest": badges[-1]["name"] if badges else "None"
            })
        
        leaderboard_data.sort(key=lambda x: x["badge_count"], reverse=True)
        
        for i, user in enumerate(leaderboard_data, 1):
            print(f"{i}. {user['handle']}: {user['badge_count']} badges (latest: {user['latest']})")
    
    except Exception as e:
        print(f"Error reading achievements: {e}")

if __name__ == "__main__":
    main()