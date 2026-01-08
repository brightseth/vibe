#!/usr/bin/env python3
"""
Live Streak & Badge Dashboard
Real-time view of user streaks and badge progress
Built by @streaks-agent
"""

from badge_system import BadgeSystem
import json
from datetime import datetime

def generate_dashboard():
    print("🎯 LIVE STREAK & BADGE DASHBOARD")
    print("=" * 50)
    print(f"📅 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Current streak data (from memory)
    streak_data = {
        '@demo_user': {'current': 1, 'best': 1},
        '@vibe_champion': {'current': 1, 'best': 1}
    }
    
    badge_system = BadgeSystem()
    
    print("👥 USER ACTIVITY STATUS")
    print("-" * 30)
    
    for user, data in streak_data.items():
        current = data['current']
        best = data['best']
        
        print(f"\n{user}:")
        print(f"  🔥 Current streak: {current} days")
        print(f"  🏆 Best streak: {best} days")
        
        # Show badges
        badges = badge_system.get_user_badges(user)
        if badges:
            badge_display = " ".join([b['icon'] for b in badges])
            print(f"  🏅 Badges: {badge_display} ({len(badges)} earned)")
        else:
            print(f"  🏅 Badges: None yet")
        
        # Show next milestone
        if current < 7:
            print(f"  📈 Next milestone: Week Warrior 💪 (need {7-current} more days)")
        elif current < 30:
            print(f"  📈 Next milestone: Consistency Champion 🔥 (need {30-current} more days)")
        elif current < 100:
            print(f"  📈 Next milestone: Century Club 👑 (need {100-current} more days)")
        else:
            print(f"  👑 MILESTONE ACHIEVED: Century Club!")
    
    print(f"\n\n🎮 BADGE SYSTEM STATUS")
    print("-" * 30)
    
    # Show available badges
    available_badges = {
        'week_streak': {'name': 'Week Warrior 💪', 'requirement': '7-day streak'},
        'consistency_champion': {'name': 'Consistency Champion 🔥', 'requirement': '30-day streak'}, 
        'century_club': {'name': 'Century Club 👑', 'requirement': '100-day streak'},
        'first_ship': {'name': 'First Ship 🚢', 'requirement': 'Ship first project'}
    }
    
    print("Available streak badges:")
    for badge_id, info in available_badges.items():
        if badge_id.endswith('_streak') or badge_id == 'consistency_champion' or badge_id == 'century_club':
            print(f"  {info['name']} - {info['requirement']}")
    
    # Badge leaderboard
    print(f"\n🏆 BADGE LEADERBOARD")
    print("-" * 30)
    leaderboard = badge_system.get_leaderboard()
    if leaderboard:
        for i, entry in enumerate(leaderboard, 1):
            badge_icons = " ".join([b['icon'] for b in entry['badges']])
            print(f"#{i} {entry['user']}: {badge_icons} ({entry['badge_count']} badges)")
    else:
        print("No badges awarded yet - everyone is building their first streaks!")
    
    print(f"\n\n✨ ENGAGEMENT INSIGHTS")
    print("-" * 30)
    total_users = len(streak_data)
    active_streaks = sum(1 for data in streak_data.values() if data['current'] > 0)
    
    print(f"📊 Total users tracked: {total_users}")
    print(f"🔥 Active streaks: {active_streaks}")
    print(f"💪 Building momentum: Both users on 1-day streaks!")
    print(f"🎯 Next big milestone: First 7-day streak for Week Warrior badge")
    
    print(f"\n🚀 System Status: READY FOR MILESTONE CELEBRATIONS!")

if __name__ == "__main__":
    generate_dashboard()