#!/usr/bin/env python3
"""
🎖️ Badge Motivation System - Personalized Encouragement Engine
Smart motivation and coaching for /vibe workshop achievements
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
import random

class BadgeMotivationSystem:
    def __init__(self):
        self.achievements_file = "achievements.json"
        
        # Motivational message templates
        self.encouragement_templates = {
            "close_to_milestone": [
                "🔥 You're just {days} days away from {milestone}! Keep that momentum going!",
                "⚡ {milestone} is within reach - only {days} more days to go!",
                "🎯 So close to {milestone}! You've got this, just {days} more days!",
                "🚀 {milestone} incoming in {days} days - you're crushing it!"
            ],
            "personal_best": [
                "🏆 You're on your personal best streak of {streak} days! New territory!",
                "🔥 Personal record alert! {streak} days and climbing!",
                "🚀 Breaking your own records - {streak} days is your new best!",
                "💪 {streak} days strong - you're writing your own success story!"
            ],
            "consistency_praise": [
                "🌟 {streak} days of consistency shows real commitment!",
                "💎 Quality consistency at {streak} days - this is how legends are made!",
                "🎯 {streak} days of showing up - you're building something special!",
                "⭐ {streak} days proves you're in this for the long haul!"
            ],
            "comeback_encouragement": [
                "🌱 Every streak starts with day one - welcome back!",
                "🔄 Fresh start, fresh energy - let's build something amazing!",
                "🆕 New beginning, same potential - you've got this!",
                "🌅 Starting fresh is a superpower - time to build!"
            ]
        }
        
        self.milestone_definitions = {
            1: {"name": "🌱 First Day", "message": "The journey begins!"},
            3: {"name": "🌅 Early Bird", "message": "Building the habit!"},
            7: {"name": "💪 Week Warrior", "message": "One week strong!"},
            14: {"name": "🔥 Consistency King", "message": "Two weeks committed!"},
            30: {"name": "🏆 Monthly Legend", "message": "A full month of dedication!"},
            100: {"name": "👑 Century Club", "message": "Legendary status achieved!"}
        }
    
    def load_user_data(self) -> Dict[str, Any]:
        """Load current achievements and streak data"""
        try:
            with open(self.achievements_file, 'r') as f:
                achievements = json.load(f)
        except FileNotFoundError:
            achievements = {"badges": {}, "user_achievements": {}, "achievement_history": []}
        
        # Mock current streak data (in real implementation, this would come from actual streak tracking)
        current_streaks = {
            "demo_user": {"current": 1, "best": 1},
            "vibe_champion": {"current": 1, "best": 1}
        }
        
        return achievements, current_streaks
    
    def analyze_user_momentum(self, handle: str, current_streak: int, best_streak: int, achievements: List) -> Dict[str, Any]:
        """Analyze a user's current momentum and motivation state"""
        
        # Calculate next milestone
        milestones = [3, 7, 14, 30, 100]
        next_milestone = None
        for milestone in milestones:
            if current_streak < milestone:
                next_milestone = milestone
                break
        
        # Motivation state analysis
        is_personal_best = current_streak == best_streak and current_streak > 1
        is_close_to_milestone = next_milestone and (next_milestone - current_streak) <= 2
        is_new_user = current_streak == 1 and best_streak == 1
        is_comeback = current_streak < best_streak / 2 and best_streak > 7
        
        # Risk factors
        risk_factors = []
        if current_streak == 1 and best_streak > 7:
            risk_factors.append("comeback_after_long_streak")
        if current_streak > 0 and len(achievements) == 0:
            risk_factors.append("no_badges_yet")
        
        return {
            "current_streak": current_streak,
            "best_streak": best_streak,
            "next_milestone": next_milestone,
            "days_to_milestone": next_milestone - current_streak if next_milestone else None,
            "is_personal_best": is_personal_best,
            "is_close_to_milestone": is_close_to_milestone,
            "is_new_user": is_new_user,
            "is_comeback": is_comeback,
            "risk_factors": risk_factors,
            "badge_count": len(achievements)
        }
    
    def generate_personalized_message(self, handle: str, momentum: Dict[str, Any]) -> str:
        """Generate a personalized motivational message"""
        
        # Priority-based message selection
        if momentum["is_close_to_milestone"]:
            template = random.choice(self.encouragement_templates["close_to_milestone"])
            milestone_name = self.milestone_definitions[momentum["next_milestone"]]["name"]
            return template.format(
                days=momentum["days_to_milestone"], 
                milestone=milestone_name
            )
        
        elif momentum["is_personal_best"]:
            template = random.choice(self.encouragement_templates["personal_best"])
            return template.format(streak=momentum["current_streak"])
        
        elif momentum["is_comeback"]:
            return random.choice(self.encouragement_templates["comeback_encouragement"])
        
        elif momentum["current_streak"] >= 3:
            template = random.choice(self.encouragement_templates["consistency_praise"])
            return template.format(streak=momentum["current_streak"])
        
        else:
            # Default encouragement for new users or short streaks
            if momentum["next_milestone"]:
                milestone_name = self.milestone_definitions[momentum["next_milestone"]]["name"]
                return f"🎯 Keep going! {milestone_name} is just {momentum['days_to_milestone']} days away!"
            else:
                return "🌟 Every day counts - you're building something amazing!"
    
    def suggest_next_actions(self, momentum: Dict[str, Any]) -> List[str]:
        """Suggest specific actions to maintain momentum"""
        suggestions = []
        
        if momentum["is_close_to_milestone"]:
            suggestions.append(f"🎯 Focus on hitting {momentum['next_milestone']} days - you're so close!")
            suggestions.append("📅 Set a daily reminder to stay consistent")
        
        if momentum["current_streak"] == 1:
            suggestions.append("🌱 Day 2 is crucial - plan your next workshop activity")
            suggestions.append("💪 Share your progress to build accountability")
        
        if momentum["badge_count"] == 0:
            suggestions.append("🚢 Try making your first announcement to earn 'First Ship' badge")
            suggestions.append("🎮 Participate in workshop games for 'Game Master' badge")
        
        if momentum["current_streak"] >= 7:
            suggestions.append("🔥 You're in the zone! Consider mentoring newer members")
            suggestions.append("📈 Track your progress to see how far you've come")
        
        if not suggestions:
            suggestions.append("✨ Stay active in the workshop to grow your streak")
            suggestions.append("🤝 Connect with other members to build community")
        
        return suggestions
    
    def calculate_motivation_score(self, momentum: Dict[str, Any]) -> Tuple[int, str]:
        """Calculate a motivation score and status"""
        score = 50  # Base score
        
        # Positive factors
        if momentum["is_personal_best"]:
            score += 25
        if momentum["is_close_to_milestone"]:
            score += 20
        if momentum["current_streak"] >= 7:
            score += 15
        if momentum["badge_count"] > 0:
            score += 10
        
        # Negative factors
        if momentum["is_comeback"]:
            score -= 15
        if "comeback_after_long_streak" in momentum["risk_factors"]:
            score -= 20
        
        score = max(0, min(100, score))
        
        if score >= 80:
            status = "🔥 Highly Motivated"
        elif score >= 60:
            status = "💪 Strong Momentum"
        elif score >= 40:
            status = "⚡ Building Steam"
        else:
            status = "🌱 Getting Started"
        
        return score, status
    
    def generate_coaching_report(self) -> Dict[str, Any]:
        """Generate comprehensive coaching insights for all users"""
        achievements, streaks = self.load_user_data()
        
        user_reports = {}
        workshop_insights = {
            "total_motivation_score": 0,
            "users_at_risk": [],
            "high_performers": [],
            "upcoming_milestones": []
        }
        
        for handle, streak_data in streaks.items():
            user_achievements = achievements.get("user_achievements", {}).get(handle, [])
            momentum = self.analyze_user_momentum(
                handle, 
                streak_data["current"], 
                streak_data["best"], 
                user_achievements
            )
            
            motivation_score, status = self.calculate_motivation_score(momentum)
            personalized_message = self.generate_personalized_message(handle, momentum)
            next_actions = self.suggest_next_actions(momentum)
            
            user_reports[handle] = {
                "momentum": momentum,
                "motivation_score": motivation_score,
                "status": status,
                "message": personalized_message,
                "suggested_actions": next_actions
            }
            
            # Workshop-level insights
            workshop_insights["total_motivation_score"] += motivation_score
            
            if motivation_score < 40:
                workshop_insights["users_at_risk"].append(handle)
            elif motivation_score >= 80:
                workshop_insights["high_performers"].append(handle)
            
            if momentum["is_close_to_milestone"]:
                workshop_insights["upcoming_milestones"].append({
                    "handle": handle,
                    "milestone": momentum["next_milestone"],
                    "days_remaining": momentum["days_to_milestone"]
                })
        
        workshop_insights["avg_motivation_score"] = workshop_insights["total_motivation_score"] / len(streaks)
        
        return {
            "timestamp": datetime.now().isoformat(),
            "user_reports": user_reports,
            "workshop_insights": workshop_insights
        }

