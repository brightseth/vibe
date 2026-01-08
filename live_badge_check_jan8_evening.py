#!/usr/bin/env python3
"""
🎖️ Live Badge Check - January 8th Evening
Built by @streaks-agent for /vibe workshop

Real-time badge eligibility check and awards for current users
"""

import json
import datetime
from pathlib import Path

class LiveBadgeCheck:
    def __init__(self):
        self.achievements_file = "achievements.json"
        self.data = self._load_achievements()
        
        # Current streak data (from memory)
        self.current_streaks = {
            "demo_user": {"current": 1, "best": 1},
            "vibe_champion": {"current": 1, "best": 1}
        }
    
    def _load_achievements(self):
        """Load achievements data"""
        try:
            with open(self.achievements_file, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"badges": {}, "user_achievements": {}, "achievement_history": []}
    
    def _save_achievements(self):
        """Save achievements data"""
        with open(self.achievements_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def check_all_users(self):
        """Check all users for badge eligibility"""
        print("🎖️ LIVE BADGE CHECK - January 8th Evening")
        print("=" * 50)
        
        results = {}
        
        for handle, streak_data in self.current_streaks.items():
            print(f"\n👤 {handle}")
            print(f"   Current streak: {streak_data['current']} days")
            print(f"   Best streak: {streak_data['best']} days")
            
            result = self.check_user_badges(handle, streak_data['current'], streak_data['best'])
            results[handle] = result
            
            # Display current badges
            user_badges = self.data.get("user_achievements", {}).get(handle, [])
            if user_badges:
                print(f"   Current badges: {len(user_badges)}")
                for badge in user_badges:
                    print(f"     • {badge['name']}")
            else:
                print("   No badges yet")
            
            # Display new badges if any
            if result['has_new_achievements']:
                print(f"   🎉 NEW BADGES: {len(result['new_badges'])}")
                for badge_id in result['new_badges']:
                    badge_info = self.data['badges'][badge_id]
                    print(f"     • {badge_info['name']} - {badge_info['description']}")
                
                if result['celebration_message']:
                    print(f"   📢 Celebration: {result['celebration_message']}")
            else:
                print("   ✅ No new badges earned")
            
            # Show progress to next
            progress = result.get('progress_to_next', {})
            if progress.get('next_badge'):
                next_badge = progress['next_badge']
                print(f"   🎯 Next goal: {next_badge['name']} in {next_badge['days_needed']} days")
        
        return results
    
    def check_user_badges(self, handle: str, current_streak: int, best_streak: int) -> dict:
        """Check for new badges earned by user"""
        
        # Get user's current badges
        user_badges = self.data.get("user_achievements", {}).get(handle, [])
        earned_badge_ids = [badge["id"] for badge in user_badges]
        
        # Check which badges user should have now
        new_badges = []
        for badge_id, badge_info in self.data.get("badges", {}).items():
            if badge_info["type"] == "streak" and badge_info["threshold"] <= current_streak:
                if badge_id not in earned_badge_ids:
                    new_badges.append(badge_id)
        
        result = {
            'has_new_achievements': len(new_badges) > 0,
            'new_badges': new_badges,
            'celebration_message': '',
            'should_announce_publicly': False,
            'progress_to_next': self._get_progress_to_next(handle, current_streak)
        }
        
        if new_badges:
            # Award the new badges
            for badge_id in new_badges:
                self._award_badge(handle, badge_id, current_streak)
            
            # Generate celebration message
            result['celebration_message'] = self._generate_celebration(handle, new_badges)
            
            # Check if should announce publicly (significant milestones)
            public_badges = ['week_streak', 'consistency_king', 'month_streak', 'century_club']
            result['should_announce_publicly'] = any(badge in public_badges for badge in new_badges)
            
            # Save changes
            self._save_achievements()
        
        return result
    
    def _award_badge(self, handle: str, badge_id: str, streak_value: int):
        """Award a badge to user"""
        badge_info = self.data["badges"][badge_id]
        
        # Add to user achievements
        if handle not in self.data["user_achievements"]:
            self.data["user_achievements"][handle] = []
        
        new_achievement = {
            "id": badge_id,
            "name": badge_info["name"],
            "description": badge_info["description"],
            "earned_at": datetime.datetime.now().isoformat(),
            "criteria": f"streak_days >= {badge_info['threshold']}"
        }
        
        self.data["user_achievements"][handle].append(new_achievement)
        
        # Add to achievement history
        self.data["achievement_history"].append({
            "handle": handle,
            "badge": {
                "id": badge_id,
                "name": badge_info["name"],
                "description": badge_info["description"],
                "earned_at": new_achievement["earned_at"]
            },
            "timestamp": new_achievement["earned_at"]
        })
    
    def _generate_celebration(self, handle: str, badge_ids: list) -> str:
        """Generate celebration message for new badges"""
        badge_messages = {
            "first_day": f"🎉 Welcome to the journey, {handle}! Your first day of consistency counts! 🌱",
            "early_bird": f"🌅 {handle} is an Early Bird! Three days strong - momentum is building! 💪",
            "week_streak": f"💪 {handle} earned Week Warrior! One full week of dedication - incredible! 🔥",
            "consistency_king": f"🔥 {handle} is the Consistency King! Two weeks of commitment - you're unstoppable! 👑",
            "month_streak": f"🏆 {handle} is a Monthly Legend! 30 days of excellence - truly inspiring! ✨",
            "century_club": f"👑 {handle} joined the Century Club! 100 days of mastery - legendary achievement! 🏆"
        }
        
        if len(badge_ids) == 1:
            return badge_messages.get(badge_ids[0], f"🎖️ {handle} earned a new badge!")
        else:
            # Multiple badges - focus on the highest
            highest_badge = max(badge_ids, key=lambda b: self.data["badges"][b]["threshold"])
            return badge_messages.get(highest_badge, f"🎖️ {handle} earned multiple badges!")
    
    def _get_progress_to_next(self, handle: str, current_streak: int) -> dict:
        """Get progress toward next badge"""
        user_badges = self.data.get("user_achievements", {}).get(handle, [])
        earned_badge_ids = [badge["id"] for badge in user_badges]
        
        # Find next badge
        next_badges = []
        for badge_id, badge_info in self.data.get("badges", {}).items():
            if badge_info["type"] == "streak" and badge_info["threshold"] > current_streak:
                if badge_id not in earned_badge_ids:
                    next_badges.append({
                        "id": badge_id,
                        "name": badge_info["name"],
                        "threshold": badge_info["threshold"],
                        "days_needed": badge_info["threshold"] - current_streak
                    })
        
        if next_badges:
            next_badge = min(next_badges, key=lambda b: b["threshold"])
            return {
                "next_badge": next_badge,
                "days_remaining": next_badge["days_needed"],
                "progress_percentage": (current_streak / next_badge["threshold"]) * 100
            }
        
        return {"next_badge": None, "days_remaining": 0, "progress_percentage": 100}
    
    def generate_summary_report(self):
        """Generate a summary report of badge status"""
        print("\n" + "="*50)
        print("📊 BADGE SYSTEM SUMMARY REPORT")
        print("="*50)
        
        # Total badges available
        total_badges = len(self.data.get("badges", {}))
        print(f"📋 Total badges available: {total_badges}")
        
        # Badge types
        badge_types = {}
        for badge_id, badge_info in self.data.get("badges", {}).items():
            badge_type = badge_info.get("type", "unknown")
            badge_types[badge_type] = badge_types.get(badge_type, 0) + 1
        
        print("📊 Badge types:")
        for badge_type, count in badge_types.items():
            print(f"   • {badge_type}: {count} badges")
        
        # User achievements summary
        user_achievements = self.data.get("user_achievements", {})
        print(f"\n👥 Users with badges: {len(user_achievements)}")
        
        total_awarded = sum(len(badges) for badges in user_achievements.values())
        print(f"🏆 Total badges awarded: {total_awarded}")
        
        # Leaderboard
        if user_achievements:
            print("\n🏅 Badge Leaderboard:")
            sorted_users = sorted(
                user_achievements.items(), 
                key=lambda x: len(x[1]), 
                reverse=True
            )
            
            for i, (handle, badges) in enumerate(sorted_users, 1):
                latest_badge = badges[-1]['name'] if badges else "None"
                print(f"   {i}. {handle}: {len(badges)} badges (latest: {latest_badge})")
        
        # Recent achievements
        recent_achievements = self.data.get("achievement_history", [])[-5:]  # Last 5
        if recent_achievements:
            print("\n🎉 Recent Badge Awards:")
            for achievement in reversed(recent_achievements):
                handle = achievement["handle"]
                badge_name = achievement["badge"]["name"]
                earned_date = achievement["timestamp"][:10]  # Just date
                print(f"   • {handle} earned {badge_name} on {earned_date}")

def main():
    """Run the live badge check"""
    checker = LiveBadgeCheck()
    
    # Run badge check for all users
    results = checker.check_all_users()
    
    # Generate summary report
    checker.generate_summary_report()
    
    print("\n" + "="*50)
    print("✅ Live badge check completed!")
    
    # Return celebration messages for any new badges
    celebrations = []
    for handle, result in results.items():
        if result['has_new_achievements'] and result['celebration_message']:
            celebrations.append({
                'handle': handle,
                'message': result['celebration_message'],
                'should_announce': result['should_announce_publicly']
            })
    
    return celebrations

if __name__ == "__main__":
    main()