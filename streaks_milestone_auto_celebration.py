#!/usr/bin/env python3
"""
Automatic milestone celebration system for streaks-agent
Triggers celebrations for streak milestones without requiring manual checks
"""
import json
import os
from datetime import datetime

class MilestoneCelebrator:
    def __init__(self):
        self.milestone_thresholds = {
            3: {"message": "Getting started! 🌱", "tier": "bronze"},
            7: {"message": "One week strong! 💪", "tier": "silver"}, 
            14: {"message": "Two weeks! You're committed! 🔥", "tier": "silver"},
            30: {"message": "Monthly legend! 🏆", "tier": "gold"},
            50: {"message": "Fifty days strong! 💎", "tier": "platinum"},
            100: {"message": "Century club! 👑", "tier": "diamond"},
            200: {"message": "Legendary dedication! ⭐", "tier": "legendary"},
            365: {"message": "Year-long champion! 🏅", "tier": "legendary"}
        }
        
        self.celebrations_file = 'milestone_celebrations_log.json'
        self.load_celebrations_log()
    
    def load_celebrations_log(self):
        """Load record of past celebrations to avoid duplicates"""
        try:
            with open(self.celebrations_file, 'r') as f:
                self.celebrations_log = json.load(f)
        except FileNotFoundError:
            self.celebrations_log = {}
    
    def save_celebrations_log(self):
        """Save celebrations log"""
        with open(self.celebrations_file, 'w') as f:
            json.dump(self.celebrations_log, f, indent=2)
    
    def check_and_celebrate_milestones(self, streak_data):
        """Check for new milestones and return celebration messages"""
        celebrations = []
        
        for handle, data in streak_data.items():
            if isinstance(data, dict):
                current_streak = data.get('current', 0)
                best_streak = data.get('best', 0)
            else:
                # Handle simple format: "@user: X days (best: Y)"
                parts = str(data).split(' days')
                current_streak = int(parts[0]) if parts[0].isdigit() else 0
                best_streak = current_streak
            
            # Check both current and best streaks for milestones
            for streak_val in [current_streak, best_streak]:
                if streak_val in self.milestone_thresholds:
                    # Check if we've already celebrated this milestone for this user
                    celebration_key = f"{handle}_{streak_val}"
                    
                    if celebration_key not in self.celebrations_log:
                        milestone_data = self.milestone_thresholds[streak_val]
                        
                        celebration = {
                            'handle': handle.replace('@', ''),
                            'milestone_days': streak_val,
                            'message': milestone_data['message'],
                            'tier': milestone_data['tier'],
                            'timestamp': datetime.now().isoformat(),
                            'current_streak': current_streak,
                            'best_streak': best_streak
                        }
                        
                        celebrations.append(celebration)
                        
                        # Log this celebration
                        self.celebrations_log[celebration_key] = celebration
        
        if celebrations:
            self.save_celebrations_log()
        
        return celebrations
    
    def format_celebration_dm(self, celebration):
        """Format a celebratory DM message"""
        handle = celebration['handle']
        days = celebration['milestone_days']
        message = celebration['message']
        tier = celebration['tier']
        
        dm_text = f"""🎉 MILESTONE ACHIEVED! 🎉

{handle}, you've hit {days} days! {message}

Your dedication is inspiring the whole workshop. Keep that momentum going! 

{self._get_tier_encouragement(tier)}

— Your friendly streaks tracker ✨"""
        
        return dm_text
    
    def format_board_announcement(self, celebration):
        """Format announcement for the board"""
        handle = celebration['handle']
        days = celebration['milestone_days'] 
        message = celebration['message']
        
        return f"🎉 @{handle} just hit {days} days! {message} Keep it up! 🚀"
    
    def _get_tier_encouragement(self, tier):
        """Get tier-specific encouragement"""
        encouragements = {
            'bronze': "You're building the foundation of consistency! 🔥",
            'silver': "You're in the flow now! This is where the magic happens ⚡",
            'gold': "You're a workshop legend! Others look up to your consistency 🌟",
            'platinum': "Exceptional dedication! You're in the top tier 💎",
            'diamond': "Elite level commitment! You're truly special 👑",
            'legendary': "You've transcended! Pure inspiration ⭐"
        }
        return encouragements.get(tier, "Amazing work! 🎊")
    
    def get_celebration_stats(self):
        """Get stats on celebrations"""
        return {
            'total_celebrations': len(self.celebrations_log),
            'unique_users': len(set(k.split('_')[0] for k in self.celebrations_log.keys())),
            'recent_celebrations': [
                c for c in self.celebrations_log.values() 
                if isinstance(c, dict) and 'timestamp' in c
            ][-5:]  # Last 5 celebrations
        }

def main():
    """Test the milestone celebration system"""
    celebrator = MilestoneCelebrator()
    
    # Test with current streak data
    test_streak_data = {
        '@demo_user': {'current': 1, 'best': 1},
        '@vibe_champion': {'current': 1, 'best': 1},
        '@test_user': {'current': 7, 'best': 7},  # Should trigger week celebration
        '@veteran_user': {'current': 30, 'best': 30}  # Should trigger month celebration
    }
    
    print("🎉 MILESTONE CELEBRATION SYSTEM TEST")
    print("=" * 50)
    
    celebrations = celebrator.check_and_celebrate_milestones(test_streak_data)
    
    if celebrations:
        print(f"Found {len(celebrations)} new milestones to celebrate!")
        
        for celebration in celebrations:
            print(f"\n🎊 CELEBRATION for @{celebration['handle']}")
            print(f"   Milestone: {celebration['milestone_days']} days")
            print(f"   Message: {celebration['message']}")
            print(f"   Tier: {celebration['tier']}")
            print("\n📱 DM Message:")
            print(celebrator.format_celebration_dm(celebration))
            print("\n📢 Board Announcement:")
            print(celebrator.format_board_announcement(celebration))
            print("-" * 30)
    else:
        print("No new milestones to celebrate right now.")
    
    # Show celebration stats
    stats = celebrator.get_celebration_stats()
    print(f"\n📊 CELEBRATION STATS")
    print(f"   Total celebrations: {stats['total_celebrations']}")
    print(f"   Unique users celebrated: {stats['unique_users']}")
    
    return celebrator

if __name__ == "__main__":
    main()