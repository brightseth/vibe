#!/usr/bin/env python3
"""
Achievement Status Dashboard
Built by @streaks-agent for comprehensive achievement tracking visualization
"""

import json
from datetime import datetime

def load_data():
    with open("streak_data.json", 'r') as f:
        streak_data = json.load(f)
    
    with open("achievements.json", 'r') as f:
        achievement_data = json.load(f)
    
    return streak_data, achievement_data

def generate_dashboard():
    streak_data, achievement_data = load_data()
    
    print("🎖️ ACHIEVEMENT STATUS DASHBOARD")
    print("=" * 60)
    print(f"📅 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Overall Stats
    total_users = len(streak_data["streaks"])
    total_badges_available = len(achievement_data["badges"])
    total_badges_awarded = sum(len(badges) for badges in achievement_data.get("user_badges", {}).values())
    
    print("📊 OVERVIEW")
    print("-" * 30)
    print(f"👥 Total Users: {total_users}")
    print(f"🏆 Badge Types Available: {total_badges_available}")
    print(f"🎖️ Total Badges Awarded: {total_badges_awarded}")
    print(f"📈 Average Badges per User: {total_badges_awarded/total_users if total_users > 0 else 0:.1f}")
    print()
    
    # Badge Catalog
    print("🏆 AVAILABLE BADGES")
    print("-" * 30)
    for badge_id, badge in achievement_data["badges"].items():
        threshold = badge.get("threshold", "N/A")
        print(f"{badge['emoji']} {badge['name']}")
        print(f"   {badge['description']}")
        print(f"   Requirement: {threshold} days" if isinstance(threshold, int) else f"   Requirement: {threshold}")
        
        # Count how many users have this badge
        count = 0
        for user_badges in achievement_data.get("user_badges", {}).values():
            if any(b.get("badge_id") == badge_id for b in user_badges):
                count += 1
        print(f"   Earned by: {count}/{total_users} users")
        print()
    
    # User Details
    print("👥 USER ACHIEVEMENT STATUS")
    print("-" * 30)
    
    for user, streak_info in streak_data["streaks"].items():
        current = streak_info["current"]
        best = streak_info["best"]
        
        print(f"\n🔸 {user}")
        print(f"   Streak: {current} days (best: {best})")
        
        # User's badges
        user_badges = achievement_data.get("user_badges", {}).get(user, [])
        if user_badges:
            print(f"   Badges ({len(user_badges)}):")
            for badge in sorted(user_badges, key=lambda x: x.get("awarded_at", "")):
                awarded_date = badge.get("awarded_at", "")[:10] if badge.get("awarded_at") else "Unknown"
                print(f"      {badge['emoji']} {badge['name']} (day {badge.get('streak_when_earned', '?')}, {awarded_date})")
        else:
            print("   Badges: None yet")
        
        # Next milestone
        next_milestones = []
        for badge_id, badge in achievement_data["badges"].items():
            threshold = badge.get("threshold")
            if isinstance(threshold, int) and current < threshold:
                has_badge = any(b.get("badge_id") == badge_id for b in user_badges)
                if not has_badge:
                    next_milestones.append((threshold, badge))
        
        if next_milestones:
            next_milestones.sort(key=lambda x: x[0])
            next_threshold, next_badge = next_milestones[0]
            days_remaining = next_threshold - current
            progress = (current / next_threshold) * 100
            print(f"   Next Milestone: {next_badge['emoji']} {next_badge['name']} in {days_remaining} days ({progress:.1f}%)")
        else:
            print("   Next Milestone: All streak badges earned! 👑")
    
    # Achievement Activity Log
    print(f"\n📜 RECENT ACHIEVEMENT ACTIVITY")
    print("-" * 30)
    
    logs = achievement_data.get("achievement_log", [])
    if logs:
        # Sort by date, most recent first
        sorted_logs = sorted(logs, key=lambda x: x.get("awarded_at", ""), reverse=True)
        for log in sorted_logs[:10]:  # Show last 10
            date = log.get("awarded_at", "")[:10] if log.get("awarded_at") else "Unknown"
            celebrated = "✅" if log.get("celebration_sent") else "📬"
            print(f"   {celebrated} {log['user']}: {log['badge_name']} (day {log.get('streak_when_earned', '?')}, {date})")
        
        if len(logs) > 10:
            print(f"   ... and {len(logs) - 10} more")
    else:
        print("   No achievements logged yet")
    
    # Milestone Analysis
    print(f"\n🎯 MILESTONE ANALYSIS")
    print("-" * 30)
    
    milestone_progress = {}
    for user, streak_info in streak_data["streaks"].items():
        current = streak_info["current"]
        
        if current >= 100:
            milestone_progress.setdefault("century_club", []).append(user)
        elif current >= 30:
            milestone_progress.setdefault("month_streak", []).append(user)
        elif current >= 7:
            milestone_progress.setdefault("week_streak", []).append(user)
        elif current >= 1:
            milestone_progress.setdefault("first_day", []).append(user)
        
        # Check approaching milestones
        if 1 <= current < 7:
            milestone_progress.setdefault("approaching_week", []).append(user)
        elif 7 <= current < 30:
            milestone_progress.setdefault("approaching_month", []).append(user)
        elif 30 <= current < 100:
            milestone_progress.setdefault("approaching_century", []).append(user)
    
    milestones = [
        ("first_day", "🎉 First Day", "Users who started"),
        ("week_streak", "💪 Week Warrior", "Users with 7+ days"),
        ("month_streak", "🏆 Monthly Legend", "Users with 30+ days"),
        ("century_club", "👑 Century Club", "Users with 100+ days")
    ]
    
    for milestone_id, name, description in milestones:
        count = len(milestone_progress.get(milestone_id, []))
        print(f"   {name}: {count} users")
    
    approaching = [
        ("approaching_week", "Approaching Week Warrior (1-6 days)"),
        ("approaching_month", "Approaching Monthly Legend (7-29 days)"),
        ("approaching_century", "Approaching Century Club (30-99 days)")
    ]
    
    for approach_id, description in approaching:
        count = len(milestone_progress.get(approach_id, []))
        if count > 0:
            print(f"   🔜 {description}: {count} users")
    
    print(f"\n{'=' * 60}")
    print("🎮 Built by @streaks-agent - Making consistency irresistible!")

if __name__ == "__main__":
    generate_dashboard()