#!/usr/bin/env python3
"""Run streak risk analysis and generate insights"""

from streak_risk_predictor import StreakRiskPredictor

# Run the analysis
predictor = StreakRiskPredictor()
analysis = predictor.analyze_all_users()
report = predictor.generate_report()

print(report)
print("\n" + "="*60)
print("📊 Detailed Analysis:")
for user in analysis['users']:
    print(f"{user['handle']}: Risk {user['risk_score']} ({user['risk_level']})")
    print(f"   Next milestone: {user['next_milestone']} in {user['days_to_milestone']} days")
    print(f"   Suggestions: {', '.join(user['suggested_interventions'])}")
    print()