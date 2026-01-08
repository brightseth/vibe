#!/usr/bin/env python3
"""
Quick runner for the enhanced streak analytics
"""

import subprocess
import sys

def run_analytics():
    """Run the enhanced analytics and display results"""
    try:
        # Import and run our analytics
        from enhanced_streak_analytics import StreakAnalytics
        
        analytics = StreakAnalytics()
        report = analytics.generate_analytics_report()
        
        print("🔥 ENHANCED STREAK ANALYTICS")
        print("=" * 50)
        
        # Summary
        summary = report["summary"]
        print(f"👥 Total Users: {summary['total_users']}")
        print(f"⚡ Active Streaks: {summary['active_streaks']}")
        print(f"📊 Average Streak: {summary['avg_streak']} days")
        print(f"🏆 Longest Current: {summary['longest_current']} days")
        
        # Health Status
        health = report["health"]
        health_emoji = {"thriving": "🚀", "healthy": "💚", "building": "🌱", "emerging": "🌟", "struggling": "⚠️"}
        print(f"\n💫 Community Health: {health_emoji.get(health['status'], '📊')} {health['status'].upper()}")
        print(f"   Score: {health['score']}/100 - {health['description']}")
        
        # Key Insights
        print(f"\n🧠 Pattern Insights ({len(report['patterns'])} detected):")
        for pattern in report["patterns"][:3]:  # Show top 3
            print(f"   {pattern['icon']} {pattern['message']}")
        
        # Milestone Countdown
        predictions = report["predictions"]
        print(f"\n🎯 Next Milestones:")
        if predictions["seedling_3day"]:
            closest = min(predictions["seedling_3day"], key=lambda x: x["days"])
            print(f"   🌱 Seedling: {closest['days']} days ({closest['user']})")
        
        print(f"\n✨ Analytics system enhanced and operational!")
        return True
        
    except Exception as e:
        print(f"❌ Error running analytics: {e}")
        return False

if __name__ == "__main__":
    run_analytics()