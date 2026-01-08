#!/usr/bin/env python3
"""
Current Gamification Status - Streaks Agent Dashboard
Built by @streaks-agent - The Tracker
"""

import json
from datetime import datetime

def load_json_safe(filename, default=None):
    """Load JSON file safely"""
    if default is None:
        default = {}
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return default

def main():
    print("🎮 GAMIFICATION STATUS DASHBOARD")
    print("=" * 50)
    print("Built by @streaks-agent - The Tracker")
    
    # Load current data
    streak_data = load_json_safe('streak_data.json', {})
    achievements = load_json_safe('achievements.json', {})
    badges_data = load_json_safe('badges.json', {})
    
    # Current time
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"📅 Report Generated: {now}")
    
    print("\n👥 CURRENT USERS & STREAKS")
    print("-" * 30)
    total_users = len(streak_data)
    active_streaks = sum(1 for user_data in streak_data.values() if user_data.get('current', 0) > 0)
    
    print(f"Total Users Tracked: {total_users}")
    print(f"Active Streaks: {active_streaks}")
    
    if streak_data:
        for handle, data in streak_data.items():
            current = data.get('current', 0)
            best = data.get('best', 0)
            last_active = data.get('last_active', 'Unknown')
            
            status = "🔥" if current > 0 else "💤"
            print(f"  {status} {handle}: {current} days (best: {best}) - last: {last_active}")
    
    print("\n🏆 ACHIEVEMENT STATUS")
    print("-" * 30)
    
    # Badge definitions
    available_badges = achievements.get('badges', {})
    print(f"Available Badge Types: {len(available_badges)}")
    
    for badge_key, badge_info in available_badges.items():
        name = badge_info.get('name', badge_key)
        threshold = badge_info.get('threshold', 'N/A')
        badge_type = badge_info.get('type', 'unknown')
        print(f"  🎖️  {name} - {threshold} {badge_type}")
    
    print(f"\n🎊 USER ACHIEVEMENTS")
    print("-" * 30)
    
    user_achievements = achievements.get('user_achievements', {})
    if user_achievements:
        total_badges_awarded = sum(len(user_badges) for user_badges in user_achievements.values())
        print(f"Total Badges Awarded: {total_badges_awarded}")
        
        for handle, user_badges in user_achievements.items():
            print(f"\n  👤 {handle}: {len(user_badges)} badges")
            for badge in user_badges:
                earned_at = badge.get('earned_at', 'Unknown time')
                print(f"     {badge.get('name', 'Unknown Badge')} - earned {earned_at}")
    else:
        print("No user achievements recorded yet")
    
    print(f"\n📊 MILESTONE ANALYSIS")
    print("-" * 30)
    
    # Analyze who's approaching milestones
    milestone_badges = {
        'early_bird': 3,
        'week_streak': 7, 
        'consistency_king': 14,
        'month_streak': 30,
        'century_club': 100
    }
    
    for handle, data in streak_data.items():
        current = data.get('current', 0)
        
        # Find next milestone
        next_milestone = None
        days_to_next = None
        
        for badge_key, threshold in milestone_badges.items():
            if current < threshold:
                # Check if they already have this badge
                user_badges = user_achievements.get(handle, [])
                has_badge = any(badge.get('id') == badge_key for badge in user_badges)
                
                if not has_badge:
                    next_milestone = badge_key
                    days_to_next = threshold - current
                    break
        
        if next_milestone:
            milestone_name = available_badges.get(next_milestone, {}).get('name', next_milestone)
            print(f"  🎯 {handle}: {days_to_next} days until {milestone_name}")
        else:
            print(f"  ⭐ {handle}: All major milestones achieved!")
    
    print(f"\n🎮 GAMIFICATION HEALTH CHECK")
    print("-" * 30)
    
    # System health indicators
    system_healthy = True
    health_issues = []
    
    if not streak_data:
        health_issues.append("No streak data found")
        system_healthy = False
    
    if not achievements.get('badges'):
        health_issues.append("No badge definitions found")
        system_healthy = False
    
    if not user_achievements:
        health_issues.append("No user achievements recorded")
        system_healthy = False
    
    if system_healthy:
        print("  ✅ Gamification system is healthy!")
        print("  ✅ Streak tracking active")
        print("  ✅ Badge system operational")
        print("  ✅ Achievement recording working")
    else:
        print("  ⚠️  System issues detected:")
        for issue in health_issues:
            print(f"     • {issue}")
    
    print(f"\n🚀 RECOMMENDATIONS")
    print("-" * 30)
    
    recommendations = []
    
    # Check for users ready for celebrations
    for handle, data in streak_data.items():
        current = data.get('current', 0)
        user_badges = user_achievements.get(handle, [])
        user_badge_ids = [badge.get('id') for badge in user_badges]
        
        if current >= 3 and 'early_bird' not in user_badge_ids:
            recommendations.append(f"🎉 Celebrate {handle} reaching 3 days (Early Bird badge)")
        elif current >= 7 and 'week_streak' not in user_badge_ids:
            recommendations.append(f"🎉 Celebrate {handle} reaching 7 days (Week Streak badge)")
    
    if not recommendations:
        recommendations = ["✨ System running smoothly - monitor for new milestones"]
    
    for rec in recommendations:
        print(f"  • {rec}")
    
    print(f"\n🎯 NEXT ACTIONS FOR @streaks-agent")
    print("-" * 30)
    print("  1. Continue monitoring daily activity")
    print("  2. Check for milestone celebrations")
    print("  3. Award new badges when earned")
    print("  4. Send celebration DMs for achievements")
    print("  5. Update streak analytics dashboard")
    
    return {
        'users_tracked': total_users,
        'active_streaks': active_streaks,
        'total_badges_awarded': sum(len(user_badges) for user_badges in user_achievements.values()) if user_achievements else 0,
        'system_healthy': system_healthy,
        'recommendations': recommendations
    }

if __name__ == "__main__":
    result = main()
    print(f"\n📈 Dashboard complete - tracking {result['users_tracked']} users")