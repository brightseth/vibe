#!/usr/bin/env python3
"""
Daily Streak Summary Generator
Creates daily summaries of streak activity for @streaks-agent
"""

import json
from datetime import datetime
from typing import Dict, List

class DailyStreakSummary:
    def __init__(self):
        self.streak_data = self.load_streak_data()
        self.achievements_data = self.load_achievements_data()
    
    def load_streak_data(self) -> Dict:
        """Load current streak data"""
        try:
            with open('streak_data.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            # Fallback to known data
            return {
                "demo_user": {"current": 1, "best": 1, "last_active": "2026-01-08"},
                "vibe_champion": {"current": 1, "best": 1, "last_active": "2026-01-08"}
            }
    
    def load_achievements_data(self) -> Dict:
        """Load achievements data"""
        try:
            with open('achievements.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"badges": {}, "user_achievements": {}, "achievement_history": []}
    
    def generate_summary(self) -> Dict:
        """Generate comprehensive daily summary"""
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Basic streak stats
        total_users = len(self.streak_data)
        active_streaks = sum(1 for user_data in self.streak_data.values() 
                           if user_data.get("current", 0) > 0)
        
        # Calculate streak distribution
        streak_ranges = self._calculate_streak_ranges()
        
        # Next milestones
        next_milestones = self._calculate_next_milestones()
        
        # Achievement progress
        achievement_progress = self._calculate_achievement_progress()
        
        # Engagement insights
        insights = self._generate_insights()
        
        return {
            "date": today,
            "summary_type": "daily_streak_report",
            "stats": {
                "total_users": total_users,
                "active_streaks": active_streaks,
                "engagement_rate": (active_streaks / total_users * 100) if total_users > 0 else 0,
                "avg_streak": sum(user_data.get("current", 0) for user_data in self.streak_data.values()) / total_users if total_users > 0 else 0
            },
            "streak_ranges": streak_ranges,
            "next_milestones": next_milestones,
            "achievements": achievement_progress,
            "insights": insights,
            "generated_at": datetime.now().isoformat()
        }
    
    def _calculate_streak_ranges(self) -> Dict:
        """Calculate how many users are in each streak range"""
        ranges = {
            "new_starters": 0,  # 1-2 days
            "building_momentum": 0,  # 3-6 days  
            "week_warriors": 0,  # 7-13 days
            "month_legends": 0,  # 14-29 days
            "streak_masters": 0  # 30+ days
        }
        
        for user_data in self.streak_data.values():
            current = user_data.get("current", 0)
            
            if current >= 30:
                ranges["streak_masters"] += 1
            elif current >= 14:
                ranges["month_legends"] += 1
            elif current >= 7:
                ranges["week_warriors"] += 1
            elif current >= 3:
                ranges["building_momentum"] += 1
            elif current >= 1:
                ranges["new_starters"] += 1
        
        return ranges
    
    def _calculate_next_milestones(self) -> Dict:
        """Calculate upcoming milestones for all users"""
        milestone_thresholds = [3, 7, 14, 30, 100]
        upcoming = {
            "this_week": [],
            "this_month": [],
            "total_approaching": 0
        }
        
        for user, user_data in self.streak_data.items():
            current = user_data.get("current", 0)
            
            # Find next milestone
            for threshold in milestone_thresholds:
                if current < threshold:
                    days_to_go = threshold - current
                    milestone_info = {
                        "user": user,
                        "current_streak": current,
                        "next_milestone": threshold,
                        "days_remaining": days_to_go
                    }
                    
                    if days_to_go <= 7:
                        upcoming["this_week"].append(milestone_info)
                    elif days_to_go <= 30:
                        upcoming["this_month"].append(milestone_info)
                    
                    upcoming["total_approaching"] += 1
                    break
        
        return upcoming
    
    def _calculate_achievement_progress(self) -> Dict:
        """Calculate achievement and badge progress"""
        user_achievements = self.achievements_data.get("user_achievements", {})
        achievement_history = self.achievements_data.get("achievement_history", [])
        
        return {
            "total_badges_awarded": sum(len(badges) for badges in user_achievements.values()),
            "users_with_badges": len([user for user, badges in user_achievements.items() if badges]),
            "recent_achievements": len([a for a in achievement_history if a.get("date", "").startswith("2026-01-08")]),
            "next_badge_opportunities": self._identify_badge_opportunities()
        }
    
    def _identify_badge_opportunities(self) -> List[Dict]:
        """Identify upcoming badge opportunities"""
        opportunities = []
        
        for user, user_data in self.streak_data.items():
            current = user_data.get("current", 0)
            
            # Check for streak milestone badges
            if current == 2:
                opportunities.append({
                    "user": user,
                    "badge": "Early Bird",
                    "requirement": "3-day streak",
                    "days_remaining": 1
                })
            elif current == 6:
                opportunities.append({
                    "user": user,
                    "badge": "Week Warrior", 
                    "requirement": "7-day streak",
                    "days_remaining": 1
                })
        
        return opportunities
    
    def _generate_insights(self) -> Dict:
        """Generate daily insights and recommendations"""
        total_users = len(self.streak_data)
        streak_1_users = sum(1 for user_data in self.streak_data.values() 
                           if user_data.get("current", 0) == 1)
        
        insights = {
            "primary": "",
            "trends": [],
            "recommendations": []
        }
        
        if streak_1_users == total_users and total_users > 0:
            insights["primary"] = "All users are in the critical first-day phase 🌱"
            insights["trends"].append("Foundation building phase - perfect for establishing habits")
            insights["recommendations"].append("Encourage first project ships to cement engagement")
            insights["recommendations"].append("Focus on 3-day milestone motivation")
        
        elif streak_1_users > total_users // 2:
            insights["primary"] = "Majority of users building initial momentum"
            insights["trends"].append("Strong early adoption, focus on habit formation")
            insights["recommendations"].append("Create first-week challenges")
        
        return insights
    
    def generate_text_summary(self) -> str:
        """Generate human-readable text summary"""
        summary_data = self.generate_summary()
        stats = summary_data["stats"]
        milestones = summary_data["next_milestones"]
        
        text = f"""
📊 Daily Streak Summary - {summary_data["date"]}

🔥 ACTIVITY OVERVIEW
• {stats["total_users"]} users tracked
• {stats["active_streaks"]} active streaks
• {stats["engagement_rate"]:.1f}% engagement rate
• {stats["avg_streak"]:.1f} average streak length

🏆 UPCOMING MILESTONES
• {len(milestones["this_week"])} milestones this week
• {len(milestones["this_month"])} milestones this month

💡 KEY INSIGHTS
{summary_data["insights"]["primary"]}

🎯 RECOMMENDATIONS
{chr(10).join(f"• {rec}" for rec in summary_data["insights"]["recommendations"])}

---
Generated by @streaks-agent at {datetime.now().strftime("%H:%M")}
        """.strip()
        
        return text

def main():
    """Generate and display daily summary"""
    summarizer = DailyStreakSummary()
    
    # Generate summary data
    summary_data = summarizer.generate_summary()
    
    # Save summary data
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"daily_summary_{timestamp}.json"
    
    with open(filename, 'w') as f:
        json.dump(summary_data, f, indent=2)
    
    # Display text summary
    text_summary = summarizer.generate_text_summary()
    print(text_summary)
    print(f"\n💾 Full data saved to: {filename}")

if __name__ == "__main__":
    main()