#!/usr/bin/env python3
"""
Award First Day badges to current streak users
Built by @streaks-agent - Making consistency irresistible!
"""

import sys
import os
sys.path.append('.')

from enhanced_achievement_system import EnhancedAchievementSystem

def main():
    print("🏆 ACHIEVEMENT BADGE SYSTEM - First Day Award Ceremony")
    print("=" * 60)
    
    # Initialize the enhanced system
    system = EnhancedAchievementSystem()
    
    # Current users with 1-day streaks (from streak memory)
    current_users = [
        {"handle": "demo_user", "streak": 1, "best": 1, "ships": 0},
        {"handle": "vibe_champion", "streak": 1, "best": 1, "ships": 0}
    ]
    
    celebration_messages = []
    
    for user in current_users:
        handle = user["handle"]
        current_streak = user["streak"]
        best_streak = user["best"]
        ships = user["ships"]
        
        print(f"\n🎯 Checking achievements for {handle}...")
        print(f"   Current streak: {current_streak} days")
        print(f"   Best streak: {best_streak} days")
        print(f"   Ships: {ships}")
        
        # Check for new achievements
        new_achievements = system.check_user_achievements(
            handle=handle,
            current_streak=current_streak,
            best_streak=best_streak,
            ships_count=ships
        )
        
        if new_achievements:
            print(f"   ✅ NEW ACHIEVEMENTS UNLOCKED: {len(new_achievements)}")
            
            for achievement in new_achievements:
                badge = achievement["badge"]
                badge_id = achievement["badge_id"]
                
                print(f"      {badge['emoji']} {badge['name']} - {badge['description']}")
                
                # Generate celebration message
                celebration_msg = system.generate_celebration_message(handle, achievement)
                
                # Check if we should announce this publicly
                should_announce_publicly = badge_id in ['week_warrior', 'fortnight_force', 'monthly_legend', 'century_club']
                
                celebration_messages.append({
                    'handle': handle,
                    'badge_id': badge_id,
                    'message': celebration_msg,
                    'public': should_announce_publicly,
                    'achievement': achievement
                })
                
                # Log that we've celebrated this
                system.log_celebration(handle, badge_id, celebration_msg)
        else:
            print(f"   ℹ️  No new achievements (may already be awarded)")
        
        # Show next milestone
        next_milestone = system.get_next_milestone(handle, current_streak)
        if next_milestone:
            badge = next_milestone["badge"]
            days_remaining = next_milestone["days_remaining"]
            progress = next_milestone["progress_percent"]
            
            print(f"   🚀 Next milestone: {badge['emoji']} {badge['name']} in {days_remaining} days ({progress}%)")
        
        # Show user stats
        stats = system.get_user_stats(handle)
        if stats.get("total_badges", 0) > 0:
            print(f"   📊 Total badges: {stats['total_badges']}")
            
            if stats.get("badges_by_rarity"):
                rarity_summary = ", ".join([f"{count} {rarity}" for rarity, count in stats["badges_by_rarity"].items()])
                print(f"      Badge breakdown: {rarity_summary}")
    
    print(f"\n{'=' * 60}")
    print("🎉 CELEBRATION SUMMARY")
    print(f"{'=' * 60}")
    
    if celebration_messages:
        for msg_data in celebration_messages:
            print(f"\n🎊 {msg_data['handle']} - {msg_data['badge_id']}")
            print(f"   Message: {msg_data['message']}")
            print(f"   Public announcement: {msg_data['public']}")
    else:
        print("\nℹ️ No new achievements to celebrate (already awarded)")
    
    # Show leaderboard
    print(f"\n{'=' * 60}")
    print("🏆 CURRENT LEADERBOARD")
    print(f"{'=' * 60}")
    
    leaderboard = system.get_leaderboard()
    if leaderboard:
        for i, entry in enumerate(leaderboard, 1):
            handle = entry["handle"]
            badges = entry["total_badges"]
            score = entry["rarity_score"]
            
            print(f"{i:2d}. {handle:15s} - {badges} badges (score: {score})")
    else:
        print("No achievements yet - leaderboard coming soon!")
    
    print(f"\n🎮 Achievement system is live and ready!")
    print("   • Streak badges: ✅ Active")
    print("   • Activity badges: ✅ Ready for ships")  
    print("   • Celebration messages: ✅ Personalized")
    print("   • Progress tracking: ✅ Next milestones visible")
    print("   • Leaderboard: ✅ Live rankings")
    
    return celebration_messages

if __name__ == "__main__":
    main()