#!/usr/bin/env python3
"""
Streak Engagement Predictor
Analyzes patterns to predict which users need encouragement and celebrates upcoming milestones.

Built for @streaks-agent to proactively support workshop engagement.
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any

class StreakEngagementPredictor:
    def __init__(self):
        self.load_data()
        
    def load_data(self):
        """Load current streak and achievement data"""
        # Load streak data (simulated based on current known users)
        self.streak_data = {
            "@demo_user": {"current": 1, "best": 1, "last_seen": "2026-01-08T17:17:00Z"},
            "@vibe_champion": {"current": 1, "best": 1, "last_seen": "2026-01-08T17:17:00Z"}
        }
        
        # Load achievements
        try:
            with open('achievements.json', 'r') as f:
                self.achievements_data = json.load(f)
        except FileNotFoundError:
            self.achievements_data = {"user_achievements": {}, "badges": {}}
            
        # Milestone definitions
        self.milestones = {
            3: {"name": "Getting started", "emoji": "🌱", "priority": "high"},
            7: {"name": "Week Warrior", "emoji": "💪", "priority": "high"},
            14: {"name": "Consistency King", "emoji": "🔥", "priority": "medium"},
            30: {"name": "Monthly Legend", "emoji": "🏆", "priority": "high"},
            100: {"name": "Century Club", "emoji": "👑", "priority": "high"}
        }

    def predict_engagement_needs(self) -> Dict[str, Any]:
        """Analyze users and predict who needs encouragement"""
        predictions = {
            "milestone_approaching": [],
            "at_risk_users": [],
            "comeback_opportunities": [],
            "celebration_ready": [],
            "insights": []
        }
        
        for handle, data in self.streak_data.items():
            current = data["current"]
            best = data["best"]
            
            # Check for milestone approaches
            milestone_pred = self._predict_milestone_approach(handle, current)
            if milestone_pred:
                predictions["milestone_approaching"].append(milestone_pred)
            
            # Check for at-risk patterns
            risk_pred = self._predict_streak_risk(handle, current, best)
            if risk_pred:
                predictions["at_risk_users"].append(risk_pred)
            
            # Check for comeback opportunities
            comeback_pred = self._predict_comeback_opportunity(handle, current, best)
            if comeback_pred:
                predictions["comeback_opportunities"].append(comeback_pred)
                
            # Check if ready for celebration
            celebration_pred = self._predict_celebration_readiness(handle, current)
            if celebration_pred:
                predictions["celebration_ready"].append(celebration_pred)
        
        # Generate actionable insights
        predictions["insights"] = self._generate_insights(predictions)
        predictions["engagement_score"] = self._calculate_workshop_engagement()
        
        return predictions
    
    def _predict_milestone_approach(self, handle: str, current_streak: int) -> Dict[str, Any]:
        """Predict if user is approaching a milestone"""
        next_milestone = None
        days_to_milestone = float('inf')
        
        for milestone_days, info in self.milestones.items():
            if current_streak < milestone_days:
                remaining = milestone_days - current_streak
                if remaining < days_to_milestone:
                    days_to_milestone = remaining
                    next_milestone = {
                        "days": milestone_days,
                        "name": info["name"],
                        "emoji": info["emoji"],
                        "priority": info["priority"]
                    }
                break
        
        if next_milestone and days_to_milestone <= 2:  # Within 2 days of milestone
            return {
                "handle": handle,
                "current_streak": current_streak,
                "milestone": next_milestone,
                "days_remaining": days_to_milestone,
                "encouragement_message": f"Only {days_to_milestone} more days to {next_milestone['name']}! {next_milestone['emoji']}",
                "celebration_prep": f"Ready to celebrate {next_milestone['name']} achievement!"
            }
        
        return None
    
    def _predict_streak_risk(self, handle: str, current: int, best: int) -> Dict[str, Any]:
        """Predict if user's streak is at risk"""
        # Simple risk model based on current patterns
        risk_level = "low"
        risk_factors = []
        
        if current == 1:
            risk_level = "medium"
            risk_factors.append("New streak - needs encouragement")
        
        if current < best * 0.5 and best > 3:
            risk_level = "high"
            risk_factors.append("Well below personal best")
        
        if current >= 3 and current < 7:
            risk_level = "medium"
            risk_factors.append("In critical first week phase")
        
        if risk_level != "low":
            return {
                "handle": handle,
                "current_streak": current,
                "best_streak": best,
                "risk_level": risk_level,
                "risk_factors": risk_factors,
                "recommendation": self._get_risk_recommendation(risk_level, current)
            }
        
        return None
    
    def _predict_comeback_opportunity(self, handle: str, current: int, best: int) -> Dict[str, Any]:
        """Predict comeback opportunities for users with broken streaks"""
        if best > current and best >= 7:  # Had a good streak before
            days_off_pace = best - current
            return {
                "handle": handle,
                "current_streak": current,
                "previous_best": best,
                "comeback_potential": "high" if best >= 14 else "medium",
                "days_behind": days_off_pace,
                "message": f"You've done {best} days before - you can do it again! 💪"
            }
        return None
    
    def _predict_celebration_readiness(self, handle: str, current: int) -> Dict[str, Any]:
        """Check if user has achieved a milestone that should be celebrated"""
        for milestone_days, info in self.milestones.items():
            if current == milestone_days:
                # Check if we've already celebrated this milestone
                user_achievements = self.achievements_data.get("user_achievements", {}).get(handle, [])
                milestone_badge_name = f"{info['name']} {info['emoji']}"
                
                already_celebrated = any(
                    badge.get('name', '').replace('🌱 ', '').replace('💪 ', '').replace('🔥 ', '').replace('🏆 ', '').replace('👑 ', '').strip() == info['name']
                    for badge in user_achievements
                )
                
                if not already_celebrated:
                    return {
                        "handle": handle,
                        "milestone_days": milestone_days,
                        "milestone_name": info["name"],
                        "milestone_emoji": info["emoji"],
                        "celebration_message": f"{info['emoji']} Congratulations on your {milestone_days}-day streak! {info['name']}!",
                        "priority": info["priority"]
                    }
        
        return None
    
    def _get_risk_recommendation(self, risk_level: str, current_streak: int) -> str:
        """Get specific recommendation based on risk level"""
        if risk_level == "high":
            return f"Send encouraging DM - user needs support to rebuild streak"
        elif risk_level == "medium" and current_streak < 3:
            return f"Share tips for building consistency - critical early stage"
        elif risk_level == "medium":
            return f"Highlight progress so far - encourage next milestone"
        else:
            return f"Monitor for continued engagement"
    
    def _generate_insights(self, predictions: Dict) -> List[str]:
        """Generate actionable insights from predictions"""
        insights = []
        
        milestone_count = len(predictions["milestone_approaching"])
        if milestone_count > 0:
            insights.append(f"🎯 {milestone_count} users approaching milestones - perfect timing for encouragement!")
        
        risk_count = len(predictions["at_risk_users"])
        if risk_count > 0:
            high_risk = sum(1 for user in predictions["at_risk_users"] if user["risk_level"] == "high")
            if high_risk > 0:
                insights.append(f"⚠️ {high_risk} users at high risk - send supportive DMs")
            else:
                insights.append(f"📊 {risk_count} users need light encouragement")
        
        comeback_count = len(predictions["comeback_opportunities"])
        if comeback_count > 0:
            insights.append(f"💪 {comeback_count} comeback candidates - remind them of past success")
        
        celebration_count = len(predictions["celebration_ready"])
        if celebration_count > 0:
            insights.append(f"🎉 {celebration_count} ready for milestone celebrations!")
        
        if not insights:
            insights.append("✅ All users engaged and on track - great workshop momentum!")
        
        return insights
    
    def _calculate_workshop_engagement(self) -> Dict[str, Any]:
        """Calculate overall workshop engagement metrics"""
        total_users = len(self.streak_data)
        if total_users == 0:
            return {"score": 0, "level": "inactive"}
        
        active_streaks = sum(1 for data in self.streak_data.values() if data["current"] > 0)
        avg_streak = sum(data["current"] for data in self.streak_data.values()) / total_users
        
        # Engagement score (0-100)
        active_ratio = active_streaks / total_users
        streak_factor = min(avg_streak / 5, 1)  # Normalize around 5-day average
        engagement_score = int((active_ratio * 0.6 + streak_factor * 0.4) * 100)
        
        if engagement_score >= 80:
            level = "excellent"
        elif engagement_score >= 60:
            level = "good"
        elif engagement_score >= 40:
            level = "moderate"
        else:
            level = "needs_attention"
        
        return {
            "score": engagement_score,
            "level": level,
            "active_users": active_streaks,
            "total_users": total_users,
            "avg_streak": round(avg_streak, 1)
        }
    
    def export_predictions_report(self) -> str:
        """Export formatted predictions report for @streaks-agent"""
        predictions = self.predict_engagement_needs()
        
        report = "🔮 STREAK ENGAGEMENT PREDICTIONS\\n"
        report += "=" * 50 + "\\n\\n"
        
        # Engagement Score
        score = predictions["engagement_score"]
        report += f"📊 Workshop Engagement: {score['score']}/100 ({score['level'].upper()})\\n"
        report += f"   Active Users: {score['active_users']}/{score['total_users']} | Avg Streak: {score['avg_streak']} days\\n\\n"
        
        # Key Insights
        report += "💡 KEY INSIGHTS\\n"
        for insight in predictions["insights"]:
            report += f"   {insight}\\n"
        report += "\\n"
        
        # Celebrations Ready
        if predictions["celebration_ready"]:
            report += "🎉 READY FOR CELEBRATION\\n"
            for cele in predictions["celebration_ready"]:
                report += f"   {cele['handle']}: {cele['celebration_message']}\\n"
            report += "\\n"
        
        # Milestone Approaching
        if predictions["milestone_approaching"]:
            report += "🎯 MILESTONE APPROACHING\\n"
            for milestone in predictions["milestone_approaching"]:
                report += f"   {milestone['handle']}: {milestone['encouragement_message']}\\n"
            report += "\\n"
        
        # At Risk Users
        if predictions["at_risk_users"]:
            report += "⚠️ USERS NEEDING SUPPORT\\n"
            for risk in predictions["at_risk_users"]:
                report += f"   {risk['handle']} ({risk['risk_level']} risk): {risk['recommendation']}\\n"
            report += "\\n"
        
        # Comeback Opportunities
        if predictions["comeback_opportunities"]:
            report += "💪 COMEBACK OPPORTUNITIES\\n"
            for comeback in predictions["comeback_opportunities"]:
                report += f"   {comeback['handle']}: {comeback['message']}\\n"
            report += "\\n"
        
        report += "=" * 50
        return report

if __name__ == "__main__":
    predictor = StreakEngagementPredictor()
    
    # Generate and display predictions
    print(predictor.export_predictions_report())
    
    # Save detailed predictions to JSON
    predictions = predictor.predict_engagement_needs()
    with open('streak_predictions.json', 'w') as f:
        json.dump(predictions, f, indent=2, default=str)
    
    print("\\n📁 Detailed predictions saved to streak_predictions.json")