#!/usr/bin/env python3
"""
Enhanced Live Badge Dashboard for /vibe Workshop
Shows real-time badge statistics, leaderboards, and achievement progress
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any

class EnhancedBadgeDashboard:
    def __init__(self):
        self.badges_file = 'badges.json'
        self.streaks_file = 'streak_data.json'
        self.load_data()
    
    def load_data(self):
        """Load badge and streak data"""
        # Load badges data
        if os.path.exists(self.badges_file):
            with open(self.badges_file, 'r') as f:
                self.badges_data = json.load(f)
        else:
            self.badges_data = {"user_badges": {}, "badge_categories": {}}
        
        # Load streak data 
        if os.path.exists(self.streaks_file):
            with open(self.streaks_file, 'r') as f:
                self.streaks_data = json.load(f)
        else:
            self.streaks_data = {}
    
    def generate_dashboard(self) -> str:
        """Generate comprehensive badge dashboard"""
        dashboard = []
        
        # Header
        dashboard.append("🏆 /vibe Workshop Badge Dashboard")
        dashboard.append("=" * 40)
        dashboard.append("")
        
        # System overview
        total_badges_available = sum(len(category) for category in self.badges_data.get("badge_categories", {}).values())
        total_users = len(self.badges_data.get("user_badges", {}))
        total_awarded = sum(len(user_data.get("earned", [])) for user_data in self.badges_data.get("user_badges", {}).values())
        
        dashboard.append("📊 System Overview:")
        dashboard.append(f"   • Available Badges: {total_badges_available}")
        dashboard.append(f"   • Active Users: {total_users}")
        dashboard.append(f"   • Total Awarded: {total_awarded}")
        dashboard.append("")
        
        # Leaderboard
        dashboard.append("🏅 Badge Leaderboard:")
        leaderboard = self.get_leaderboard()
        for i, entry in enumerate(leaderboard[:5], 1):
            badge_display = self.get_user_badge_display(entry['user'])
            dashboard.append(f"   {i}. {entry['user']} - {entry['badges']} badges {badge_display}")
        dashboard.append("")
        
        # Rarity breakdown
        dashboard.append("💎 Badge Rarity Distribution:")
        rarity_stats = self.get_rarity_stats()
        for rarity, count in rarity_stats.items():
            emoji = self.badges_data.get("rarity_levels", {}).get(rarity, {}).get("emoji", "⚪")
            dashboard.append(f"   {emoji} {rarity.title()}: {count} awarded")
        dashboard.append("")
        
        # Recent achievements
        dashboard.append("🎉 Recent Achievements:")
        recent = self.get_recent_achievements()
        for achievement in recent[:3]:
            dashboard.append(f"   • {achievement['user']} earned {achievement['badge_name']}")
        dashboard.append("")
        
        # Badge categories with progress
        dashboard.append("📋 Badge Categories:")
        for category, badges in self.badges_data.get("badge_categories", {}).items():
            awarded_in_category = self.count_awarded_in_category(category)
            total_in_category = len(badges)
            dashboard.append(f"   • {category.title()}: {awarded_in_category}/{total_in_category * total_users} possible")
        dashboard.append("")
        
        # Individual user progress
        dashboard.append("👤 User Progress:")
        for user in self.badges_data.get("user_badges", {}):
            user_data = self.badges_data["user_badges"][user]
            badge_count = len(user_data.get("earned", []))
            points = user_data.get("total_points", 0)
            streak = self.streaks_data.get(user, {}).get("current", 0)
            
            dashboard.append(f"   {user}:")
            dashboard.append(f"     • Badges: {badge_count}")
            dashboard.append(f"     • Points: {points}")
            dashboard.append(f"     • Current Streak: {streak} days")
            
            # Next achievable badges
            next_badges = self.get_next_achievable_badges(user)
            if next_badges:
                dashboard.append(f"     • Next: {', '.join(next_badges[:2])}")
            dashboard.append("")
        
        # Achievement suggestions
        dashboard.append("💡 Achievement Opportunities:")
        suggestions = self.get_achievement_suggestions()
        for suggestion in suggestions[:3]:
            dashboard.append(f"   • {suggestion}")
        
        return "\\n".join(dashboard)
    
    def get_leaderboard(self) -> List[Dict]:
        """Get badge leaderboard sorted by points and badge count"""
        leaderboard = []
        
        for user, data in self.badges_data.get("user_badges", {}).items():
            badges_count = len(data.get("earned", []))
            points = data.get("total_points", 0)
            
            leaderboard.append({
                "user": user,
                "badges": badges_count,
                "points": points
            })
        
        # Sort by points first, then by badge count
        return sorted(leaderboard, key=lambda x: (x["points"], x["badges"]), reverse=True)
    
    def get_user_badge_display(self, user: str) -> str:
        """Get emoji display of user's badges"""
        user_data = self.badges_data.get("user_badges", {}).get(user, {})
        earned_badges = user_data.get("earned", [])
        
        emojis = []
        for badge_info in earned_badges:
            badge_key = badge_info.get("badge_key")
            # Find the badge emoji
            for category in self.badges_data.get("badge_categories", {}).values():
                if badge_key in category:
                    # Extract emoji from badge name or use a default
                    badge_name = category[badge_key].get("name", "")
                    if "🌱" in badge_name:
                        emojis.append("🌱")
                    elif "🔥" in badge_name:
                        emojis.append("🔥")
                    elif "👑" in badge_name:
                        emojis.append("👑")
                    elif "💎" in badge_name:
                        emojis.append("💎")
                    else:
                        # Use rarity emoji as fallback
                        rarity = category[badge_key].get("rarity", "common")
                        emoji = self.badges_data.get("rarity_levels", {}).get(rarity, {}).get("emoji", "⭐")
                        emojis.append(emoji)
        
        return " ".join(emojis) if emojis else "🆕"
    
    def get_rarity_stats(self) -> Dict[str, int]:
        """Get count of badges awarded by rarity"""
        rarity_counts = {}
        
        for user_data in self.badges_data.get("user_badges", {}).values():
            for badge_info in user_data.get("earned", []):
                badge_key = badge_info.get("badge_key")
                
                # Find badge rarity
                for category in self.badges_data.get("badge_categories", {}).values():
                    if badge_key in category:
                        rarity = category[badge_key].get("rarity", "common")
                        rarity_counts[rarity] = rarity_counts.get(rarity, 0) + 1
        
        return rarity_counts
    
    def get_recent_achievements(self) -> List[Dict]:
        """Get most recent badge achievements"""
        achievements = []
        
        for user, data in self.badges_data.get("user_badges", {}).items():
            for badge_info in data.get("earned", []):
                achievements.append({
                    "user": user,
                    "badge_key": badge_info.get("badge_key"),
                    "badge_name": self.get_badge_display_name(badge_info.get("badge_key")),
                    "awarded_at": badge_info.get("awarded_at")
                })
        
        # Sort by award time (most recent first)
        return sorted(achievements, key=lambda x: x["awarded_at"], reverse=True)
    
    def get_badge_display_name(self, badge_key: str) -> str:
        """Get display name for a badge"""
        for category in self.badges_data.get("badge_categories", {}).values():
            if badge_key in category:
                return category[badge_key].get("name", badge_key)
        return badge_key
    
    def count_awarded_in_category(self, category: str) -> int:
        """Count total badges awarded in a category"""
        count = 0
        category_badges = self.badges_data.get("badge_categories", {}).get(category, {})
        
        for user_data in self.badges_data.get("user_badges", {}).values():
            for badge_info in user_data.get("earned", []):
                badge_key = badge_info.get("badge_key")
                if badge_key in category_badges:
                    count += 1
        
        return count
    
    def get_next_achievable_badges(self, user: str) -> List[str]:
        """Get badges the user could achieve next"""
        user_badges = set()
        user_data = self.badges_data.get("user_badges", {}).get(user, {})
        
        for badge_info in user_data.get("earned", []):
            user_badges.add(badge_info.get("badge_key"))
        
        # Get user's current streak
        current_streak = self.streaks_data.get(user, {}).get("current", 0)
        
        next_badges = []
        
        # Check streak badges
        if current_streak < 7 and "week_streak" not in user_badges:
            days_needed = 7 - current_streak
            next_badges.append(f"Week Streak (in {days_needed} days)")
        elif current_streak < 30 and "month_streak" not in user_badges:
            days_needed = 30 - current_streak
            next_badges.append(f"Monthly Legend (in {days_needed} days)")
        
        # Check shipping badges
        if "first_ship" not in user_badges:
            next_badges.append("First Ship (ship a project)")
        
        return next_badges
    
    def get_achievement_suggestions(self) -> List[str]:
        """Get suggestions for encouraging more achievements"""
        suggestions = []
        
        # Analyze what badges are least earned
        rarity_stats = self.get_rarity_stats()
        total_users = len(self.badges_data.get("user_badges", {}))
        
        if rarity_stats.get("common", 0) < total_users:
            suggestions.append("Encourage new users to start their first streaks")
        
        if rarity_stats.get("uncommon", 0) < total_users // 2:
            suggestions.append("Help users reach their first week streak milestone")
        
        if total_users > 0 and not any("ship" in badge for badges in self.badges_data.get("user_badges", {}).values() for badge_info in badges.get("earned", []) for badge in [badge_info.get("badge_key", "")]):
            suggestions.append("No shipping badges yet - encourage first ships!")
        
        return suggestions

def main():
    """Generate and display the enhanced badge dashboard"""
    dashboard = EnhancedBadgeDashboard()
    print(dashboard.generate_dashboard())
    
    # Also save to file for easy viewing
    with open('badge_dashboard_live.txt', 'w') as f:
        f.write(dashboard.generate_dashboard())
    
    print("\\n📊 Dashboard saved to badge_dashboard_live.txt")

if __name__ == "__main__":
    main()