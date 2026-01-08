#!/usr/bin/env python3
"""
Quick Badge Status Check for @streaks-agent
Check current badge status and progress for tracked users
"""

import json
from datetime import datetime

def main():
    print("🎖️ Current Badge Status")
    print("=" * 40)
    
    # Load achievements
    try:
        with open("achievements.json", 'r') as f:
            achievements = json.load(f)
    except FileNotFoundError:
        print("No achievements.json found")
        return
    
    # Current streak data
    users = {
        "demo_user": {"current_streak": 1, "best_streak": 1},
        "vibe_champion": {"current_streak": 1, "best_streak": 1}
    }
    
    print(f"👥 Tracked Users: {len(users)}")
    print(f"🎯 Badge Types Available: {len(achievements.get('badges', {}))}")
    
    for handle, streak_data in users.items():
        print(f"\n🔍 {handle}:")
        print(f"   Current streak: {streak_data['current_streak']} days")
        
        # Current badges
        user_badges = achievements.get("user_achievements", {}).get(handle, [])
        print(f"   Current badges: {len(user_badges)}")
        
        for badge in user_badges:
            print(f"   ✅ {badge['name']}")
        
        # Next badge available
        current_streak = streak_data['current_streak']
        next_badges = []
        
        for badge_id, badge_info in achievements.get("badges", {}).items():
            if badge_info.get("type") == "streak":
                threshold = badge_info.get("threshold", 0)
                if threshold > current_streak:
                    # Check if they already have this badge
                    earned_badge_ids = [b["id"] for b in user_badges]
                    if badge_id not in earned_badge_ids:
                        next_badges.append({
                            "id": badge_id,
                            "name": badge_info["name"],
                            "threshold": threshold,
                            "days_needed": threshold - current_streak
                        })
        
        if next_badges:
            next_badge = min(next_badges, key=lambda b: b["threshold"])
            print(f"   🎯 Next badge: {next_badge['name']} in {next_badge['days_needed']} days")
            progress = (current_streak / next_badge['threshold']) * 100
            print(f"   📊 Progress: {progress:.1f}%")
        else:
            print(f"   ✅ No upcoming badges (or all earned)")
    
    # System summary
    print(f"\n📈 System Status:")
    total_awarded = sum(len(badges) for badges in achievements.get("user_achievements", {}).values())
    print(f"   Total badges awarded: {total_awarded}")
    print(f"   Most recent award: {achievements.get('achievement_history', [{}])[-1].get('timestamp', 'None')}")
    
    # Badge distribution
    badge_counts = {}
    for badge_id in achievements.get("badges", {}):
        count = 0
        for user_badges in achievements.get("user_achievements", {}).values():
            if any(b["id"] == badge_id for b in user_badges):
                count += 1
        badge_counts[badge_id] = count
    
    print(f"\n🏆 Badge Distribution:")
    for badge_id, count in sorted(badge_counts.items(), key=lambda x: x[1], reverse=True):
        badge_name = achievements["badges"][badge_id]["name"]
        print(f"   {badge_name}: {count} users")

if __name__ == "__main__":
    main()