#!/usr/bin/env python3
"""
Streak Milestone Celebration System
Built by @streaks-agent for /vibe workshop

Automatically detects milestone achievements and triggers celebrations.
Integrates with badge system and DM notifications.
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class StreakMilestoneCelebrator:
    def __init__(self):
        self.celebration_config = {
            # Milestone thresholds and their celebration styles
            "milestones": {
                1: {
                    "name": "First Day",
                    "emoji": "🌱", 
                    "celebration_type": "welcome",
                    "message_templates": [
                        "🌱 Welcome to /vibe, {handle}! You've taken your first step - this is where consistency begins!",
                        "🎉 Day 1 complete, {handle}! Every journey starts with a single step. You're officially part of the community!",
                        "✨ {handle}, you just planted your first seed in the /vibe garden! Let's watch it grow day by day!"
                    ],
                    "should_announce": False  # DM only for first day
                },
                3: {
                    "name": "Seedling Growth",
                    "emoji": "🌿",
                    "celebration_type": "encouragement", 
                    "message_templates": [
                        "🌿 {handle}, 3 days strong! Your consistency habit is taking root - this is when the magic starts!",
                        "💚 Look at that growth, {handle}! 3 days of dedication shows you're serious about this journey!",
                        "🌱➡️🌿 {handle} just leveled up! Day 3 is when habits begin to form. You're building something beautiful!"
                    ],
                    "should_announce": True,
                    "announce_template": "🌿 {handle} hit their 3-day streak! Growing strong! 💪"
                },
                7: {
                    "name": "Week Warrior",
                    "emoji": "🔥",
                    "celebration_type": "milestone",
                    "message_templates": [
                        "🔥 WEEK WARRIOR UNLOCKED! {handle}, you've built a real habit - 7 days of pure consistency!",
                        "💪 {handle} just crushed their first week! This is where momentum becomes unstoppable!",
                        "🏆 One full week of dedication, {handle}! You're proving that small daily actions create big results!"
                    ],
                    "should_announce": True,
                    "announce_template": "🔥 WEEK WARRIOR! {handle} just completed 7 days of consistency! 🏆"
                },
                14: {
                    "name": "Fortnight Force",
                    "emoji": "💪",
                    "celebration_type": "achievement",
                    "message_templates": [
                        "💪 FORTNIGHT FORCE! {handle}, 14 days of unwavering commitment! You're in the top 10% of habit builders!",
                        "🌟 TWO WEEKS STRONG! {handle} is showing what dedication looks like - this is inspiring!",
                        "⚡ {handle} hit the 2-week milestone! Your consistency is becoming legendary!"
                    ],
                    "should_announce": True,
                    "announce_template": "💪 FORTNIGHT FORCE! {handle} reached 14 days of pure consistency! 🌟"
                },
                30: {
                    "name": "Monthly Legend",
                    "emoji": "👑",
                    "celebration_type": "legendary",
                    "message_templates": [
                        "👑 MONTHLY LEGEND STATUS ACHIEVED! {handle}, 30 days of consistency is extraordinary - you're an inspiration!",
                        "🏆 ONE FULL MONTH! {handle} has shown what true commitment looks like. This is genuinely impressive!",
                        "💎 {handle} just proved that consistency is a superpower! 30 days of dedication - absolutely legendary!"
                    ],
                    "should_announce": True,
                    "announce_template": "👑 MONTHLY LEGEND! {handle} achieved 30 days of consistency! Absolutely inspiring! ✨"
                },
                100: {
                    "name": "Century Club", 
                    "emoji": "💎",
                    "celebration_type": "mythical",
                    "message_templates": [
                        "💎 CENTURY CLUB MEMBER! {handle}, 100 days of consistency is beyond impressive - you're a legend!",
                        "🏆 100 DAYS! {handle} just achieved something incredible. This level of consistency is rare and beautiful!",
                        "👑 {handle} has mastered the art of consistency! 100 days proves you've built something unbreakable!"
                    ],
                    "should_announce": True,
                    "announce_template": "💎 CENTURY CLUB! {handle} achieved 100 days of consistency! This is legendary! 👑"
                }
            }
        }
        self.celebration_log_file = "celebration_log.json"
        self.load_celebration_log()
    
    def load_celebration_log(self):
        """Load history of celebrations to avoid duplicates"""
        try:
            with open(self.celebration_log_file, 'r') as f:
                self.celebration_log = json.load(f)
        except FileNotFoundError:
            self.celebration_log = {
                "celebrated_milestones": {},  # {handle: [milestone_days]}
                "celebration_history": []      # [{handle, milestone, timestamp, message}]
            }
    
    def save_celebration_log(self):
        """Save celebration history"""
        with open(self.celebration_log_file, 'w') as f:
            json.dump(self.celebration_log, f, indent=2)
    
    def has_been_celebrated(self, handle: str, milestone_days: int) -> bool:
        """Check if we've already celebrated this milestone for this user"""
        user_celebrations = self.celebration_log.get("celebrated_milestones", {}).get(handle, [])
        return milestone_days in user_celebrations
    
    def get_milestone_for_streak(self, streak_days: int) -> Optional[Dict]:
        """Get the milestone configuration for a streak length"""
        for milestone_day, config in self.celebration_config["milestones"].items():
            if streak_days == milestone_day:
                return {
                    "days": milestone_day,
                    "config": config
                }
        return None
    
    def get_next_milestone(self, current_streak: int) -> Optional[Dict]:
        """Get the next milestone a user is approaching"""
        for milestone_day in sorted(self.celebration_config["milestones"].keys()):
            if current_streak < milestone_day:
                config = self.celebration_config["milestones"][milestone_day]
                return {
                    "days": milestone_day,
                    "days_remaining": milestone_day - current_streak,
                    "progress_percent": round((current_streak / milestone_day) * 100, 1),
                    "config": config
                }
        return None
    
    def generate_celebration_message(self, handle: str, milestone: Dict) -> str:
        """Generate a personalized celebration message"""
        import random
        
        config = milestone["config"]
        templates = config["message_templates"]
        
        # Choose a random template and personalize it
        template = random.choice(templates)
        return template.format(handle=handle)
    
    def generate_announcement_message(self, handle: str, milestone: Dict) -> Optional[str]:
        """Generate a public announcement message"""
        config = milestone["config"]
        
        if not config.get("should_announce", False):
            return None
        
        template = config.get("announce_template", "")
        return template.format(handle=handle)
    
    def check_and_celebrate_user(self, handle: str, current_streak: int) -> Dict:
        """Check if user hit a milestone and prepare celebration"""
        result = {
            "milestone_hit": False,
            "celebration_needed": False,
            "dm_message": None,
            "announcement": None,
            "milestone_info": None
        }
        
        # Check if current streak matches any milestone
        milestone = self.get_milestone_for_streak(current_streak)
        
        if milestone and not self.has_been_celebrated(handle, milestone["days"]):
            result["milestone_hit"] = True
            result["celebration_needed"] = True
            result["milestone_info"] = milestone
            
            # Generate messages
            result["dm_message"] = self.generate_celebration_message(handle, milestone)
            result["announcement"] = self.generate_announcement_message(handle, milestone)
            
            # Mark as celebrated
            if handle not in self.celebration_log["celebrated_milestones"]:
                self.celebration_log["celebrated_milestones"][handle] = []
            
            self.celebration_log["celebrated_milestones"][handle].append(milestone["days"])
            
            # Log the celebration
            self.celebration_log["celebration_history"].append({
                "handle": handle,
                "milestone": milestone["days"],
                "milestone_name": milestone["config"]["name"],
                "timestamp": datetime.now().isoformat(),
                "dm_message": result["dm_message"],
                "announcement": result["announcement"]
            })
            
            self.save_celebration_log()
        
        return result
    
    def get_user_celebration_stats(self, handle: str) -> Dict:
        """Get celebration statistics for a user"""
        user_celebrations = self.celebration_log.get("celebrated_milestones", {}).get(handle, [])
        history = [entry for entry in self.celebration_log.get("celebration_history", []) 
                  if entry["handle"] == handle]
        
        return {
            "total_milestones_celebrated": len(user_celebrations),
            "milestones": sorted(user_celebrations),
            "last_celebration": history[-1] if history else None,
            "celebration_count": len(history)
        }
    
    def get_celebration_dashboard_data(self) -> Dict:
        """Get data for celebration analytics dashboard"""
        total_celebrations = len(self.celebration_log.get("celebration_history", []))
        unique_users_celebrated = len(self.celebration_log.get("celebrated_milestones", {}))
        
        # Count celebrations by milestone
        milestone_counts = {}
        for entry in self.celebration_log.get("celebration_history", []):
            milestone = entry["milestone"]
            milestone_counts[milestone] = milestone_counts.get(milestone, 0) + 1
        
        # Recent celebrations
        recent = sorted(
            self.celebration_log.get("celebration_history", []),
            key=lambda x: x["timestamp"],
            reverse=True
        )[:5]
        
        return {
            "total_celebrations": total_celebrations,
            "unique_users_celebrated": unique_users_celebrated,
            "celebrations_by_milestone": milestone_counts,
            "recent_celebrations": recent,
            "available_milestones": list(self.celebration_config["milestones"].keys())
        }

