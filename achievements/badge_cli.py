#!/usr/bin/env python3
"""
Command Line Interface for Badge Management
"""

import sys
import json
from achievements.badge_system import BadgeSystem
from achievements.integration import get_badge_stats, get_user_badge_summary

def main():
    if len(sys.argv) < 2:
        print("Badge Management CLI")
        print("Commands:")
        print("  stats           - Show overall badge statistics")
        print("  user <handle>   - Show badges for specific user")
        print("  leaderboard     - Show badge leaderboard")
        print("  award <user> <badge_type> - Award a badge manually")
        return
    
    command = sys.argv[1]
    badge_system = BadgeSystem()
    
    if command == "stats":
        stats = get_badge_stats()
        print(f"📊 Badge Statistics:")
        print(f"Total Badge Types: {stats['total_badge_types']}")
        print(f"Total Users: {stats['total_users']}")
        print(f"Total Badges Awarded: {stats['total_badges_awarded']}")
        
    elif command == "user" and len(sys.argv) > 2:
        user = sys.argv[2]
        summary = get_user_badge_summary(user)
        print(summary)
        
    elif command == "leaderboard":
        stats = get_badge_stats()
        print("🏅 Badge Leaderboard:")
        for i, (user, count) in enumerate(stats['leaderboard'].items(), 1):
            print(f"{i}. {user}: {count} badges")
            
    elif command == "award" and len(sys.argv) > 3:
        user = sys.argv[2]
        badge_type = sys.argv[3]
        
        if badge_system.award_badge(user, badge_type):
            badge_name = badge_system.data["badge_types"].get(badge_type, {}).get("name", badge_type)
            print(f"✅ Awarded {badge_name} to {user}")
        else:
            print(f"❌ {user} already has {badge_type} badge")
            
    else:
        print("Invalid command. Use no arguments to see help.")

if __name__ == "__main__":
    main()