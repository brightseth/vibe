#!/usr/bin/env python3
"""
Quick runner for the enhanced engagement predictor
"""

import sys
import os
sys.path.append('.')

from streak_engagement_predictor_v2 import StreakEngagementPredictor
import json

def main():
    predictor = StreakEngagementPredictor()
    
    # Create current streak data file for the predictor
    current_streaks = {
        '@demo_user': {'current': 1, 'best': 1, 'last_active': '2026-01-08'},
        '@vibe_champion': {'current': 1, 'best': 1, 'last_active': '2026-01-08'}
    }
    
    with open('streak_data.json', 'w') as f:
        json.dump(current_streaks, f, indent=2)
    
    # Generate report
    report = predictor.generate_engagement_report()
    
    print("🔮 Enhanced Streak Engagement Analysis")
    print("=" * 50)
    
    print(f"\n📊 Current Status ({report['total_users']} active users)")
    print(f"Average streak: {report['summary_stats']['avg_streak']:.1f} days")
    
    print(f"\n🚦 Risk Assessment:")
    for user, analysis in report['risk_analysis'].items():
        risk_color = {'critical': '🔴', 'moderate': '🟡', 'low': '🟢'}.get(analysis['risk_level'])
        print(f"  {risk_color} {user}")
        print(f"    Current: {analysis['current_streak']} days | Risk: {analysis['score']:.2f}")
        print(f"    Next: {analysis['next_milestone']['name']} in {analysis['next_milestone']['days'] - analysis['current_streak']} days")
        print(f"    💭 {analysis['motivation_message']}")
    
    if report['recommendations']:
        print(f"\n💡 Action Items:")
        for i, rec in enumerate(report['recommendations'], 1):
            priority_emoji = {'high': '🚨', 'medium': '📋', 'low': '💭'}.get(rec['priority'])
            print(f"  {i}. {priority_emoji} {rec['action']}")
            if 'reason' in rec:
                print(f"     Reason: {rec['reason']}")
    
    # Save report
    filename = predictor.save_report(report)
    print(f"\n📁 Full report saved: {filename}")
    
    return report

if __name__ == "__main__":
    main()