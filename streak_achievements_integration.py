"""
Integration between streaks tracking and achievements system
For use by @streaks-agent
"""

from achievements import AchievementTracker
import json
from datetime import datetime

def check_and_award_streak_badges(handle: str, current_streak: int, best_streak: int, is_new_user=False):
    """
    Check if user earned any new badges and return celebration messages
    
    Returns:
        tuple: (new_badges_list, celebration_message, should_announce_publicly)
    """
    tracker = AchievementTracker()
    
    # Build user stats for badge checking
    user_stats = {
        'streak_days': current_streak,
        'best_streak': best_streak,
    }
    
    # If this is a new user, mark them as early adopter if within window
    if is_new_user:
        user_stats['join_date'] = datetime.now().strftime('%Y-%m-%d')
    
    # Check for new badges
    new_badges = tracker.check_new_badges(handle, user_stats)
    
    if not new_badges:
        return [], "", False
    
    # Format celebration message
    celebration_msg = tracker.format_badge_announcement(handle, new_badges)
    
    # Determine if this should be announced publicly
    # Announce major milestones publicly
    public_worthy_badges = ['week_warrior', 'fortnight_hero', 'monthly_legend', 'century_club', 'first_ship']
    should_announce = any(badge in public_worthy_badges for badge in new_badges)
    
    return new_badges, celebration_msg, should_announce

def get_next_streak_milestone(current_streak: int):
    """Get info about the next streak milestone"""
    milestones = [
        (1, "🌱 First Day", "Start your journey"),
        (7, "💪 Week Warrior", "One week strong!"), 
        (14, "🔥 Fortnight Hero", "Two weeks committed!"),
        (30, "🏆 Monthly Legend", "Monthly dedication!"),
        (100, "👑 Century Club", "Legendary commitment!")
    ]
    
    for days, badge, message in milestones:
        if current_streak < days:
            return {
                'days_needed': days - current_streak,
                'badge_name': badge,
                'message': message,
                'progress_percent': (current_streak / days) * 100
            }
    
    return None  # Already achieved highest milestone

def format_progress_message(handle: str, current_streak: int):
    """Create an encouraging progress message"""
    next_milestone = get_next_streak_milestone(current_streak)
    
    if not next_milestone:
        return f"🎉 {handle} is in the Century Club with {current_streak} days! Legendary commitment! 👑"
    
    days_needed = next_milestone['days_needed']
    badge_name = next_milestone['badge_name']
    
    if days_needed == 1:
        return f"🔥 {handle} is just 1 day away from {badge_name}! So close!"
    elif days_needed <= 3:
        return f"📈 {handle} is {days_needed} days from {badge_name}! Keep going!"
    else:
        return f"💪 {handle} at {current_streak} days, working toward {badge_name}!"

def get_user_badge_summary(handle: str):
    """Get a summary of user's achievements"""
    tracker = AchievementTracker()
    badges = tracker.get_user_badges(handle)
    
    if not badges:
        return f"{handle} is just getting started - first badge coming soon! 🌱"
    
    badge_count = len(badges)
    latest_badge = badges[-1]['name'] if badges else None
    
    return f"{handle} has {badge_count} badges. Latest: {latest_badge}"

def update_participation_stats(handle: str, action: str):
    """
    Update participation stats for non-streak achievements
    
    Args:
        handle: User handle
        action: Type of action ('ship', 'game', 'dm', etc.)
    """
    # Load existing participation data
    try:
        with open('participation_stats.json', 'r') as f:
            stats = json.load(f)
    except FileNotFoundError:
        stats = {}
    
    if handle not in stats:
        stats[handle] = {
            'ships': 0,
            'games': 0, 
            'dms': 0,
            'join_date': datetime.now().strftime('%Y-%m-%d')
        }
    
    # Update based on action
    if action == 'ship':
        stats[handle]['ships'] += 1
    elif action == 'game':
        stats[handle]['games'] += 1
    elif action == 'dm':
        stats[handle]['dms'] += 1
    
    # Save updated stats
    with open('participation_stats.json', 'w') as f:
        json.dump(stats, f, indent=2)
    
    # Check for new participation badges
    tracker = AchievementTracker()
    user_stats = {
        'ships': stats[handle]['ships'],
        'games': stats[handle]['games'],
        'dms': stats[handle]['dms'],
        'join_date': stats[handle]['join_date']
    }
    
    new_badges = tracker.check_new_badges(handle, user_stats)
    
    if new_badges:
        celebration_msg = tracker.format_badge_announcement(handle, new_badges)
        return new_badges, celebration_msg
    
    return [], ""

# Example usage for streaks-agent workflow
def streaks_agent_badge_check(handle: str, current_streak: int, best_streak: int):
    """
    Main function for streaks-agent to check badges during daily updates
    
    Returns dict with all relevant info for agent to act on
    """
    new_badges, celebration_msg, should_announce = check_and_award_streak_badges(
        handle, current_streak, best_streak
    )
    
    progress_msg = format_progress_message(handle, current_streak)
    badge_summary = get_user_badge_summary(handle)
    next_milestone = get_next_streak_milestone(current_streak)
    
    return {
        'new_badges': new_badges,
        'celebration_message': celebration_msg,
        'should_announce_publicly': should_announce,
        'progress_message': progress_msg,
        'badge_summary': badge_summary,
        'next_milestone': next_milestone,
        'has_new_achievements': len(new_badges) > 0
    }

if __name__ == "__main__":
    # Test the integration
    result = streaks_agent_badge_check("demo_user", 7, 7)
    print("Badge check result:")
    for key, value in result.items():
        print(f"  {key}: {value}")