#!/usr/bin/env python3
"""
Live Badge System Dashboard
Shows current badges, leaderboard, and available achievements
"""

import json
from datetime import datetime

def load_all_data():
    """Load all relevant data files"""
    with open('badges.json', 'r') as f:
        badges = json.load(f)
    
    with open('achievements.json', 'r') as f:
        achievements = json.load(f)
    
    with open('streak_data.json', 'r') as f:
        streaks = json.load(f)
    
    return badges, achievements, streaks

def generate_leaderboard(badges):
    """Generate current leaderboard"""
    leaderboard = []
    for user_handle, user_badges in badges["user_badges"].items():
        total_points = sum(badges["badge_definitions"][b["badge_key"]]["points"] for b in user_badges)
        leaderboard.append({
            "user": user_handle,
            "points": total_points,
            "badge_count": len(user_badges),
            "badges": user_badges
        })
    
    return sorted(leaderboard, key=lambda x: x["points"], reverse=True)

def generate_dashboard():
    """Generate complete dashboard"""
    badges, achievements, streaks = load_all_data()
    
    dashboard = []
    dashboard.append("🏆 BADGE SYSTEM DASHBOARD")
    dashboard.append("=" * 50)
    dashboard.append(f"📅 Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Current statistics
    total_badges_awarded = badges["stats"]["total_badges_awarded"]
    total_users = len(badges["user_badges"])
    dashboard.append(f"\n📊 SYSTEM STATS")
    dashboard.append(f"👥 Active users: {total_users}")
    dashboard.append(f"🎖️  Total badges awarded: {total_badges_awarded}")
    dashboard.append(f"🏅 Available badge types: {len(badges['badge_definitions'])}")
    
    # Leaderboard
    leaderboard = generate_leaderboard(badges)
    dashboard.append(f"\n🥇 LEADERBOARD")
    if leaderboard:
        for i, user in enumerate(leaderboard, 1):
            badge_names = [badges["badge_definitions"][b["badge_key"]]["name"] for b in user["badges"]]
            badge_display = ", ".join(badge_names) if badge_names else "No badges"
            dashboard.append(f"{i}. {user['user']}: {user['points']} pts")
            dashboard.append(f"   Badges ({user['badge_count']}): {badge_display}")
    else:
        dashboard.append("No users in leaderboard yet")
    
    # Recent badge awards
    dashboard.append(f"\n🎉 RECENT BADGE AWARDS")
    recent_awards = sorted(badges["badge_log"], key=lambda x: x["awarded_at"], reverse=True)[:5]
    if recent_awards:
        for award in recent_awards:
            timestamp = datetime.fromisoformat(award["awarded_at"].replace('Z', '+00:00')).strftime('%m/%d %H:%M')
            dashboard.append(f"• {award['user']}: {award['badge_name']} ({timestamp})")
    else:
        dashboard.append("No recent awards")
    
    # Badge categories
    dashboard.append(f"\n🎯 AVAILABLE BADGES BY CATEGORY")
    categories = {}
    for badge_key, badge_data in badges["badge_definitions"].items():
        category = badge_data.get("category", "misc")
        if category not in categories:
            categories[category] = []
        categories[category].append(f"{badge_data['name']} ({badge_data['points']}pts)")
    
    for category, badge_list in categories.items():
        dashboard.append(f"  📂 {category.title()}: {len(badge_list)} badges")
        for badge in badge_list:
            dashboard.append(f"    • {badge}")
    
    # Current streak status
    dashboard.append(f"\n📈 STREAK STATUS")
    streak_users = streaks.get("streaks", {})
    if streak_users:
        for user, streak_data in streak_users.items():
            current = streak_data.get("current", 0)
            best = streak_data.get("best", 0)
            dashboard.append(f"• {user}: {current} days current (best: {best})")
    else:
        dashboard.append("No streak data available")
    
    # Next milestones
    dashboard.append(f"\n🎯 UPCOMING MILESTONES")
    for user, streak_data in streak_users.items():
        current = streak_data.get("current", 0)
        if current < 3:
            dashboard.append(f"• {user}: {3-current} days to Early Bird badge")
        elif current < 7:
            dashboard.append(f"• {user}: {7-current} days to Week Warrior badge")
        elif current < 30:
            dashboard.append(f"• {user}: {30-current} days to Monthly Legend badge")
    
    return "\n".join(dashboard)

def main():
    """Generate and display dashboard"""
    dashboard_content = generate_dashboard()
    print(dashboard_content)
    
    # Save to file
    with open('badge_dashboard_status.md', 'w') as f:
        f.write(dashboard_content)
    
    return dashboard_content

if __name__ == "__main__":
    main()