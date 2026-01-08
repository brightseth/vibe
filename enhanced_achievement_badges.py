#!/usr/bin/env python3
"""
Enhanced Achievement Badge System for /vibe workshop
Created by @streaks-agent

Adds special participation badges, community recognition,
and advanced gamification features to the existing achievement system.
"""

import json
import datetime
from pathlib import Path

class EnhancedAchievementBadges:
    def __init__(self, achievements_file='achievements.json'):
        self.achievements_file = achievements_file
        self.load_achievements()
        self.initialize_enhanced_badges()
    
    def load_achievements(self):
        """Load achievements from JSON file"""
        try:
            with open(self.achievements_file, 'r') as f:
                self.data = json.load(f)
        except FileNotFoundError:
            self.data = {"badges": {}, "user_badges": {}, "achievement_log": []}
    
    def save_achievements(self):
        """Save achievements to JSON file"""
        with open(self.achievements_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def initialize_enhanced_badges(self):
        """Add enhanced badge types to the existing system"""
        enhanced_badges = {
            # Participation Badges
            "early_bird": {
                "name": "Early Bird",
                "description": "First to ship something in a new day",
                "emoji": "🌅",
                "type": "participation",
                "threshold": 1
            },
            "night_owl": {
                "name": "Night Owl", 
                "description": "Active and shipping late at night",
                "emoji": "🦉",
                "type": "participation",
                "threshold": 1
            },
            "weekend_warrior": {
                "name": "Weekend Warrior",
                "description": "Maintains streak through weekends",
                "emoji": "⚔️",
                "type": "consistency",
                "threshold": 2  # weekends
            },
            
            # Community Badges
            "vibe_catalyst": {
                "name": "Vibe Catalyst",
                "description": "Consistently boosts community energy",
                "emoji": "⚡",
                "type": "community",
                "threshold": 5  # positive interactions
            },
            "mentor": {
                "name": "Mentor",
                "description": "Helps others level up their projects",
                "emoji": "🧙",
                "type": "community", 
                "threshold": 3  # helpful interactions
            },
            "connector": {
                "name": "Connector",
                "description": "Brings people together through collaboration",
                "emoji": "🌉",
                "type": "community",
                "threshold": 2  # collaborations facilitated
            },
            
            # Special Achievement Badges
            "breakthrough": {
                "name": "Breakthrough",
                "description": "Achieved something you thought impossible",
                "emoji": "💥",
                "type": "special",
                "threshold": 1
            },
            "phoenix": {
                "name": "Phoenix",
                "description": "Came back stronger after a streak break",
                "emoji": "🔥",
                "type": "resilience",
                "threshold": 1  # comeback achievement
            },
            "innovator": {
                "name": "Innovator",
                "description": "Created something completely new for the workshop",
                "emoji": "💡",
                "type": "creativity",
                "threshold": 1
            },
            
            # Multi-modal Badges (for future features)
            "storyteller": {
                "name": "Storyteller",
                "description": "Shares compelling project narratives",
                "emoji": "📚",
                "type": "communication",
                "threshold": 3
            },
            "artist": {
                "name": "Artist",
                "description": "Brings visual beauty to the workshop",
                "emoji": "🎨",
                "type": "creativity",
                "threshold": 2
            },
            "architect": {
                "name": "Architect",
                "description": "Designs systems that others can build upon",
                "emoji": "🏗️",
                "type": "technical",
                "threshold": 1
            }
        }
        
        # Add enhanced badges to existing system
        for badge_id, badge in enhanced_badges.items():
            if badge_id not in self.data["badges"]:
                self.data["badges"][badge_id] = badge
        
        self.save_achievements()
    
    def award_special_badge(self, handle, badge_id, reason=None):
        """Award a special achievement badge with optional reason"""
        if badge_id not in self.data["badges"]:
            return False
            
        if handle not in self.data["user_badges"]:
            self.data["user_badges"][handle] = []
        
        if badge_id not in self.data["user_badges"][handle]:
            self.data["user_badges"][handle].append(badge_id)
            
            # Enhanced log entry with reason
            log_entry = {
                "handle": handle,
                "badge_id": badge_id,
                "timestamp": datetime.datetime.now().isoformat(),
                "badge_name": self.data["badges"][badge_id]["name"],
                "type": self.data["badges"][badge_id]["type"],
                "reason": reason
            }
            self.data["achievement_log"].append(log_entry)
            
            self.save_achievements()
            return True
        return False
    
    def check_participation_badges(self, handle, activity_data):
        """Check for participation-based badges"""
        badges_awarded = []
        
        # Early Bird - first activity of the day
        if activity_data.get("first_of_day", False):
            if self.award_special_badge(handle, "early_bird", "First to ship today"):
                badges_awarded.append(self.data["badges"]["early_bird"])
        
        # Night Owl - late night activity
        current_hour = datetime.datetime.now().hour
        if current_hour >= 22 or current_hour <= 5:
            if activity_data.get("active_now", False):
                if self.award_special_badge(handle, "night_owl", "Active late at night"):
                    badges_awarded.append(self.data["badges"]["night_owl"])
        
        return badges_awarded
    
    def check_community_badges(self, handle, community_data):
        """Check for community contribution badges"""
        badges_awarded = []
        
        # Vibe Catalyst - positive community impact
        if community_data.get("positive_interactions", 0) >= 5:
            if self.award_special_badge(handle, "vibe_catalyst", "Boosting community energy"):
                badges_awarded.append(self.data["badges"]["vibe_catalyst"])
        
        # Mentor - helping others
        if community_data.get("helpful_interactions", 0) >= 3:
            if self.award_special_badge(handle, "mentor", "Helping others succeed"):
                badges_awarded.append(self.data["badges"]["mentor"])
        
        # Connector - facilitating collaboration  
        if community_data.get("collaborations_facilitated", 0) >= 2:
            if self.award_special_badge(handle, "connector", "Bringing people together"):
                badges_awarded.append(self.data["badges"]["connector"])
        
        return badges_awarded
    
    def award_breakthrough_badge(self, handle, achievement_description):
        """Award breakthrough badge for major personal achievements"""
        reason = f"Breakthrough: {achievement_description}"
        if self.award_special_badge(handle, "breakthrough", reason):
            return self.data["badges"]["breakthrough"]
        return None
    
    def award_phoenix_badge(self, handle, previous_streak, new_streak):
        """Award phoenix badge for comebacks"""
        if new_streak > previous_streak:
            reason = f"Comeback: {new_streak} days (previous best: {previous_streak})"
            if self.award_special_badge(handle, "phoenix", reason):
                return self.data["badges"]["phoenix"]
        return None
    
    def get_badge_categories(self):
        """Get badges organized by category"""
        categories = {}
        for badge_id, badge in self.data["badges"].items():
            badge_type = badge.get("type", "streak")
            if badge_type not in categories:
                categories[badge_type] = []
            categories[badge_type].append({"id": badge_id, **badge})
        return categories
    
    def get_user_profile(self, handle):
        """Get comprehensive user profile with badge breakdown"""
        badge_ids = self.data["user_badges"].get(handle, [])
        badges = [{"id": bid, **self.data["badges"][bid]} for bid in badge_ids]
        
        # Group by category
        categories = {}
        for badge in badges:
            badge_type = badge.get("type", "streak")
            if badge_type not in categories:
                categories[badge_type] = []
            categories[badge_type].append(badge)
        
        return {
            "handle": handle,
            "total_badges": len(badge_ids),
            "badges_by_category": categories,
            "recent_achievements": self.get_recent_achievements(handle)
        }
    
    def get_recent_achievements(self, handle, days=7):
        """Get user's recent achievements"""
        cutoff = datetime.datetime.now() - datetime.timedelta(days=days)
        recent = []
        
        for entry in self.data["achievement_log"]:
            if entry["handle"] == handle:
                achievement_time = datetime.datetime.fromisoformat(entry["timestamp"])
                if achievement_time > cutoff:
                    recent.append(entry)
        
        return sorted(recent, key=lambda x: x["timestamp"], reverse=True)
    
    def generate_achievement_summary(self):
        """Generate comprehensive achievement system summary"""
        categories = self.get_badge_categories()
        
        summary = {
            "total_badges_available": len(self.data["badges"]),
            "badge_categories": {},
            "user_stats": {},
            "recent_activity": []
        }
        
        # Badge categories summary
        for category, badges in categories.items():
            summary["badge_categories"][category] = {
                "count": len(badges),
                "badges": [{"name": b["name"], "emoji": b["emoji"]} for b in badges]
            }
        
        # User stats
        for handle, badge_ids in self.data["user_badges"].items():
            summary["user_stats"][handle] = {
                "total_badges": len(badge_ids),
                "badge_breakdown": {}
            }
            
            # Count by category for this user
            for bid in badge_ids:
                badge = self.data["badges"][bid]
                badge_type = badge.get("type", "streak")
                if badge_type not in summary["user_stats"][handle]["badge_breakdown"]:
                    summary["user_stats"][handle]["badge_breakdown"][badge_type] = 0
                summary["user_stats"][handle]["badge_breakdown"][badge_type] += 1
        
        # Recent achievement activity (last 7 days)
        cutoff = datetime.datetime.now() - datetime.timedelta(days=7)
        for entry in self.data["achievement_log"]:
            achievement_time = datetime.datetime.fromisoformat(entry["timestamp"])
            if achievement_time > cutoff:
                summary["recent_activity"].append({
                    "handle": entry["handle"],
                    "badge": entry["badge_name"],
                    "type": entry.get("type", "streak"),
                    "timestamp": entry["timestamp"]
                })
        
        summary["recent_activity"] = sorted(
            summary["recent_activity"], 
            key=lambda x: x["timestamp"], 
            reverse=True
        )
        
        return summary

def main():
    """Demo the enhanced achievement system"""
    badges = EnhancedAchievementBadges()
    
    print("🎖️ Enhanced Achievement Badge System")
    print("="*50)
    
    # Show available badge categories
    categories = badges.get_badge_categories()
    for category, badge_list in categories.items():
        print(f"\n{category.upper()} BADGES:")
        for badge in badge_list:
            print(f"  {badge['emoji']} {badge['name']} - {badge['description']}")
    
    # Show system summary
    print("\n" + "="*50)
    print("SYSTEM SUMMARY:")
    summary = badges.generate_achievement_summary()
    print(f"Total badges available: {summary['total_badges_available']}")
    
    for category, info in summary['badge_categories'].items():
        print(f"{category}: {info['count']} badges")
    
    if summary['recent_activity']:
        print("\nRECENT ACHIEVEMENTS:")
        for activity in summary['recent_activity'][:5]:
            print(f"  {activity['handle']} earned {activity['badge']} ({activity['type']})")

if __name__ == "__main__":
    main()