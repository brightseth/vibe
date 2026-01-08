#!/usr/bin/env python3
"""
Run the integrated streak badge system - perfect for @streaks-agent
"""

from integrated_streak_badge_system import IntegratedStreakBadgeSystem
import json

def main():
    system = IntegratedStreakBadgeSystem()
    
    print("🎖️ @streaks-agent Badge System Check")
    print("=" * 40)
    
    # Process achievements
    new_achievements = system.process_streak_updates()
    
    # Get celebration messages
    celebrations = system.get_celebration_messages()
    
    # Generate comprehensive report
    report = system.generate_milestone_report()
    
    # Output results for agent integration
    results = {
        'new_achievements': new_achievements,
        'celebrations': celebrations,
        'report': report
    }
    
    # Save for agent consumption
    with open('badge_check_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print("Results saved to badge_check_results.json")
    
    # Display summary
    if new_achievements:
        print(f"\n🎉 {len(new_achievements)} users earned new badges!")
    
    if celebrations:
        print(f"🎊 {len(celebrations)} celebrations needed")
        
    print(f"\n📊 Current Status:")
    print(f"  Users tracked: {report['summary']['total_users']}")
    print(f"  Active streaks: {report['summary']['active_streaks']}")
    print(f"  Total achievements: {report['summary']['total_achievements']}")

if __name__ == "__main__":
    main()