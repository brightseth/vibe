#!/usr/bin/env python3
"""
Streaks Agent: Integrated Achievement & Badge System Check
Bridges the achievements.json system with badges.json for unified gamification
"""

import json
from datetime import datetime
from badge_system import BadgeSystem

def load_achievements():
    """Load current achievements data"""
    try:
        with open('achievements.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"user_achievements": {}, "achievement_history": []}

def load_streaks():
    """Load current streak data"""
    try:
        with open('streak_data.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {}

def sync_achievements_to_badges():
    """Synchronize achievements.json data with badge system"""
    achievements = load_achievements()
    streaks = load_streaks()
    badge_system = BadgeSystem("badges.json")
    
    awards_made = []
    
    # Check each user in achievements
    for user_handle, user_achievements in achievements.get("user_achievements", {}).items():
        print(f"\n=== Checking {user_handle} ===")
        
        # Award First Day badge if they have first_day achievement
        for achievement in user_achievements:
            if achievement["id"] == "first_day":
                success, msg = badge_system.award_badge(user_handle, "first_ship", "Started their streak journey")
                if success:
                    awards_made.append(f"{user_handle}: First Ship 🚢")
                    print(f"✅ {msg}")
                else:
                    print(f"ℹ️  {msg}")
        
        # Check streak-based badges
        if user_handle in streaks:
            current_streak = streaks[user_handle].get("current", 0)
            best_streak = streaks[user_handle].get("best", 0)
            
            # Award appropriate streak badges
            streak_badges_awarded = badge_system.check_streak_badges(user_handle, current_streak, best_streak)
            for badge in streak_badges_awarded:
                awards_made.append(f"{user_handle}: {badge}")
                print(f"✅ Awarded streak badge: {badge}")
    
    return awards_made, badge_system

def generate_status_report():
    """Generate a comprehensive status report"""
    awards_made, badge_system = sync_achievements_to_badges()
    
    # Get current stats
    leaderboard = badge_system.get_leaderboard()
    
    report = []
    report.append("🏆 BADGE SYSTEM STATUS REPORT")
    report.append("=" * 40)
    report.append(f"📅 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if awards_made:
        report.append(f"\n🎉 NEW BADGES AWARDED ({len(awards_made)}):")
        for award in awards_made:
            report.append(f"  • {award}")
    else:
        report.append("\n📊 No new badges to award")
    
    report.append(f"\n🏆 LEADERBOARD:")
    if leaderboard:
        for i, entry in enumerate(leaderboard, 1):
            report.append(f"  {i}. {entry['user']}: {entry['points']} pts ({entry['badge_count']} badges)")
    else:
        report.append("  No users have badges yet")
    
    # Badge definitions overview
    report.append(f"\n🎯 AVAILABLE BADGES:")
    badge_defs = badge_system.data["badge_definitions"]
    by_category = {}
    for key, badge in badge_defs.items():
        category = badge.get("category", "misc")
        if category not in by_category:
            by_category[category] = []
        by_category[category].append(f"{badge['name']} ({badge['points']}pts)")
    
    for category, badges in by_category.items():
        report.append(f"  {category.title()}: {len(badges)} badges")
        for badge in badges[:2]:  # Show first 2
            report.append(f"    • {badge}")
        if len(badges) > 2:
            report.append(f"    • ... and {len(badges)-2} more")
    
    return "\n".join(report)

def main():
    """Main execution"""
    print("🚀 Streaks Agent: Badge System Integration")
    print("=" * 50)
    
    # Run the sync and generate report
    report = generate_status_report()
    print(report)
    
    # Save report to file
    with open('badge_status_check_jan8_evening.md', 'w') as f:
        f.write(report)
    
    print(f"\n💾 Report saved to badge_status_check_jan8_evening.md")

if __name__ == "__main__":
    main()