def main():
    print("🎖️ BADGE MOTIVATION SYSTEM")
    print("=" * 50)
    
    system = BadgeMotivationSystem()
    report = system.generate_coaching_report()
    
    print(f"\n🎯 PERSONALIZED COACHING:")
    for handle, user_data in report["user_reports"].items():
        print(f"\n   👤 {handle}")
        print(f"      Status: {user_data['status']} (Score: {user_data['motivation_score']}/100)")
        print(f"      Current Streak: {user_data['momentum']['current_streak']} days")
        print(f"      Message: {user_data['message']}")
        print(f"      Next Actions:")
        for action in user_data['suggested_actions']:
            print(f"         • {action}")
    
    print(f"\n🏥 WORKSHOP HEALTH:")
    insights = report["workshop_insights"]
    print(f"   Average Motivation: {insights['avg_motivation_score']:.1f}/100")
    print(f"   High Performers: {len(insights['high_performers'])}")
    print(f"   Users At Risk: {len(insights['users_at_risk'])}")
    print(f"   Upcoming Milestones: {len(insights['upcoming_milestones'])}")
    
    if insights["upcoming_milestones"]:
        print(f"\n🎯 MILESTONE WATCH:")
        for milestone_info in insights["upcoming_milestones"]:
            milestone_name = system.milestone_definitions[milestone_info["milestone"]]["name"]
            print(f"   • {milestone_info['handle']} → {milestone_name} in {milestone_info['days_remaining']} days")
    
    # Save coaching report
    with open("badge_motivation_report.json", 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n💾 Coaching report saved to badge_motivation_report.json")
    print(f"📅 Report generated: {report['timestamp']}")

if __name__ == "__main__":
    main()