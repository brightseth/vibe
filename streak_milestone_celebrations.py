#!/usr/bin/env python3
"""
Streak Milestone Celebrations System
Built by @streaks-agent for /vibe workshop

Creates special celebrations when users hit major streak milestones:
- 3 days: "Getting started! 🌱"  
- 7 days: "One week strong! 💪"
- 14 days: "Two weeks! You're committed! 🔥"
- 30 days: "Monthly legend! 🏆"
- 100 days: "Century club! 👑"
"""

import json
import os
from datetime import datetime

class StreakMilestoneCelebrations:
    def __init__(self):
        self.celebrations_file = 'milestone_celebrations.json'
        self.load_celebrations()
        
        # Define milestone thresholds and messages
        self.milestones = {
            3: {
                'title': 'Getting Started',
                'emoji': '🌱',
                'message': 'Getting started! Building that consistency muscle! 🌱',
                'encouragement': 'Keep going - you\'re forming a great habit!',
                'tier': 'starter'
            },
            7: {
                'title': 'One Week Strong', 
                'emoji': '💪',
                'message': 'One week strong! You\'re building real momentum! 💪',
                'encouragement': 'A full week of consistency - that\'s dedication!',
                'tier': 'bronze'
            },
            14: {
                'title': 'Two Week Warrior',
                'emoji': '🔥', 
                'message': 'Two weeks! You\'re committed to the /vibe! 🔥',
                'encouragement': 'Fourteen days straight - you\'re on fire!',
                'tier': 'silver'
            },
            30: {
                'title': 'Monthly Legend',
                'emoji': '🏆',
                'message': 'Monthly legend! Thirty days of pure dedication! 🏆',
                'encouragement': 'A full month! You\'re a true workshop champion!',
                'tier': 'gold'
            },
            100: {
                'title': 'Century Club',
                'emoji': '👑',
                'message': 'Century club! One hundred days of /vibe mastery! 👑',
                'encouragement': 'You\'re workshop royalty! Incredible dedication!',
                'tier': 'legendary'
            }
        }
    
    def load_celebrations(self):
        """Load celebration history"""
        try:
            with open(self.celebrations_file, 'r') as f:
                self.celebrations = json.load(f)
        except FileNotFoundError:
            self.celebrations = {}
    
    def save_celebrations(self):
        """Save celebration history"""
        with open(self.celebrations_file, 'w') as f:
            json.dump(self.celebrations, f, indent=2)
    
    def check_for_celebrations(self, handle, current_streak):
        """Check if user has hit any celebration-worthy milestones"""
        if handle not in self.celebrations:
            self.celebrations[handle] = {'celebrated_milestones': []}
        
        celebrated = self.celebrations[handle]['celebrated_milestones']
        new_celebrations = []
        
        # Check each milestone
        for milestone_days, milestone_info in self.milestones.items():
            # If they've hit this milestone and haven't celebrated it yet
            if current_streak >= milestone_days and milestone_days not in celebrated:
                new_celebrations.append({
                    'milestone': milestone_days,
                    'info': milestone_info,
                    'celebration_date': datetime.now().isoformat()
                })
                
                # Mark as celebrated
                self.celebrations[handle]['celebrated_milestones'].append(milestone_days)
        
        return new_celebrations
    
    def create_celebration_message(self, handle, milestone_info):
        """Create celebration message for DM"""
        milestone = milestone_info['info']
        
        message = f"🎉 {handle} - {milestone['title']}! {milestone['emoji']}\n\n"
        message += f"{milestone['message']}\n\n"
        message += f"{milestone['encouragement']}\n\n"
        message += "Keep up the amazing work! ✨"
        
        return message
    
    def create_board_announcement(self, handle, milestone_info):
        """Create board announcement for major milestones (14+ days)"""
        milestone = milestone_info['info']
        days = milestone_info['milestone']
        
        # Only announce big milestones publicly
        if days >= 14:
            return f"🎉 {handle} hit {days} days! {milestone['emoji']} {milestone['title']}!"
        
        return None
    
    def get_next_milestone(self, current_streak):
        """Get info about next milestone to work toward"""
        next_milestones = [m for m in self.milestones.keys() if m > current_streak]
        
        if not next_milestones:
            return None
        
        next_milestone = min(next_milestones)
        days_to_go = next_milestone - current_streak
        
        return {
            'days': next_milestone,
            'info': self.milestones[next_milestone],
            'days_remaining': days_to_go
        }
    
    def get_user_milestone_progress(self, handle):
        """Get user's milestone celebration history"""
        if handle not in self.celebrations:
            return {'celebrated_milestones': [], 'total_celebrations': 0}
        
        celebrated = self.celebrations[handle]['celebrated_milestones']
        return {
            'celebrated_milestones': sorted(celebrated),
            'total_celebrations': len(celebrated),
            'highest_milestone': max(celebrated) if celebrated else 0
        }

def main():
    """Test the celebration system"""
    print("🎉 Streak Milestone Celebrations System")
    print("=" * 45)
    
    celebration_system = StreakMilestoneCelebrations()
    
    # Test with current users
    test_users = [
        ('demo_user', 1),
        ('vibe_champion', 1)
    ]
    
    total_celebrations = 0
    
    for handle, streak in test_users:
        print(f"\n👤 Checking {handle} (streak: {streak} days)")
        
        # Check for new celebrations
        new_celebrations = celebration_system.check_for_celebrations(handle, streak)
        
        if new_celebrations:
            total_celebrations += len(new_celebrations)
            print(f"   🎉 NEW CELEBRATIONS: {len(new_celebrations)}")
            
            for celebration in new_celebrations:
                milestone_info = celebration['info']
                days = celebration['milestone']
                
                print(f"\n   🎊 MILESTONE: {days} days - {milestone_info['title']}")
                
                # Create celebration message
                dm_message = celebration_system.create_celebration_message(handle, celebration)
                print(f"   📱 DM Message:")
                print(f"      {dm_message}")
                
                # Check if board announcement needed
                board_msg = celebration_system.create_board_announcement(handle, celebration)
                if board_msg:
                    print(f"   📢 Board Announcement: {board_msg}")
        else:
            print(f"   ❌ No new celebrations (current: {streak} days)")
        
        # Show next milestone
        next_milestone = celebration_system.get_next_milestone(streak)
        if next_milestone:
            print(f"   🎯 Next milestone: {next_milestone['days']} days ({next_milestone['days_remaining']} to go)")
            print(f"      Goal: {next_milestone['info']['title']} {next_milestone['info']['emoji']}")
        
        # Show progress
        progress = celebration_system.get_user_milestone_progress(handle)
        print(f"   📊 Milestone history: {progress['celebrated_milestones']} ({progress['total_celebrations']} total)")
    
    # Save any new celebrations
    if total_celebrations > 0:
        celebration_system.save_celebrations()
        print(f"\n💾 Saved {total_celebrations} new celebrations!")
    else:
        print(f"\n📊 No new celebrations. Users need 3+ day streaks for first milestone!")
    
    print(f"\n🎯 Milestone System Status:")
    print(f"   • Available milestones: {list(celebration_system.milestones.keys())}")
    print(f"   • Users tracked: {len(test_users)}")
    print(f"   • New celebrations: {total_celebrations}")

if __name__ == "__main__":
    main()