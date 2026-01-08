#!/usr/bin/env python3
"""
Integrated Achievement Badges System for /vibe Workshop
Built by @streaks-agent to address backlog priorities

Features:
- 'First Ship' badge for project announcements
- 'Week Streak' badge for 7-day consistency
- 'Game Master' badge for game participation
- Real-time badge checking and celebration
- Dashboard integration ready

This addresses the multiple backlog items for achievement badges.
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Tuple

class IntegratedAchievementSystem:
    def __init__(self, data_file="integrated_achievements.json"):
        self.data_file = data_file
        self.load_data()
        
    def load_data(self):
        """Load or initialize achievement data"""
        if os.path.exists(self.data_file):
            with open(self.data_file, 'r') as f:
                self.data = json.load(f)
        else:
            self.data = {
                "badges": self.get_badge_definitions(),
                "user_achievements": {},
                "celebration_history": [],
                "participation_stats": {}
            }
            self.save_data()
    
    def save_data(self):
        """Save achievement data"""
        with open(self.data_file, 'w') as f:
            json.dump(self.data, f, indent=2)
    
    def get_badge_definitions(self):
        """Core badge system as requested in backlog"""
        return {
            "first_ship": {
                "id": "first_ship",
                "name": "First Ship",
                "description": "Made your first project announcement",
                "emoji": "🚢",
                "type": "participation",
                "threshold": 1,
                "metric": "ships_count",
                "celebration_type": "personal",
                "rarity": "common"
            },
            "week_streak": {
                "id": "week_streak", 
                "name": "Week Warrior",
                "description": "Maintained a 7-day activity streak",
                "emoji": "💪",
                "type": "streak",
                "threshold": 7,
                "metric": "current_streak",
                "celebration_type": "public",
                "rarity": "uncommon"
            },
            "game_master": {
                "id": "game_master",
                "name": "Game Master", 
                "description": "Created or participated in a workshop game",
                "emoji": "🎮",
                "type": "participation",
                "threshold": 1,
                "metric": "games_count",
                "celebration_type": "personal",
                "rarity": "uncommon"
            },
            "consistency_champion": {
                "id": "consistency_champion",
                "name": "Consistency Champion",
                "description": "Maintained a 14-day streak",
                "emoji": "🔥",
                "type": "streak",
                "threshold": 14,
                "metric": "current_streak", 
                "celebration_type": "public",
                "rarity": "rare"
            },
            "monthly_legend": {
                "id": "monthly_legend",
                "name": "Monthly Legend",
                "description": "Achieved a 30-day streak",
                "emoji": "🏆",
                "type": "streak",
                "threshold": 30,
                "metric": "current_streak",
                "celebration_type": "public",
                "rarity": "epic"
            },
            "prolific_shipper": {
                "id": "prolific_shipper",
                "name": "Prolific Shipper",
                "description": "Shipped 5+ projects",
                "emoji": "🚀",
                "type": "participation",
                "threshold": 5,
                "metric": "ships_count",
                "celebration_type": "public",
                "rarity": "rare"
            },
            "community_builder": {
                "id": "community_builder",
                "name": "Community Builder",
                "description": "Actively engaged with 10+ community members",
                "emoji": "🤝",
                "type": "social",
                "threshold": 10,
                "metric": "dm_count",
                "celebration_type": "public",
                "rarity": "rare"
            },
            "early_adopter": {
                "id": "early_adopter",
                "name": "Early Adopter",
                "description": "Among the first /vibe workshop members",
                "emoji": "🌟",
                "type": "special",
                "threshold": 1,
                "metric": "join_order",
                "celebration_type": "personal",
                "rarity": "legendary"
            }
        }
    
    def check_and_award_badges(self, handle: str, **metrics) -> Tuple[List[Dict], str, bool]:
        """
        Main function for @streaks-agent integration
        Returns: (new_badges, celebration_message, should_announce_publicly)
        """
        # Initialize user if not exists
        if handle not in self.data["user_achievements"]:
            self.data["user_achievements"][handle] = {
                "badges": [],
                "last_updated": datetime.now().isoformat(),
                "stats": {}
            }
        
        user_data = self.data["user_achievements"][handle]
        current_badges = set(user_data["badges"])
        new_badges = []
        
        # Update user stats
        user_data["stats"].update(metrics)
        
        # Check each badge
        for badge_id, badge in self.data["badges"].items():
            if badge_id in current_badges:
                continue  # Already has this badge
            
            metric_name = badge["metric"]
            if metric_name in metrics and metrics[metric_name] >= badge["threshold"]:
                # Award the badge!
                new_badges.append(badge)
                user_data["badges"].append(badge_id)
                
                # Log the achievement
                self.data["celebration_history"].append({
                    "handle": handle,
                    "badge_id": badge_id,
                    "badge_name": badge["name"],
                    "earned_at": datetime.now().isoformat(),
                    "trigger_value": metrics[metric_name]
                })
        
        user_data["last_updated"] = datetime.now().isoformat()
        self.save_data()
        
        # Generate celebration response
        celebration_message = ""
        should_announce = False
        
        if new_badges:
            # Create celebration message
            if len(new_badges) == 1:
                badge = new_badges[0]
                celebration_message = f"🎉 {handle} earned the {badge['emoji']} {badge['name']} badge! {badge['description']}"
                should_announce = (badge["celebration_type"] == "public")
            else:
                badge_names = [f"{b['emoji']} {b['name']}" for b in new_badges]
                celebration_message = f"🎊 Amazing! {handle} earned {len(new_badges)} new badges: {', '.join(badge_names)}!"
                should_announce = any(b["celebration_type"] == "public" for b in new_badges)
        
        return new_badges, celebration_message, should_announce
    
    def get_user_progress(self, handle: str, **current_metrics) -> Dict:
        """Get user's current badge status and progress toward next badges"""
        if handle not in self.data["user_achievements"]:
            return {"badges": [], "progress": [], "next_milestone": None}
        
        user_data = self.data["user_achievements"][handle]
        current_badges = set(user_data["badges"])
        
        # Calculate progress toward unearned badges
        progress = []
        for badge_id, badge in self.data["badges"].items():
            if badge_id not in current_badges:
                metric_name = badge["metric"]
                if metric_name in current_metrics:
                    current_value = current_metrics[metric_name]
                    threshold = badge["threshold"]
                    progress_percent = min(100, (current_value / threshold) * 100)
                    
                    progress.append({
                        "badge": badge,
                        "current_value": current_value,
                        "threshold": threshold,
                        "progress_percent": round(progress_percent, 1),
                        "remaining": max(0, threshold - current_value)
                    })
        
        # Find closest milestone
        next_milestone = None
        if progress:
            closest = min(progress, key=lambda x: x["remaining"] if x["remaining"] > 0 else float('inf'))
            if closest["remaining"] > 0:
                next_milestone = closest
        
        return {
            "badges": [self.data["badges"][badge_id] for badge_id in user_data["badges"]],
            "total_badges": len(user_data["badges"]),
            "progress": sorted(progress, key=lambda x: x["remaining"]),
            "next_milestone": next_milestone
        }
    
    def get_leaderboard(self) -> List[Dict]:
        """Generate achievement leaderboard"""
        leaderboard = []
        
        rarity_points = {"common": 1, "uncommon": 2, "rare": 4, "epic": 8, "legendary": 16}
        
        for handle, user_data in self.data["user_achievements"].items():
            total_badges = len(user_data["badges"])
            points = 0
            
            for badge_id in user_data["badges"]:
                if badge_id in self.data["badges"]:
                    rarity = self.data["badges"][badge_id]["rarity"]
                    points += rarity_points.get(rarity, 1)
            
            recent_badges = user_data["badges"][-3:]  # Last 3 badges
            
            leaderboard.append({
                "handle": handle,
                "total_badges": total_badges,
                "achievement_points": points,
                "recent_badges": [self.data["badges"].get(bid, {}) for bid in recent_badges],
                "last_activity": user_data.get("last_updated", "")
            })
        
        return sorted(leaderboard, key=lambda x: x["achievement_points"], reverse=True)
    
    def generate_status_report(self) -> str:
        """Generate a comprehensive status report"""
        report = ["🏆 Achievement Badges System Status", "=" * 40]
        
        # Overall stats
        total_users = len(self.data["user_achievements"])
        total_celebrations = len(self.data["celebration_history"])
        available_badges = len(self.data["badges"])
        
        report.extend([
            f"👥 Users Tracked: {total_users}",
            f"🎉 Total Celebrations: {total_celebrations}",
            f"🏅 Available Badges: {available_badges}",
            ""
        ])
        
        # Badge distribution
        badge_counts = {}
        for user_data in self.data["user_achievements"].values():
            for badge_id in user_data["badges"]:
                badge_counts[badge_id] = badge_counts.get(badge_id, 0) + 1
        
        if badge_counts:
            report.extend(["📊 Badge Distribution:", ""])
            for badge_id, count in sorted(badge_counts.items(), key=lambda x: x[1], reverse=True):
                badge = self.data["badges"].get(badge_id, {})
                name = badge.get("name", badge_id)
                emoji = badge.get("emoji", "🏅")
                report.append(f"   {emoji} {name}: {count} users")
        
        # Recent achievements
        if self.data["celebration_history"]:
            report.extend(["", "🎊 Recent Achievements:"])
            recent = sorted(self.data["celebration_history"], 
                          key=lambda x: x["earned_at"], reverse=True)[:5]
            for achievement in recent:
                handle = achievement["handle"]
                badge_name = achievement["badge_name"]
                earned_at = achievement["earned_at"][:10]  # Just date
                report.append(f"   {earned_at}: {handle} → {badge_name}")
        
        return "\n".join(report)

