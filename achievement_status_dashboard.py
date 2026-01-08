#!/usr/bin/env python3
"""
Achievement Status Dashboard for /vibe workshop
Shows current badges, streaks, and upcoming milestones
"""

import json
from datetime import datetime

def load_json(filepath, default=None):
    """Load JSON with fallback"""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default if default is not None else {}

def generate_dashboard():
    """Generate comprehensive achievement dashboard"""
    
    # Load all data
    streak_data = load_json('streak_data.json', {})
    achievements = load_json('achievements.json', {})
    badges_data = load_json('badges.json', {})
    
    print("🎖️ ACHIEVEMENT STATUS DASHBOARD")
    print("=" * 50)
    print(f"📅 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Overall stats
    total_users = len(streak_data.get('streaks', {}))
    total_badges = badges_data.get('stats', {}).get('total_badges_awarded', 0)
    
    print(f"\n📊 OVERALL STATS")
    print(f"   👥 Total Users: {total_users}")
    print(f"   🏆 Total Badges Awarded: {total_badges}")
    print(f"   📈 Average Badges per User: {total_badges / total_users if total_users > 0 else 0:.1f}")
    
    # Badge distribution
    print(f"\n🎖️ BADGE DISTRIBUTION")
    badge_counts = {}
    for user_badges in badges_data.get('user_badges', {}).values():
        for badge in user_badges:
            badge_counts[badge] = badge_counts.get(badge, 0) + 1
    
    if badge_counts:
        for badge, count in sorted(badge_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"   {badge}: {count} users")
    else:
        print("   No badges awarded yet")
    
    # User progress
    print(f"\n👤 USER PROGRESS")
    streaks = streak_data.get('streaks', {})
    user_achievements = achievements.get('user_achievements', {})
    
    for user in streaks.keys():
        current_streak = streaks[user]['current']
        best_streak = streaks[user]['best'] 
        user_badges = user_achievements.get(user, [])
        
        print(f"\n   {user}")
        print(f"   └─ Current Streak: {current_streak} days")
        print(f"   └─ Best Streak: {best_streak} days")
        print(f"   └─ Badges Earned ({len(user_badges)}):")
        
        if user_badges:
            for badge in user_badges:
                print(f"      • {badge.get('name', 'Unknown Badge')}")
        else:
            print(f"      • No badges yet")
        
        # Next milestone
        next_milestone = None
        if current_streak < 3:
            next_milestone = f"🌅 Early Bird (need {3 - current_streak} more days)"
        elif current_streak < 7:
            next_milestone = f"💪 Week Warrior (need {7 - current_streak} more days)"
        elif current_streak < 14:
            next_milestone = f"🔥 Consistency King (need {14 - current_streak} more days)"
        elif current_streak < 30:
            next_milestone = f"🏆 Monthly Legend (need {30 - current_streak} more days)"
        elif current_streak < 100:
            next_milestone = f"👑 Century Club (need {100 - current_streak} more days)"
        
        if next_milestone:
            print(f"   └─ Next Milestone: {next_milestone}")
        else:
            print(f"   └─ Next Milestone: All streak badges earned! 🏆")
    
    # Recent achievements
    print(f"\n📈 RECENT ACHIEVEMENTS")
    recent_achievements = achievements.get('achievement_history', [])[-10:]  # Last 10
    
    if recent_achievements:
        for achievement in recent_achievements:
            user = achievement['handle']
            badge_name = achievement['badge']['name']
            timestamp = achievement['timestamp'][:10]  # Just date
            print(f"   {timestamp}: {user} earned {badge_name}")
    else:
        print("   No achievements yet")
    
    # Engagement insights
    print(f"\n💡 ENGAGEMENT INSIGHTS")
    
    # Days until next milestones
    approaching_milestones = []
    for user in streaks.keys():
        current = streaks[user]['current']
        if current == 2:
            approaching_milestones.append(f"{user} (1 day from Early Bird)")
        elif current == 6:
            approaching_milestones.append(f"{user} (1 day from Week Warrior)")
        elif current == 13:
            approaching_milestones.append(f"{user} (1 day from Consistency King)")
    
    if approaching_milestones:
        print("   🎯 Users close to milestones:")
        for milestone in approaching_milestones:
            print(f"      • {milestone}")
    else:
        print("   📊 No users close to major milestones")
    
    # Growth opportunities
    print(f"\n🚀 GROWTH OPPORTUNITIES")
    if total_users < 5:
        print("   • Consider inviting more workshop members")
    if total_badges < total_users * 2:
        print("   • Users ready for more achievement opportunities")
    if max(streaks[user]['current'] for user in streaks.keys()) < 7:
        print("   • Focus on helping users reach their first week milestone")
    
    print(f"\n✅ Dashboard generated successfully!")

def main():
    """Generate and display dashboard"""
    generate_dashboard()

if __name__ == "__main__":
    main()