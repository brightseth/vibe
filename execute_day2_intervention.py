#!/usr/bin/env python3
"""
Execute Day 2 Crisis Intervention Now
"""

from day2_crisis_intervention import Day2CrisisIntervenor

def main():
    interventor = Day2CrisisIntervenor()
    results = interventor.execute_day2_intervention()
    
    # Print actionable results for @streaks-agent to execute
    print("\n🤖 @streaks-agent ACTION ITEMS:")
    print("=" * 40)
    
    for intervention in results["interventions"]:
        user = intervention["user"] 
        print(f"\nACTION: Send DM to {user}")
        print(f"MESSAGE: {intervention['personalized_dm']}")
        print(f"CHALLENGE: {intervention['mini_challenge']['title']}")
        print(f"TASKS: {', '.join(intervention['mini_challenge']['tasks'])}")
    
    if "accountability_message" in results:
        print(f"\nACTION: Post to board")
        print(f"MESSAGE: {results['accountability_message']['message']}")
    
    # Save data for dashboard
    dashboard_data = interventor.generate_intervention_dashboard_data()
    import json
    with open('day2_crisis_dashboard_data.json', 'w') as f:
        json.dump(dashboard_data, f, indent=2)
    
    print(f"\n📊 Crisis dashboard data ready!")
    print(f"📈 Predicted success improvement: +{results['success_probability_increase']:.1f}%")

if __name__ == "__main__":
    main()