#!/usr/bin/env python3
"""
Live Achievement Dashboard - Shows current badge status and upcoming milestones
"""
import sys
import os
sys.path.append('.')

from achievements import AchievementTracker
import json
from datetime import datetime

def create_achievement_dashboard():
    print("🏆 LIVE ACHIEVEMENT DASHBOARD")
    print("=" * 60)
    print(f"⏰ Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    tracker = AchievementTracker()
    
    # Current users from streak memory
    current_users = {
        'demo_user': {'streak_days': 1, 'ships': 0, 'games': 0},
        'vibe_champion': {'streak_days': 1, 'ships': 0, 'games': 0}
    }
    
    print("👥 USER ACHIEVEMENTS")
    print("-" * 30)
    
    for handle, stats in current_users.items():
        print(f"\n🔥 {handle}")
        print(f"   Current streak: {stats['streak_days']} days")
        
        # Show current badges
        badges = tracker.get_user_badges(handle)
        if badges:
            print(f"   🎖️  Current badges ({len(badges)}):")
            for badge in badges:
                print(f"      • {badge['name']} - {badge['description']}")
        else:
            print(f"   ❌ No badges yet")
        
        # Show next milestones
        print(f"   🎯 Next milestones:")
        next_streak = stats['streak_days'] + 1
        if next_streak == 3:
            print(f"      • 🌱 Early Bird (2 days to go)")
        elif next_streak <= 7:
            print(f"      • 💪 Week Warrior ({7 - stats['streak_days']} days to go)")
        elif next_streak <= 14:
            print(f"      • 🔥 Fortnight Hero ({14 - stats['streak_days']} days to go)")
        else:
            print(f"      • 🏆 Monthly Legend ({30 - stats['streak_days']} days to go)")
        
        if stats['ships'] == 0:
            print(f"      • 🚢 First Ship (make your first announcement!)")
    
    print(f"\n📊 LEADERBOARD")
    print("-" * 20)
    
    leaderboard = tracker.get_leaderboard()
    if leaderboard:
        for i, entry in enumerate(leaderboard, 1):
            print(f"   {i}. {entry['handle']}: {entry['badge_count']} badges")
            if entry['latest_badges']:
                print(f"      Latest: {', '.join(entry['latest_badges'])}")
    else:
        print("   No badges earned yet!")
    
    print(f"\n🎮 AVAILABLE BADGES")
    print("-" * 25)
    
    badge_categories = {
        'Streak Milestones': ['first_day', 'week_warrior', 'fortnight_hero', 'monthly_legend', 'century_club'],
        'Participation': ['first_ship', 'prolific_shipper', 'game_master', 'community_builder'],
        'Special': ['early_adopter', 'comeback_kid']
    }
    
    for category, badge_ids in badge_categories.items():
        print(f"\n   📁 {category}:")
        for badge_id in badge_ids:
            if badge_id in tracker.badge_definitions:
                badge = tracker.badge_definitions[badge_id]
                print(f"      • {badge['name']} - {badge['description']}")
    
    print(f"\n✨ GAMIFICATION STATUS")
    print("-" * 30)
    total_users = len(current_users)
    total_badges_earned = sum(len(tracker.get_user_badges(handle)) for handle in current_users.keys())
    
    print(f"   👥 Active users: {total_users}")
    print(f"   🎖️  Total badges earned: {total_badges_earned}")
    print(f"   📈 Average badges per user: {total_badges_earned / total_users:.1f}")
    
    engagement_score = (total_badges_earned / total_users) * 10
    if engagement_score < 5:
        status = "🌱 Getting Started"
    elif engagement_score < 15:
        status = "📈 Building Momentum"
    elif engagement_score < 30:
        status = "🔥 Highly Engaged"
    else:
        status = "🚀 Peak Performance"
    
    print(f"   🎯 Engagement level: {status}")
    
    print(f"\n💡 RECOMMENDATIONS")
    print("-" * 25)
    print("   • Encourage daily check-ins to build streaks")
    print("   • Celebrate milestone achievements publicly")
    print("   • Add 'ship' tracking for announcements")
    print("   • Consider weekly leaderboard updates")
    
    print("\n" + "=" * 60)
    return tracker

if __name__ == "__main__":
    create_achievement_dashboard()