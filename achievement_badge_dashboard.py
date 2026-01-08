#!/usr/bin/env python3
"""
Achievement Badge Dashboard
Built by @streaks-agent for /vibe workshop

Interactive dashboard for viewing badges, progress, and leaderboard.
Addresses backlog requirement for badge visualization.
"""

import json
import os
from datetime import datetime
from integrated_achievement_badges import IntegratedAchievementSystem, streaks_agent_badge_check

class AchievementDashboard:
    def __init__(self):
        self.system = IntegratedAchievementSystem()
    
    def display_available_badges(self):
        """Show all available badges and their requirements"""
        print("🏅 Available Achievement Badges")
        print("=" * 35)
        
        badges_by_type = {}
        for badge_id, badge in self.system.data["badges"].items():
            badge_type = badge["type"]
            if badge_type not in badges_by_type:
                badges_by_type[badge_type] = []
            badges_by_type[badge_type].append(badge)
        
        type_names = {
            "streak": "🔥 Streak Badges",
            "participation": "🚢 Participation Badges", 
            "social": "🤝 Social Badges",
            "special": "⭐ Special Badges"
        }
        
        for badge_type, badges in badges_by_type.items():
            print(f"\n{type_names.get(badge_type, badge_type.title())} Badges:")
            for badge in sorted(badges, key=lambda x: x["threshold"]):
                rarity = badge["rarity"].upper()
                print(f"   {badge['emoji']} {badge['name']} ({rarity})")
                print(f"      {badge['description']}")
                print(f"      Requirement: {badge['threshold']} {badge['metric'].replace('_', ' ')}")
                print()
    
    def display_user_profile(self, handle: str):
        """Show detailed user achievement profile"""
        if handle not in self.system.data["user_achievements"]:
            print(f"❌ User {handle} not found")
            return
        
        user_data = self.system.data["user_achievements"][handle]
        
        print(f"👤 {handle}'s Achievement Profile")
        print("=" * 35)
        
        # Current badges
        if user_data["badges"]:
            print(f"🏅 Earned Badges ({len(user_data['badges'])}):")
            for badge_id in user_data["badges"]:
                if badge_id in self.system.data["badges"]:
                    badge = self.system.data["badges"][badge_id]
                    print(f"   {badge['emoji']} {badge['name']} - {badge['description']}")
        else:
            print("🏅 No badges earned yet")
        
        # Current stats
        stats = user_data.get("stats", {})
        if stats:
            print(f"\n📊 Current Stats:")
            for metric, value in stats.items():
                print(f"   {metric.replace('_', ' ').title()}: {value}")
        
        # Recent achievements
        user_achievements = [a for a in self.system.data["celebration_history"] 
                           if a["handle"] == handle]
        if user_achievements:
            print(f"\n🎉 Recent Achievement History:")
            for achievement in sorted(user_achievements, key=lambda x: x["earned_at"], reverse=True)[:5]:
                earned_date = achievement["earned_at"][:10]
                print(f"   {earned_date}: {achievement['badge_name']}")
    
    def display_leaderboard(self):
        """Show achievement leaderboard"""
        leaderboard = self.system.get_leaderboard()
        
        print("🏆 Achievement Leaderboard")
        print("=" * 25)
        
        if not leaderboard:
            print("No users have earned achievements yet")
            return
        
        for i, entry in enumerate(leaderboard, 1):
            handle = entry["handle"]
            points = entry["achievement_points"]
            badge_count = entry["total_badges"]
            
            print(f"{i}. {handle}")
            print(f"   🎯 Achievement Points: {points}")
            print(f"   🏅 Total Badges: {badge_count}")
            
            if entry["recent_badges"]:
                recent = [f"{b.get('emoji', '🏅')}{b.get('name', '')}" 
                         for b in entry["recent_badges"] if b]
                if recent:
                    print(f"   📈 Recent: {', '.join(recent)}")
            print()
    
    def display_progress_for_user(self, handle: str, **metrics):
        """Show progress toward next achievements"""
        progress_data = self.system.get_user_progress(handle, **metrics)
        
        print(f"🎯 {handle}'s Achievement Progress")
        print("=" * 35)
        
        if progress_data["next_milestone"]:
            milestone = progress_data["next_milestone"]
            badge = milestone["badge"]
            print(f"🔥 Next Milestone: {badge['emoji']} {badge['name']}")
            print(f"   Progress: {milestone['progress_percent']}%")
            print(f"   Remaining: {milestone['remaining']} {badge['metric'].replace('_', ' ')}")
            print()
        
        # Show all progress
        if progress_data["progress"]:
            print("📈 All Progress:")
            for item in progress_data["progress"][:5]:  # Top 5
                badge = item["badge"]
                print(f"   {badge['emoji']} {badge['name']}: {item['progress_percent']}%")
                if item["remaining"] > 0:
                    print(f"      Need {item['remaining']} more {badge['metric'].replace('_', ' ')}")
                print()
    
    def check_user_for_new_badges(self, handle: str, **metrics):
        """Live badge checking for a user"""
        print(f"🔍 Checking {handle} for new achievements...")
        
        result = streaks_agent_badge_check(handle, **metrics)
        
        if result["has_new_achievements"]:
            print("🎉 NEW BADGES AWARDED!")
            print(f"Celebration: {result['celebration_message']}")
            print(f"Public announcement: {'Yes' if result['should_announce_publicly'] else 'No'}")
            
            for badge in result["new_badges"]:
                print(f"   {badge['emoji']} {badge['name']} - {badge['description']}")
        else:
            print("✅ No new badges this check")
        
        # Show progress
        progress = result["user_progress"]
        if progress["next_milestone"]:
            milestone = progress["next_milestone"]
            badge = milestone["badge"]
            print(f"\n🎯 Next: {badge['emoji']} {badge['name']} ({milestone['progress_percent']}%)")

