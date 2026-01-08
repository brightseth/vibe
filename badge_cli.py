#!/usr/bin/env python3
"""
Command-line interface for the badge system
Usage: python badge_cli.py <command> [args]
"""

import sys
from badge_system import BadgeSystem
from streak_badge_integration import StreakBadgeIntegration

def show_help():
    print("""
🏆 Badge System CLI

Commands:
  list                     - Show all available badges
  user <handle>           - Show badges for a user
  award <handle> <badge>  - Award a badge to a user
  leaderboard            - Show points leaderboard
  stats                  - Show system statistics
  test-streak <handle>   - Test streak badge awarding
  
Examples:
  python badge_cli.py user @demo_user
  python badge_cli.py award @demo_user first_ship
  python badge_cli.py leaderboard
""")

def list_badges():
    badge_system = BadgeSystem()
    print("\n🏆 Available Badges:")
    print("-" * 50)
    
    for key, badge in badge_system.data["badge_definitions"].items():
        rarity_colors = {
            "common": "🟢",
            "uncommon": "🔵", 
            "rare": "🟣",
            "legendary": "🟠"
        }
        color = rarity_colors.get(badge["rarity"], "⚫")
        
        print(f"{color} {badge['name']}")
        print(f"   {badge['description']}")
        print(f"   {badge['points']} points • {badge['rarity'].title()} • {badge['category']}")
        print()

def show_user(handle):
    badge_system = BadgeSystem()
    integration = StreakBadgeIntegration()
    
    print(f"\n🎯 {handle}'s Profile:")
    print("-" * 50)
    
    badges = badge_system.get_user_badges(handle)
    points = badge_system.get_user_points(handle)
    progress = integration.get_user_progress_summary(handle)
    
    print(f"Total Points: {points}")
    print(f"Badges Earned: {len(badges)}")
    print()
    
    if badges:
        print("🏆 Earned Badges:")
        for badge in badges:
            print(f"  {badge['name']} ({badge['points']} pts)")
            print(f"    Earned: {badge['awarded_at'][:10]}")
            if badge['reason']:
                print(f"    Reason: {badge['reason']}")
        print()
    
    if progress['next_milestones']:
        print("🎯 Next Milestones:")
        for milestone in progress['next_milestones']:
            print(f"  • {milestone}")

def award_badge(handle, badge_key, reason="Manual award"):
    badge_system = BadgeSystem()
    success, message = badge_system.award_badge(handle, badge_key, reason)
    
    if success:
        print(f"✅ {message}")
    else:
        print(f"❌ {message}")

def show_leaderboard():
    badge_system = BadgeSystem()
    leaderboard = badge_system.get_leaderboard()
    
    print("\n🥇 Leaderboard:")
    print("-" * 50)
    
    if not leaderboard:
        print("No users found with badges yet!")
        return
    
    for i, entry in enumerate(leaderboard, 1):
        medal = ["🥇", "🥈", "🥉"][i-1] if i <= 3 else f"{i}."
        print(f"{medal} {entry['user']}")
        print(f"   {entry['points']} points • {entry['badge_count']} badges")
        print()

def show_stats():
    badge_system = BadgeSystem()
    stats = badge_system.data["stats"]
    
    print("\n📊 System Statistics:")
    print("-" * 50)
    print(f"Total Badges Awarded: {stats.get('total_badges_awarded', 0)}")
    print(f"Available Badge Types: {len(badge_system.data['badge_definitions'])}")
    print(f"Active Users: {len(badge_system.data['user_badges'])}")
    
    if badge_system.data["badge_log"]:
        print("\n📝 Recent Awards:")
        recent = badge_system.data["badge_log"][-5:]  # Last 5
        for award in recent:
            print(f"  {award['badge_name']} → {award['user']} ({award['awarded_at'][:10]})")

def test_streak_badges(handle):
    integration = StreakBadgeIntegration()
    
    print(f"\n🧪 Testing streak badges for {handle}:")
    print("-" * 50)
    
    test_cases = [
        (7, 7, "7-day milestone"),
        (30, 30, "30-day milestone"), 
        (100, 100, "100-day milestone"),
        (5, 20, "Comeback scenario")
    ]
    
    for current, best, scenario in test_cases:
        print(f"\nTesting: {scenario} (current: {current}, best: {best})")
        awarded = integration.process_streak_update(handle, current, best)
        if awarded:
            for badge_key in awarded:
                msg = integration.get_celebration_message(handle, badge_key)
                print(f"  ✅ Awarded: {badge_key}")
                print(f"  💬 Message: {msg}")
        else:
            print(f"  ➖ No new badges awarded")

def main():
    if len(sys.argv) < 2:
        show_help()
        return
    
    command = sys.argv[1].lower()
    
    if command == "list":
        list_badges()
    elif command == "user" and len(sys.argv) >= 3:
        show_user(sys.argv[2])
    elif command == "award" and len(sys.argv) >= 4:
        reason = " ".join(sys.argv[4:]) if len(sys.argv) > 4 else "Manual award"
        award_badge(sys.argv[2], sys.argv[3], reason)
    elif command == "leaderboard":
        show_leaderboard()
    elif command == "stats":
        show_stats()
    elif command == "test-streak" and len(sys.argv) >= 3:
        test_streak_badges(sys.argv[2])
    else:
        show_help()

if __name__ == "__main__":
    main()