#!/usr/bin/env python3
"""
🎖️ Visual Badge Status Report
Generate a clear visual overview of current badge achievements
"""

import json
from datetime import datetime

def load_achievements():
    """Load current achievements"""
    try:
        with open('achievements.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"badges": {}, "user_achievements": {}, "achievement_history": []}

def load_streaks():
    """Load current streaks"""
    try:
        with open('streak_data.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def generate_visual_report():
    """Generate visual badge status report"""
    achievements = load_achievements()
    streaks = load_streaks()
    
    print("🎖️ BADGE STATUS VISUAL REPORT")
    print("=" * 50)
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Current Streaks
    print("📊 CURRENT STREAKS:")
    print("-" * 20)
    if streaks:
        for user, streak_info in streaks.items():
            if isinstance(streak_info, dict):
                current = streak_info.get('current', 0)
                best = streak_info.get('best', 0)
            else:
                current = streak_info
                best = current
            
            print(f"  {user:<15} {current:>3} days (best: {best})")
    else:
        print("  No streak data found")
    print()
    
    # Badge Definitions
    print("🏆 AVAILABLE BADGES:")
    print("-" * 20)
    if "badges" in achievements:
        for badge_id, badge_info in achievements["badges"].items():
            name = badge_info.get("name", badge_id)
            threshold = badge_info.get("threshold", "?")
            badge_type = badge_info.get("type", "unknown")
            print(f"  {name:<20} {threshold:>3} {badge_type}")
    print()
    
    # User Achievements
    print("🎯 USER ACHIEVEMENTS:")
    print("-" * 20)
    if "user_achievements" in achievements:
        for user, user_badges in achievements["user_achievements"].items():
            print(f"  {user}:")
            if user_badges:
                for badge in user_badges:
                    name = badge.get("name", badge.get("id", "Unknown"))
                    earned_date = badge.get("earned_at", "Unknown")
                    if earned_date != "Unknown":
                        earned_date = earned_date[:10]  # Just the date part
                    print(f"    ✅ {name:<20} (earned: {earned_date})")
            else:
                print("    (No badges earned yet)")
            print()
    
    # Achievement History
    print("📚 RECENT ACHIEVEMENT HISTORY:")
    print("-" * 20)
    if "achievement_history" in achievements:
        history = achievements["achievement_history"]
        recent = sorted(history, key=lambda x: x.get("timestamp", ""), reverse=True)[:5]
        
        for entry in recent:
            user = entry.get("handle", "Unknown")
            badge_name = entry.get("badge", {}).get("name", "Unknown")
            timestamp = entry.get("timestamp", "Unknown")
            if timestamp != "Unknown":
                timestamp = timestamp[:10]
            print(f"  {timestamp} - {user} earned {badge_name}")
    
    print()
    
    # Next Milestones
    print("🎯 NEXT MILESTONES:")
    print("-" * 20)
    
    milestone_thresholds = [1, 3, 7, 14, 30, 100]
    
    for user, streak_info in streaks.items():
        if isinstance(streak_info, dict):
            current = streak_info.get('current', 0)
        else:
            current = streak_info
        
        print(f"  {user} (current: {current} days):")
        
        # Find next milestone
        next_milestone = None
        for threshold in milestone_thresholds:
            if current < threshold:
                next_milestone = threshold
                break
        
        if next_milestone:
            days_needed = next_milestone - current
            progress = (current / next_milestone) * 100
            print(f"    🎯 Next: {next_milestone} days ({days_needed} days away, {progress:.1f}% complete)")
        else:
            print(f"    🏆 All major milestones achieved!")
        print()
    
    # Summary Stats
    print("📈 SUMMARY STATISTICS:")
    print("-" * 20)
    total_users = len(streaks) if streaks else 0
    total_achievements = len(achievements.get("achievement_history", []))
    active_streaks = len([s for s in streaks.values() if (s.get('current', 0) if isinstance(s, dict) else s) > 0]) if streaks else 0
    
    print(f"  Total Users: {total_users}")
    print(f"  Total Achievements: {total_achievements}")
    print(f"  Active Streaks: {active_streaks}")
    print()
    
    # Health Assessment
    print("💪 ENGAGEMENT HEALTH:")
    print("-" * 20)
    if total_users > 0:
        engagement_rate = (active_streaks / total_users) * 100
        achievement_rate = total_achievements / total_users if total_users > 0 else 0
        
        print(f"  Engagement Rate: {engagement_rate:.1f}% (active streaks)")
        print(f"  Achievement Rate: {achievement_rate:.1f} per user")
        
        if engagement_rate >= 80:
            print("  Status: 🔥 Excellent engagement!")
        elif engagement_rate >= 60:
            print("  Status: 💪 Good engagement")
        elif engagement_rate >= 40:
            print("  Status: ⚡ Moderate engagement")
        else:
            print("  Status: 📈 Room for improvement")
    else:
        print("  Status: 🌱 No users tracked yet")
    
    print("\n" + "=" * 50)
    print("🎮 Achievement system is active and tracking!")

if __name__ == "__main__":
    generate_visual_report()