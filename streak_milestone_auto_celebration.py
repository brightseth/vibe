#!/usr/bin/env python3
"""
🎉 Streak Milestone Auto-Celebration System
Built by @streaks-agent for /vibe workshop gamification

Automatically celebrates when users hit major streak milestones:
- 3 days: "Getting started! 🌱"  
- 7 days: "One week strong! 💪"
- 14 days: "Two weeks! You're committed! 🔥"
- 30 days: "Monthly legend! 🏆"
- 100 days: "Century club! 👑"

Integrates with existing badge system and streak tracking.
"""

import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional

class StreakMilestoneCelebrator:
    def __init__(self):
        self.milestone_thresholds = {
            3: {
                "title": "Getting Started! 🌱",
                "message": "Three consecutive days of activity! You're building the habit! ⚡",
                "badge": "early_bird",
                "celebration_level": "dm"  # personal DM only
            },
            7: {
                "title": "One Week Strong! 💪",
                "message": "Seven days of consistency! That's real commitment to the /vibe! 🔥",
                "badge": "week_streak", 
                "celebration_level": "dm_and_mention"  # DM + light board mention
            },
            14: {
                "title": "Two Weeks! You're Committed! 🔥",
                "message": "Fourteen days of workshop engagement! You're really finding your rhythm! ✨",
                "badge": "consistency_king",
                "celebration_level": "dm_and_announce"  # DM + board announcement
            },
            30: {
                "title": "Monthly Legend! 🏆", 
                "message": "THIRTY consecutive days! You've made the /vibe a real part of your life! 🚀",
                "badge": "month_streak",
                "celebration_level": "full_celebration"  # DM + board + special recognition
            },
            100: {
                "title": "Century Club! 👑",
                "message": "ONE HUNDRED DAYS! You are /vibe workshop royalty! This is incredible dedication! 🎉✨👑",
                "badge": "century_club", 
                "celebration_level": "legendary"  # Full fanfare
            }
        }
        
        self.celebrations_file = "milestone_celebrations.json"
        self.streaks_file = "streak_data.json"
        self.achievements_file = "achievements.json"
        
        self.load_celebration_history()
    
    def load_celebration_history(self):
        """Load history of celebrations to avoid duplicates"""
        try:
            if os.path.exists(self.celebrations_file):
                with open(self.celebrations_file, 'r') as f:
                    self.celebration_history = json.load(f)
            else:
                self.celebration_history = {
                    "celebrated_milestones": {},
                    "celebration_log": []
                }
        except Exception as e:
            print(f"Error loading celebration history: {e}")
            self.celebration_history = {"celebrated_milestones": {}, "celebration_log": []}
    
    def save_celebration_history(self):
        """Save celebration history to prevent duplicates"""
        try:
            with open(self.celebrations_file, 'w') as f:
                json.dump(self.celebration_history, f, indent=2)
        except Exception as e:
            print(f"Error saving celebration history: {e}")
    
    def load_current_streaks(self) -> Dict:
        """Load current streak data"""
        try:
            if os.path.exists(self.streaks_file):
                with open(self.streaks_file, 'r') as f:
                    return json.load(f)
            else:
                # Mock data for development if file doesn't exist
                return {
                    "demo_user": {"current": 1, "best": 1},
                    "vibe_champion": {"current": 1, "best": 1}
                }
        except Exception as e:
            print(f"Error loading streaks: {e}")
            return {}
    
    def check_milestone_achievements(self) -> List[Tuple[str, int, Dict]]:
        """Check if any users have hit new milestones that haven't been celebrated"""
        streaks = self.load_current_streaks()
        new_milestones = []
        
        for handle, data in streaks.items():
            current_streak = data.get("current", 0)
            
            # Check each milestone threshold
            for threshold, milestone_data in self.milestone_thresholds.items():
                if current_streak >= threshold:
                    # Check if we've already celebrated this milestone for this user
                    celebration_key = f"{handle}_{threshold}"
                    
                    if celebration_key not in self.celebration_history["celebrated_milestones"]:
                        new_milestones.append((handle, threshold, milestone_data))
        
        return new_milestones
    
    def create_celebration_message(self, handle: str, milestone: int, milestone_data: Dict) -> str:
        """Create personalized celebration message"""
        title = milestone_data["title"]
        message = milestone_data["message"]
        
        celebration_msg = f"""🎉 Congratulations @{handle}!

{title}

{message}

Your dedication to the /vibe workshop is inspiring! Keep up the amazing work! ✨

Badge unlocked: {milestone_data.get('badge', 'milestone_achievement')} 🏆"""
        
        return celebration_msg
    
    def create_board_announcement(self, handle: str, milestone: int, milestone_data: Dict) -> str:
        """Create board announcement for major milestones"""
        title = milestone_data["title"]
        
        if milestone == 7:
            return f"🔥 @{handle} just hit a 7-day streak! Week warrior status unlocked! 💪"
        elif milestone == 14:
            return f"⚡ @{handle} is on a 14-day streak! Consistency champion! 🏆"
        elif milestone == 30:
            return f"🚀 @{handle} achieved a MONTHLY STREAK! 30 consecutive days of /vibe! Legend status! 👑"
        elif milestone == 100:
            return f"👑 CENTURY CLUB ALERT! @{handle} has reached 100 consecutive days! Workshop royalty! 🎉✨🏆"
        else:
            return f"🎉 @{handle} hit {milestone} days! {title}"
    
    def record_celebration(self, handle: str, milestone: int, milestone_data: Dict):
        """Record that we celebrated this milestone"""
        celebration_key = f"{handle}_{milestone}"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Mark as celebrated
        self.celebration_history["celebrated_milestones"][celebration_key] = {
            "handle": handle,
            "milestone": milestone,
            "title": milestone_data["title"],
            "celebrated_at": timestamp,
            "celebration_level": milestone_data["celebration_level"]
        }
        
        # Add to log
        self.celebration_history["celebration_log"].append({
            "handle": handle,
            "milestone": milestone,
            "title": milestone_data["title"],
            "timestamp": timestamp,
            "message_type": milestone_data["celebration_level"]
        })
        
        self.save_celebration_history()
    
    def generate_celebration_actions(self) -> List[Dict]:
        """Generate list of celebration actions to take"""
        new_milestones = self.check_milestone_achievements()
        actions = []
        
        for handle, milestone, milestone_data in new_milestones:
            celebration_level = milestone_data["celebration_level"]
            
            # Create DM action
            dm_message = self.create_celebration_message(handle, milestone, milestone_data)
            actions.append({
                "type": "dm",
                "handle": handle,
                "message": dm_message,
                "milestone": milestone,
                "title": milestone_data["title"]
            })
            
            # Create board announcement for higher levels
            if celebration_level in ["dm_and_announce", "full_celebration", "legendary"]:
                board_message = self.create_board_announcement(handle, milestone, milestone_data)
                actions.append({
                    "type": "board_announce",
                    "handle": handle, 
                    "message": board_message,
                    "milestone": milestone,
                    "title": milestone_data["title"]
                })
            
            # Record that we're celebrating this
            self.record_celebration(handle, milestone, milestone_data)
        
        return actions
    
    def get_celebration_summary(self) -> Dict:
        """Get summary of celebration system status"""
        streaks = self.load_current_streaks()
        
        summary = {
            "total_users": len(streaks),
            "users_approaching_milestones": {},
            "recent_celebrations": self.celebration_history["celebration_log"][-5:],  # Last 5
            "total_celebrations": len(self.celebration_history["celebration_log"]),
            "milestone_progress": {}
        }
        
        # Check who's approaching milestones
        for handle, data in streaks.items():
            current_streak = data.get("current", 0)
            
            for threshold in sorted(self.milestone_thresholds.keys()):
                if current_streak < threshold:
                    days_to_go = threshold - current_streak
                    milestone_name = self.milestone_thresholds[threshold]["title"]
                    
                    if handle not in summary["users_approaching_milestones"]:
                        summary["users_approaching_milestones"][handle] = []
                    
                    summary["users_approaching_milestones"][handle].append({
                        "milestone": threshold,
                        "days_remaining": days_to_go,
                        "name": milestone_name
                    })
                    break  # Only show next milestone
        
        return summary


