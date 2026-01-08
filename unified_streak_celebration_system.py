#!/usr/bin/env python3
"""
Unified Streak Celebration System for @streaks-agent
Integrates streak tracking, milestone detection, badge awards, and celebrations
"""

import json
from datetime import datetime
from typing import Dict, List, Optional

class UnifiedStreakCelebrationSystem:
    def __init__(self):
        # Milestone definitions
        self.milestones = {
            3: {"name": "Early Bird 🌅", "message": "3 days strong! You're building a habit! 🌱", "tier": "bronze"},
            7: {"name": "Week Warrior 💪", "message": "One week of consistency! You're on fire! 🔥", "tier": "silver"},
            14: {"name": "Consistency King 🔥", "message": "Two weeks! This is becoming who you are! 👑", "tier": "silver"},
            30: {"name": "Monthly Legend 🏆", "message": "30 days! You're a /vibe workshop legend! ✨", "tier": "gold"},
            100: {"name": "Century Club 👑", "message": "100 days! You've transcended to workshop royalty! 💎", "tier": "legendary"}
        }
        
        self.celebration_log = self.load_celebration_log()
        
    def load_celebration_log(self) -> Dict:
        """Load celebration history to avoid duplicate celebrations"""
        try:
            with open('celebration_log.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"milestones": {}, "badges": {}, "last_checked": None}
    
    def save_celebration_log(self):
        """Save celebration log to file"""
        with open('celebration_log.json', 'w') as f:
            json.dump(self.celebration_log, f, indent=2)
    
    def process_user_streaks(self, streak_data: Dict) -> List[Dict]:
        """
        Process current streak data and identify celebration opportunities
        Returns list of celebrations to execute
        """
        celebrations_needed = []
        current_time = datetime.now().isoformat()
        
        for user, data in streak_data.items():
            if not user.startswith('@'):
                user = f"@{user}"
                
            current_streak = data.get('current_streak', 0)
            best_streak = data.get('best_streak', 0)
            
            # Check each milestone
            for threshold, milestone_info in self.milestones.items():
                if current_streak >= threshold:
                    milestone_key = f"{user}_{threshold}"
                    
                    # Check if we've already celebrated this milestone
                    if milestone_key not in self.celebration_log.get("milestones", {}):
                        celebrations_needed.append({
                            "type": "milestone",
                            "user": user,
                            "milestone": milestone_info["name"],
                            "days": threshold,
                            "message": milestone_info["message"],
                            "tier": milestone_info["tier"],
                            "is_personal_best": current_streak == best_streak,
                            "celebration_key": milestone_key
                        })
        
        return celebrations_needed
    
    def create_celebration_dm(self, celebration: Dict) -> str:
        """Create DM message for milestone celebration"""
        user = celebration["user"]
        milestone = celebration["milestone"]
        days = celebration["days"]
        message = celebration["message"]
        
        if celebration["is_personal_best"]:
            dm_text = f"""🎉 Congratulations {user}!

You've achieved {milestone}!

{message}

🏆 NEW PERSONAL BEST: {days} days!

Keep the momentum going - you're building something amazing! ✨"""
        else:
            dm_text = f"""🎉 Congratulations {user}!

You've achieved {milestone}!

{message}

📊 Current streak: {days} days

You're absolutely crushing it! 🚀"""
        
        return dm_text
    
    def create_board_announcement(self, celebration: Dict) -> str:
        """Create board announcement for significant milestones"""
        user = celebration["user"]
        milestone = celebration["milestone"]
        days = celebration["days"]
        tier = celebration["tier"]
        
        # Only announce gold and legendary tier milestones publicly
        if tier in ["gold", "legendary"]:
            return f"🎉 {user} achieved {milestone}! {days} days of consistency! 🔥"
        
        return None
    
    def mark_celebration_complete(self, celebration: Dict):
        """Mark celebration as completed to avoid duplicates"""
        if "milestones" not in self.celebration_log:
            self.celebration_log["milestones"] = {}
        
        celebration_key = celebration["celebration_key"]
        self.celebration_log["milestones"][celebration_key] = {
            "celebrated_at": datetime.now().isoformat(),
            "milestone": celebration["milestone"],
            "days": celebration["days"],
            "user": celebration["user"]
        }
        
        self.celebration_log["last_checked"] = datetime.now().isoformat()
        self.save_celebration_log()
    
    def get_next_milestone_for_user(self, user: str, current_streak: int) -> Optional[Dict]:
        """Get next milestone information for a user"""
        for threshold in sorted(self.milestones.keys()):
            if current_streak < threshold:
                milestone_info = self.milestones[threshold]
                return {
                    "name": milestone_info["name"],
                    "days_required": threshold,
                    "days_remaining": threshold - current_streak,
                    "progress": (current_streak / threshold) * 100
                }
        return None
    
    def generate_progress_report(self, streak_data: Dict) -> str:
        """Generate a progress report for the board"""
        total_users = len(streak_data)
        total_streak_days = sum(data.get('current_streak', 0) for data in streak_data.values())
        avg_streak = total_streak_days / total_users if total_users > 0 else 0
        
        # Count users at each milestone
        milestone_counts = {}
        for threshold in self.milestones.keys():
            count = sum(1 for data in streak_data.values() if data.get('current_streak', 0) >= threshold)
            milestone_counts[threshold] = count
        
        # Find longest current streak
        longest_streak = max((data.get('current_streak', 0) for data in streak_data.values()), default=0)
        
        report = f"""📊 Weekly Streak Progress Report

👥 Active Users: {total_users}
🔥 Total Streak Days: {total_streak_days}
📈 Average Streak: {avg_streak:.1f} days
🏆 Longest Current Streak: {longest_streak} days

🎯 Milestone Progress:"""
        
        for threshold, count in milestone_counts.items():
            milestone_name = self.milestones[threshold]["name"]
            report += f"\n   {milestone_name}: {count} users"
        
        return report
    
    def run_celebration_check(self, current_streak_data: Dict) -> Dict:
        """
        Main method to run celebration check and return action plan
        """
        results = {
            "celebrations_needed": [],
            "dm_messages": [],
            "board_announcements": [],
            "progress_report": None,
            "next_milestones": {}
        }
        
        # Process streaks and find celebrations
        celebrations = self.process_user_streaks(current_streak_data)
        results["celebrations_needed"] = celebrations
        
        # Create messages for each celebration
        for celebration in celebrations:
            dm_message = self.create_celebration_dm(celebration)
            results["dm_messages"].append({
                "user": celebration["user"],
                "message": dm_message
            })
            
            # Check if board announcement is needed
            board_msg = self.create_board_announcement(celebration)
            if board_msg:
                results["board_announcements"].append(board_msg)
        
        # Get next milestones for each user
        for user, data in current_streak_data.items():
            if not user.startswith('@'):
                user = f"@{user}"
            
            next_milestone = self.get_next_milestone_for_user(user, data.get('current_streak', 0))
            if next_milestone:
                results["next_milestones"][user] = next_milestone
        
        # Generate progress report
        results["progress_report"] = self.generate_progress_report(current_streak_data)
        
        return results

def main():
    """Test the unified system with current data"""
    system = UnifiedStreakCelebrationSystem()
    
    # Current streak data from @streaks-agent memory
    current_data = {
        "demo_user": {"current_streak": 1, "best_streak": 1},
        "vibe_champion": {"current_streak": 1, "best_streak": 1}
    }
    
    print("🎉 Unified Streak Celebration System")
    print("=" * 50)
    
    # Run celebration check
    results = system.run_celebration_check(current_data)
    
    print(f"📊 Analysis Results:")
    print(f"   Celebrations needed: {len(results['celebrations_needed'])}")
    print(f"   DM messages to send: {len(results['dm_messages'])}")
    print(f"   Board announcements: {len(results['board_announcements'])}")
    
    # Show next milestones
    print(f"\n🎯 Next Milestones:")
    for user, milestone in results["next_milestones"].items():
        print(f"   {user}: {milestone['days_remaining']} days to {milestone['name']} ({milestone['progress']:.1f}%)")
    
    # Show progress report
    print(f"\n{results['progress_report']}")
    
    if results['celebrations_needed']:
        print(f"\n🎊 Celebrations would be sent:")
        for dm in results['dm_messages']:
            print(f"\n--- DM to {dm['user']} ---")
            print(dm['message'])
    else:
        print(f"\n✅ No new celebrations needed - all current milestones already recognized")
    
    print(f"\n🚀 System Status: Ready for integration with @streaks-agent workflow!")

if __name__ == "__main__":
    main()