def main():
    """Interactive dashboard"""
    dashboard = AchievementDashboard()
    
    print("🎖️ /vibe Achievement Badge Dashboard")
    print("Built by @streaks-agent")
    print("=" * 40)
    
    while True:
        print("\nAvailable commands:")
        print("1. badges - Show all available badges")
        print("2. profile <handle> - Show user profile")
        print("3. leaderboard - Show achievement rankings")
        print("4. progress <handle> - Show user progress")
        print("5. check <handle> - Check for new badges")
        print("6. status - Show system status")
        print("7. exit - Quit dashboard")
        
        command = input("\nEnter command: ").strip().lower()
        
        if command == "exit":
            print("Goodbye! 👋")
            break
        elif command == "badges":
            dashboard.display_available_badges()
        elif command.startswith("profile "):
            handle = command.split(" ", 1)[1]
            dashboard.display_user_profile(handle)
        elif command == "leaderboard":
            dashboard.display_leaderboard()
        elif command.startswith("progress "):
            handle = command.split(" ", 1)[1]
            # Default metrics for demo
            dashboard.display_progress_for_user(handle, current_streak=1, ships_count=0, games_count=0)
        elif command.startswith("check "):
            handle = command.split(" ", 1)[1]
            # Default metrics for demo - in real use, get from streak system
            dashboard.check_user_for_new_badges(handle, current_streak=1, best_streak=1, ships_count=0, games_count=0)
        elif command == "status":
            print(dashboard.system.generate_status_report())
        else:
            print("❌ Unknown command")

# CLI Interface for @streaks-agent integration
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        dashboard = AchievementDashboard()
        command = sys.argv[1]
        
        if command == "leaderboard":
            dashboard.display_leaderboard()
        elif command == "badges":
            dashboard.display_available_badges()
        elif command == "status":
            print(dashboard.system.generate_status_report())
        elif command == "profile" and len(sys.argv) > 2:
            dashboard.display_user_profile(sys.argv[2])
        else:
            print("Usage: python achievement_badge_dashboard.py [leaderboard|badges|status|profile <handle>]")
    else:
        main()