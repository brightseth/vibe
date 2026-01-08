#!/usr/bin/env python3
"""
Live Badge Check and Award System for @streaks-agent
Checks current users and awards appropriate badges
"""

import json
from datetime import datetime
import sys
import os

class LiveBadgeChecker:
    def __init__(self):
        self.badges_file = "badges.json"
        self.achievements_file = "achievements.json"
        self.load_data()
    
    def load_data(self):
        """Load both badge systems"""
        try:
            with open(self.badges_file, 'r') as f:
                self.badges_data = json.load(f)
        except FileNotFoundError:
            self.badges_data = {"badge_definitions": {}, "user_badges": {}, "badge_log": [], "stats": {}}
        
        try:
            with open(self.achievements_file, 'r') as f:
                self.achievements_data = json.load(f)
        except FileNotFoundError:
            self.achievements_data = {"badges": {}, "user_achievements": {}, "achievement_history": []}
    
    def save_data(self):
        """Save both badge systems"""
        with open(self.badges_file, 'w') as f:
            json.dump(self.badges_data, f, indent=2)
        
        with open(self.achievements_file, 'w') as f:
            json.dump(self.achievements_data, f, indent=2)
    
    def check_and_award_streak_badges(self, user_handle, current_streak, best_streak):
        """Check and award streak-based badges in both systems"""
        awarded_badges = []
        
        # Current users: @demo_user and @vibe_champion both have 1-day streaks
        print(f"\n=== Checking badges for {user_handle} ===")
        print(f"Current streak: {current_streak} days")
        print(f"Best streak: {best_streak} days")
        
        # Check badges.json system
        if user_handle not in self.badges_data["user_badges"]:
            self.badges_data["user_badges"][user_handle] = []
        
        # Check achievements.json system
        clean_handle = user_handle.replace('@', '')
        if clean_handle not in self.achievements_data["user_achievements"]:
            self.achievements_data["user_achievements"][clean_handle] = []
        
        # Get existing badges to avoid duplicates
        existing_badges_main = [b["badge_key"] for b in self.badges_data["user_badges"][user_handle]]
        existing_achievements = [a["id"] for a in self.achievements_data["user_achievements"][clean_handle]]
        
        print(f"Existing badges: {existing_badges_main}")
        print(f"Existing achievements: {existing_achievements}")
        
        # Early Bird Badge (3 days) - they already have first_day, could get this at 3 days
        if current_streak >= 3 and "early_bird" not in existing_badges_main:
            self.award_badge_both_systems(user_handle, "early_bird", f"Reached {current_streak}-day streak")
            awarded_badges.append("early_bird")
        
        # Week Streak Badge (7 days)
        if current_streak >= 7 and "week_streak" not in existing_badges_main:
            self.award_badge_both_systems(user_handle, "week_streak", f"Achieved {current_streak}-day streak")
            awarded_badges.append("week_streak")
        
        # Consistency King (14 days)
        if current_streak >= 14 and "consistency_king" not in existing_badges_main:
            self.award_badge_both_systems(user_handle, "consistency_king", f"Achieved {current_streak}-day streak")
            awarded_badges.append("consistency_king")
        
        # Month Legend (30 days)
        if current_streak >= 30 and "month_legend" not in existing_badges_main:
            self.award_badge_both_systems(user_handle, "month_legend", f"Achieved {current_streak}-day streak")
            awarded_badges.append("month_legend")
        
        # Century Club (100 days)
        if current_streak >= 100 and "century_club" not in existing_badges_main:
            self.award_badge_both_systems(user_handle, "century_club", f"Achieved {current_streak}-day streak")
            awarded_badges.append("century_club")
        
        return awarded_badges
    
    def award_badge_both_systems(self, user_handle, badge_key, reason):
        """Award badge in both systems for consistency"""
        now = datetime.now().isoformat()
        clean_handle = user_handle.replace('@', '')
        
        # Award in badges.json system
        if badge_key in self.badges_data["badge_definitions"]:
            badge_info = self.badges_data["badge_definitions"][badge_key]
            awarded_badge = {
                "badge_key": badge_key,
                "awarded_at": now,
                "reason": reason
            }
            self.badges_data["user_badges"][user_handle].append(awarded_badge)
            
            # Log the award
            log_entry = {
                "user": user_handle,
                "badge": badge_key,
                "badge_name": badge_info["name"],
                "points": badge_info["points"],
                "awarded_at": now,
                "reason": reason
            }
            self.badges_data["badge_log"].append(log_entry)
            
            # Update stats
            self.badges_data["stats"]["total_badges_awarded"] = self.badges_data["stats"].get("total_badges_awarded", 0) + 1
        
        # Award in achievements.json system
        if badge_key in self.achievements_data["badges"]:
            achievement_info = self.achievements_data["badges"][badge_key]
            awarded_achievement = {
                "id": badge_key,
                "name": achievement_info["name"],
                "description": achievement_info["description"],
                "earned_at": now,
                "criteria": reason
            }
            self.achievements_data["user_achievements"][clean_handle].append(awarded_achievement)
            
            # Log in history
            history_entry = {
                "handle": clean_handle,
                "badge": {
                    "id": badge_key,
                    "name": achievement_info["name"],
                    "description": achievement_info["description"],
                    "earned_at": now
                },
                "timestamp": now
            }
            self.achievements_data["achievement_history"].append(history_entry)
        
        print(f"✅ Awarded '{badge_key}' to {user_handle}: {reason}")
    
    def generate_celebration_message(self, user_handle, badge_key):
        """Generate personalized celebration message"""
        messages = {
            "early_bird": "🌱 Getting started! Three days of consistency shows real commitment!",
            "week_streak": "💪 One week strong! You're building something powerful here.",
            "consistency_king": "🔥 Two weeks! You're committed! Your dedication is inspiring!",
            "month_legend": "🏆 Monthly legend! 30 days of showing up - incredible!",
            "century_club": "👑 Century club! 100 days! You are now workshop royalty!"
        }
        
        return messages.get(badge_key, f"🎉 Badge earned: {badge_key}!")
    
    def generate_status_report(self):
        """Generate a status report of current badge state"""
        report = ["=== BADGE SYSTEM STATUS REPORT ===\n"]
        
        # Total stats
        total_badges_awarded = self.badges_data["stats"].get("total_badges_awarded", 0)
        total_users = len(self.badges_data["user_badges"])
        report.append(f"Total badges awarded: {total_badges_awarded}")
        report.append(f"Active users: {total_users}")
        report.append("")
        
        # Per-user breakdown
        for user_handle in self.badges_data["user_badges"]:
            user_badges = self.badges_data["user_badges"][user_handle]
            points = sum(self.badges_data["badge_definitions"][b["badge_key"]]["points"] 
                        for b in user_badges if b["badge_key"] in self.badges_data["badge_definitions"])
            
            report.append(f"{user_handle}:")
            report.append(f"  Badges: {len(user_badges)}")
            report.append(f"  Points: {points}")
            
            if user_badges:
                report.append(f"  Latest: {user_badges[-1]['badge_key']} ({user_badges[-1]['awarded_at'][:10]})")
            report.append("")
        
        # Available badges to earn
        report.append("🏆 AVAILABLE MILESTONES:")
        report.append("  - 3 days → Early Bird 🌱")
        report.append("  - 7 days → Week Warrior 💪")
        report.append("  - 14 days → Consistency King 🔥")
        report.append("  - 30 days → Monthly Legend 🏆")
        report.append("  - 100 days → Century Club 👑")
        
        return "\n".join(report)

def main():
    """Run live badge check for current users"""
    checker = LiveBadgeChecker()
    
    # Current streak data (from @streaks-agent memory)
    current_users = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    print("🎮 LIVE BADGE CHECK - Streaks Agent")
    print("=" * 50)
    
    total_awarded = []
    
    for user_handle, streak_data in current_users.items():
        awarded = checker.check_and_award_streak_badges(
            user_handle,
            streak_data["current"],
            streak_data["best"]
        )
        
        if awarded:
            total_awarded.extend([(user_handle, badge) for badge in awarded])
            
            # Generate celebration messages
            for badge in awarded:
                msg = checker.generate_celebration_message(user_handle, badge)
                print(f"\n🎉 CELEBRATION: {msg}")
    
    # Save changes
    if total_awarded:
        checker.save_data()
        print(f"\n💾 Saved {len(total_awarded)} new badge awards!")
    else:
        print("\n✅ All users have appropriate badges for their current streaks")
    
    # Generate status report
    print("\n" + checker.generate_status_report())
    
    return total_awarded

if __name__ == "__main__":
    awarded = main()
    print(f"\n🏁 Badge check complete. {len(awarded)} badges awarded this run.")