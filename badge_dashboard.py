"""
Badge Dashboard - View achievements and leaderboard
"""

from achievements import AchievementTracker
import json

def display_user_profile(handle: str):
    """Display a user's complete achievement profile"""
    tracker = AchievementTracker()
    badges = tracker.get_user_badges(handle)
    
    print(f"\n🏆 {handle}'s Achievement Profile")
    print("=" * 40)
    
    if not badges:
        print("No badges yet - keep participating to earn your first badge! 🌱")
        return
    
    print(f"Total Badges: {len(badges)}")
    print("\nEarned Badges:")
    for badge in badges:
        print(f"  {badge['name']} - {badge['description']}")

def display_leaderboard():
    """Display the achievement leaderboard"""
    tracker = AchievementTracker()
    leaderboard = tracker.get_leaderboard()
    
    print("\n🏆 Achievement Leaderboard")
    print("=" * 40)
    
    if not leaderboard:
        print("No badges earned yet. Be the first to start your streak! 🚀")
        return
    
    for i, player in enumerate(leaderboard, 1):
        handle = player['handle']
        count = player['badge_count']
        recent = ", ".join(player['latest_badges'][-2:])  # Show 2 most recent
        
        medal = ["🥇", "🥈", "🥉"][min(i-1, 2)]
        print(f"{medal} #{i} {handle}: {count} badges")
        if recent:
            print(f"    Recent: {recent}")

def display_available_badges():
    """Show all available badges and their requirements"""
    tracker = AchievementTracker()
    
    print("\n🎯 Available Badges")
    print("=" * 40)
    
    categories = {
        'Streak Badges': ['first_day', 'week_warrior', 'fortnight_hero', 'monthly_legend', 'century_club'],
        'Participation': ['first_ship', 'prolific_shipper', 'game_master', 'community_builder'],
        'Special': ['early_adopter', 'comeback_kid']
    }
    
    for category, badge_ids in categories.items():
        print(f"\n📋 {category}:")
        for badge_id in badge_ids:
            if badge_id in tracker.badge_definitions:
                badge = tracker.badge_definitions[badge_id]
                print(f"  {badge['name']} - {badge['description']}")

def check_badge_progress(handle: str, current_streak: int):
    """Show progress toward next badges"""
    print(f"\n📈 {handle}'s Badge Progress")
    print("=" * 40)
    
    streak_milestones = [
        (1, "🌱 First Day"),
        (7, "💪 Week Warrior"), 
        (14, "🔥 Fortnight Hero"),
        (30, "🏆 Monthly Legend"),
        (100, "👑 Century Club")
    ]
    
    next_milestone = None
    for days, badge_name in streak_milestones:
        if current_streak < days:
            next_milestone = (days, badge_name)
            break
    
    if next_milestone:
        days_needed = next_milestone[0] - current_streak
        print(f"Next streak badge: {next_milestone[1]}")
        print(f"Days needed: {days_needed}")
        print(f"Progress: {current_streak}/{next_milestone[0]} days ({'█' * (current_streak * 10 // next_milestone[0])}{'░' * (10 - current_streak * 10 // next_milestone[0])})")
    else:
        print("🎉 You've achieved the highest streak badge!")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python badge_dashboard.py [leaderboard|profile <handle>|available|progress <handle> <streak>]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "leaderboard":
        display_leaderboard()
    elif command == "profile" and len(sys.argv) > 2:
        display_user_profile(sys.argv[2])
    elif command == "available":
        display_available_badges()
    elif command == "progress" and len(sys.argv) > 3:
        display_user_profile(sys.argv[2])
        check_badge_progress(sys.argv[2], int(sys.argv[3]))
    else:
        print("Invalid command or missing arguments")