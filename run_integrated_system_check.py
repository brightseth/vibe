#!/usr/bin/env python3
"""
Quick check of integrated streak & badge system
Run by @streaks-agent to check for celebrations and new milestones
"""

from integrated_streak_badge_system import IntegratedStreakBadgeSystem

def main():
    """Check system and return actionable items"""
    system = IntegratedStreakBadgeSystem()
    
    print("🎖️ Checking Integrated Streak & Badge System...")
    
    # Check for new achievements
    new_achievements = system.process_streak_updates()
    
    # Get celebrations needed  
    celebrations = system.get_celebration_messages()
    
    # Generate milestone report
    report = system.generate_milestone_report()
    
    print("\n=== RESULTS ===")
    
    if new_achievements:
        print("🎉 NEW ACHIEVEMENTS:")
        for user, badges in new_achievements.items():
            for badge in badges:
                print(f"  {user} earned {badge.emoji} {badge.name}!")
    else:
        print("✅ No new achievements detected")
    
    if celebrations:
        print("\n🎊 CELEBRATIONS NEEDED:")
        for user, message, board in celebrations:
            print(f"  DM {user}: {message}")
            if board:
                print(f"    📢 BOARD: {user} achieved milestone!")
    else:
        print("\n✅ No pending celebrations")
    
    print(f"\n📊 SYSTEM STATUS:")
    print(f"  Users: {report['summary']['total_users']}")
    print(f"  Total Achievements: {report['summary']['total_achievements']}")
    print(f"  Active Streaks: {report['summary']['active_streaks']}")
    
    print(f"\n🎯 NEXT MILESTONES:")
    for user, milestone in report['next_milestones'].items():
        if milestone['next_badge']:
            print(f"  {user}: {milestone['days_needed']} days to {milestone['next_emoji']} {milestone['next_badge']} ({milestone['progress_percent']}%)")
        else:
            print(f"  {user}: All milestones achieved! 🏆")
    
    return {
        'new_achievements': new_achievements,
        'celebrations': celebrations,
        'report': report
    }

if __name__ == "__main__":
    main()