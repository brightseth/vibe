#!/usr/bin/env python3
"""
Streak Milestone Celebration System for @streaks-agent
Automatically detects milestone achievements and triggers personalized celebrations.
"""

import json
import os
from datetime import datetime, timedelta

class StreakMilestoneCelebrator:
    def __init__(self):
        self.milestone_thresholds = {
            3: {"emoji": "🌱", "title": "Getting Started", "message": "Getting started! 🌱"},
            7: {"emoji": "💪", "title": "Week Strong", "message": "One week strong! 💪"}, 
            14: {"emoji": "🔥", "title": "Two Weeks", "message": "Two weeks! You're committed! 🔥"},
            30: {"emoji": "🏆", "title": "Monthly Legend", "message": "Monthly legend! 🏆"},
            100: {"emoji": "👑", "title": "Century Club", "message": "Century club! 👑"}
        }
        
        self.celebrations_file = "milestone_celebrations.json"
        self.load_celebration_history()
    
    def load_celebration_history(self):
        """Load history of celebrations to avoid duplicates"""
        if os.path.exists(self.celebrations_file):
            with open(self.celebrations_file, 'r') as f:
                self.celebration_history = json.load(f)
        else:
            self.celebration_history = {"users": {}}
    
    def save_celebration_history(self):
        """Save celebration history to prevent duplicates"""
        with open(self.celebrations_file, 'w') as f:
            json.dump(self.celebration_history, f, indent=2)
    
    def has_celebrated_milestone(self, user, milestone):
        """Check if we've already celebrated this milestone for user"""
        user_history = self.celebration_history["users"].get(user, {})
        return str(milestone) in user_history.get("celebrated_milestones", [])
    
    def record_celebration(self, user, milestone):
        """Record that we celebrated this milestone"""
        if user not in self.celebration_history["users"]:
            self.celebration_history["users"][user] = {"celebrated_milestones": []}
        
        self.celebration_history["users"][user]["celebrated_milestones"].append(str(milestone))
        self.celebration_history["users"][user]["last_celebration"] = datetime.now().isoformat()
        self.save_celebration_history()
    
    def check_milestones(self, streak_data):
        """
        Check current streak data for milestone achievements
        Returns list of celebrations needed
        """
        celebrations_needed = []
        
        for user, streak_info in streak_data.items():
            if isinstance(streak_info, str) and "days" in streak_info:
                # Parse "X days (best: Y)" format
                current_streak = int(streak_info.split(" days")[0])
            elif isinstance(streak_info, dict):
                current_streak = streak_info.get("current", 0)
            else:
                current_streak = 0
            
            # Check each milestone
            for threshold, milestone_info in self.milestone_thresholds.items():
                if (current_streak >= threshold and 
                    not self.has_celebrated_milestone(user, threshold)):
                    
                    celebrations_needed.append({
                        "user": user,
                        "milestone": threshold,
                        "current_streak": current_streak,
                        "celebration": milestone_info
                    })
        
        return celebrations_needed
    
    def generate_celebration_message(self, celebration):
        """Generate a personalized celebration message"""
        user = celebration["user"]
        milestone = celebration["milestone"]
        streak = celebration["current_streak"]
        info = celebration["celebration"]
        
        base_message = f"{info['message']}\n\n"
        base_message += f"You've hit {streak} consecutive days in the workshop! "
        
        # Add milestone-specific encouragement
        if milestone == 3:
            base_message += "The momentum is building! Keep showing up and great things happen. 🚀"
        elif milestone == 7:
            base_message += "You've officially formed a habit! One week of consistent participation shows real commitment. 🎯"
        elif milestone == 14:
            base_message += "Two solid weeks! You're not just visiting the workshop - you're becoming part of its heartbeat. ❤️"
        elif milestone == 30:
            base_message += "A full month of dedication! You're now part of the workshop's core culture. You inspire others just by showing up. 🌟"
        elif milestone == 100:
            base_message += "ONE HUNDRED DAYS! You are legendary. Your consistency has shaped this entire workshop. You're not just a participant - you're a pillar of our community. 🏛️"
        
        return base_message
    
    def get_next_milestone(self, current_streak):
        """Get info about the next milestone to reach"""
        for threshold in sorted(self.milestone_thresholds.keys()):
            if current_streak < threshold:
                days_to_go = threshold - current_streak
                info = self.milestone_thresholds[threshold]
                return {
                    "days_to_milestone": days_to_go,
                    "milestone_days": threshold,
                    "title": info["title"],
                    "emoji": info["emoji"]
                }
        return None
    
    def create_motivation_board_post(self, celebrations):
        """Create a board post celebrating multiple milestones"""
        if not celebrations:
            return None
        
        if len(celebrations) == 1:
            cel = celebrations[0]
            return f"🎉 Milestone Achievement! {cel['user']} just hit {cel['milestone']} days! {cel['celebration']['emoji']}"
        else:
            user_list = ", ".join([cel['user'] for cel in celebrations])
            return f"🎉 Multiple milestone achievements today! Celebrating: {user_list}"
    
    def get_celebration_stats(self):
        """Get stats about celebrations given"""
        total_celebrations = 0
        unique_users = set()
        
        for user, data in self.celebration_history["users"].items():
            milestones = data.get("celebrated_milestones", [])
            total_celebrations += len(milestones)
            if milestones:
                unique_users.add(user)
        
        return {
            "total_celebrations": total_celebrations,
            "unique_users_celebrated": len(unique_users),
            "celebration_history": self.celebration_history
        }

# Example usage for @streaks-agent
if __name__ == "__main__":
    celebrator = StreakMilestoneCelebrator()
    
    # Example streak data (format that streaks-agent uses)
    sample_streaks = {
        "@demo_user": "1 days (best: 1)",
        "@vibe_champion": "1 days (best: 1)"
    }
    
    celebrations = celebrator.check_milestones(sample_streaks)
    
    print("🎯 Streak Milestone Celebration System")
    print("=" * 40)
    
    if celebrations:
        print(f"Found {len(celebrations)} celebrations needed:")
        for cel in celebrations:
            print(f"\n🎉 {cel['user']} - {cel['milestone']} days!")
            print(celebrator.generate_celebration_message(cel))
            
            # Record the celebration
            celebrator.record_celebration(cel['user'], cel['milestone'])
    else:
        print("No new milestones to celebrate right now.")
        print("\n📊 Next milestones:")
        for user, streak_str in sample_streaks.items():
            current = int(streak_str.split(" days")[0])
            next_milestone = celebrator.get_next_milestone(current)
            if next_milestone:
                print(f"{user}: {next_milestone['days_to_milestone']} days until {next_milestone['title']} {next_milestone['emoji']}")
    
    # Show stats
    stats = celebrator.get_celebration_stats()
    print(f"\n📈 Celebration Stats:")
    print(f"Total celebrations given: {stats['total_celebrations']}")
    print(f"Users celebrated: {stats['unique_users_celebrated']}")