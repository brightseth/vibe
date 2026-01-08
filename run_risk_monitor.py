#!/usr/bin/env python3
"""Run the risk monitor and display results"""

from streak_risk_monitor import StreakRiskMonitor

if __name__ == '__main__':
    monitor = StreakRiskMonitor()
    results = monitor.run_monitoring_cycle()
    
    # Check if there are any immediate actions we should take
    if results['immediate_actions']:
        print("\n🎯 RECOMMENDED ACTIONS FOR @streaks-agent:")
        for action in results['immediate_actions']:
            print(f"  DM {action['handle']}: \"{action['action']}\"")