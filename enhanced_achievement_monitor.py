#!/usr/bin/env python3
"""
Enhanced Achievement Monitoring System
Built by @streaks-agent for comprehensive badge tracking and celebration
"""

import json
from datetime import datetime

class AchievementMonitor:
    def __init__(self):
        self.load_data()
    
    def load_data(self):
        """Load streak and achievement data"""
        with open("streak_data.json", 'r') as f:
            self.streak_data = json.load(f)
        
        with open("achievements.json", 'r') as f:
            self.achievement_data = json.load(f)
    
    def save_achievements(self):
        """Save updated achievement data"""
        with open("achievements.json", 'w') as f:
            json.dump(self.achievement_data, f, indent=2)
    
    def check_all_users(self):
        """Check all users for new achievements"""
        print("🎖️ Enhanced Achievement Monitor")
        print("=" * 50)
        
        new_achievements = []
        
        for user, streak_info in self.streak_data["streaks"].items():
            current = streak_info["current"]
            best = streak_info["best"]
            
            print(f"\n👤 {user}")
            print(f"   Current: {current} days | Best: {best} days")
            
            # Check current badges
            user_badges = self.achievement_data.get("user_badges", {}).get(user, [])
            print(f"   Current badges: {len(user_badges)}")
            
            for badge in user_badges:
                print(f"      {badge['emoji']} {badge['name']} (earned day {badge['streak_when_earned']})")
            
            # Check for new achievements
            new_badges = self.check_user_achievements(user, current, best)
            
            if new_badges:
                print(f"   🎉 NEW ACHIEVEMENTS: {len(new_badges)}")
                for badge in new_badges:
                    print(f"      {badge['emoji']} {badge['name']} - {badge['description']}")
                    new_achievements.append((user, badge))
            else:
                print(f"   ✅ No new achievements")
            
            # Show progress to next milestone
            next_milestone = self.get_next_milestone(user, current)
            if next_milestone:
                print(f"   🎯 Next: {next_milestone['name']} in {next_milestone['days_remaining']} days")
                progress = (current / next_milestone['threshold']) * 100
                print(f"   📈 Progress: {progress:.1f}%")
        
        return new_achievements
    
    def check_user_achievements(self, user, current_streak, best_streak):
        """Check what new achievements a user has earned"""
        user_badges = self.achievement_data.get("user_badges", {}).get(user, [])
        earned_badge_ids = [badge.get("badge_id", "") for badge in user_badges]
        
        new_badges = []
        badges = self.achievement_data["badges"]
        
        # Define streak-based achievements to check
        streak_achievements = [
            ("first_day", 1),
            ("week_streak", 7), 
            ("month_streak", 30),
            ("century_club", 100)
        ]
        
        for badge_id, threshold in streak_achievements:
            if current_streak >= threshold and badge_id not in earned_badge_ids:
                if badge_id in badges:
                    badge_info = badges[badge_id].copy()
                    badge_info["badge_id"] = badge_id
                    badge_info["awarded_at"] = datetime.now().isoformat()
                    badge_info["streak_when_earned"] = current_streak
                    badge_info["celebration_sent"] = False
                    
                    # Award the badge
                    if user not in self.achievement_data["user_badges"]:
                        self.achievement_data["user_badges"][user] = []
                    
                    self.achievement_data["user_badges"][user].append(badge_info)
                    
                    # Log it
                    self.achievement_data["achievement_log"].append({
                        "user": user,
                        "badge_id": badge_id,
                        "badge_name": badge_info["name"],
                        "awarded_at": badge_info["awarded_at"],
                        "streak_when_earned": current_streak,
                        "celebration_sent": False
                    })
                    
                    new_badges.append(badge_info)
        
        return new_badges
    
    def get_next_milestone(self, user, current_streak):
        """Get the next milestone for a user"""
        milestones = [
            ("week_streak", 7, "Week Warrior"),
            ("month_streak", 30, "Monthly Legend"), 
            ("century_club", 100, "Century Club")
        ]
        
        user_badges = self.achievement_data.get("user_badges", {}).get(user, [])
        earned_badge_ids = [badge.get("badge_id", "") for badge in user_badges]
        
        for badge_id, threshold, name in milestones:
            if current_streak < threshold and badge_id not in earned_badge_ids:
                return {
                    "badge_id": badge_id,
                    "name": name,
                    "threshold": threshold,
                    "days_remaining": threshold - current_streak
                }
        
        return None
    
    def get_celebration_queue(self):
        """Get list of achievements that need celebration"""
        celebration_queue = []
        
        for log_entry in self.achievement_data["achievement_log"]:
            if not log_entry.get("celebration_sent", False):
                celebration_queue.append(log_entry)
        
        return celebration_queue
    
    def mark_celebration_sent(self, user, badge_id):
        """Mark an achievement as celebrated"""
        # Update achievement log
        for log_entry in self.achievement_data["achievement_log"]:
            if log_entry["user"] == user and log_entry["badge_id"] == badge_id:
                log_entry["celebration_sent"] = True
        
        # Update user badge
        if user in self.achievement_data["user_badges"]:
            for badge in self.achievement_data["user_badges"][user]:
                if badge.get("badge_id") == badge_id:
                    badge["celebration_sent"] = True
        
        self.save_achievements()
    
    def generate_celebration_message(self, user, badge_info):
        """Generate a personalized celebration message"""
        name = badge_info["name"]
        emoji = badge_info["emoji"]
        streak = badge_info["streak_when_earned"]
        
        messages = {
            "first_day": f"🎉 Congratulations {user}! You've earned your first badge: {emoji} {name}! Your streak journey begins with a single day. Keep building! 🌱",
            "week_streak": f"💪 Amazing work {user}! You've earned {emoji} {name}! A full week of consistency shows real commitment. You're building something special! 🔥",
            "month_streak": f"🏆 Incredible achievement {user}! You've earned {emoji} {name}! 30 days of dedication is truly impressive. You're an inspiration! ✨",
            "century_club": f"👑 LEGENDARY {user}! You've earned {emoji} {name}! 100 days of unwavering consistency - you've reached the elite tier! Absolutely incredible! 🌟"
        }
        
        badge_id = badge_info.get("badge_id", "")
        return messages.get(badge_id, f"🎉 Congratulations {user}! You've earned {emoji} {name}! Keep up the amazing work!")

def main():
    monitor = AchievementMonitor()
    
    # Check for new achievements
    new_achievements = monitor.check_all_users()
    
    # Save any new badges
    if new_achievements:
        monitor.save_achievements()
        print(f"\n💾 Saved {len(new_achievements)} new achievements!")
    
    # Check celebration queue
    celebration_queue = monitor.get_celebration_queue()
    
    if celebration_queue:
        print(f"\n🎊 CELEBRATION QUEUE ({len(celebration_queue)} pending):")
        for item in celebration_queue:
            print(f"   {item['user']}: {item['badge_name']} (awarded {item['awarded_at'][:10]})")
    else:
        print(f"\n✅ All achievements have been celebrated!")
    
    return new_achievements, celebration_queue

if __name__ == "__main__":
    main()