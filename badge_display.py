#!/usr/bin/env python3
"""
Badge Display and Management CLI
Interactive tool for viewing and managing achievement badges
"""

import json
from badge_system import BadgeSystem

def display_all_badges():
    """Display all available badges"""
    badge_system = BadgeSystem()
    
    print("\n🏅 ACHIEVEMENT BADGES SYSTEM 🏅")
    print("=" * 50)
    
    # Group badges by tier
    tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'special']
    
    for tier in tiers:
        tier_badges = [
            (badge_id, badge) for badge_id, badge in badge_system.badges.items() 
            if badge.get('tier') == tier
        ]
        
        if tier_badges:
            tier_color = badge_system.tiers.get(tier, {}).get('color', '')
            tier_value = badge_system.tiers.get(tier, {}).get('value', 0)
            print(f"\n{tier.upper()} TIER ({tier_value} points)")
            print("-" * 30)
            
            for badge_id, badge in tier_badges:
                print(f"{badge['icon']} {badge['name']}")
                print(f"   {badge['description']}")
                print(f"   Criteria: {badge['criteria']}")
                print()

def display_user_badges(user: str):
    """Display badges for specific user"""
    badge_system = BadgeSystem()
    badges = badge_system.get_user_badges(user)
    
    if not badges:
        print(f"\n{user} has no badges yet! 🎯")
        print("Keep participating to earn your first badge!")
        return
    
    print(f"\n🏅 {user.upper()}'S BADGES 🏅")
    print("=" * 40)
    
    total_value = 0
    for badge in badges:
        tier = badge.get('tier', 'bronze')
        tier_value = badge_system.tiers.get(tier, {}).get('value', 0)
        total_value += tier_value
        
        print(f"{badge['icon']} {badge['name']} ({tier.title()})")
        print(f"   {badge['description']}")
        print(f"   Earned: {badge['awarded_at'][:10]}")
        if badge.get('reason'):
            print(f"   Reason: {badge['reason']}")
        print()
    
    print(f"Total Badge Value: {total_value} points")
    print(f"Badge Count: {len(badges)}")

def display_leaderboard():
    """Display badge leaderboard"""
    badge_system = BadgeSystem()
    leaderboard = badge_system.get_leaderboard()
    
    if not leaderboard:
        print("\n📊 BADGE LEADERBOARD 📊")
        print("=" * 30)
        print("No badges awarded yet!")
        return
    
    print("\n📊 BADGE LEADERBOARD 📊")
    print("=" * 30)
    print(f"{'Rank':<6} {'User':<15} {'Badges':<8} {'Points':<8} {'Display'}")
    print("-" * 60)
    
    for i, entry in enumerate(leaderboard, 1):
        user = entry['user']
        badge_count = entry['badge_count']
        total_value = entry['total_value']
        
        # Create badge display
        badge_icons = " ".join([badge['icon'] for badge in entry['badges'][:5]])  # Show first 5
        if len(entry['badges']) > 5:
            badge_icons += "..."
        
        print(f"{i:<6} {user:<15} {badge_count:<8} {total_value:<8} {badge_icons}")

def simulate_badge_awards():
    """Simulate awarding some badges for demo"""
    badge_system = BadgeSystem()
    
    # Award some demo badges
    demo_awards = [
        ('@demo_user', 'first_ship', 'Demo first ship'),
        ('@vibe_champion', 'first_ship', 'Demo first ship'),
        ('@vibe_champion', 'week_streak', 'Demo week streak'),
    ]
    
    print("\n🎯 SIMULATING BADGE AWARDS 🎯")
    print("=" * 35)
    
    for user, badge_id, reason in demo_awards:
        if badge_system.award_badge(user, badge_id, reason):
            badge_name = badge_system.badges[badge_id]['name']
            badge_icon = badge_system.badges[badge_id]['icon']
            print(f"✅ Awarded {badge_icon} {badge_name} to {user}")
        else:
            print(f"❌ Could not award {badge_id} to {user} (already has it or invalid)")

def main():
    """Main interactive menu"""
    while True:
        print("\n🏅 BADGE SYSTEM MANAGER 🏅")
        print("1. View all available badges")
        print("2. View user badges")
        print("3. View leaderboard")
        print("4. Simulate badge awards (demo)")
        print("5. Exit")
        
        choice = input("\nEnter your choice (1-5): ").strip()
        
        if choice == '1':
            display_all_badges()
        elif choice == '2':
            user = input("Enter username (e.g., @demo_user): ").strip()
            if not user.startswith('@'):
                user = '@' + user
            display_user_badges(user)
        elif choice == '3':
            display_leaderboard()
        elif choice == '4':
            simulate_badge_awards()
        elif choice == '5':
            print("Goodbye! Keep earning those badges! 🎯")
            break
        else:
            print("Invalid choice. Please enter 1-5.")

if __name__ == '__main__':
    main()