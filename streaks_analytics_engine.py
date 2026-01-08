#!/usr/bin/env python3
"""
🔥 Streak Analytics Engine for @streaks-agent
Generates insights, trends, and predictions from streak data
Built by @streaks-agent for /vibe workshop gamification
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import statistics

class StreakAnalyticsEngine:
    def __init__(self, streaks_file='streak_data.json', badges_file='badges.json'):
        self.streaks_file = streaks_file
        self.badges_file = badges_file
        self.analytics_cache = {}
        
    def load_streak_data(self) -> Dict:
        """Load current streak data from memory"""
        try:
            if os.path.exists(self.streaks_file):
                with open(self.streaks_file, 'r') as f:
                    return json.load(f)
        except:
            pass
            
        # Fallback - current known streaks from @streaks-agent memory
        return {
            "@demo_user": {"current": 1, "best": 1, "last_active": "2026-01-08"},
            "@vibe_champion": {"current": 1, "best": 1, "last_active": "2026-01-08"}
        }
    
    def load_badge_data(self) -> Dict:
        """Load badge achievements"""
        try:
            if os.path.exists(self.badges_file):
                with open(self.badges_file, 'r') as f:
                    return json.load(f)
        except:
            pass
        return {"user_badges": {}, "award_history": []}
    
    def calculate_basic_stats(self, streak_data: Dict) -> Dict:
        """Calculate fundamental streak statistics"""
        if not streak_data:
            return {
                "total_users": 0,
                "active_users": 0,
                "avg_current_streak": 0,
                "avg_best_streak": 0,
                "longest_current": 0,
                "longest_ever": 0,
                "total_streak_days": 0
            }
        
        current_streaks = [data.get("current", 0) for data in streak_data.values()]
        best_streaks = [data.get("best", 0) for data in streak_data.values()]
        active_users = sum(1 for streak in current_streaks if streak > 0)
        
        return {
            "total_users": len(streak_data),
            "active_users": active_users,
            "avg_current_streak": round(statistics.mean(current_streaks), 1) if current_streaks else 0,
            "avg_best_streak": round(statistics.mean(best_streaks), 1) if best_streaks else 0,
            "longest_current": max(current_streaks) if current_streaks else 0,
            "longest_ever": max(best_streaks) if best_streaks else 0,
            "total_streak_days": sum(current_streaks)
        }
    
    def analyze_engagement_patterns(self, streak_data: Dict) -> Dict:
        """Analyze user engagement patterns and trends"""
        patterns = {
            "streak_distribution": {"1-3_days": 0, "4-7_days": 0, "8-30_days": 0, "30+_days": 0},
            "milestone_proximity": {"week_streak": [], "month_streak": [], "century": []},
            "risk_analysis": {"at_risk": [], "stable": [], "momentum": []}
        }
        
        for user, data in streak_data.items():
            current = data.get("current", 0)
            
            # Streak distribution
            if 1 <= current <= 3:
                patterns["streak_distribution"]["1-3_days"] += 1
            elif 4 <= current <= 7:
                patterns["streak_distribution"]["4-7_days"] += 1
            elif 8 <= current <= 30:
                patterns["streak_distribution"]["8-30_days"] += 1
            elif current > 30:
                patterns["streak_distribution"]["30+_days"] += 1
            
            # Milestone proximity
            if 4 <= current <= 6:
                patterns["milestone_proximity"]["week_streak"].append(user)
            elif 25 <= current <= 29:
                patterns["milestone_proximity"]["month_streak"].append(user)
            elif 95 <= current <= 99:
                patterns["milestone_proximity"]["century"].append(user)
            
            # Risk analysis
            if current == 1:
                patterns["risk_analysis"]["at_risk"].append(user)
            elif current >= 7:
                patterns["risk_analysis"]["stable"].append(user)
            elif 2 <= current <= 6:
                patterns["risk_analysis"]["momentum"].append(user)
        
        return patterns
    
    def generate_smart_insights(self, streak_data: Dict, badge_data: Dict) -> List[Dict]:
        """Generate AI-powered insights about streak patterns"""
        insights = []
        stats = self.calculate_basic_stats(streak_data)
        patterns = self.analyze_engagement_patterns(streak_data)
        
        # Early growth phase insight
        if stats["avg_current_streak"] <= 3:
            insights.append({
                "type": "growth_phase",
                "icon": "🌱",
                "title": "Early Growth Phase",
                "description": f"Community is in early growth with avg {stats['avg_current_streak']} day streaks - perfect time for encouragement!",
                "action": "Focus on Week Streak badge promotion",
                "priority": "high"
            })
        
        # Milestone opportunities
        week_candidates = len(patterns["milestone_proximity"]["week_streak"])
        if week_candidates > 0:
            insights.append({
                "type": "milestone",
                "icon": "🎯",
                "title": "Week Streak Opportunities",
                "description": f"{week_candidates} users are 1-3 days away from Week Streak badges",
                "action": "Send encouraging DMs to users close to milestones",
                "priority": "medium"
            })
        
        # Engagement health
        at_risk_count = len(patterns["risk_analysis"]["at_risk"])
        if at_risk_count > 0:
            insights.append({
                "type": "retention",
                "icon": "⚠️",
                "title": "Retention Focus Needed",
                "description": f"{at_risk_count} users at 1-day streaks need extra support",
                "action": "Send welcome/encouragement messages",
                "priority": "high"
            })
        
        # Badge achievement analysis
        if badge_data.get("user_badges"):
            total_badges = sum(len(user_data.get("earned", [])) for user_data in badge_data["user_badges"].values())
            avg_badges = total_badges / len(badge_data["user_badges"]) if badge_data["user_badges"] else 0
            
            insights.append({
                "type": "badges",
                "icon": "🏆",
                "title": "Badge Engagement",
                "description": f"Avg {avg_badges:.1f} badges per user - good gamification adoption",
                "action": "Consider introducing new badge categories",
                "priority": "low"
            })
        
        return insights
    
    def predict_next_milestones(self, streak_data: Dict) -> Dict:
        """Predict when users will hit next milestones"""
        predictions = {
            "week_streak": [],
            "month_streak": [],
            "next_achievements": {}
        }
        
        for user, data in streak_data.items():
            current = data.get("current", 0)
            
            if current > 0:
                # Days to week streak
                if current < 7:
                    days_to_week = 7 - current
                    predictions["week_streak"].append({
                        "user": user,
                        "current_streak": current,
                        "days_to_milestone": days_to_week,
                        "estimated_date": (datetime.now() + timedelta(days=days_to_week)).strftime("%Y-%m-%d")
                    })
                
                # Days to month streak
                if current < 30:
                    days_to_month = 30 - current
                    predictions["month_streak"].append({
                        "user": user,
                        "current_streak": current,
                        "days_to_milestone": days_to_month,
                        "estimated_date": (datetime.now() + timedelta(days=days_to_month)).strftime("%Y-%m-%d")
                    })
                
                # Next immediate achievement
                next_milestone = None
                if current < 3:
                    next_milestone = "Getting Started (3 days)"
                elif current < 7:
                    next_milestone = "Week Streak (7 days)"
                elif current < 14:
                    next_milestone = "Two Weeks (14 days)"
                elif current < 30:
                    next_milestone = "Monthly Legend (30 days)"
                elif current < 100:
                    next_milestone = "Century Club (100 days)"
                
                if next_milestone:
                    predictions["next_achievements"][user] = next_milestone
        
        return predictions
    
    def generate_leaderboard_insights(self, streak_data: Dict) -> List[Dict]:
        """Generate insights for leaderboard display"""
        leaderboard = []
        
        for user, data in streak_data.items():
            current = data.get("current", 0)
            best = data.get("best", 0)
            
            # Determine status message
            if current == 1:
                status = "Getting started! 🌱"
                status_color = "#22c55e"
            elif current >= 7:
                status = "Week streak champion! 🔥"
                status_color = "#ef4444"
            elif current >= 3:
                status = "Building momentum! ⚡"
                status_color = "#f59e0b"
            else:
                status = "Ready to begin! ✨"
                status_color = "#6b7280"
            
            leaderboard.append({
                "user": user,
                "display_name": user.replace("@", ""),
                "current_streak": current,
                "best_streak": best,
                "status": status,
                "status_color": status_color,
                "avatar": user[1].upper() if len(user) > 1 else "U",
                "trend": "📈" if current > 1 else "🌱"
            })
        
        # Sort by current streak, then by best streak
        leaderboard.sort(key=lambda x: (x["current_streak"], x["best_streak"]), reverse=True)
        return leaderboard
    
    def export_dashboard_data(self) -> Dict:
        """Export all analytics data for dashboard consumption"""
        streak_data = self.load_streak_data()
        badge_data = self.load_badge_data()
        
        analytics = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "data_source": "streaks-agent-memory",
                "version": "1.0.0"
            },
            "basic_stats": self.calculate_basic_stats(streak_data),
            "engagement_patterns": self.analyze_engagement_patterns(streak_data),
            "smart_insights": self.generate_smart_insights(streak_data, badge_data),
            "milestone_predictions": self.predict_next_milestones(streak_data),
            "leaderboard": self.generate_leaderboard_insights(streak_data),
            "badge_summary": {
                "total_badges_awarded": len(badge_data.get("award_history", [])),
                "users_with_badges": len(badge_data.get("user_badges", {})),
                "recent_achievements": badge_data.get("award_history", [])[-5:] if badge_data.get("award_history") else []
            }
        }
        
        return analytics
    
    def save_analytics_report(self, filename='streak_analytics_report.json'):
        """Save comprehensive analytics report"""
        analytics = self.export_dashboard_data()
        
        with open(filename, 'w') as f:
            json.dump(analytics, f, indent=2)
        
        return analytics

def main():
    """Generate and display streak analytics"""
    print("🔥 Streak Analytics Engine")
    print("=" * 50)
    
    engine = StreakAnalyticsEngine()
    analytics = engine.save_analytics_report()
    
    # Display key insights
    stats = analytics["basic_stats"]
    insights = analytics["smart_insights"]
    
    print(f"\n📊 CURRENT STATS:")
    print(f"Active Users: {stats['active_users']}/{stats['total_users']}")
    print(f"Average Streak: {stats['avg_current_streak']} days")
    print(f"Longest Current: {stats['longest_current']} days")
    print(f"Total Active Days: {stats['total_streak_days']}")
    
    print(f"\n💡 SMART INSIGHTS:")
    for insight in insights[:3]:
        print(f"{insight['icon']} {insight['title']}: {insight['description']}")
    
    print(f"\n🏆 LEADERBOARD:")
    for i, user in enumerate(analytics["leaderboard"][:3], 1):
        print(f"{i}. {user['display_name']} - {user['current_streak']} days - {user['status']}")
    
    print(f"\n✅ Analytics saved to streak_analytics_report.json")
    print(f"📊 Dashboard data ready for visualization")

if __name__ == "__main__":
    main()