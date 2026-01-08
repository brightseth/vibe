#!/usr/bin/env python3
"""Quick runner for engagement analysis"""

from streak_engagement_predictor import StreakEngagementPredictor

if __name__ == "__main__":
    predictor = StreakEngagementPredictor()
    insights = predictor.run_analysis()
    print(f"\n✅ Analysis complete! Check streak_engagement_predictions.json for detailed insights.")