# Integration functions for @streaks-agent

def streaks_agent_badge_check(handle: str, current_streak: int, best_streak: int, 
                             ships_count: int = 0, games_count: int = 0, dm_count: int = 0) -> Dict:
    """
    Primary integration function for @streaks-agent
    Call this when updating streaks to check for new achievements
    """
    system = IntegratedAchievementSystem()
    
    metrics = {
        "current_streak": current_streak,
        "best_streak": best_streak,
        "ships_count": ships_count,
        "games_count": games_count,
        "dm_count": dm_count
    }
    
    new_badges, celebration_message, should_announce = system.check_and_award_badges(handle, **metrics)
    
    return {
        "has_new_achievements": len(new_badges) > 0,
        "new_badges": new_badges,
        "celebration_message": celebration_message,
        "should_announce_publicly": should_announce,
        "user_progress": system.get_user_progress(handle, **metrics)
    }

def main():
    """Test the integrated achievement system"""
    print("🎖️ Testing Integrated Achievement Badges System")
    print("=" * 50)
    
    # Test badge checking
    result = streaks_agent_badge_check("demo_user", current_streak=7, best_streak=7, ships_count=1)
    
    if result["has_new_achievements"]:
        print("🎉 NEW ACHIEVEMENTS DETECTED!")
        print(f"Message: {result['celebration_message']}")
        print(f"Public announcement: {result['should_announce_publicly']}")
        
        for badge in result["new_badges"]:
            print(f"   {badge['emoji']} {badge['name']} - {badge['description']}")
    else:
        print("No new achievements this cycle")
    
    # Show progress
    progress = result["user_progress"]
    print(f"\n📊 Current Status:")
    print(f"   Total badges: {progress['total_badges']}")
    
    if progress["next_milestone"]:
        milestone = progress["next_milestone"]
        badge = milestone["badge"]
        print(f"   Next milestone: {badge['emoji']} {badge['name']}")
        print(f"   Progress: {milestone['progress_percent']}% ({milestone['remaining']} to go)")
    
    # Generate status report
    system = IntegratedAchievementSystem()
    report = system.generate_status_report()
    print(f"\n{report}")

if __name__ == "__main__":
    main()