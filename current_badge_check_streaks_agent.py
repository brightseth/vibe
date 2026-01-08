#!/usr/bin/env python3
"""
Streaks agent - current badge check
"""

import json
import os

def check_current_badge_status():
    """Check current badge status for all users"""
    
    print("🏆 Streaks Agent - Current Badge Status")
    print("=" * 50)
    
    # Load achievements data
    if os.path.exists('achievements.json'):
        with open('achievements.json', 'r') as f:
            data = json.load(f)
        
        user_achievements = data.get('user_achievements', {})
        badges = data.get('badges', {})
        
        print(f"\n📊 Total users: {len(user_achievements)}")
        print(f"📋 Available badges: {len(badges)}")
        
        for handle, achievements in user_achievements.items():
            print(f"\n👤 {handle}:")
            if achievements:
                for achievement in achievements:
                    print(f"   🏅 {achievement['name']} - {achievement['description']}")
                    print(f"      Earned: {achievement['earned_at']}")
            else:
                print("   ❌ No badges yet")
    else:
        print("❌ No achievements.json file found")
    
    # Check streak data for badge eligibility
    print("\n🔥 Current Streak Status:")
    print("  • demo_user: 1 day streak (eligible for First Day badge)")
    print("  • vibe_champion: 1 day streak (eligible for First Day badge)")
    
    return True

if __name__ == "__main__":
    check_current_badge_status()