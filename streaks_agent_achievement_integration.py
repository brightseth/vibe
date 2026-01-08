#!/usr/bin/env python3
"""
Complete achievement integration for @streaks-agent
This is the main file for @streaks-agent to use for badge checking and celebrations
"""

from achievements import AchievementTracker
from streak_achievements_integration import (
    check_and_award_streak_badges, 
    get_next_streak_milestone,
    format_progress_message,
    update_participation_stats
)
import json
from datetime import datetime

class StreaksAgentAchievements:
    def __init__(self):
        self.tracker = AchievementTracker()
    
    def check_user_for_new_badges(self, handle: str, current_streak: int, best_streak: int):
        """
        Main method for @streaks-agent to check achievements
        
        Returns:
            dict: {
                'new_badges': [...],
                'dm_message': "...", 
                'board_announcement': "..." or None,
                'celebration_needed': True/False
            }
        """
        # Remove @ prefix if present
        clean_handle = handle.lstrip('@')
        
        # Check for new streak badges
        new_badges, celebration_msg, should_announce = check_and_award_streak_badges(
            clean_handle, current_streak, best_streak
        )
        
        dm_message = None
        board_announcement = None
        
        if new_badges:
            # Personal DM message
            if len(new_badges) == 1:
                badge_info = self.tracker.badge_definitions[new_badges[0]]
                dm_message = f"🎉 Congratulations! You earned {badge_info['name']}!\n\n{badge_info['description']}\n\nKeep up the amazing consistency! 💪"
            else:
                badge_names = [self.tracker.badge_definitions[bid]['name'] for bid in new_badges]
                dm_message = f"🎉 Amazing! You earned {len(new_badges)} badges:\n\n" + "\n".join([f"• {name}" for name in badge_names]) + "\n\nYour dedication is inspiring! 🌟"
            
            # Public announcement for major milestones
            if should_announce:
                board_announcement = celebration_msg
        
        return {
            'new_badges': new_badges,
            'dm_message': dm_message,
            'board_announcement': board_announcement,
            'celebration_needed': len(new_badges) > 0,
            'next_milestone': get_next_streak_milestone(current_streak)
        }
    
    def get_progress_message(self, handle: str, current_streak: int):
        """Get an encouraging progress message"""
        return format_progress_message(handle.lstrip('@'), current_streak)
    
    def record_ship(self, handle: str):
        """Record that user made a ship - check for ship badges"""
        clean_handle = handle.lstrip('@')
        new_badges, celebration_msg = update_participation_stats(clean_handle, 'ship')
        
        if new_badges:
            return {
                'new_badges': new_badges,
                'celebration_message': celebration_msg,
                'celebration_needed': True
            }
        return {'new_badges': [], 'celebration_needed': False}
    
    def get_user_badge_summary(self, handle: str):
        """Get formatted summary of user's badges"""
        clean_handle = handle.lstrip('@')
        badges = self.tracker.get_user_badges(clean_handle)
        
        if not badges:
            return f"{handle} is starting their badge journey 🌱"
        
        badge_count = len(badges)
        latest_badge = badges[-1]['name'] if badges else None
        
        return f"{handle} has earned {badge_count} badge{'s' if badge_count != 1 else ''}. Latest: {latest_badge}"
    
    def get_leaderboard_summary(self):
        """Get top badge earners for display"""
        leaderboard = self.tracker.get_leaderboard()
        
        if not leaderboard:
            return "No badge achievements yet - be the first! 🏆"
        
        top_3 = leaderboard[:3]
        summary = "🏆 Badge Leaderboard:\n"
        
        medals = ["🥇", "🥈", "🥉"]
        for i, entry in enumerate(top_3):
            medal = medals[i] if i < 3 else "🏅"
            latest_badges = ", ".join(entry['latest_badges'][-2:])  # Show 2 latest
            summary += f"{medal} {entry['handle']}: {entry['badge_count']} badges ({latest_badges})\n"
        
        return summary.strip()
    
    def get_milestone_encouragement(self, handle: str, current_streak: int):
        """Get specific encouragement based on proximity to next milestone"""
        clean_handle = handle.lstrip('@')
        next_milestone = get_next_streak_milestone(current_streak)
        
        if not next_milestone:
            return f"🔥 {handle} is already in the Century Club! Legendary dedication! 👑"
        
        days_needed = next_milestone['days_needed']
        badge_name = next_milestone['badge_name']
        
        if days_needed == 1:
            return f"⚡ {handle}: Just 1 more day until {badge_name}! You've got this! 🎯"
        elif days_needed <= 3:
            return f"🔥 {handle}: Only {days_needed} days from {badge_name}! Keep that streak alive! 💪"
        elif days_needed <= 7:
            return f"📈 {handle}: {days_needed} days to {badge_name}. Consistency is key! 🗝️"
        else:
            progress = (current_streak / (current_streak + days_needed)) * 100
            return f"🌟 {handle}: {progress:.0f}% toward {badge_name}. Every day counts! ⭐"

# Example usage for @streaks-agent
def demo_usage():
    """Demo how @streaks-agent would use this"""
    agent = StreaksAgentAchievements()
    
    # When someone comes online and streak updates
    handle = "demo_user"
    current_streak = 1
    best_streak = 1
    
    # Check for achievements
    result = agent.check_user_for_new_badges(handle, current_streak, best_streak)
    
    print("Achievement check result:")
    for key, value in result.items():
        print(f"  {key}: {value}")
    
    print("\nAgent would then:")
    if result['celebration_needed']:
        print(f"  1. DM {handle}: {result['dm_message']}")
        if result['board_announcement']:
            print(f"  2. Announce: {result['board_announcement']}")
    
    print(f"  3. Progress: {agent.get_progress_message(handle, current_streak)}")

if __name__ == "__main__":
    demo_usage()