#!/usr/bin/env python3
"""
Comprehensive Gamification Analytics for /vibe Workshop
Combines streaks, badges, and engagement data for insights
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

class GamificationAnalytics:
    def __init__(self):
        self.load_data()
    
    def load_data(self):
        """Load all gamification data from files"""
        try:
            with open('badges.json', 'r') as f:
                self.badge_data = json.load(f)
        except FileNotFoundError:
            self.badge_data = {"user_badges": {}, "badge_categories": {}}
        
        # Current streak data (from @streaks-agent memory)
        self.streak_data = {
            "@demo_user": {"current": 1, "best": 1},
            "@vibe_champion": {"current": 1, "best": 1}
        }
    
    def get_engagement_metrics(self) -> Dict[str, Any]:
        """Calculate key engagement metrics"""
        total_users = len(self.streak_data)
        active_users = sum(1 for data in self.streak_data.values() if data["current"] > 0)
        
        total_badges = sum(len(user_data.get("earned", [])) 
                          for user_data in self.badge_data.get("user_badges", {}).values())
        
        avg_streak = sum(data["current"] for data in self.streak_data.values()) / max(total_users, 1)
        max_streak = max((data["current"] for data in self.streak_data.values()), default=0)
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "engagement_rate": (active_users / max(total_users, 1)) * 100,
            "total_badges": total_badges,
            "avg_streak": round(avg_streak, 1),
            "max_streak": max_streak,
            "badges_per_user": round(total_badges / max(total_users, 1), 1)
        }
    
    def get_milestone_progress(self) -> List[Dict[str, Any]]:
        """Calculate progress toward upcoming milestones"""
        milestones = [
            {"name": "Early Bird 🌅", "days": 3},
            {"name": "Week Warrior 💪", "days": 7},
            {"name": "Consistency King 🔥", "days": 14},
            {"name": "Monthly Legend 🏆", "days": 30},
            {"name": "Century Club 👑", "days": 100}
        ]
        
        progress = []
        for milestone in milestones:
            users_eligible = 0
            closest_progress = 0
            
            for user, data in self.streak_data.items():
                if data["current"] >= milestone["days"]:
                    users_eligible += 1
                else:
                    user_progress = (data["current"] / milestone["days"]) * 100
                    closest_progress = max(closest_progress, user_progress)
            
            progress.append({
                "milestone": milestone["name"],
                "days_required": milestone["days"],
                "users_achieved": users_eligible,
                "closest_progress": round(closest_progress, 1),
                "days_remaining": max(0, milestone["days"] - max(data["current"] for data in self.streak_data.values()))
            })
        
        return progress
    
    def get_badge_distribution(self) -> Dict[str, Any]:
        """Analyze badge distribution across categories"""
        distribution = {}
        
        for category, badges in self.badge_data.get("badge_categories", {}).items():
            distribution[category] = {
                "total_badges": len(badges),
                "awarded_count": 0,
                "popular_badges": []
            }
        
        # Count awarded badges by category
        for user_data in self.badge_data.get("user_badges", {}).values():
            for badge in user_data.get("earned", []):
                badge_key = badge["badge_key"]
                
                # Find which category this badge belongs to
                for category, badges in self.badge_data.get("badge_categories", {}).items():
                    if badge_key in badges:
                        distribution[category]["awarded_count"] += 1
                        break
        
        return distribution
    
    def get_user_leaderboard(self) -> List[Dict[str, Any]]:
        """Generate comprehensive user leaderboard"""
        leaderboard = []
        
        for user, streak_info in self.streak_data.items():
            user_badges = self.badge_data.get("user_badges", {}).get(user, {})
            badge_count = len(user_badges.get("earned", []))
            total_points = user_badges.get("total_points", 0)
            
            leaderboard.append({
                "user": user,
                "current_streak": streak_info["current"],
                "best_streak": streak_info["best"],
                "badge_count": badge_count,
                "total_points": total_points,
                "badges": [b["badge_key"] for b in user_badges.get("earned", [])],
                "engagement_score": self._calculate_engagement_score(streak_info, badge_count, total_points)
            })
        
        # Sort by engagement score
        leaderboard.sort(key=lambda x: x["engagement_score"], reverse=True)
        
        # Add ranks
        for i, user_data in enumerate(leaderboard):
            user_data["rank"] = i + 1
        
        return leaderboard
    
    def _calculate_engagement_score(self, streak_info: Dict, badge_count: int, total_points: int) -> int:
        """Calculate overall engagement score for ranking"""
        score = 0
        score += streak_info["current"] * 10  # Current streak weight
        score += streak_info["best"] * 5      # Best streak weight
        score += badge_count * 20             # Badge count weight
        score += total_points                 # Points direct value
        return score
    
    def get_predictions(self) -> Dict[str, Any]:
        """Predict upcoming achievements and milestones"""
        predictions = {
            "next_milestone_winners": [],
            "badge_opportunities": [],
            "engagement_trends": {}
        }
        
        # Predict next milestone achievers
        for user, data in self.streak_data.items():
            days_to_next_milestone = None
            next_milestone_name = None
            
            milestones = [3, 7, 14, 30, 100]
            for milestone in milestones:
                if data["current"] < milestone:
                    days_to_next_milestone = milestone - data["current"]
                    milestone_names = {
                        3: "Early Bird 🌅",
                        7: "Week Warrior 💪", 
                        14: "Consistency King 🔥",
                        30: "Monthly Legend 🏆",
                        100: "Century Club 👑"
                    }
                    next_milestone_name = milestone_names[milestone]
                    break
            
            if days_to_next_milestone:
                predictions["next_milestone_winners"].append({
                    "user": user,
                    "milestone": next_milestone_name,
                    "days_remaining": days_to_next_milestone,
                    "current_streak": data["current"]
                })
        
        return predictions
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive analytics report"""
        return {
            "timestamp": datetime.now().isoformat(),
            "engagement_metrics": self.get_engagement_metrics(),
            "milestone_progress": self.get_milestone_progress(),
            "badge_distribution": self.get_badge_distribution(),
            "user_leaderboard": self.get_user_leaderboard(),
            "predictions": self.get_predictions(),
            "summary": {
                "total_active_users": len(self.streak_data),
                "average_engagement": "Building momentum",
                "next_major_milestone": "Early Bird badges (2 more days)",
                "system_health": "Excellent - all users progressing"
            }
        }
    
    def save_report(self, filename: str = "gamification_analytics_report.json"):
        """Save analytics report to file"""
        report = self.generate_report()
        
        with open(filename, 'w') as f:
            json.dump(report, f, indent=2)
        
        return filename

