#!/usr/bin/env python3
"""
@streaks-agent Badge Check - Jan 8 2026
Check current users for badge eligibility and award/celebrate them
"""

import json
import os
from datetime import datetime

class StreaksBadgeSystem:
    def __init__(self):
        self.badge_file = 'user_badges.json'
        self.load_badges()
    
    def load_badges(self):
        """Load existing badge data"""
        try:
            with open(self.badge_file, 'r') as f:
                self.user_badges = json.load(f)
        except FileNotFoundError:
            self.user_badges = {}
    
    def save_badges(self):
        """Save badge data"""
        with open(self.badge_file, 'w') as f:
            json.dump(self.user_badges, f, indent=2)
    
    def award_badge(self, handle, badge_id, badge_info):
        """Award a badge to user"""
        if handle not in self.user_badges:
            self.user_badges[handle] = {'badges': [], 'history': []}
        
        # Check if already has badge
        existing_badges = [b['id'] for b in self.user_badges[handle]['badges']]
        if badge_id in existing_badges:
            return False
        
        # Award badge
        badge_data = {
            'id': badge_id,
            'awarded_date': datetime.now().isoformat(),
            **badge_info
        }
        
        self.user_badges[handle]['badges'].append(badge_data)
        self.user_badges[handle]['history'].append({
            'badge': badge_id,
            'date': datetime.now().isoformat(),
            'action': 'awarded'
        })
        
        return True
    
    def check_streak_badges(self, handle, streak_days):
        """Check if user qualifies for streak badges"""
        new_badges = []
        
        # Week Streak (7 days) - Bronze
        if streak_days >= 7:
            awarded = self.award_badge(handle, 'week_streak', {
                'name': 'Week Streak',
                'emoji': '🔥',
                'description': 'Active for 7 consecutive days',
                'tier': 'bronze'
            })
            if awarded:
                new_badges.append('week_streak')
        
        # Month Warrior (30 days) - Silver  
        if streak_days >= 30:
            awarded = self.award_badge(handle, 'month_warrior', {
                'name': 'Month Warrior', 
                'emoji': '⚔️',
                'description': 'Active for 30 consecutive days',
                'tier': 'silver'
            })
            if awarded:
                new_badges.append('month_warrior')
        
        # Century Club (100 days) - Gold
        if streak_days >= 100:
            awarded = self.award_badge(handle, 'century_club', {
                'name': 'Century Club',
                'emoji': '👑', 
                'description': 'Active for 100 consecutive days',
                'tier': 'gold'
            })
            if awarded:
                new_badges.append('century_club')
        
        return new_badges
    
    def get_user_badge_count(self, handle):
        """Get user's current badge count"""
        if handle not in self.user_badges:
            return 0
        return len(self.user_badges[handle]['badges'])
    
    def get_user_badge_display(self, handle):
        """Get badge display string"""
        if handle not in self.user_badges:
            return ""
        
        badges = self.user_badges[handle]['badges']
        if not badges:
            return ""
        
        emojis = ' '.join([b['emoji'] for b in badges])
        count = len(badges)
        return f"{emojis} ({count} badge{'s' if count != 1 else ''})"

def main():
    print("🏆 @streaks-agent Badge Check - Jan 8 2026")
    print("=" * 50)
    
    badge_system = StreaksBadgeSystem()
    
    # Current users from memory
    current_streaks = {
        'demo_user': 1,
        'vibe_champion': 1
    }
    
    total_new_badges = 0
    
    for handle, streak_days in current_streaks.items():
        print(f"\n👤 Checking {handle} (streak: {streak_days} days)")
        
        # Check for new badges
        new_badges = badge_system.check_streak_badges(handle, streak_days)
        
        if new_badges:
            total_new_badges += len(new_badges)
            print(f"   🎉 NEW BADGES: {new_badges}")
            
            # Create celebration message for each badge
            for badge_id in new_badges:
                badge_data = badge_system.user_badges[handle]['badges']
                badge_info = next(b for b in badge_data if b['id'] == badge_id)
                
                print(f"   📣 Celebration for {badge_info['name']}:")
                print(f"      🎉 {handle} earned the \"{badge_info['name']}\" badge! {badge_info['emoji']}")
                print(f"      {badge_info['description']}")
                print(f"      Nice work! Keep up the amazing streak! ✨")
        else:
            print(f"   ❌ No new badges (needs 7+ day streak for first badge)")
        
        # Show current badge status
        badge_display = badge_system.get_user_badge_display(handle)
        badge_count = badge_system.get_user_badge_count(handle)
        
        if badge_display:
            print(f"   ✅ Current badges: {badge_display}")
        else:
            print(f"   📊 Current badges: 0")
    
    # Save any changes
    if total_new_badges > 0:
        badge_system.save_badges()
        print(f"\n💾 Awarded {total_new_badges} new badges and saved to {badge_system.badge_file}")
    else:
        print(f"\n📊 No new badges to award. Users need longer streaks!")
    
    # Summary
    print(f"\n🎯 Badge System Status:")
    print(f"   • Users tracked: {len(current_streaks)}")
    print(f"   • New badges awarded: {total_new_badges}")
    print(f"   • Badge requirement: 7+ days for first badge")
    print(f"   • Current max streak: {max(current_streaks.values())} days")

if __name__ == "__main__":
    main()