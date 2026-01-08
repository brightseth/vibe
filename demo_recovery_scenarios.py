#!/usr/bin/env python3
"""
🔄 Demo Recovery System with Simulated Scenarios
Shows how the streak recovery system would work with different user scenarios.

Built by @streaks-agent for /vibe workshop gamification.
"""

import json
from datetime import datetime, timedelta

def create_demo_scenarios():
    """Create realistic comeback scenarios for demo"""
    
    # Simulate different types of users who need recovery
    demo_data = {
        "users": {
            "@former_champion": {
                "current_streak": 0,
                "best_streak": 21,
                "last_seen": (datetime.now() - timedelta(days=5)).isoformat(),
                "total_days": 45
            },
            "@fresh_breaker": {
                "current_streak": 0,
                "best_streak": 8,
                "last_seen": (datetime.now() - timedelta(days=2)).isoformat(),
                "total_days": 15
            },
            "@struggling_maintainer": {
                "current_streak": 2,
                "best_streak": 12,
                "last_seen": datetime.now().isoformat(),
                "total_days": 18
            },
            "@restart_candidate": {
                "current_streak": 0,
                "best_streak": 6,
                "last_seen": (datetime.now() - timedelta(days=3)).isoformat(),
                "total_days": 12
            },
            # Our current users for comparison
            "@demo_user": {
                "current_streak": 1,
                "best_streak": 1,
                "last_seen": datetime.now().isoformat(),
                "total_days": 1
            },
            "@vibe_champion": {
                "current_streak": 1,
                "best_streak": 1,
                "last_seen": datetime.now().isoformat(),
                "total_days": 1
            }
        }
    }
    
    return demo_data

def analyze_recovery_scenarios():
    """Analyze and display recovery scenarios"""
    
    from streak_recovery_system import StreakRecoverySystem
    
    # Create demo data file
    demo_data = create_demo_scenarios()
    with open('demo_achievements.json', 'w') as f:
        json.dump(demo_data, f, indent=2)
    
    # Analyze with recovery system
    recovery = StreakRecoverySystem()
    recovery.achievements_file = 'demo_achievements.json'  # Use demo data
    
    print("🔄 STREAK RECOVERY ANALYSIS")
    print("=" * 50)
    
    candidates = recovery.identify_comeback_candidates()
    
    if not candidates:
        print("✅ All users are maintaining good streaks!")
        return
        
    print(f"📊 Found {len(candidates)} users who could use comeback support:\n")
    
    for i, candidate in enumerate(candidates, 1):
        print(f"{i}. {candidate['user']}")
        print(f"   📈 Best streak: {candidate['best_streak']} days")
        print(f"   📉 Current: {candidate['current_streak']} days") 
        print(f"   ⏰ Days away: {candidate['days_away']}")
        print(f"   🎯 Scenario: {candidate['scenario'].replace('_', ' ').title()}")
        print(f"   💬 Message: {candidate['motivation_message'][:80]}...")
        print(f"   🎁 Bonus: {candidate['recovery_bonus']['badge']} (+{candidate['recovery_bonus']['points']} pts)")
        print()
        
    # Generate full dashboard
    print("📋 RECOVERY DASHBOARD")
    print("-" * 30)
    
    dashboard = recovery.generate_recovery_dashboard()
    
    print(f"Users needing support: {dashboard['recovery_needed']}")
    
    # Show by scenario type
    print("\n🎭 SCENARIO BREAKDOWN:")
    for scenario, users in dashboard['scenarios'].items():
        print(f"• {scenario.replace('_', ' ').title()}: {len(users)} users")
        
    # Show success potential
    metrics = dashboard['success_metrics']
    print(f"\n🎯 RECOVERY POTENTIAL:")
    print(f"• {metrics['users_needing_support']} users to re-engage")
    print(f"• {metrics['total_lost_momentum_days']} total streak days lost")
    print(f"• {metrics['success_impact']}")
    
    # Show sample recovery plan
    if dashboard['action_plan']:
        sample = dashboard['action_plan'][0]
        print(f"\n📅 SAMPLE RECOVERY PLAN ({sample['user']}):")
        plan = recovery.create_recovery_plan(sample['user'], sample['scenario'])
        print(f"• Day 1: {plan['day_1']}")
        print(f"• Week 1: {plan['week_1']}")  
        print(f"• Long-term: {plan['long_term']}")
        
    print(f"\n✨ The recovery system helps identify and re-engage users")
    print(f"   who have lost momentum, turning streak breaks into comebacks!")

if __name__ == "__main__":
    analyze_recovery_scenarios()