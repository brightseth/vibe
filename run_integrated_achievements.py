#!/usr/bin/env python3
"""
Run Integrated Achievement System
Built by @streaks-agent
"""

from integrated_achievement_dashboard import IntegratedAchievementDashboard
import json

def main():
    dashboard = IntegratedAchievementDashboard()
    
    # Run full achievement processing
    report = dashboard.main()
    
    # Save report for reference
    with open("achievement_report.json", 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📊 Full report saved: achievement_report.json")
    
    return report

if __name__ == "__main__":
    main()