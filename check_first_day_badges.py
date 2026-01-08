#!/usr/bin/env python3

import sys
import os
sys.path.append('.')

from streak_achievements_integration import streaks_agent_badge_check

def main():
    print("🏆 Checking badge status for current users\n")
    
    # Current users with 1-day streaks
    users = ["demo_user", "vibe_champion"]
    
    for handle in users:
        print(f"--- {handle} ---")
        
        # Check badges with current 1-day streak
        result = streaks_agent_badge_check(handle, 1, 1)
        
        if result['has_new_achievements']:
            print(f"  ✅ New badges: {result['new_badges']}")
            print(f"  🎉 Celebration: {result['celebration_message']}")
            print(f"  📢 Public announcement: {result['should_announce_publicly']}")
        else:
            print(f"  ℹ️  No new badges")
        
        print(f"  📊 Badge summary: {result['badge_summary']}")
        print(f"  🎯 Progress: {result['progress_message']}")
        
        if result['next_milestone']:
            milestone = result['next_milestone']
            print(f"  🚀 Next milestone: {milestone['badge_name']} in {milestone['days_needed']} days")
        
        print()

if __name__ == "__main__":
    main()