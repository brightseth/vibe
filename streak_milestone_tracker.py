#!/usr/bin/env python3
"""
Streak Milestone Tracker for @streaks-agent
Visual progress tracking toward next badge milestones
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List

class MilestoneTracker:
    def __init__(self):
        self.milestones = [
            {"days": 1, "name": "First Day", "emoji": "🌱", "message": "Welcome to the journey!"},
            {"days": 3, "name": "Getting Started", "emoji": "🌿", "message": "Building momentum!"},
            {"days": 7, "name": "Week Streak", "emoji": "🔥", "message": "One week strong!"},
            {"days": 14, "name": "Two Week Hero", "emoji": "💪", "message": "You're committed!"},
            {"days": 30, "name": "Monthly Legend", "emoji": "👑", "message": "Incredible dedication!"},
            {"days": 50, "name": "Halfway Hero", "emoji": "⭐", "message": "Halfway to 100!"},
            {"days": 100, "name": "Century Club", "emoji": "💎", "message": "Legendary achievement!"},
            {"days": 365, "name": "Year Warrior", "emoji": "🏆", "message": "A full year of dedication!"}
        ]
        
    def get_next_milestone(self, current_streak: int) -> Dict:
        """Get the next milestone for a user's current streak"""
        for milestone in self.milestones:
            if current_streak < milestone["days"]:
                days_remaining = milestone["days"] - current_streak
                progress_percent = (current_streak / milestone["days"]) * 100
                
                return {
                    "milestone": milestone,
                    "days_remaining": days_remaining,
                    "progress_percent": progress_percent,
                    "is_close": days_remaining <= 3
                }
        
        # If they've passed all milestones
        return {
            "milestone": {"name": "Legend Status", "emoji": "🚀", "days": current_streak},
            "days_remaining": 0,
            "progress_percent": 100,
            "is_close": False
        }
    
    def create_progress_bar(self, progress_percent: float, width: int = 20) -> str:
        """Create a visual progress bar"""
        filled = int((progress_percent / 100) * width)
        bar = "█" * filled + "░" * (width - filled)
        return f"[{bar}] {progress_percent:.1f}%"
    
    def get_milestone_visualization(self, handle: str, current_streak: int, best_streak: int) -> str:
        """Create a visual milestone tracking display"""
        next_milestone = self.get_next_milestone(current_streak)
        milestone = next_milestone["milestone"]
        
        lines = []
        lines.append(f"🎯 MILESTONE TRACKER - {handle}")
        lines.append("=" * 40)
        lines.append(f"Current Streak: {current_streak} days")
        lines.append(f"Best Streak: {best_streak} days")
        lines.append("")
        
        # Progress toward next milestone
        if next_milestone["days_remaining"] > 0:
            lines.append(f"🎯 Next: {milestone['name']} {milestone['emoji']}")
            lines.append(f"Target: {milestone['days']} days")
            lines.append(f"Progress: {self.create_progress_bar(next_milestone['progress_percent'])}")
            lines.append(f"Days remaining: {next_milestone['days_remaining']}")
            
            if next_milestone["is_close"]:
                lines.append("⚡ You're so close! Keep going!")
            elif next_milestone["days_remaining"] <= 7:
                lines.append("💪 Less than a week to go!")
        else:
            lines.append(f"🎉 You've achieved {milestone['name']} status!")
            lines.append("🚀 Keep going to set new records!")
        
        lines.append("")
        
        # Show milestone ladder
        lines.append("🏆 MILESTONE LADDER")
        lines.append("-" * 20)
        
        for milestone in self.milestones:
            status = ""
            if current_streak >= milestone["days"]:
                status = "✅"
            elif current_streak >= milestone["days"] * 0.8:  # Close to milestone
                status = "🟡"
            else:
                status = "⭕"
            
            lines.append(f"{status} {milestone['emoji']} {milestone['name']} ({milestone['days']} days)")
        
        return "\\n".join(lines)
    
    def get_encouragement_message(self, current_streak: int, best_streak: int) -> str:
        """Get an encouraging message based on current progress"""
        next_milestone = self.get_next_milestone(current_streak)
        
        if current_streak == 0:
            return "🌱 Start your streak journey today! Every expert was once a beginner."
        
        if current_streak == best_streak:
            return "🔥 You're on your personal best! Keep the momentum going!"
        
        if next_milestone["is_close"]:
            return f"⚡ Just {next_milestone['days_remaining']} more days to {next_milestone['milestone']['name']}!"
        
        messages = [
            "💪 Consistency beats intensity. Keep showing up!",
            "🎯 Small daily actions lead to big results.",
            "🚀 Every day you show up, you're building something amazing.",
            "✨ Progress, not perfection. You're doing great!",
            "🌟 The magic happens when you stay consistent."
        ]
        
        import random
        return random.choice(messages)
    
    def create_weekly_recap(self, handle: str, streak_data: Dict) -> str:
        """Create a weekly recap message"""
        current_streak = streak_data.get("current", 0)
        best_streak = streak_data.get("best", 0)
        
        lines = []
        lines.append(f"📊 WEEKLY RECAP - {handle}")
        lines.append("=" * 30)
        lines.append(f"Current Streak: {current_streak} days")
        lines.append(f"Best Ever: {best_streak} days")
        
        # Progress this week
        if current_streak >= 7:
            completed_weeks = current_streak // 7
            lines.append(f"🗓️ Completed Weeks: {completed_weeks}")
        
        # Next milestone
        next_milestone = self.get_next_milestone(current_streak)
        if next_milestone["days_remaining"] > 0:
            milestone = next_milestone["milestone"]
            lines.append(f"🎯 Working toward: {milestone['name']} {milestone['emoji']}")
            lines.append(f"   {next_milestone['days_remaining']} days to go!")
        
        lines.append("")
        lines.append(self.get_encouragement_message(current_streak, best_streak))
        
        return "\\n".join(lines)

def main():
    tracker = MilestoneTracker()
    
    # Test with current user data
    test_users = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    for handle, streak_data in test_users.items():
        print(tracker.get_milestone_visualization(handle, streak_data["current"], streak_data["best"]))
        print("\\n" + "="*50 + "\\n")
        
        print(tracker.create_weekly_recap(handle, streak_data))
        print("\\n" + "="*50 + "\\n")

if __name__ == "__main__":
    main()