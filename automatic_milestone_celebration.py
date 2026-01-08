#!/usr/bin/env python3
"""
Automatic Milestone Celebration System
Detects when users cross streak thresholds and triggers celebrations
"""

import json
from datetime import datetime

class MilestoneCelebrationEngine:
    def __init__(self):
        self.milestones = {
            3: {"name": "Getting started", "icon": "🌱", "message": "Three days strong! You're building momentum!"},
            7: {"name": "Week Warrior", "icon": "💪", "message": "One week strong! You're committed!"},
            14: {"name": "Two Week Legend", "icon": "🔥", "message": "Two weeks! Your dedication is inspiring!"},
            30: {"name": "Monthly Champion", "icon": "🏆", "message": "Monthly legend! 30 days of consistency!"},
            100: {"name": "Century Club", "icon": "👑", "message": "Century club! You are now workshop royalty!"}
        }
        
        self.load_celebration_history()
    
    def load_celebration_history(self):
        """Load history of celebrations to avoid duplicates"""
        try:
            with open('celebration_history.json', 'r') as f:
                self.celebration_history = json.load(f)
        except FileNotFoundError:
            self.celebration_history = {"celebrations": {}}
    
    def save_celebration_history(self):
        """Save celebration history"""
        with open('celebration_history.json', 'w') as f:
            json.dump(self.celebration_history, f, indent=2)
    
    def check_for_celebrations(self, user_handle, current_streak, best_streak):
        """Check if user has crossed any milestone thresholds"""
        celebrations_due = []
        
        # Initialize user celebration history if needed
        if user_handle not in self.celebration_history["celebrations"]:
            self.celebration_history["celebrations"][user_handle] = []
        
        user_celebrations = self.celebration_history["celebrations"][user_handle]
        celebrated_milestones = [c["milestone"] for c in user_celebrations]
        
        # Check each milestone
        for milestone_days in self.milestones.keys():
            if current_streak >= milestone_days and milestone_days not in celebrated_milestones:
                milestone_info = self.milestones[milestone_days]
                
                celebration = {
                    "milestone": milestone_days,
                    "name": milestone_info["name"],
                    "icon": milestone_info["icon"],
                    "message": milestone_info["message"],
                    "current_streak": current_streak,
                    "celebrated_at": datetime.now().isoformat()
                }
                
                celebrations_due.append(celebration)
                
                # Record the celebration
                self.celebration_history["celebrations"][user_handle].append(celebration)
        
        return celebrations_due
    
    def generate_celebration_dm(self, user_handle, celebration):
        """Generate personalized DM for milestone achievement"""
        return f"{celebration['icon']} {celebration['message']} You're at {celebration['current_streak']} days - keep the momentum going!"
    
    def generate_board_announcement(self, user_handle, celebration):
        """Generate board announcement for notable milestones"""
        if celebration['milestone'] >= 7:  # Only announce week+ milestones to board
            return f"🎉 {user_handle} just hit {celebration['current_streak']} days! {celebration['icon']} {celebration['name']}!"
        return None

def main():
    """Test the celebration system with current users"""
    engine = MilestoneCelebrationEngine()
    
    # Current user data (from @streaks-agent memory)
    current_users = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    print("🎉 MILESTONE CELEBRATION CHECK")
    print("=" * 50)
    
    total_celebrations = 0
    
    for user_handle, streak_data in current_users.items():
        print(f"\n{user_handle} (streak: {streak_data['current']} days)")
        
        celebrations = engine.check_for_celebrations(
            user_handle,
            streak_data['current'],
            streak_data['best']
        )
        
        if celebrations:
            for celebration in celebrations:
                print(f"  🎉 CELEBRATION DUE: {celebration['name']} ({celebration['milestone']} days)")
                
                # Generate DM message
                dm_message = engine.generate_celebration_dm(user_handle, celebration)
                print(f"     DM: {dm_message}")
                
                # Generate board announcement if notable
                board_msg = engine.generate_board_announcement(user_handle, celebration)
                if board_msg:
                    print(f"     BOARD: {board_msg}")
                
                total_celebrations += 1
        else:
            print("  ✅ No new celebrations due")
            
            # Show next milestone
            next_milestone = None
            for milestone in sorted(engine.milestones.keys()):
                if streak_data['current'] < milestone:
                    next_milestone = milestone
                    break
            
            if next_milestone:
                days_to_go = next_milestone - streak_data['current']
                milestone_info = engine.milestones[next_milestone]
                print(f"  📍 Next: {milestone_info['name']} in {days_to_go} days ({milestone_info['icon']})")
    
    # Save any new celebrations
    if total_celebrations > 0:
        engine.save_celebration_history()
        print(f"\n💾 Saved {total_celebrations} new celebrations!")
    
    print(f"\n📊 CELEBRATION SYSTEM STATUS:")
    print(f"  Milestone thresholds: {len(engine.milestones)}")
    print(f"  Users tracked: {len(engine.celebration_history['celebrations'])}")
    print(f"  Celebrations this run: {total_celebrations}")
    
    # Show milestone roadmap
    print(f"\n🗺️  MILESTONE ROADMAP:")
    for days, info in sorted(engine.milestones.items()):
        print(f"  {days:3d} days → {info['icon']} {info['name']}")

if __name__ == "__main__":
    main()