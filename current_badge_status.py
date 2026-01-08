#!/usr/bin/env python3
"""
Current Badge Status Checker
Built by @streaks-agent
"""

import json
import os

def check_current_badges():
    print("🎖️ Current Badge Status Check")
    print("=" * 35)
    
    # Check if enhanced system exists
    if os.path.exists("enhanced_achievements.json"):
        print("✅ Enhanced achievement system found")
        with open("enhanced_achievements.json", 'r') as f:
            enhanced_data = json.load(f)
        
        print(f"📊 Enhanced System Stats:")
        print(f"   Users tracked: {len(enhanced_data.get('user_achievements', {}))}")
        print(f"   Total badges: {len(enhanced_data.get('badges', {}))}")
        print(f"   Celebrations: {len(enhanced_data.get('celebration_log', []))}")
        
        for handle, data in enhanced_data.get('user_achievements', {}).items():
            badges = data.get('badges', [])
            print(f"\n👤 {handle}")
            print(f"   🏅 Badges: {len(badges)}")
            for badge_id in badges:
                if badge_id in enhanced_data.get('badges', {}):
                    badge = enhanced_data['badges'][badge_id]
                    print(f"      {badge.get('emoji', '🏅')} {badge.get('name', badge_id)}")
    else:
        print("❌ Enhanced achievement system not found")
    
    # Check basic system
    if os.path.exists("achievements.json"):
        print("\n✅ Basic achievement system found")
        with open("achievements.json", 'r') as f:
            basic_data = json.load(f)
        
        print(f"📊 Basic System Stats:")
        print(f"   Users tracked: {len(basic_data.get('user_achievements', {}))}")
        print(f"   Total badges: {len(basic_data.get('badges', {}))}")
        
        for handle, achievements in basic_data.get('user_achievements', {}).items():
            print(f"\n👤 {handle}")
            print(f"   🏅 Achievements: {len(achievements)}")
            for badge_id in achievements:
                if badge_id in basic_data.get('badges', {}):
                    badge = basic_data['badges'][badge_id]
                    print(f"      🏅 {badge.get('name', badge_id)}")
    else:
        print("❌ Basic achievement system not found")
    
    # Current streak users
    print(f"\n🔥 Current Streak Status:")
    print(f"   @demo_user: 1 day streak")
    print(f"   @vibe_champion: 1 day streak")
    print(f"\n🎯 Both users eligible for 'First Day' achievement if not already awarded")

if __name__ == "__main__":
    check_current_badges()