def main():
    """Test the celebration system"""
    celebrator = StreakMilestoneCelebrator()
    
    print("🎊 Streak Milestone Celebration System Test")
    print("=" * 50)
    
    # Test scenarios
    test_users = [
        ("@demo_user", 1),
        ("@vibe_champion", 1),
        ("@test_user", 3),
        ("@week_user", 7),
        ("@month_user", 30)
    ]
    
    for handle, streak in test_users:
        print(f"\n👤 Testing {handle} with {streak}-day streak:")
        
        result = celebrator.check_and_celebrate_user(handle, streak)
        
        if result["celebration_needed"]:
            milestone = result["milestone_info"]
            print(f"   🎉 MILESTONE HIT: {milestone['config']['name']} ({milestone['days']} days)")
            print(f"   💬 DM: {result['dm_message'][:50]}...")
            if result['announcement']:
                print(f"   📢 Announcement: {result['announcement']}")
        else:
            print(f"   ✅ No new milestones (or already celebrated)")
        
        # Show next milestone
        next_milestone = celebrator.get_next_milestone(streak)
        if next_milestone:
            days_left = next_milestone['days_remaining']
            progress = next_milestone['progress_percent']
            name = next_milestone['config']['name']
            print(f"   🎯 Next: {name} in {days_left} days ({progress}% progress)")
    
    # Show dashboard data
    print("\n📊 Celebration Dashboard Data:")
    dashboard = celebrator.get_celebration_dashboard_data()
    print(f"   Total Celebrations: {dashboard['total_celebrations']}")
    print(f"   Users Celebrated: {dashboard['unique_users_celebrated']}")
    print(f"   Recent Celebrations: {len(dashboard['recent_celebrations'])}")

if __name__ == "__main__":
    main()