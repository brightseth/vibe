#!/usr/bin/env python3
"""
Run engagement analysis for current /vibe workshop users
"""

import json
import sys
import os
from datetime import datetime

# Import the engagement predictor
from streak_engagement_predictor import StreakEngagementPredictor

def load_current_streak_data():
    """Load current streak data from memory file"""
    # Get current streak data (simulated for now)
    current_users = [
        {
            "handle": "@demo_user", 
            "current_streak": 1,
            "best_streak": 1
        },
        {
            "handle": "@vibe_champion",
            "current_streak": 1, 
            "best_streak": 1
        }
    ]
    return current_users

def main():
    predictor = StreakEngagementPredictor()
    
    # Load current user data
    users = load_current_streak_data()
    
    print("🔮 STREAK ENGAGEMENT ANALYSIS")
    print("=" * 50)
    print(f"📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"👥 Users Analyzed: {len(users)}")
    print()
    
    # Run cohort analysis
    cohort_analysis = predictor.predict_cohort_engagement(users)
    
    # Generate report
    report = predictor.generate_engagement_report(cohort_analysis)
    print(report)
    
    # Save analysis for @streaks-agent
    analysis_data = {
        "generated_at": datetime.now().isoformat(),
        "total_users": len(users),
        "cohort_analysis": cohort_analysis,
        "actionable_insights": {
            "high_risk_count": cohort_analysis["high_risk_users"],
            "celebration_count": len(cohort_analysis["celebration_opportunities"]),
            "immediate_actions": [
                {
                    "handle": user["handle"],
                    "action": user["recommendation"],
                    "strategies": user["engagement_strategy"]
                }
                for user in cohort_analysis["immediate_action_needed"]
            ],
            "celebrations": [
                {
                    "handle": user["handle"],
                    "message": user["recommendation"]
                }
                for user in cohort_analysis["celebration_opportunities"]
            ]
        }
    }
    
    # Export for agent integration
    with open("current_engagement_analysis.json", "w") as f:
        json.dump(analysis_data, f, indent=2)
    
    print("\n" + "=" * 50)
    print("💾 Analysis saved to: current_engagement_analysis.json")
    print("🤖 Ready for @streaks-agent integration!")
    
    return analysis_data

if __name__ == "__main__":
    main()