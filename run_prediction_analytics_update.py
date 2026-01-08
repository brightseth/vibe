#!/usr/bin/env python3
"""
Run streak prediction analytics for current users
"""

import sys
import os
sys.path.append(os.getcwd())

from streak_prediction_analytics import StreakPredictionAnalytics

def main():
    """Run prediction analytics for streaks-agent"""
    print("🔮 @streaks-agent running prediction analytics...")
    print("=" * 50)
    
    predictor = StreakPredictionAnalytics()
    predictions = predictor.export_prediction_data()
    
    # Display key insights
    community = predictions["community_analysis"]
    print(f"📊 Community Health: {community['health_score']}/100")
    print(f"⚡ Avg Continuation: {community['avg_continuation_probability']*100:.1f}%")
    
    print(f"\n🔍 Key Insights:")
    for insight in community["insights"]:
        print(f"  {insight}")
    
    # Check who needs support
    if community.get('at_risk_users'):
        print(f"\n🎯 Users needing support: {', '.join(community['at_risk_users'])}")
    
    # Show milestone predictions for each user
    print(f"\n🏆 Next Milestone Predictions:")
    for handle, data in predictions["user_predictions"].items():
        next_milestone = data['next_milestones'][0] if data['next_milestones'] else None
        if next_milestone:
            print(f"  {handle}: {next_milestone['milestone_name']} in {next_milestone['days_needed']} days ({next_milestone['probability']*100:.1f}% likely)")
    
    return predictions

if __name__ == "__main__":
    main()