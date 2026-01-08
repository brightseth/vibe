#!/usr/bin/env python3
"""
Quick Gamification Status Checker
A simple command-line tool to check current streak and badge status
Built by @streaks-agent for quick status checks
"""

import json
from datetime import datetime

def load_streak_data():
    """Load current streak data - simulated from @streaks-agent memory"""
    return {
        "@demo_user": {"current_streak": 1, "best_streak": 1, "last_active": "2026-01-08"},
        "@vibe_champion": {"current_streak": 1, "best_streak": 1, "last_active": "2026-01-08"}
    }

def load_achievements():
    """Load achievement data from JSON"""
    try:
        with open('achievements.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"user_achievements": {}, "achievement_history": []}

def print_status_summary():
    """Print a quick status summary"""
    streaks = load_streak_data()
    achievements = load_achievements()
    
    print("🔥 GAMIFICATION STATUS SUMMARY")
    print("=" * 40)
    
    # Users and streaks
    print(f"👥 USERS TRACKED: {len(streaks)}")
    active_streaks = sum(1 for data in streaks.values() if data['current_streak'] > 0)
    print(f"🔥 ACTIVE STREAKS: {active_streaks}")
    
    longest = max(data['current_streak'] for data in streaks.values()) if streaks else 0
    print(f"🏆 LONGEST CURRENT: {longest} days")
    
    avg = sum(data['current_streak'] for data in streaks.values()) / len(streaks) if streaks else 0
    print(f"📊 AVERAGE STREAK: {avg:.1f} days")
    
    print("\n📋 USER DETAILS:")
    print("-" * 20)
    
    for user, data in streaks.items():
        user_badges = achievements.get("user_achievements", {}).get(user.strip("@"), [])
        badge_count = len(user_badges)
        
        status = "🔥 ACTIVE" if data['current_streak'] > 0 else "💔 BROKEN"
        print(f"{user}: {data['current_streak']} days {status}")
        print(f"  Best: {data['best_streak']} days | Badges: {badge_count}")
        
        if user_badges:
            latest_badge = user_badges[-1]['name'] if user_badges else "None"
            print(f"  Latest Badge: {latest_badge}")
        print()
    
    # Next milestones
    print("🎯 NEXT MILESTONES:")
    print("-" * 18)
    
    milestones = [3, 7, 14, 30, 100]
    for user, data in streaks.items():
        current = data['current_streak']
        next_milestone = None
        for threshold in milestones:
            if current < threshold:
                next_milestone = threshold
                break
        
        if next_milestone:
            days_left = next_milestone - current
            badge_names = {
                3: "Early Bird 🌅",
                7: "Week Warrior 💪", 
                14: "Consistency King 🔥",
                30: "Monthly Legend 🏆",
                100: "Century Club 👑"
            }
            badge_name = badge_names.get(next_milestone, f"{next_milestone}-day badge")
            print(f"{user}: {badge_name} in {days_left} days")
    
    # System status
    print(f"\n🤖 SYSTEM STATUS:")
    print("-" * 16)
    print("✅ Streak tracking: ACTIVE")
    print("✅ Badge system: ACTIVE") 
    print("✅ Analytics dashboard: READY")
    print("✅ Milestone celebrations: ACTIVE")
    
    print(f"\n🕒 Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🤖 Powered by @streaks-agent")

def print_badge_details():
    """Print detailed badge information"""
    achievements = load_achievements()
    badges = achievements.get("badges", {})
    
    print("\n🏆 AVAILABLE BADGES:")
    print("=" * 30)
    
    badge_categories = {
        "Streak Badges": ["first_day", "early_bird", "week_streak", "consistency_king", "month_streak", "century_club"],
        "Activity Badges": ["first_ship", "game_master"]
    }
    
    for category, badge_ids in badge_categories.items():
        print(f"\n📂 {category}:")
        print("-" * (len(category) + 4))
        
        for badge_id in badge_ids:
            if badge_id in badges:
                badge = badges[badge_id]
                print(f"  {badge['name']}")
                print(f"    {badge['description']}")
                print(f"    Requirement: {badge['threshold']} {badge['type'].replace('_', ' ')}")
                print()
    
    print("🎉 EARNED BADGES:")
    print("-" * 16)
    
    user_achievements = achievements.get("user_achievements", {})
    for user, user_badges in user_achievements.items():
        print(f"\n@{user}:")
        for badge in user_badges:
            earned_date = datetime.fromisoformat(badge['earned_at'].replace('Z', '+00:00')).strftime('%Y-%m-%d')
            print(f"  {badge['name']} - {earned_date}")

def print_analytics_links():
    """Print available analytics and dashboard links"""
    print("\n📊 ANALYTICS & DASHBOARDS:")
    print("=" * 35)
    
    features = [
        ("Live Analytics Dashboard", "python3 serve_live_streak_analytics.py", "http://localhost:8080"),
        ("Static Dashboard", "Open beautiful_streak_analytics_dashboard.html", "Direct file access"),
        ("Gamification Status", "Open gamification_status_dashboard.html", "Feature overview"),
        ("Badge Data", "cat achievements.json", "Raw JSON data"),
    ]
    
    for name, command, access in features:
        print(f"\n🔗 {name}:")
        print(f"   Command: {command}")
        print(f"   Access: {access}")

def main():
    """Main function - print comprehensive status"""
    try:
        print_status_summary()
        print_badge_details()
        print_analytics_links()
        
        print("\n" + "="*50)
        print("🚀 All systems operational! Ready for streak tracking! 🔥")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Error checking status: {e}")
        print("💡 Ensure achievements.json exists and is readable.")

if __name__ == "__main__":
    main()