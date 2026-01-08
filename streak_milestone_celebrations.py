#!/usr/bin/env python3
"""
Enhanced Milestone Celebration System
Automated celebrations with personalized messages and milestone predictions
Built by @streaks-agent for maximum stickiness
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

class MilestoneCelebrationEngine:
    def __init__(self):
        self.milestones = {
            1: {"name": "First Day 🌱", "message": "Welcome to your streak journey! Every expert was once a beginner.", "color": "#22C55E"},
            3: {"name": "Early Bird 🌅", "message": "Three days strong! You're building momentum!", "color": "#3B82F6"},
            7: {"name": "Week Warrior 💪", "message": "A full week! You're developing a real habit now.", "color": "#A855F7"},
            14: {"name": "Consistency King 🔥", "message": "Two weeks of dedication! You're unstoppable!", "color": "#F59E0B"},
            30: {"name": "Monthly Legend 🏆", "message": "30 days! You've proven you can stick with anything!", "color": "#EF4444"},
            100: {"name": "Century Club 👑", "message": "100 days! You're in the elite tier of consistency!", "color": "#EC4899"}
        }
        
        # Load existing streak data
        self.load_streak_data()
        self.load_achievement_data()
    
    def load_streak_data(self):
        """Load current streak data from the system"""
        # This would integrate with the existing streak system
        self.current_streaks = {
            "demo_user": {"current": 1, "best": 1, "last_active": "2026-01-08"},
            "vibe_champion": {"current": 1, "best": 1, "last_active": "2026-01-08"}
        }
    
    def load_achievement_data(self):
        """Load existing achievement data"""
        try:
            with open("achievements.json", 'r') as f:
                self.achievements = json.load(f)
        except FileNotFoundError:
            self.achievements = {"user_achievements": {}, "achievement_history": []}
    
    def check_milestone_eligibility(self, handle: str, current_streak: int) -> Optional[Dict]:
        """Check if user has reached a new milestone"""
        # Get previously earned milestones
        earned_milestones = set()
        if handle in self.achievements.get("user_achievements", {}):
            for achievement in self.achievements["user_achievements"][handle]:
                for threshold in self.milestones:
                    if achievement["id"] == self.milestone_id_from_threshold(threshold):
                        earned_milestones.add(threshold)
        
        # Find highest milestone they've reached but not been celebrated for
        eligible_milestones = []
        for threshold in sorted(self.milestones.keys()):
            if current_streak >= threshold and threshold not in earned_milestones:
                eligible_milestones.append(threshold)
        
        if eligible_milestones:
            return {
                "threshold": max(eligible_milestones),
                "milestone": self.milestones[max(eligible_milestones)],
                "user": handle
            }
        return None
    
    def milestone_id_from_threshold(self, threshold: int) -> str:
        """Convert milestone threshold to badge ID"""
        milestone_map = {
            1: "first_day",
            3: "early_bird", 
            7: "week_streak",
            14: "consistency_king",
            30: "month_streak",
            100: "century_club"
        }
        return milestone_map.get(threshold, f"milestone_{threshold}")
    
    def predict_next_milestone(self, current_streak: int) -> Dict:
        """Predict when user will hit their next milestone"""
        next_milestones = [t for t in self.milestones.keys() if t > current_streak]
        if next_milestones:
            next_threshold = min(next_milestones)
            days_needed = next_threshold - current_streak
            estimated_date = datetime.now() + timedelta(days=days_needed)
            
            return {
                "threshold": next_threshold,
                "milestone": self.milestones[next_threshold],
                "days_needed": days_needed,
                "estimated_date": estimated_date.strftime("%B %d"),
                "progress_percent": (current_streak / next_threshold) * 100
            }
        return {
            "threshold": None,
            "milestone": {"name": "Milestone Master!", "message": "You've conquered all our milestones!"},
            "days_needed": 0,
            "estimated_date": "Complete!",
            "progress_percent": 100
        }
    
    def generate_celebration_message(self, milestone_data: Dict) -> Dict:
        """Generate personalized celebration message"""
        threshold = milestone_data["threshold"]
        milestone = milestone_data["milestone"]
        user = milestone_data["user"]
        
        # Base celebration message
        celebration = {
            "title": f"🎉 {milestone['name']} Achievement Unlocked!",
            "message": milestone["message"],
            "user": user,
            "color": milestone["color"],
            "timestamp": datetime.now().isoformat(),
            "milestone_day": threshold
        }
        
        # Add context-specific encouragements
        if threshold == 1:
            celebration["encouragement"] = "The hardest part is starting - you did it! 🌟"
        elif threshold == 3:
            celebration["encouragement"] = "Momentum is building! Keep riding the wave! 🌊"
        elif threshold == 7:
            celebration["encouragement"] = "You've proven you can build habits! What's next? 🚀"
        elif threshold == 14:
            celebration["encouragement"] = "Two weeks! You're in the top tier of committed creators! ⭐"
        elif threshold == 30:
            celebration["encouragement"] = "A full month! You've mastered the art of consistency! 🎨"
        elif threshold == 100:
            celebration["encouragement"] = "Century club! You're an inspiration to everyone! 👑"
        
        return celebration
    
    def generate_motivation_message(self, handle: str, current_streak: int) -> Dict:
        """Generate motivational progress update"""
        next_milestone = self.predict_next_milestone(current_streak)
        
        if next_milestone["threshold"]:
            progress_bar = self.create_progress_bar(
                current_streak, 
                next_milestone["threshold"]
            )
            
            return {
                "user": handle,
                "current_streak": current_streak,
                "message": f"Day {current_streak} complete! 📅",
                "next_milestone": next_milestone["milestone"]["name"],
                "progress_bar": progress_bar,
                "days_remaining": next_milestone["days_needed"],
                "estimated_completion": next_milestone["estimated_date"],
                "motivation": self.get_daily_motivation(current_streak),
                "timestamp": datetime.now().isoformat()
            }
        
        return {
            "user": handle,
            "current_streak": current_streak,
            "message": f"Day {current_streak} - Milestone master! 🏆",
            "motivation": "You've conquered all milestones! You're an inspiration! 👑"
        }
    
    def create_progress_bar(self, current: int, target: int, length: int = 10) -> str:
        """Create visual progress bar"""
        filled = int((current / target) * length)
        empty = length - filled
        return "█" * filled + "░" * empty + f" {current}/{target}"
    
    def get_daily_motivation(self, streak_day: int) -> str:
        """Get motivational message based on streak day"""
        motivations = {
            1: "Great start! Tomorrow builds on today! 💪",
            2: "Two days! Momentum is everything! 🔥", 
            3: "Three days! You're forming a habit! 🌱",
            4: "Four days! Consistency is your superpower! ⚡",
            5: "Five days! You're on fire! 🚀",
            6: "Six days! Almost a full week! 📅",
            7: "Seven days! Week warrior achieved! 💪",
            8: "Eight days! Into your second week! 🌟",
            14: "Two weeks! You're unstoppable! 🔥",
            21: "21 days! Habit formation complete! 🧠",
            30: "30 days! Monthly legend status! 🏆"
        }
        
        return motivations.get(streak_day, 
            f"Day {streak_day}! Every day you show up matters! ✨"
        )
    
    def check_all_users_for_celebrations(self) -> List[Dict]:
        """Check all users for milestone celebrations needed"""
        celebrations_needed = []
        
        for handle, streak_data in self.current_streaks.items():
            milestone_data = self.check_milestone_eligibility(
                handle, 
                streak_data["current"]
            )
            
            if milestone_data:
                celebration = self.generate_celebration_message(milestone_data)
                celebrations_needed.append(celebration)
        
        return celebrations_needed
    
    def generate_daily_progress_updates(self) -> List[Dict]:
        """Generate daily progress messages for all users"""
        updates = []
        
        for handle, streak_data in self.current_streaks.items():
            update = self.generate_motivation_message(
                handle, 
                streak_data["current"]
            )
            updates.append(update)
        
        return updates
    
    def save_celebration_history(self, celebration: Dict):
        """Save celebration to history"""
        history_entry = {
            "user": celebration["user"],
            "milestone": celebration["title"],
            "day": celebration["milestone_day"],
            "celebrated_at": celebration["timestamp"],
            "message_sent": True
        }
        
        # Add to achievements file
        if "celebration_history" not in self.achievements:
            self.achievements["celebration_history"] = []
        
        self.achievements["celebration_history"].append(history_entry)
        
        # Save back to file
        with open("achievements.json", 'w') as f:
            json.dump(self.achievements, f, indent=2)

def main():
    """Demo the celebration system"""
    engine = MilestoneCelebrationEngine()
    
    print("🎉 Milestone Celebration Engine")
    print("=" * 50)
    
    # Check for celebrations needed
    celebrations = engine.check_all_users_for_celebrations()
    
    if celebrations:
        print(f"🎊 {len(celebrations)} celebrations ready!")
        for celebration in celebrations:
            print(f"\n🎉 {celebration['title']}")
            print(f"👤 User: {celebration['user']}")
            print(f"💬 Message: {celebration['message']}")
            print(f"✨ Encouragement: {celebration['encouragement']}")
            
    else:
        print("📅 No new milestones reached")
    
    # Generate daily progress updates
    print(f"\n📈 Daily Progress Updates")
    print("-" * 30)
    
    updates = engine.generate_daily_progress_updates()
    for update in updates:
        print(f"\n👤 {update['user']}")
        print(f"📊 {update['message']}")
        if "progress_bar" in update:
            print(f"🎯 Next: {update['next_milestone']}")
            print(f"📈 Progress: {update['progress_bar']}")
            print(f"⏰ {update['days_remaining']} days until {update['estimated_completion']}")
        print(f"💪 {update['motivation']}")
    
    # Show upcoming milestones for planning
    print(f"\n🎯 Upcoming Milestones")
    print("-" * 25)
    
    for handle, streak_data in engine.current_streaks.items():
        next_milestone = engine.predict_next_milestone(streak_data["current"])
        if next_milestone["threshold"]:
            print(f"{handle}: {next_milestone['milestone']['name']} in {next_milestone['days_needed']} days")
            print(f"   Progress: {next_milestone['progress_percent']:.1f}%")

if __name__ == "__main__":
    main()