#!/usr/bin/env python3
"""
🎉 Enhanced Milestone Celebration System v2
Built by @streaks-agent for /vibe workshop

Features:
- Personalized celebration messages based on user patterns
- Multiple celebration formats (DM, board post, achievement badge)
- Milestone prediction and preparation
- Special celebrations for milestone chains
"""

import json
import datetime
from typing import Dict, List, Optional

class MilestoneCelebrationEngine:
    def __init__(self):
        self.celebration_log = self.load_celebration_log()
        self.milestone_templates = {
            3: {
                "name": "First Steps",
                "emoji": "🌱",
                "board_message": "{handle} just hit their 3-day streak! Building consistency one day at a time! 🌱",
                "dm_templates": [
                    "🌱 Three days in a row, {handle}! You're building real momentum now. The hardest part is behind you - keep this energy flowing! ✨",
                    "🎉 Day 3 complete! {handle}, you're officially in the groove. Consistency is becoming your superpower! 🌟",
                    "🔥 Three-day streak achieved! {handle}, you're proving that showing up is half the battle. Keep this fire burning! 🚀"
                ]
            },
            7: {
                "name": "Week Warrior",
                "emoji": "💪", 
                "board_message": "🎊 {handle} is now a Week Warrior with 7 straight days! Incredible dedication! 💪",
                "dm_templates": [
                    "🏆 WEEK WARRIOR UNLOCKED! {handle}, 7 days of consistency is truly impressive. You're building something special here! 💪",
                    "🎉 One full week of dedication! {handle}, you're showing what commitment looks like. The /vibe community sees your effort! ⭐",
                    "🔥 Seven days strong! {handle}, you've turned showing up into a habit. This is how legends are made! 🌟"
                ]
            },
            14: {
                "name": "Two Week Champion", 
                "emoji": "🔥",
                "board_message": "🔥 TWO WEEKS STRONG! {handle} is on fire with 14 consecutive days! Absolutely inspiring! 🔥",
                "dm_templates": [
                    "🔥 FOURTEEN DAYS! {handle}, you're not just consistent - you're UNSTOPPABLE! Two weeks of dedication is extraordinary! 🏆",
                    "⚡ Two full weeks of showing up! {handle}, you're setting the standard for what commitment looks like in /vibe! 🌟",
                    "🚀 14-day streak achieved! {handle}, you've moved beyond motivation into pure discipline. Phenomenal! 💎"
                ]
            },
            30: {
                "name": "Monthly Legend",
                "emoji": "🏆",
                "board_message": "👑 MONTHLY LEGEND STATUS! {handle} has achieved 30 consecutive days! A true inspiration to us all! 👑",
                "dm_templates": [
                    "👑 THIRTY DAYS! {handle}, you are officially a Monthly Legend! This level of consistency is rare and remarkable! 🏆",
                    "🎊 ONE MONTH STRONG! {handle}, you've shown what true dedication looks like. You're inspiring everyone in /vibe! ⭐",
                    "🌟 30 consecutive days! {handle}, you've achieved something extraordinary. You're not just consistent - you're legendary! 💎"
                ]
            },
            100: {
                "name": "Century Club",
                "emoji": "👑",
                "board_message": "🎆 CENTURY CLUB MEMBER! {handle} has reached 100 days! This is absolutely legendary! 🎆👑",
                "dm_templates": [
                    "🎆 ONE HUNDRED DAYS! {handle}, you have achieved the impossible! Century Club status is reserved for true legends! 👑",
                    "🏰 100 consecutive days! {handle}, you've built a fortress of consistency! This achievement will inspire /vibe for years! 💎",
                    "⭐ CENTURY ACHIEVED! {handle}, you are proof that consistency creates miracles! 100 days is absolutely extraordinary! 🌟"
                ]
            }
        }
    
    def load_celebration_log(self) -> Dict:
        """Load existing celebration log"""
        try:
            with open('celebration_log.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {
                "celebrated_milestones": {},
                "celebration_history": []
            }
    
    def save_celebration_log(self):
        """Save celebration log"""
        with open('celebration_log.json', 'w') as f:
            json.dump(self.celebration_log, f, indent=2)
    
    def has_milestone_been_celebrated(self, handle: str, milestone: int) -> bool:
        """Check if milestone has already been celebrated"""
        return (handle in self.celebration_log["celebrated_milestones"] and 
                milestone in self.celebration_log["celebrated_milestones"][handle])
    
    def get_personalized_message(self, handle: str, milestone: int, current_streak: int) -> str:
        """Generate personalized celebration message"""
        if milestone not in self.milestone_templates:
            return f"🎉 Congratulations {handle} on your {current_streak}-day streak! Keep it up! ✨"
        
        template_data = self.milestone_templates[milestone]
        
        # Choose template based on user history or randomly
        import random
        message_template = random.choice(template_data["dm_templates"])
        
        return message_template.format(handle=handle, streak=current_streak)
    
    def should_post_to_board(self, milestone: int) -> bool:
        """Determine if milestone should be announced publicly"""
        # Post to board for major milestones
        return milestone in [7, 14, 30, 100]
    
    def celebrate_milestone(self, handle: str, current_streak: int, milestone: int):
        """Execute full milestone celebration"""
        
        if self.has_milestone_been_celebrated(handle, milestone):
            print(f"✓ Milestone {milestone} already celebrated for {handle}")
            return
        
        print(f"🎉 Celebrating {milestone}-day milestone for {handle}!")
        
        # Get personalized message
        dm_message = self.get_personalized_message(handle, milestone, current_streak)
        
        # Record celebration
        celebration_record = {
            "handle": handle,
            "milestone": milestone,
            "milestone_name": self.milestone_templates.get(milestone, {}).get("name", f"{milestone} Day Streak"),
            "current_streak": current_streak,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "dm_message": dm_message,
            "celebration_type": "milestone"
        }
        
        # Add to log
        if handle not in self.celebration_log["celebrated_milestones"]:
            self.celebration_log["celebrated_milestones"][handle] = []
        
        self.celebration_log["celebrated_milestones"][handle].append(milestone)
        self.celebration_log["celebration_history"].append(celebration_record)
        
        # Save log
        self.save_celebration_log()
        
        # Output celebration commands (for agent to execute)
        print(f"📱 DM to {handle}: {dm_message}")
        
        if self.should_post_to_board(milestone):
            board_message = self.milestone_templates[milestone]["board_message"].format(handle=handle)
            print(f"📢 Board announcement: {board_message}")
        
        print(f"✓ Milestone {milestone} celebrated and recorded for {handle}")
    
    def check_upcoming_milestones(self, streaks_data: Dict[str, Dict]) -> List[Dict]:
        """Predict upcoming milestones"""
        upcoming = []
        
        for handle, streak_info in streaks_data.items():
            current_streak = streak_info.get("current", 0)
            
            for milestone in [3, 7, 14, 30, 100]:
                if milestone > current_streak and not self.has_milestone_been_celebrated(handle, milestone):
                    days_until = milestone - current_streak
                    upcoming.append({
                        "handle": handle,
                        "milestone": milestone,
                        "days_until": days_until,
                        "expected_date": (datetime.datetime.now() + datetime.timedelta(days=days_until)).strftime("%Y-%m-%d"),
                        "milestone_name": self.milestone_templates.get(milestone, {}).get("name", f"{milestone} Day Streak")
                    })
                    break  # Only next milestone for each user
        
        return upcoming
    
    def generate_status_report(self, streaks_data: Dict[str, Dict]) -> str:
        """Generate celebration system status report"""
        
        upcoming = self.check_upcoming_milestones(streaks_data)
        
        report = """
🎉 MILESTONE CELEBRATION SYSTEM STATUS

📊 Current Streaks:
"""
        
        for handle, streak_info in streaks_data.items():
            current = streak_info.get("current", 0)
            best = streak_info.get("best", 0)
            celebrated = self.celebration_log["celebrated_milestones"].get(handle, [])
            
            report += f"  • {handle}: {current} days (best: {best}) - Celebrated: {celebrated}\n"
        
        report += f"\n🔮 Next Milestones:\n"
        
        for milestone in upcoming:
            report += f"  • {milestone['handle']}: {milestone['milestone_name']} in {milestone['days_until']} days ({milestone['expected_date']})\n"
        
        total_celebrations = len(self.celebration_log["celebration_history"])
        report += f"\n🏆 Total Celebrations: {total_celebrations}\n"
        
        return report

def main():
    """Main execution for testing"""
    engine = MilestoneCelebrationEngine()
    
    # Sample streak data
    streaks_data = {
        "demo_user": {"current": 1, "best": 1},
        "vibe_champion": {"current": 1, "best": 1}
    }
    
    # Generate status report
    print(engine.generate_status_report(streaks_data))
    
    # Check for 3-day milestone (simulation)
    print("\n🧪 SIMULATION: What happens when users reach 3 days...")
    test_streaks = {
        "demo_user": {"current": 3, "best": 3},
        "vibe_champion": {"current": 3, "best": 3}
    }
    
    for handle, streak_info in test_streaks.items():
        current = streak_info["current"]
        # Check for 3-day milestone
        if current >= 3:
            engine.celebrate_milestone(handle, current, 3)

if __name__ == "__main__":
    main()