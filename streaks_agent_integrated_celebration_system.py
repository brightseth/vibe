#!/usr/bin/env python3
"""
Integrated Celebration System for @streaks-agent
Built to work with agent tools and current streak data

Automatically detects achievements and triggers celebrations via DM and announcements
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple

class StreaksAgentCelebrationSystem:
    def __init__(self, data_file="streaks_celebrations.json"):
        self.data_file = data_file
        self.load_data()
        
    def load_data(self):
        """Load celebration data"""
        if os.path.exists(self.data_file):
            with open(self.data_file, 'r') as f:
                self.data = json.load(f)
        else:
            self.data = {
                "celebrated_milestones": {},
                "celebration_history": [],
                "achievements": self.get_achievement_definitions()
            }
            self.save_data()
    
    def save_data(self):
        """Save celebration data"""
        with open(self.data_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def get_achievement_definitions(self):
        """Define achievements with celebration configs"""
        return {
            "first_day": {
                "name": "First Day",
                "emoji": "🎉",
                "description": "Started your /vibe journey!",
                "streak_threshold": 1,
                "celebrate_dm": True,
                "announce_board": False,
                "message_templates": [
                    "🎉 Welcome to /vibe, {handle}! You've taken your first step! 🌟",
                    "🌟 {handle}, you're officially part of the /vibe community! Day 1 complete!",
                    "🎯 Great start, {handle}! The first day is often the hardest - you've got this!"
                ]
            },
            "seedling": {
                "name": "Seedling",
                "emoji": "🌱", 
                "description": "3 days of growing consistency!",
                "streak_threshold": 3,
                "celebrate_dm": True,
                "announce_board": False,
                "message_templates": [
                    "🌱 {handle}, you're growing! 3 days of consistency - your habits are taking root!",
                    "✨ Look at you, {handle}! 3 days strong and building momentum!",
                    "💪 {handle} is showing real commitment! Day 3 unlocks the Seedling achievement!"
                ]
            },
            "week_warrior": {
                "name": "Week Warrior",
                "emoji": "💪",
                "description": "One full week of dedication!",
                "streak_threshold": 7,
                "celebrate_dm": True,
                "announce_board": True,
                "message_templates": [
                    "💪 WEEK WARRIOR UNLOCKED! {handle}, you've built a real habit now - 7 days strong!",
                    "🔥 {handle} just crushed their first week! Week Warrior status achieved!",
                    "🏆 One full week of dedication, {handle}! You're proving consistency pays off!"
                ]
            },
            "fortnight_force": {
                "name": "Fortnight Force", 
                "emoji": "🔥",
                "description": "Two weeks of unwavering commitment!",
                "streak_threshold": 14,
                "celebrate_dm": True,
                "announce_board": True,
                "message_templates": [
                    "🔥 FORTNIGHT FORCE! {handle}, 14 days of pure dedication! You're on fire!",
                    "⚡ {handle} just hit the 2-week mark! Fortnight Force status achieved!",
                    "💥 Two weeks strong, {handle}! Your consistency is inspiring the whole community!"
                ]
            },
            "monthly_legend": {
                "name": "Monthly Legend",
                "emoji": "🏆",
                "description": "A full month of consistency!",
                "streak_threshold": 30,
                "celebrate_dm": True,
                "announce_board": True,
                "message_templates": [
                    "🏆 MONTHLY LEGEND ACHIEVED! {handle}, 30 days of dedication! You're a true /vibe legend!",
                    "👑 {handle} just unlocked Monthly Legend status! 30 days of unwavering commitment!",
                    "🌟 One full month, {handle}! You've proven that consistency creates magic!"
                ]
            },
            "century_club": {
                "name": "Century Club",
                "emoji": "👑",
                "description": "100 days of legendary dedication!",
                "streak_threshold": 100,
                "celebrate_dm": True,
                "announce_board": True,
                "message_templates": [
                    "👑 CENTURY CLUB! {handle}, 100 days of pure legend! You've reached the ultimate milestone!",
                    "🎊 {handle} just joined the Century Club! 100 days of dedication - absolutely incredible!",
                    "✨ One hundred days, {handle}! You're not just consistent - you're legendary!"
                ]
            }
        }
    
    def check_celebrations_needed(self, current_streaks: Dict[str, Dict]) -> List[Dict]:
        """Check what celebrations are needed based on current streaks"""
        celebrations_needed = []
        
        for handle, streak_data in current_streaks.items():
            current_streak = streak_data.get("current", 0)
            
            # Initialize user celebration tracking
            if handle not in self.data["celebrated_milestones"]:
                self.data["celebrated_milestones"][handle] = {}
            
            user_celebrations = self.data["celebrated_milestones"][handle]
            
            # Check each achievement
            for achievement_id, achievement in self.data["achievements"].items():
                threshold = achievement["streak_threshold"]
                
                # User has hit this milestone and we haven't celebrated it
                if (current_streak >= threshold and 
                    achievement_id not in user_celebrations):
                    
                    import random
                    message = random.choice(achievement["message_templates"]).format(handle=handle)
                    
                    celebration = {
                        "handle": handle,
                        "achievement_id": achievement_id,
                        "achievement": achievement,
                        "current_streak": current_streak,
                        "message": message,
                        "dm_needed": achievement["celebrate_dm"],
                        "announce_needed": achievement["announce_board"],
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    celebrations_needed.append(celebration)
                    
                    # Mark as celebrated to avoid duplicates
                    user_celebrations[achievement_id] = {
                        "celebrated_at": datetime.now().isoformat(),
                        "streak_at_celebration": current_streak
                    }
        
        if celebrations_needed:
            self.save_data()
        
        return celebrations_needed
    
    def get_next_milestones(self, current_streaks: Dict[str, Dict]) -> Dict[str, Dict]:
        """Get next milestone info for each user"""
        next_milestones = {}
        
        for handle, streak_data in current_streaks.items():
            current_streak = streak_data.get("current", 0)
            
            # Find next unachieved milestone
            next_milestone = None
            min_distance = float('inf')
            
            for achievement_id, achievement in self.data["achievements"].items():
                threshold = achievement["streak_threshold"]
                
                if threshold > current_streak:
                    distance = threshold - current_streak
                    if distance < min_distance:
                        min_distance = distance
                        next_milestone = {
                            "achievement_id": achievement_id,
                            "achievement": achievement,
                            "days_remaining": distance,
                            "progress_percent": round((current_streak / threshold) * 100, 1)
                        }
            
            if next_milestone:
                next_milestones[handle] = next_milestone
        
        return next_milestones
    
    def get_celebration_summary(self, celebrations: List[Dict]) -> str:
        """Create summary of celebrations for announcement"""
        if not celebrations:
            return "No celebrations needed - tracking streaks"
        
        summary_parts = []
        dm_count = len([c for c in celebrations if c["dm_needed"]])
        announce_count = len([c for c in celebrations if c["announce_needed"]])
        
        summary_parts.append(f"🎊 Processed {len(celebrations)} milestone celebrations")
        
        if dm_count > 0:
            summary_parts.append(f"💌 Sent {dm_count} celebration DMs")
        
        if announce_count > 0:
            summary_parts.append(f"📢 Made {announce_count} board announcements")
        
        # List specific achievements
        for celebration in celebrations:
            achievement = celebration["achievement"]
            handle = celebration["handle"]
            streak = celebration["current_streak"]
            summary_parts.append(f"  {achievement['emoji']} {handle}: {achievement['name']} ({streak} days)")
        
        return "\n".join(summary_parts)
    
    def get_engagement_insights(self, current_streaks: Dict[str, Dict]) -> str:
        """Generate engagement insights for tracking"""
        total_users = len(current_streaks)
        active_users = len([s for s in current_streaks.values() if s.get("current", 0) > 0])
        
        if total_users == 0:
            return "📊 No users tracked yet"
        
        # Calculate streak distribution
        streak_ranges = {"1-3 days": 0, "4-7 days": 0, "8-14 days": 0, "15+ days": 0}
        
        for streak_data in current_streaks.values():
            current = streak_data.get("current", 0)
            if 1 <= current <= 3:
                streak_ranges["1-3 days"] += 1
            elif 4 <= current <= 7:
                streak_ranges["4-7 days"] += 1
            elif 8 <= current <= 14:
                streak_ranges["8-14 days"] += 1
            elif current >= 15:
                streak_ranges["15+ days"] += 1
        
        insights = [f"📊 Tracking {total_users} users ({active_users} active)"]
        
        for range_name, count in streak_ranges.items():
            if count > 0:
                insights.append(f"  {range_name}: {count} users")
        
        return "\n".join(insights)

def main():
    """Test celebration system"""
    system = StreaksAgentCelebrationSystem()
    
    # Test with sample streaks
    sample_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    print("🎊 Testing Celebration System")
    print("=" * 40)
    
    # Check for celebrations
    celebrations = system.check_celebrations_needed(sample_streaks)
    print(f"Celebrations needed: {len(celebrations)}")
    
    for celebration in celebrations:
        print(f"\n🎉 {celebration['handle']}")
        print(f"   Achievement: {celebration['achievement']['name']}")
        print(f"   Message: {celebration['message']}")
        print(f"   DM: {celebration['dm_needed']}")
        print(f"   Announce: {celebration['announce_needed']}")
    
    # Check next milestones
    next_milestones = system.get_next_milestones(sample_streaks)
    print(f"\n🎯 Next Milestones:")
    for handle, milestone in next_milestones.items():
        achievement = milestone["achievement"]
        print(f"   {handle}: {achievement['name']} in {milestone['days_remaining']} days ({milestone['progress_percent']}%)")
    
    # Generate summary
    summary = system.get_celebration_summary(celebrations)
    print(f"\n📋 Summary:")
    print(summary)
    
    # Generate insights  
    insights = system.get_engagement_insights(sample_streaks)
    print(f"\n{insights}")

if __name__ == "__main__":
    main()