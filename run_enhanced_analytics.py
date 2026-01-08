#!/usr/bin/env python3
"""
🚀 Enhanced Analytics Runner
Combines trend analysis and badge system for comprehensive insights
"""

from streak_trend_analytics import StreakTrendAnalyzer
from achievement_badge_system import AchievementBadgeSystem
import json

def run_comprehensive_analysis():
    """Run complete analytics and badge analysis"""
    
    # Initialize systems
    analyzer = StreakTrendAnalyzer()
    badge_system = AchievementBadgeSystem()
    
    # Current streak data (from memory)
    current_data = {
        'demo_user': {'current': 1, 'best': 1},
        'vibe_champion': {'current': 1, 'best': 1}
    }
    
    # Add data to analyzer
    analyzer.add_snapshot(current_data)
    
    # Award existing badges (first day achievements)
    badge_system.award_badge("@demo_user", badge_system.badges["first_day"], 1)
    badge_system.award_badge("@vibe_champion", badge_system.badges["first_day"], 1)
    
    # Generate comprehensive report
    analytics_data = analyzer.generate_dashboard_data()
    badge_summary = badge_system.generate_badge_summary()
    
    # Combine into master dashboard data
    dashboard_data = {
        'overview': {
            'total_active_users': analytics_data['total_active'],
            'retention_rate': analytics_data['retention_rate'],
            'total_badges_awarded': badge_summary['system_stats']['total_badges_awarded'],
            'next_milestone_users': len([p for p in analytics_data['predictions'] if p['days_remaining'] <= 3])
        },
        'trends': analytics_data,
        'achievements': badge_summary,
        'combined_insights': []
    }
    
    # Add combined insights
    if analytics_data['retention_rate'] >= 90 and badge_summary['system_stats']['total_badges_awarded'] >= 2:
        dashboard_data['combined_insights'].append({
            'type': 'success',
            'title': '🎯 Perfect Launch Metrics',
            'description': 'High retention + active badge system = engaged community foundation!'
        })
    
    if len(analytics_data['predictions']) > 0:
        next_milestone = analytics_data['predictions'][0]
        dashboard_data['combined_insights'].append({
            'type': 'opportunity', 
            'title': f"🌟 Milestone Watch: {next_milestone['user']}",
            'description': f"Ready for {next_milestone['next_milestone']} in {next_milestone['days_remaining']} days!"
        })
    
    return dashboard_data

def main():
    dashboard_data = run_comprehensive_analysis()
    
    print("🔥 Enhanced Streak Analytics & Badge System")
    print("=" * 60)
    print("\n📊 OVERVIEW")
    print(f"Active Users: {dashboard_data['overview']['total_active_users']}")
    print(f"Retention: {dashboard_data['overview']['retention_rate']:.0f}%")
    print(f"Badges Awarded: {dashboard_data['overview']['total_badges_awarded']}")
    print(f"Upcoming Milestones: {dashboard_data['overview']['next_milestone_users']}")
    
    print("\n🧠 KEY INSIGHTS")
    for insight in dashboard_data['trends']['insights']:
        print(f"  {insight['title']}")
        print(f"    {insight['description']}")
    
    print("\n🎖️ BADGE LEADERBOARD")
    for user_stats in dashboard_data['achievements']['leaderboard']:
        print(f"  {user_stats['user']}: {user_stats['total_badges']} badges ({user_stats['rarity_points']} points)")
    
    print("\n🎯 MILESTONE PREDICTIONS")
    for prediction in dashboard_data['trends']['predictions']:
        print(f"  {prediction['user']}: {prediction['next_milestone']} in {prediction['days_remaining']} days ({prediction['probability']:.0%} chance)")
    
    print(f"\n💾 Full data available in JSON format ({len(json.dumps(dashboard_data))} chars)")

if __name__ == "__main__":
    main()