def main():
    """Demo/test the celebration system"""
    celebrator = StreakMilestoneCelebrator()
    
    print("🎉 Streak Milestone Auto-Celebration System")
    print("=" * 50)
    
    # Check for new milestones
    actions = celebrator.generate_celebration_actions()
    
    if actions:
        print(f"📬 {len(actions)} celebration actions generated:")
        for i, action in enumerate(actions, 1):
            print(f"\n{i}. {action['type'].upper()}: {action['handle']}")
            print(f"   Milestone: {action['title']}")
            if action['type'] == 'dm':
                print(f"   Message preview: {action['message'][:100]}...")
            else:
                print(f"   Announcement: {action['message']}")
    else:
        print("✅ No new milestones to celebrate")
    
    # Show system summary
    summary = celebrator.get_celebration_summary()
    print(f"\n📊 System Summary:")
    print(f"   👥 Users tracked: {summary['total_users']}")
    print(f"   🎉 Total celebrations: {summary['total_celebrations']}")
    
    if summary["users_approaching_milestones"]:
        print(f"\n🎯 Users approaching milestones:")
        for handle, milestones in summary["users_approaching_milestones"].items():
            if milestones:
                next_milestone = milestones[0]
                print(f"   @{handle}: {next_milestone['days_remaining']} days to {next_milestone['name']}")
    
    return actions, summary


if __name__ == "__main__":
    actions, summary = main()