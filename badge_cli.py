#!/usr/bin/env python3
"""
CLI tool for managing achievement badges
"""

import sys
from badge_system import BadgeSystem

def main():
    if len(sys.argv) < 2:
        print("Usage: python badge_cli.py <command> [args...]")
        print("Commands:")
        print("  list_badges - Show all available badges")
        print("  user_badges <user> - Show badges for user")
        print("  award <user> <badge_id> [reason] - Award badge to user")
        print("  leaderboard - Show badge leaderboard")
        print("  check_streaks <user> <days> - Check streak badges for user")
        return
    
    command = sys.argv[1]
    system = BadgeSystem()
    
    if command == "list_badges":
        print("📋 Available Badges:")
        for badge_id, badge in system.data["badge_definitions"].items():
            print(f"  {badge['emoji']} {badge_id}: {badge['name']} - {badge['description']}")
    
    elif command == "user_badges":
        if len(sys.argv) < 3:
            print("Usage: badge_cli.py user_badges <user>")
            return
        user = sys.argv[2]
        badges = system.get_user_badges(user)
        if badges:
            print(f"🏅 {user}'s badges:")
            for badge in badges:
                print(f"  {badge['emoji']} {badge['name']}: {badge['description']}")
        else:
            print(f"{user} has no badges yet")
    
    elif command == "award":
        if len(sys.argv) < 4:
            print("Usage: badge_cli.py award <user> <badge_id> [reason]")
            return
        user = sys.argv[2]
        badge_id = sys.argv[3]
        reason = " ".join(sys.argv[4:]) if len(sys.argv) > 4 else "Manual award"
        
        if system.award_badge(user, badge_id, reason):
            badge = system.data["badge_definitions"][badge_id]
            print(f"🎉 Awarded {badge['emoji']} {badge['name']} to {user}!")
        else:
            print(f"❌ Could not award badge {badge_id} to {user}")
    
    elif command == "leaderboard":
        print("🏆 Badge Leaderboard:")
        leaderboard = system.get_leaderboard()
        for i, (user, count) in enumerate(leaderboard, 1):
            badges = system.get_user_badges(user)
            emojis = " ".join([b["emoji"] for b in badges])
            print(f"  {i}. {user}: {emojis} ({count} badges)")
    
    elif command == "check_streaks":
        if len(sys.argv) < 4:
            print("Usage: badge_cli.py check_streaks <user> <days>")
            return
        user = sys.argv[2]
        days = int(sys.argv[3])
        
        new_badges = system.check_streak_badges(user, days)
        if new_badges:
            for badge_id in new_badges:
                badge = system.data["badge_definitions"][badge_id]
                print(f"🎉 {user} earned: {badge['emoji']} {badge['name']}!")
        else:
            print(f"No new streak badges for {user} at {days} days")
    
    else:
        print(f"Unknown command: {command}")

if __name__ == "__main__":
    main()