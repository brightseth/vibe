#!/usr/bin/env python3
"""
Simple Streak Dashboard Runner
Generates analytics from current streak data
"""

from streak_analytics import StreakAnalytics

def run_dashboard():
    # This would integrate with the actual streak system
    # For now, using the current data we have
    current_streaks = {
        "@demo_user": {"current": 1, "best": 1},
        "@vibe_champion": {"current": 1, "best": 1}
    }
    
    analytics = StreakAnalytics(current_streaks)
    
    print("=== STREAK ANALYTICS DASHBOARD ===")
    print(analytics.generate_report())
    
    # Get actionable insights
    insights = analytics.generate_insights()
    patterns = analytics.identify_patterns()
    
    print("\n=== IMMEDIATE ACTIONS ===")
    
    # Suggest specific actions based on patterns
    if patterns['milestone_approachers']:
        print("🎯 MILESTONE WATCH:")
        for approach in patterns['milestone_approachers']:
            if isinstance(approach, dict):
                print(f"   → DM {approach['user']} (close to {approach['milestone']} days!)")
    
    if patterns['comeback_candidates']:
        print("🔄 COMEBACK OPPORTUNITIES:")
        for user in patterns['comeback_candidates']:
            print(f"   → Reach out to {user} (had good streak before)")
    
    if patterns['consistent_performers']:
        print("⭐ CELEBRATE CONSISTENCY:")
        for user in patterns['consistent_performers']:
            print(f"   → Acknowledge {user}'s dedication")

if __name__ == "__main__":
    run_dashboard()