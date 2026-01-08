#!/usr/bin/env python3
"""
Streak Engagement Predictor for @streaks-agent
Predicts streak risk and suggests targeted interventions
"""

import json
from datetime import datetime, timedelta
import random

class StreakEngagementPredictor:
    def __init__(self):
        self.streaks_data = {
            "@demo_user": {"current": 1, "best": 1, "last_activity": datetime.now() - timedelta(hours=2)},
            "@vibe_champion": {"current": 1, "best": 1, "last_activity": datetime.now() - timedelta(hours=5)}
        }
        
        self.achievements_data = self.load_achievements()
        
        # Risk factors and weights
        self.risk_factors = {
            "hours_since_activity": {"weight": 0.4, "threshold": 12},
            "streak_length": {"weight": 0.3, "threshold": 3},  # Shorter streaks = higher risk
            "achievement_velocity": {"weight": 0.2, "threshold": 0.1},
            "engagement_pattern": {"weight": 0.1, "threshold": 0.5}
        }
    
    def load_achievements(self):
        """Load current achievements"""
        try:
            with open('achievements.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"user_achievements": {}}
    
    def calculate_streak_risk(self, handle):
        """Calculate risk score (0-100) for streak breaking"""
        if handle not in self.streaks_data:
            return {"risk_score": 0, "risk_level": "unknown", "factors": []}
        
        data = self.streaks_data[handle]
        risk_score = 0
        risk_factors = []
        
        # Factor 1: Time since last activity
        hours_since = (datetime.now() - data["last_activity"]).total_seconds() / 3600
        if hours_since > self.risk_factors["hours_since_activity"]["threshold"]:
            activity_risk = min(40, hours_since * 2)  # Max 40 points
            risk_score += activity_risk
            risk_factors.append(f"🕐 {hours_since:.1f}h since activity (+{activity_risk:.0f})")
        
        # Factor 2: Streak length vulnerability (new streaks are fragile)
        streak_length = data["current"]
        if streak_length <= self.risk_factors["streak_length"]["threshold"]:
            streak_risk = max(0, 30 - (streak_length * 10))  # 30 for 1-day, 20 for 2-day, etc.
            risk_score += streak_risk
            risk_factors.append(f"🔥 New streak ({streak_length}d) fragility (+{streak_risk:.0f})")
        
        # Factor 3: Achievement momentum
        user_achievements = self.achievements_data.get("user_achievements", {}).get(handle.replace("@", ""), [])
        if len(user_achievements) <= 1:  # Only first day badge
            momentum_risk = 20
            risk_score += momentum_risk
            risk_factors.append(f"🏅 Low achievement momentum (+{momentum_risk})")
        
        # Factor 4: Weekend/evening patterns (simulated)
        now = datetime.now()
        if now.weekday() >= 5:  # Weekend
            weekend_risk = 10
            risk_score += weekend_risk
            risk_factors.append(f"📅 Weekend engagement risk (+{weekend_risk})")
        
        # Determine risk level
        if risk_score >= 70:
            risk_level = "critical"
        elif risk_score >= 50:
            risk_level = "high"
        elif risk_score >= 30:
            risk_level = "moderate"
        elif risk_score >= 15:
            risk_level = "low"
        else:
            risk_level = "minimal"
        
        return {
            "risk_score": min(100, risk_score),
            "risk_level": risk_level,
            "factors": risk_factors,
            "hours_since_activity": hours_since,
            "streak_length": streak_length
        }
    
    def generate_intervention_suggestions(self, handle, risk_data):
        """Generate personalized engagement suggestions"""
        risk_level = risk_data["risk_level"]
        suggestions = []
        
        if risk_level == "critical":
            suggestions.extend([
                "🚨 Send immediate DM with encouraging message",
                "🎯 Highlight next milestone (only 2 days to Early Bird!)",
                "💬 Ask about their current project or interests",
                "🏆 Remind about achievement progress"
            ])
        
        elif risk_level == "high":
            suggestions.extend([
                "📞 Personal check-in via DM",
                "🎮 Suggest participating in today's activity",
                "🌟 Share their progress publicly for motivation",
                "🤝 Connect with other streak buddies"
            ])
        
        elif risk_level == "moderate":
            suggestions.extend([
                "✨ Gentle reminder about streak progress",
                "🎯 Share upcoming milestones they're working toward",
                "📊 Show their position on leaderboard"
            ])
        
        elif risk_level == "low":
            suggestions.extend([
                "👏 Celebrate consistency with encouraging comment",
                "📈 Share analytics showing their growth"
            ])
        
        else:  # minimal
            suggestions.extend([
                "🎉 Acknowledge their great streak momentum",
                "🚀 Challenge them toward next milestone"
            ])
        
        return suggestions
    
    def analyze_workshop_engagement(self):
        """Analyze overall workshop engagement and identify intervention needs"""
        analysis = {
            "timestamp": datetime.now().isoformat(),
            "total_users": len(self.streaks_data),
            "risk_summary": {"critical": 0, "high": 0, "moderate": 0, "low": 0, "minimal": 0},
            "user_risk_profiles": {},
            "intervention_priorities": [],
            "engagement_insights": []
        }
        
        # Analyze each user
        for handle in self.streaks_data.keys():
            risk_data = self.calculate_streak_risk(handle)
            suggestions = self.generate_intervention_suggestions(handle, risk_data)
            
            analysis["user_risk_profiles"][handle] = {
                "risk_score": risk_data["risk_score"],
                "risk_level": risk_data["risk_level"],
                "factors": risk_data["factors"],
                "suggested_interventions": suggestions,
                "hours_since_activity": risk_data["hours_since_activity"],
                "current_streak": self.streaks_data[handle]["current"]
            }
            
            # Count risk levels
            analysis["risk_summary"][risk_data["risk_level"]] += 1
            
            # Priority interventions
            if risk_data["risk_level"] in ["critical", "high"]:
                analysis["intervention_priorities"].append({
                    "handle": handle,
                    "risk_level": risk_data["risk_level"],
                    "primary_action": suggestions[0] if suggestions else "Monitor closely"
                })
        
        # Generate engagement insights
        total_risk_score = sum(profile["risk_score"] for profile in analysis["user_risk_profiles"].values())
        avg_risk = total_risk_score / len(analysis["user_risk_profiles"]) if analysis["user_risk_profiles"] else 0
        
        analysis["engagement_insights"] = [
            f"📊 Average risk score: {avg_risk:.1f}/100",
            f"🚨 {analysis['risk_summary']['critical'] + analysis['risk_summary']['high']} users need immediate attention",
            f"🎯 {len(analysis['intervention_priorities'])} priority interventions identified"
        ]
        
        # Recommendations for @streaks-agent
        if avg_risk >= 60:
            analysis["engagement_insights"].append("🔥 High workshop risk - increase engagement activities")
        elif avg_risk >= 40:
            analysis["engagement_insights"].append("⚡ Moderate risk - targeted check-ins recommended")
        else:
            analysis["engagement_insights"].append("✅ Workshop engagement healthy - maintain current approach")
        
        return analysis
    
    def export_predictions(self):
        """Export prediction data for dashboard integration"""
        analysis = self.analyze_workshop_engagement()
        
        # Save to JSON for dashboard consumption
        with open('streak_engagement_predictions.json', 'w') as f:
            json.dump(analysis, f, indent=2)
        
        return analysis

def main():
    """Run engagement prediction analysis"""
    predictor = StreakEngagementPredictor()
    analysis = predictor.export_predictions()
    
    print("🔮 STREAK ENGAGEMENT PREDICTION ANALYSIS")
    print("=" * 50)
    
    # Risk summary
    print("\n🚨 Risk Level Distribution:")
    for level, count in analysis["risk_summary"].items():
        if count > 0:
            print(f"   {level.capitalize()}: {count} users")
    
    # Priority interventions
    if analysis["intervention_priorities"]:
        print(f"\n⚡ Priority Interventions ({len(analysis['intervention_priorities'])}):")
        for priority in analysis["intervention_priorities"]:
            print(f"   {priority['handle']}: {priority['primary_action']}")
    
    # User details
    print(f"\n👥 Individual Risk Profiles:")
    for handle, profile in analysis["user_risk_profiles"].items():
        risk_emoji = {"critical": "🚨", "high": "⚠️", "moderate": "⚡", "low": "✅", "minimal": "🎉"}
        emoji = risk_emoji.get(profile["risk_level"], "❓")
        print(f"   {emoji} {handle}: {profile['risk_score']}/100 ({profile['risk_level']})")
        if profile["factors"]:
            print(f"      Factors: {', '.join(profile['factors'])}")
    
    # Insights
    print(f"\n💡 Key Insights:")
    for insight in analysis["engagement_insights"]:
        print(f"   {insight}")
    
    print(f"\n📁 Full analysis saved to: streak_engagement_predictions.json")

if __name__ == "__main__":
    main()