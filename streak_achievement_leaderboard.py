#!/usr/bin/env python3
"""
Streak Achievement Leaderboard Generator
Creates visual leaderboard showing current standings and progress
"""

import json
from datetime import datetime
from collections import defaultdict

def generate_leaderboard():
    """Generate achievement leaderboard with streak data"""
    
    # Load achievements
    try:
        with open("achievements.json", 'r') as f:
            achievements = json.load(f)
    except FileNotFoundError:
        print("❌ No achievements.json found")
        return
    
    # Current streak data (from @streaks-agent memory)
    streak_data = {
        "demo_user": {"current_streak": 1, "best_streak": 1},
        "vibe_champion": {"current_streak": 1, "best_streak": 1}
    }
    
    print("🏆 /vibe Workshop Achievement Leaderboard")
    print("=" * 50)
    print(f"📅 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print()
    
    # Calculate standings
    standings = []
    for handle in streak_data.keys():
        user_badges = achievements.get("user_achievements", {}).get(handle, [])
        current_streak = streak_data[handle]["current_streak"]
        best_streak = streak_data[handle]["best_streak"]
        badge_count = len(user_badges)
        
        # Calculate score (badges * 10 + current_streak * 2 + best_streak)
        score = badge_count * 10 + current_streak * 2 + best_streak
        
        standings.append({
            "handle": handle,
            "score": score,
            "badge_count": badge_count,
            "current_streak": current_streak,
            "best_streak": best_streak,
            "badges": user_badges
        })
    
    # Sort by score
    standings.sort(key=lambda x: x["score"], reverse=True)
    
    # Display leaderboard
    print("🥇 CURRENT STANDINGS")
    print("-" * 30)
    
    for i, user in enumerate(standings, 1):
        rank_emoji = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else f"{i}."
        
        print(f"{rank_emoji} @{user['handle']}")
        print(f"   Score: {user['score']} pts")
        print(f"   🎖️  {user['badge_count']} badges")
        print(f"   🔥 {user['current_streak']} day streak")
        print(f"   📈 {user['best_streak']} best streak")
        
        # Show badges
        if user['badges']:
            badge_names = [b['name'] for b in user['badges']]
            print(f"   🏆 {', '.join(badge_names)}")
        else:
            print(f"   🏆 No badges yet")
        print()
    
    # Progress tracking
    print("🎯 NEXT MILESTONES")
    print("-" * 25)
    
    badge_thresholds = [
        ("early_bird", "Early Bird 🌅", 3),
        ("week_streak", "Week Warrior 💪", 7),
        ("consistency_king", "Consistency King 🔥", 14),
        ("month_streak", "Monthly Legend 🏆", 30),
        ("century_club", "Century Club 👑", 100)
    ]
    
    for user in standings:
        print(f"📊 @{user['handle']}:")
        current = user['current_streak']
        
        # Find next milestone
        earned_badge_ids = [b['id'] for b in user['badges']]
        
        for badge_id, badge_name, threshold in badge_thresholds:
            if badge_id not in earned_badge_ids and current < threshold:
                days_needed = threshold - current
                progress = (current / threshold) * 100
                print(f"   🎯 {badge_name}: {days_needed} days away ({progress:.1f}%)")
                break
        else:
            print(f"   ✅ All streak milestones achieved!")
        print()
    
    # Badge distribution
    print("📈 BADGE DISTRIBUTION")
    print("-" * 22)
    
    badge_counts = defaultdict(int)
    for user_badges in achievements.get("user_achievements", {}).values():
        for badge in user_badges:
            badge_counts[badge['name']] += 1
    
    if badge_counts:
        for badge_name, count in sorted(badge_counts.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / len(standings)) * 100
            bar = "█" * count + "░" * (len(standings) - count)
            print(f"   {badge_name}: {count}/{len(standings)} users ({percentage:.1f}%) {bar}")
    else:
        print("   No badges earned yet")
    
    print()
    print("🚀 Keep building those streaks! Consistency creates momentum.")
    print("💪 Every day you show up, you're leveling up the workshop vibe.")
    
    # Save to file for dashboard
    leaderboard_data = {
        "generated_at": datetime.now().isoformat(),
        "standings": standings,
        "total_users": len(standings),
        "total_badges_awarded": sum(len(achievements.get("user_achievements", {}).get(handle, [])) 
                                  for handle in streak_data.keys()),
        "badge_distribution": dict(badge_counts)
    }
    
    with open("leaderboard_data.json", 'w') as f:
        json.dump(leaderboard_data, f, indent=2)
    
    print(f"\n💾 Leaderboard data saved to leaderboard_data.json")

if __name__ == "__main__":
    generate_leaderboard()