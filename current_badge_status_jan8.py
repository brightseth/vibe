#!/usr/bin/env python3
"""
🎖️ Current Badge Status Check - Jan 8, 2026
Quick check of current achievement status
"""

import json

def main():
    print("🎖️ BADGE STATUS CHECK")
    print("=" * 40)
    
    try:
        with open("achievements.json", 'r') as f:
            achievements = json.load(f)
        
        print(f"\n📊 CURRENT STATUS:")
        print(f"   Total users tracked: {len(achievements.get('user_achievements', {}))}")
        print(f"   Total badges awarded: {len(achievements.get('achievement_history', []))}")
        
        print(f"\n🏆 LEADERBOARD:")
        for handle, badges in achievements.get("user_achievements", {}).items():
            badge_display = " ".join([badge["name"] for badge in badges])
            print(f"   {handle}: {badge_display} ({len(badges)} badge{'s' if len(badges) != 1 else ''})")
        
        print(f"\n🎯 AVAILABLE BADGES:")
        for badge_id, badge_info in achievements.get("badges", {}).items():
            print(f"   {badge_info['name']}: {badge_info['description']}")
        
        print(f"\n✨ NEXT POTENTIAL MILESTONES:")
        print(f"   - Week Streak 💪 (7 days) - Both users need 6 more days")
        print(f"   - Consistency King 🔥 (14 days) - Both users need 13 more days")
        print(f"   - Monthly Legend 🏆 (30 days) - Both users need 29 more days")
        
    except FileNotFoundError:
        print("❌ No achievements.json found")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()