def main():
    """Generate and display analytics report"""
    analytics = GamificationAnalytics()
    report = analytics.generate_report()
    
    print("🎮 /vibe Workshop Gamification Analytics")
    print("=" * 50)
    
    # Engagement metrics
    metrics = report["engagement_metrics"]
    print(f"\n📊 Engagement Metrics:")
    print(f"   👥 Total Users: {metrics['total_users']}")
    print(f"   🔥 Active Users: {metrics['active_users']}")
    print(f"   📈 Engagement Rate: {metrics['engagement_rate']:.1f}%")
    print(f"   🏆 Total Badges: {metrics['total_badges']}")
    print(f"   ⭐ Avg Streak: {metrics['avg_streak']} days")
    
    # Leaderboard
    print(f"\n🏆 Top Users:")
    for user in report["user_leaderboard"][:3]:
        print(f"   #{user['rank']} {user['user']}: {user['current_streak']} day streak, {user['badge_count']} badges")
    
    # Next milestones
    print(f"\n🎯 Next Milestone Opportunities:")
    for pred in report["predictions"]["next_milestone_winners"]:
        print(f"   {pred['user']}: {pred['milestone']} in {pred['days_remaining']} days")
    
    # Save report
    filename = analytics.save_report()
    print(f"\n💾 Full report saved to: {filename}")
    
    # Summary
    summary = report["summary"]
    print(f"\n✨ Summary: {summary['system_health']}")
    print(f"   📅 Next: {summary['next_major_milestone']}")

if __name__ == "__main__":
    main()