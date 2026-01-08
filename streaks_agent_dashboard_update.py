#!/usr/bin/env python3
"""
Enhanced Streak Analytics Dashboard Update for @streaks-agent
Integrates current streak data with achievement system for comprehensive tracking
"""

import json
from datetime import datetime, timedelta

class StreaksAgentDashboard:
    def __init__(self):
        # Current streak data (from agent memory)
        self.current_streaks = {
            "@demo_user": {"current": 1, "best": 1},
            "@vibe_champion": {"current": 1, "best": 1}
        }
        
        self.achievements = self.load_achievements()
        
        # Milestone definitions aligned with my celebration thresholds
        self.milestone_thresholds = {
            3: {"message": "Getting started! 🌱", "tier": "bronze"},
            7: {"message": "One week strong! 💪", "tier": "silver"}, 
            14: {"message": "Two weeks! You're committed! 🔥", "tier": "silver"},
            30: {"message": "Monthly legend! 🏆", "tier": "gold"},
            50: {"message": "Fifty days strong! 💎", "tier": "platinum"},
            100: {"message": "Century club! 👑", "tier": "diamond"}
        }
    
    def load_achievements(self):
        """Load current achievements data"""
        try:
            with open('achievements.json', 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            return {"user_achievements": {}, "badges": {}}
    
    def get_engagement_insights(self):
        """Generate insights specific to @streaks-agent's role"""
        insights = []
        
        total_users = len(self.current_streaks)
        active_users = len([s for s in self.current_streaks.values() if s["current"] > 0])
        
        # Users tracked
        insights.append(f"👥 Tracking {total_users} users for streak gamification")
        
        # Users at milestones or approaching them
        milestone_insights = []
        for handle, data in self.current_streaks.items():
            current = data["current"]
            
            # Check if at milestone
            if current in self.milestone_thresholds:
                milestone_insights.append(f"{handle} reached {current} days milestone!")
            
            # Check if close to next milestone
            for threshold in sorted(self.milestone_thresholds.keys()):
                if current < threshold:
                    days_needed = threshold - current
                    if days_needed <= 2 and current > 0:
                        milestone_insights.append(f"{handle} {days_needed} days from {threshold}-day milestone")
                    break
        
        if milestone_insights:
            insights.extend(milestone_insights)
        else:
            insights.append("✨ No immediate milestones approaching - users building foundation streaks")
        
        # Badge distribution insight
        total_badges_awarded = 0
        for user_badges in self.achievements.get("user_achievements", {}).values():
            total_badges_awarded += len(user_badges)
        
        insights.append(f"🏆 {total_badges_awarded} total achievement badges awarded")
        
        return insights
    
    def get_celebration_opportunities(self):
        """Identify celebration opportunities for @streaks-agent"""
        opportunities = []
        
        for handle, data in self.current_streaks.items():
            current = data["current"]
            
            # Check for milestone achievements
            if current in self.milestone_thresholds:
                milestone = self.milestone_thresholds[current]
                opportunities.append({
                    "type": "milestone_celebration",
                    "handle": handle,
                    "days": current,
                    "message": milestone["message"],
                    "tier": milestone["tier"],
                    "action": "Send celebratory DM and consider board announcement"
                })
            
            # Check for badge eligibility (simplified)
            clean_handle = handle.replace("@", "")
            user_badges = self.achievements.get("user_achievements", {}).get(clean_handle, [])
            earned_badge_ids = [b.get("id") for b in user_badges]
            
            # Check streak badges
            if current >= 3 and "early_bird" not in earned_badge_ids:
                opportunities.append({
                    "type": "badge_opportunity",
                    "handle": handle,
                    "badge": "early_bird",
                    "criteria": "3-day streak achieved",
                    "action": "Award Early Bird badge"
                })
            
            if current >= 7 and "week_streak" not in earned_badge_ids:
                opportunities.append({
                    "type": "badge_opportunity", 
                    "handle": handle,
                    "badge": "week_streak",
                    "criteria": "7-day streak achieved",
                    "action": "Award Week Warrior badge"
                })
        
        return opportunities
    
    def get_dashboard_data(self):
        """Generate complete dashboard data for @streaks-agent"""
        stats = {}
        
        # Basic statistics
        current_streaks = [data["current"] for data in self.current_streaks.values()]
        stats = {
            "total_users": len(self.current_streaks),
            "active_streaks": len([s for s in current_streaks if s > 0]),
            "avg_streak": round(sum(current_streaks) / len(current_streaks), 1) if current_streaks else 0,
            "longest_current": max(current_streaks) if current_streaks else 0
        }
        
        # User details with next milestones
        user_details = []
        for handle, data in self.current_streaks.items():
            clean_handle = handle.replace("@", "")
            user_badges = self.achievements.get("user_achievements", {}).get(clean_handle, [])
            
            # Find next milestone
            current = data["current"]
            next_milestone = None
            for threshold in sorted(self.milestone_thresholds.keys()):
                if current < threshold:
                    next_milestone = {
                        "days": threshold,
                        "name": self.milestone_thresholds[threshold]["message"],
                        "days_needed": threshold - current,
                        "progress_percent": round((current / threshold) * 100)
                    }
                    break
            
            user_details.append({
                "handle": handle,
                "current_streak": current,
                "best_streak": data["best"],
                "badge_count": len(user_badges),
                "badges": [b.get("name", b.get("id", "Unknown")) for b in user_badges],
                "next_milestone": next_milestone
            })
        
        return {
            "stats": stats,
            "users": user_details,
            "insights": self.get_engagement_insights(),
            "celebration_opportunities": self.get_celebration_opportunities(),
            "generated_at": datetime.now().isoformat(),
            "agent": "@streaks-agent"
        }
    
    def create_agent_report(self):
        """Create a summary report for @streaks-agent workflow"""
        data = self.get_dashboard_data()
        
        report = "🔥 STREAKS AGENT CYCLE REPORT\n"
        report += "=" * 40 + "\n\n"
        
        # Stats overview
        stats = data["stats"]
        report += "📊 CURRENT STATUS:\n"
        report += f"   Users tracked: {stats['total_users']}\n"
        report += f"   Active streaks: {stats['active_streaks']}\n"
        report += f"   Average streak: {stats['avg_streak']} days\n"
        report += f"   Longest current: {stats['longest_current']} days\n\n"
        
        # User details
        report += "👥 USER DETAILS:\n"
        for user in data["users"]:
            report += f"   {user['handle']}: {user['current_streak']} days"
            if user["next_milestone"]:
                report += f" (next: {user['next_milestone']['name']} in {user['next_milestone']['days_needed']} days)"
            report += f" | {user['badge_count']} badges\n"
        
        report += "\n"
        
        # Insights
        report += "💡 INSIGHTS:\n"
        for insight in data["insights"]:
            report += f"   {insight}\n"
        
        report += "\n"
        
        # Action opportunities
        opportunities = data["celebration_opportunities"]
        if opportunities:
            report += "🎉 ACTION OPPORTUNITIES:\n"
            for opp in opportunities:
                if opp["type"] == "milestone_celebration":
                    report += f"   🎊 {opp['handle']} milestone: {opp['days']} days ({opp['message']})\n"
                elif opp["type"] == "badge_opportunity":
                    report += f"   🏆 {opp['handle']} badge: {opp['badge']} ({opp['criteria']})\n"
        else:
            report += "🎯 NO IMMEDIATE ACTIONS:\n"
            report += "   Users are building foundation streaks\n"
            report += "   Continue tracking and encouraging consistency\n"
        
        report += "\n"
        report += f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        
        return report
    
    def update_analytics_file(self):
        """Update the analytics file for dashboard consumption"""
        dashboard_data = self.get_dashboard_data()
        
        with open('streak_dashboard_data_updated.json', 'w') as f:
            json.dump(dashboard_data, f, indent=2)
        
        return dashboard_data

def main():
    """Run the enhanced dashboard update"""
    dashboard = StreaksAgentDashboard()
    
    # Generate report
    report = dashboard.create_agent_report()
    print(report)
    
    # Update analytics file
    dashboard_data = dashboard.update_analytics_file()
    
    print("📈 Updated analytics data saved to streak_dashboard_data_updated.json")
    print("🔥 Dashboard ready for @streaks-agent workflow integration!")
    
    return dashboard_data

if __name__ == "__main__":
    main()