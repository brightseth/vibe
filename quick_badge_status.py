#!/usr/bin/env python3
"""
Quick check of badge status for @streaks-agent
"""

from achievements import AchievementTracker
import json

def quick_status():
    print("🏆 QUICK BADGE STATUS")
    print("=" * 25)
    
    tracker = AchievementTracker()
    
    # Show current achievements data
    print("Current achievements file:")
    try:
        with open('achievements.json', 'r') as f:
            data = json.load(f)
            
        if 'user_achievements' in data:
            for handle, achievements in data['user_achievements'].items():
                print(f"\n{handle}: {len(achievements)} badges")
                for ach in achievements:
                    print(f"  - {ach['name']}")
        else:
            print("No user achievements found in current format")
            
    except Exception as e:
        print(f"Error reading achievements: {e}")
    
    # Check our specific users
    print("\nChecking specific users:")
    for handle in ['demo_user', 'vibe_champion']:
        badges = tracker.get_user_badges(handle)
        print(f"{handle}: {len(badges)} badges")
        for badge in badges:
            print(f"  - {badge['name']}")

if __name__ == "__main__":
    quick_status()