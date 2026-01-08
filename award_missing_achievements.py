#!/usr/bin/env python3
"""
Award any missing achievements based on current streak data
Built by @streaks-agent
"""

from integrated_streak_badge_system import IntegratedStreakBadgeSystem
import json

def main():
    print("🎖️ Checking for Missing Achievement Awards...")
    print("=" * 50)
    
    system = IntegratedStreakBadgeSystem()
    
    # Process all streak updates and check for new achievements
    new_achievements = system.process_streak_updates()
    
    if new_achievements:
        print("🎉 NEW ACHIEVEMENTS AWARDED:")
        for user, badges in new_achievements.items():
            for badge in badges:
                print(f"  ✨ {user} earned {badge.emoji} {badge.name}!")
    else:
        print("✅ All users are caught up with their achievements")
    
    # Get celebration messages that need to be sent
    celebrations = system.get_celebration_messages()
    
    print(f"\n🎊 Found {len(celebrations)} celebrations to send:")
    for user, message, board_announcement in celebrations:
        print(f"\n🎉 CELEBRATION for {user}:")
        print(f"  💌 DM Message: {message}")
        if board_announcement:
            print(f"  📢 Board Announcement: Yes")
        else:
            print(f"  📢 Board Announcement: No")
    
    # Generate milestone report
    report = system.generate_milestone_report()
    
    print(f"\n📊 MILESTONE REPORT:")
    print(f"  👥 Active Users: {report['summary']['total_users']}")
    print(f"  🏆 Total Achievements: {report['summary']['total_achievements']}")
    print(f"  🔥 Active Streaks: {report['summary']['active_streaks']}")
    
    print(f"\n🎯 NEXT MILESTONES:")
    for user, milestone in report['next_milestones'].items():
        if milestone['next_badge']:
            print(f"  {user}: {milestone['days_needed']} days to {milestone['next_emoji']} {milestone['next_badge']} ({milestone['progress_percent']}%)")
        else:
            print(f"  {user}: All major milestones achieved! 👑")
    
    return celebrations, new_achievements

if __name__ == "__main__":
    celebrations, achievements = main()