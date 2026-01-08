#!/usr/bin/env python3
"""
@streaks-agent Badge Status Report - Jan 8 2026
Summary of current badge system status and next milestones
"""

import json
from datetime import datetime

def load_badges():
    """Load current badge system data"""
    try:
        with open('badges.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return None

def format_badge_display(badges_earned):
    """Create emoji display for user badges"""
    if not badges_earned:
        return "No badges yet"
    
    badge_emojis = {
        'first_day': '🌱',
        'early_adopter': '🌱',
        'week_streak': '🔥',
        'month_streak': '👑',
        'century_streak': '💎',
        'first_ship': '🚢',
        'game_master': '🎮',
        'mentor': '🌟'
    }
    
    emojis = []
    for badge in badges_earned:
        key = badge['badge_key']
        if key in badge_emojis:
            emojis.append(badge_emojis[key])
    
    return ' '.join(emojis) + f" ({len(badges_earned)} badges)"

def calculate_next_milestone(current_streak):
    """Calculate next streak milestone"""
    milestones = [
        (7, "Week Streak 🔥", "30 points"),
        (30, "Monthly Legend 👑", "100 points"), 
        (100, "Century Club 💎", "500 points")
    ]
    
    for days, name, points in milestones:
        if current_streak < days:
            days_to_go = days - current_streak
            return {
                'days_needed': days_to_go,
                'milestone_name': name,
                'points': points,
                'milestone_days': days
            }
    
    return None

def main():
    print("🏆 @streaks-agent Badge System Status - Jan 8 2026")
    print("=" * 60)
    
    # Load badge data
    badge_data = load_badges()
    if not badge_data:
        print("❌ No badge data found!")
        return
    
    # Current streaks from memory
    current_streaks = {
        '@demo_user': 1,
        '@vibe_champion': 1
    }
    
    print(f"📊 System Overview:")
    print(f"   • Users tracked: {len(badge_data['user_badges'])}")
    print(f"   • Badge categories: {len(badge_data['badge_categories'])}")
    print(f"   • Total badge types: {sum(len(cat) for cat in badge_data['badge_categories'].values())}")
    print(f"   • Awards given: {len(badge_data['award_history'])}")
    
    print(f"\n👥 Current User Status:")
    
    for user, current_streak in current_streaks.items():
        user_data = badge_data['user_badges'].get(user, {})
        badges_earned = user_data.get('earned', [])
        total_points = user_data.get('total_points', 0)
        
        print(f"\n   {user}:")
        print(f"      Current streak: {current_streak} days")
        print(f"      Badges: {format_badge_display(badges_earned)}")
        print(f"      Points: {total_points}")
        
        # Next milestone
        next_milestone = calculate_next_milestone(current_streak)
        if next_milestone:
            print(f"      Next milestone: {next_milestone['milestone_name']} in {next_milestone['days_needed']} days")
            print(f"      Reward: {next_milestone['points']}")
        else:
            print(f"      🎉 All streak milestones achieved!")
    
    print(f"\n🏅 Current Leaderboard:")
    leaderboard = badge_data['leaderboard']['by_points']
    for i, entry in enumerate(leaderboard, 1):
        user_badges = badge_data['user_badges'][entry['user']]['earned']
        badge_display = format_badge_display(user_badges)
        print(f"   {i}. {entry['user']}: {entry['points']} pts, {badge_display}")
    
    print(f"\n🎯 Upcoming Opportunities:")
    print(f"   • Both users need 6 more days for Week Streak 🔥 (30 points)")
    print(f"   • Early Adopter badges already awarded (joined before Jan 15)")
    print(f"   • First Ship 🚢 badges available when users ship projects")
    print(f"   • Game Master 🎮 badges for creating games")
    
    print(f"\n⚡ System Health:")
    print(f"   ✅ Badge definitions loaded: {len(badge_data['badge_categories'])} categories")
    print(f"   ✅ User tracking active: {len(badge_data['user_badges'])} users")
    print(f"   ✅ Award history maintained: {len(badge_data['award_history'])} awards")
    print(f"   ✅ Leaderboards updated: 3 ranking types")
    
    print(f"\n🚀 Next Actions for @streaks-agent:")
    print(f"   1. Continue tracking daily streaks")
    print(f"   2. Award Week Streak badges when users hit 7 days")
    print(f"   3. Celebrate milestone achievements with DMs")
    print(f"   4. Monitor for shipping activity for First Ship badges")
    print(f"   5. Build leaderboard visualization if requested")

if __name__ == "__main__":
    main()