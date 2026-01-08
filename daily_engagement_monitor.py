#!/usr/bin/env python3
"""
Daily Engagement Monitor for @streaks-agent
Built for /vibe workshop to provide proactive streak protection

This system monitors streak health and provides early intervention
when users might be at risk of breaking their streaks.
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

class DailyEngagementMonitor:
    def __init__(self):
        self.streak_data = self.load_streak_data()
        self.achievements = self.load_achievements()
        
    def load_streak_data(self):
        """Load current streak data"""
        # In real implementation, this would load from actual streak storage
        return {
            "demo_user": {"current": 1, "best": 1, "last_active": "2026-01-08"},
            "vibe_champion": {"current": 1, "best": 1, "last_active": "2026-01-08"}
        }
    
    def load_achievements(self):
        """Load achievement data"""
        try:
            with open('achievements.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"user_achievements": {}}
    
    def analyze_daily_risks(self) -> Dict[str, Any]:
        """Analyze users for streak risks and opportunities"""
        today = datetime.now().date()
        risks = []
        opportunities = []
        
        for username, data in self.streak_data.items():
            last_active = datetime.strptime(data["last_active"], "%Y-%m-%d").date()
            days_since_active = (today - last_active).days
            current_streak = data["current"]
            
            # Risk Analysis
            if days_since_active >= 1 and current_streak > 0:
                # Haven't been active today, risk of breaking streak
                risk_level = self.calculate_risk_level(current_streak, days_since_active)
                risks.append({
                    "username": username,
                    "current_streak": current_streak,
                    "days_inactive": days_since_active,
                    "risk_level": risk_level,
                    "next_milestone": self.get_next_milestone(current_streak),
                    "motivation_message": self.get_motivation_message(username, current_streak, risk_level)
                })
            
            # Opportunity Analysis
            if current_streak > 0:
                opportunities.append({
                    "username": username,
                    "current_streak": current_streak,
                    "next_milestone": self.get_next_milestone(current_streak),
                    "days_to_milestone": self.get_days_to_milestone(current_streak),
                    "encouragement_message": self.get_encouragement_message(username, current_streak)
                })
        
        return {
            "date": today.isoformat(),
            "total_users": len(self.streak_data),
            "at_risk_count": len(risks),
            "opportunity_count": len(opportunities),
            "risks": risks,
            "opportunities": opportunities,
            "overall_health": self.assess_overall_health(risks, opportunities)
        }
    
    def calculate_risk_level(self, streak_length: int, days_inactive: int) -> str:
        """Calculate risk level based on streak and inactivity"""
        if days_inactive == 0:
            return "none"
        elif days_inactive == 1 and streak_length == 1:
            return "critical"  # Day 2 is most vulnerable
        elif days_inactive == 1 and streak_length <= 7:
            return "high"
        elif days_inactive == 1:
            return "medium"
        else:
            return "lost"  # Streak already broken
    
    def get_next_milestone(self, current_streak: int) -> Dict[str, Any]:
        """Get the next milestone badge they're working toward"""
        milestones = [
            (3, "Early Bird 🌅", "3-day streak milestone"),
            (7, "Week Warrior 💪", "One week strong"),
            (14, "Consistency King 🔥", "Two weeks of dedication"),
            (30, "Monthly Legend 🏆", "Monthly legend status"),
            (100, "Century Club 👑", "Ultimate achievement")
        ]
        
        for days, name, desc in milestones:
            if current_streak < days:
                return {
                    "days": days,
                    "name": name,
                    "description": desc,
                    "days_remaining": days - current_streak
                }
        
        return {"days": 200, "name": "Streak Master 🚀", "description": "Beyond legendary", "days_remaining": 200 - current_streak}
    
    def get_days_to_milestone(self, current_streak: int) -> int:
        """Get days remaining to next milestone"""
        milestone = self.get_next_milestone(current_streak)
        return milestone["days_remaining"]
    
    def get_motivation_message(self, username: str, streak: int, risk: str) -> str:
        """Generate personalized motivation message based on risk"""
        messages = {
            "critical": f"Hey @{username}! 🚨 Day 2 is the toughest - but you've got this! Your 1-day streak is the foundation of something amazing. Just show up today! 💪",
            "high": f"@{username}, don't let that {streak}-day streak slip away! You're building something great - just a quick check-in keeps the momentum alive! 🔥",
            "medium": f"Hey @{username}! Your {streak}-day streak shows real dedication. One small action today keeps the fire burning! 🌟",
            "low": f"@{username}, your {streak}-day streak is impressive! A quick visit keeps the momentum strong! ⚡"
        }
        return messages.get(risk, f"Keep going @{username}! 🎯")
    
    def get_encouragement_message(self, username: str, streak: int) -> str:
        """Generate encouragement for users on track"""
        next_milestone = self.get_next_milestone(streak)
        days_left = next_milestone["days_remaining"]
        
        if days_left <= 2:
            return f"@{username}, you're SO close! Just {days_left} more day{'s' if days_left > 1 else ''} to earn {next_milestone['name']}! 🎯"
        elif days_left <= 7:
            return f"@{username}, great momentum! {days_left} days to your {next_milestone['name']} badge! 🚀"
        else:
            return f"@{username}, solid {streak}-day streak! Keep building toward {next_milestone['name']}! 💪"
    
    def assess_overall_health(self, risks: List, opportunities: List) -> Dict[str, Any]:
        """Assess overall workshop engagement health"""
        total_users = len(self.streak_data)
        if not total_users:
            return {"status": "inactive", "message": "No active users"}
        
        critical_risk_count = len([r for r in risks if r["risk_level"] == "critical"])
        high_risk_count = len([r for r in risks if r["risk_level"] == "high"])
        
        if critical_risk_count >= total_users * 0.5:
            status = "critical"
            message = "⚠️ Many users at Day 2 risk - intervention needed!"
        elif high_risk_count >= total_users * 0.3:
            status = "concerning"  
            message = "⚡ Several users need motivation support"
        elif len(opportunities) >= total_users * 0.7:
            status = "thriving"
            message = "🌟 Strong engagement momentum!"
        else:
            status = "stable"
            message = "✅ Steady engagement levels"
        
        return {
            "status": status,
            "message": message,
            "critical_risk_users": critical_risk_count,
            "high_risk_users": high_risk_count,
            "healthy_users": total_users - len(risks)
        }
    
    def generate_daily_report(self) -> str:
        """Generate daily engagement report for @streaks-agent"""
        analysis = self.analyze_daily_risks()
        
        report = f"""
# 📊 Daily Engagement Report - {analysis['date']}
*Generated by Daily Engagement Monitor*

## 🎯 Overall Health: {analysis['overall_health']['status'].upper()}
{analysis['overall_health']['message']}

## 📈 Summary Stats
- **Total Users**: {analysis['total_users']}
- **Users At Risk**: {analysis['at_risk_count']}
- **Growth Opportunities**: {analysis['opportunity_count']}

## 🚨 Users Needing Support ({analysis['at_risk_count']} users)
"""
        
        for risk in analysis['risks']:
            report += f"""
### @{risk['username']} - {risk['risk_level'].upper()} RISK
- **Current Streak**: {risk['current_streak']} days
- **Days Inactive**: {risk['days_inactive']}
- **Next Milestone**: {risk['next_milestone']['name']} in {risk['next_milestone']['days_remaining']} days
- **Action**: {risk['motivation_message']}
"""

        report += f"\n## 🌟 Users Building Momentum ({analysis['opportunity_count']} users)\n"
        
        for opp in analysis['opportunities']:
            report += f"""
### @{opp['username']}
- **Current Streak**: {opp['current_streak']} days  
- **Next Goal**: {opp['next_milestone']['name']} in {opp['days_to_milestone']} days
- **Encouragement**: {opp['encouragement_message']}
"""

        report += f"""
## 🎯 Recommended Actions for @streaks-agent

### Immediate Actions
- Send motivation DMs to {analysis['at_risk_count']} at-risk users
- Celebrate progress with {analysis['opportunity_count']} active users
- Monitor Day 2 users extra closely (most critical phase)

### Strategic Focus
- Workshop Health: {analysis['overall_health']['status']}
- Next 24h: Critical window for streak retention
- Community Support: Consider peer encouragement features

---
*Monitor runs daily to catch engagement risks early! 🎯*
"""
        return report

def main():
    """Run daily engagement analysis"""
    monitor = DailyEngagementMonitor()
    analysis = monitor.analyze_daily_risks()
    report = monitor.generate_daily_report()
    
    # Save analysis data
    with open('daily_engagement_analysis.json', 'w') as f:
        json.dump(analysis, f, indent=2)
    
    # Save report
    with open('daily_engagement_report.md', 'w') as f:
        f.write(report)
    
    print("✅ Daily Engagement Monitor completed!")
    print(f"📊 {analysis['total_users']} users analyzed")
    print(f"🚨 {analysis['at_risk_count']} users need support")
    print(f"🌟 {analysis['opportunity_count']} users showing great momentum")
    print(f"📈 Overall health: {analysis['overall_health']['status']}")
    
    return analysis

if __name__ == "__main__":
    main()