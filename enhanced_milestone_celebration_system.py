#!/usr/bin/env python3
"""
Enhanced Milestone Celebration System for /vibe workshop
Automatically triggers special celebrations for major streak milestones
with personalized messages and community announcements.
"""

import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

class EnhancedMilestoneCelebrator:
    def __init__(self):
        self.achievements_file = 'achievements.json'
        self.streaks_file = 'streak_data.json'
        self.celebrations_file = 'milestone_celebrations_log.json'
        
        # Enhanced milestone definitions with special messages
        self.milestones = {
            1: {
                "name": "First Day 🌱",
                "message": "Welcome to your streak journey! Every expert was once a beginner.",
                "celebration_type": "welcome",
                "announcement": False
            },
            3: {
                "name": "Getting Started 🌟",
                "message": "You're building momentum! Three days shows real commitment.",
                "celebration_type": "encouragement", 
                "announcement": False
            },
            7: {
                "name": "Week Warrior 💪",
                "message": "One week strong! You've officially established a habit. Keep the fire burning!",
                "celebration_type": "achievement",
                "announcement": True
            },
            14: {
                "name": "Two Week Champion 🔥",
                "message": "Two weeks of dedication! You're in the top tier of consistent creators. The compound effect is real!",
                "celebration_type": "major_achievement",
                "announcement": True
            },
            30: {
                "name": "Monthly Legend 🏆",
                "message": "30 days of unstoppable momentum! You've transcended streaks - this is lifestyle now. Legendary status unlocked!",
                "celebration_type": "legendary",
                "announcement": True
            },
            50: {
                "name": "Fifty Day Hero 🌟",
                "message": "50 days! You're an inspiration to everyone in the workshop. Your consistency speaks volumes!",
                "celebration_type": "heroic",
                "announcement": True
            },
            100: {
                "name": "Century Club Emperor 👑",
                "message": "ONE HUNDRED DAYS! 👑 You've achieved what less than 1% do. You're workshop royalty now. This deserves a celebration!",
                "celebration_type": "imperial",
                "announcement": True
            },
            365: {
                "name": "Year-Long Legend 🌟👑🎉",
                "message": "365 DAYS! A FULL YEAR of dedication! You've redefined what consistency means. You ARE the workshop spirit!",
                "celebration_type": "transcendent",
                "announcement": True
            }
        }
        
        # Load existing data
        self.celebrations_log = self.load_celebrations_log()
        
    def load_celebrations_log(self) -> Dict:
        """Load the celebrations log to avoid duplicate celebrations"""
        try:
            with open(self.celebrations_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                "celebrations": [],
                "user_milestones": {}
            }
    
    def save_celebrations_log(self):
        """Save the celebrations log"""
        with open(self.celebrations_file, 'w') as f:
            json.dump(self.celebrations_log, f, indent=2, default=str)
    
    def get_current_streaks(self) -> Dict[str, Dict]:
        """Get current streak data for all users"""
        try:
            with open('streak_memory.json', 'r') as f:
                data = json.load(f)
                return data.get('streaks', {})
        except FileNotFoundError:
            # Fallback to achievements data
            try:
                with open(self.achievements_file, 'r') as f:
                    achievements = json.load(f)
                    # Extract streak info from user achievements
                    streaks = {}
                    for user, user_achievements in achievements.get('user_achievements', {}).items():
                        # Find highest streak achievement
                        max_streak = 1
                        for achievement in user_achievements:
                            if 'streak' in achievement.get('description', '').lower():
                                # Extract days from achievement
                                if 'First Day' in achievement.get('name', ''):
                                    max_streak = max(max_streak, 1)
                        streaks[user] = {'current_streak': max_streak, 'best_streak': max_streak}
                    return streaks
            except FileNotFoundError:
                return {}
    
    def has_celebrated(self, user: str, milestone: int) -> bool:
        """Check if we've already celebrated this milestone for this user"""
        user_milestones = self.celebrations_log.get('user_milestones', {})
        return user in user_milestones and milestone in user_milestones[user]
    
    def record_celebration(self, user: str, milestone: int, celebration_data: Dict):
        """Record that we've celebrated this milestone"""
        if 'user_milestones' not in self.celebrations_log:
            self.celebrations_log['user_milestones'] = {}
        if user not in self.celebrations_log['user_milestones']:
            self.celebrations_log['user_milestones'][user] = []
        
        self.celebrations_log['user_milestones'][user].append(milestone)
        self.celebrations_log['celebrations'].append({
            'user': user,
            'milestone': milestone,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            **celebration_data
        })
    
    def create_celebration_message(self, user: str, milestone: int, current_streak: int) -> Dict:
        """Create a personalized celebration message"""
        milestone_data = self.milestones.get(milestone, {
            "name": f"{milestone} Day Streak! 🔥",
            "message": f"Amazing! {milestone} days of consistency!",
            "celebration_type": "milestone",
            "announcement": milestone >= 7
        })
        
        # Personalize the message
        base_message = milestone_data["message"]
        
        # Add streak context if current streak is higher than milestone
        if current_streak > milestone:
            base_message += f" (Currently on day {current_streak}!)"
        
        # Add motivational context based on celebration type
        motivational_suffix = {
            "welcome": " Welcome to the journey! 🚀",
            "encouragement": " You're building something amazing! 🌟",
            "achievement": " This is what dedication looks like! 💎",
            "major_achievement": " You're in rare company now! 🌟",
            "legendary": " Workshop legends are made this way! ⚡",
            "heroic": " Your consistency inspires everyone! 🎯",
            "imperial": " Bow down to true dedication! 🙌",
            "transcendent": " You've transcended streaks - this is mastery! ✨"
        }.get(milestone_data.get("celebration_type", "milestone"), " Keep the momentum! 🔥")
        
        return {
            "milestone_name": milestone_data["name"],
            "personal_message": base_message + motivational_suffix,
            "celebration_type": milestone_data.get("celebration_type", "milestone"),
            "should_announce": milestone_data.get("announcement", False),
            "current_streak": current_streak
        }
    
    def check_and_celebrate_milestones(self) -> List[Dict]:
        """Check all users for new milestone achievements and celebrate them"""
        celebrations_triggered = []
        current_streaks = self.get_current_streaks()
        
        if not current_streaks:
            print("No streak data found")
            return celebrations_triggered
        
        for user, streak_data in current_streaks.items():
            current_streak = streak_data.get('current_streak', 0)
            
            # Check each milestone threshold
            for milestone in sorted(self.milestones.keys()):
                if (current_streak >= milestone and 
                    not self.has_celebrated(user, milestone)):
                    
                    # Create celebration
                    celebration = self.create_celebration_message(user, milestone, current_streak)
                    celebration['user'] = user
                    celebration['milestone'] = milestone
                    
                    # Record the celebration
                    self.record_celebration(user, milestone, celebration)
                    celebrations_triggered.append(celebration)
                    
                    print(f"🎉 NEW MILESTONE: {user} achieved {celebration['milestone_name']}!")
        
        # Save updated log
        if celebrations_triggered:
            self.save_celebrations_log()
        
        return celebrations_triggered
    
    def generate_celebration_summary(self) -> Dict:
        """Generate a summary of recent celebrations and upcoming milestones"""
        current_streaks = self.get_current_streaks()
        
        summary = {
            "recent_celebrations": [],
            "upcoming_milestones": {},
            "celebration_stats": {
                "total_celebrations": len(self.celebrations_log.get('celebrations', [])),
                "users_with_milestones": len(self.celebrations_log.get('user_milestones', {}))
            },
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Recent celebrations (last 7 days)
        recent_threshold = datetime.now(timezone.utc).timestamp() - (7 * 24 * 60 * 60)
        for celebration in self.celebrations_log.get('celebrations', []):
            try:
                celebration_time = datetime.fromisoformat(celebration['timestamp'].replace('Z', '+00:00'))
                if celebration_time.timestamp() > recent_threshold:
                    summary["recent_celebrations"].append(celebration)
            except (ValueError, KeyError):
                continue
        
        # Upcoming milestones for each user
        for user, streak_data in current_streaks.items():
            current_streak = streak_data.get('current_streak', 0)
            
            # Find next milestone
            next_milestones = [m for m in sorted(self.milestones.keys()) if m > current_streak]
            if next_milestones:
                next_milestone = next_milestones[0]
                days_needed = next_milestone - current_streak
                progress_percent = int((current_streak / next_milestone) * 100)
                
                summary["upcoming_milestones"][user] = {
                    "current_streak": current_streak,
                    "next_milestone": next_milestone,
                    "milestone_name": self.milestones[next_milestone]["name"],
                    "days_needed": days_needed,
                    "progress_percent": progress_percent
                }
        
        return summary

def main():
    """Main function to check and celebrate milestones"""
    print("🎯 Enhanced Milestone Celebration System")
    print("=" * 50)
    
    celebrator = EnhancedMilestoneCelebrator()
    
    # Check for new milestone achievements
    new_celebrations = celebrator.check_and_celebrate_milestones()
    
    if new_celebrations:
        print(f"\n🎉 {len(new_celebrations)} NEW CELEBRATIONS TRIGGERED!")
        for celebration in new_celebrations:
            print(f"\n👤 {celebration['user']}")
            print(f"🏆 {celebration['milestone_name']}")
            print(f"💬 {celebration['personal_message']}")
            if celebration['should_announce']:
                print(f"📢 Will announce to workshop!")
    else:
        print("\n📊 No new milestones reached")
    
    # Generate summary
    summary = celebrator.generate_celebration_summary()
    
    print(f"\n📊 CELEBRATION SUMMARY")
    print(f"Recent celebrations: {len(summary['recent_celebrations'])}")
    print(f"Total celebrations ever: {summary['celebration_stats']['total_celebrations']}")
    print(f"Users with milestones: {summary['celebration_stats']['users_with_milestones']}")
    
    # Show upcoming milestones
    if summary["upcoming_milestones"]:
        print(f"\n🎯 UPCOMING MILESTONES")
        for user, milestone_info in summary["upcoming_milestones"].items():
            print(f"{user}: {milestone_info['days_needed']} days to {milestone_info['milestone_name']} ({milestone_info['progress_percent']}%)")
    
    # Save summary to file for dashboard use
    with open('milestone_celebration_summary.json', 'w') as f:
        json.dump(summary, f, indent=2, default=str)
    
    print(f"\n✅ Celebration system complete!")
    return new_celebrations

if __name__ == "__main__":
    main()