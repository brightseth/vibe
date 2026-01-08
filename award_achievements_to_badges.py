#!/usr/bin/env python3
"""
Streaks Agent: Award Badges Based on Current Achievements
Bridge achievements.json to badges.json system
"""

import json
from datetime import datetime

def ensure_badge_definitions():
    """Ensure badges.json has proper badge definitions"""
    badge_definitions = {
        "first_ship": {
            "name": "First Ship 🚢",
            "description": "Posted your first creation to the board",
            "points": 10,
            "rarity": "common",
            "category": "participation"
        },
        "week_streak": {
            "name": "Week Streak 🔥",
            "description": "Stayed active for 7 consecutive days",
            "points": 30,
            "rarity": "uncommon",
            "category": "streaks"
        },
        "month_legend": {
            "name": "Monthly Legend 👑",
            "description": "Stayed active for 30 consecutive days",
            "points": 100,
            "rarity": "legendary", 
            "category": "streaks"
        },
        "century_club": {
            "name": "Century Club 💎",
            "description": "Incredible 100-day streak!",
            "points": 500,
            "rarity": "mythical",
            "category": "streaks"
        },
        "first_day": {
            "name": "First Day 🌱",
            "description": "Started your streak journey", 
            "points": 5,
            "rarity": "common",
            "category": "participation"
        },
        "early_bird": {
            "name": "Early Bird 🌅",
            "description": "Active for 3 consecutive days",
            "points": 15,
            "rarity": "common",
            "category": "streaks"
        },
        "consistency_king": {
            "name": "Consistency King 🔥",
            "description": "Maintained a 14-day streak",
            "points": 60,
            "rarity": "rare",
            "category": "streaks"
        },
        "game_master": {
            "name": "Game Master 🎮",
            "description": "Created or facilitated workshop games",
            "points": 40,
            "rarity": "rare",
            "category": "community"
        }
    }
    
    try:
        with open('badges.json', 'r') as f:
            badges_data = json.load(f)
    except FileNotFoundError:
        badges_data = {}
    
    # Update with proper structure
    badges_data["badge_definitions"] = badge_definitions
    if "user_badges" not in badges_data:
        badges_data["user_badges"] = {}
    if "badge_log" not in badges_data:
        badges_data["badge_log"] = []
    if "stats" not in badges_data:
        badges_data["stats"] = {"total_badges_awarded": 0}
    
    # Update the user badges from old structure
    if "user_badges" in badges_data:
        for user, old_badges in badges_data.get("user_badges", {}).items():
            if isinstance(old_badges, dict) and "earned" in old_badges:
                badges_data["user_badges"][user] = []
    
    with open('badges.json', 'w') as f:
        json.dump(badges_data, f, indent=2)
    
    return badges_data

def load_achievements():
    """Load achievements from achievements.json"""
    try:
        with open('achievements.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"user_achievements": {}}

def award_badge_to_user(badges_data, user_handle, badge_key, reason=""):
    """Award a badge to a user"""
    if user_handle not in badges_data["user_badges"]:
        badges_data["user_badges"][user_handle] = []
    
    # Check if already has badge
    existing_badges = [b.get("badge_key", "") for b in badges_data["user_badges"][user_handle]]
    if badge_key in existing_badges:
        return False, f"Already has {badge_key}"
    
    # Award badge
    badge_award = {
        "badge_key": badge_key,
        "awarded_at": datetime.now().isoformat(),
        "reason": reason
    }
    
    badges_data["user_badges"][user_handle].append(badge_award)
    
    # Log the award
    badge_def = badges_data["badge_definitions"][badge_key]
    log_entry = {
        "user": user_handle,
        "badge": badge_key,
        "badge_name": badge_def["name"],
        "points": badge_def["points"],
        "awarded_at": badge_award["awarded_at"],
        "reason": reason
    }
    badges_data["badge_log"].append(log_entry)
    badges_data["stats"]["total_badges_awarded"] += 1
    
    return True, f"Awarded {badge_def['name']} to {user_handle}"

def sync_achievements_to_badges():
    """Sync achievements to badge system"""
    print("🚀 Syncing achievements to badge system...")
    
    # Ensure proper badge system
    badges_data = ensure_badge_definitions()
    
    # Load achievements
    achievements = load_achievements()
    
    awards_made = []
    
    # Process each user's achievements
    for user_handle, user_achievements in achievements.get("user_achievements", {}).items():
        print(f"\n=== Processing {user_handle} ===")
        
        for achievement in user_achievements:
            achievement_id = achievement.get("id", "")
            
            # Map achievements to badges
            if achievement_id == "first_day":
                success, msg = award_badge_to_user(badges_data, f"@{user_handle}", "first_day", "Started streak journey")
                if success:
                    awards_made.append(f"@{user_handle}: First Day 🌱")
                    print(f"✅ {msg}")
                else:
                    print(f"ℹ️  {msg}")
    
    # Save updated badges
    with open('badges.json', 'w') as f:
        json.dump(badges_data, f, indent=2)
    
    return awards_made, badges_data

def generate_celebration_messages(awards_made):
    """Generate celebration messages for new badge awards"""
    celebrations = []
    
    for award in awards_made:
        user, badge_name = award.split(": ", 1)
        
        if "First Day" in badge_name:
            message = f"""🎉 {user} earned their first badge!

{badge_name}

Welcome to the streak journey! Keep showing up daily and you'll unlock more achievements. 

Next up: Early Bird 🌅 (3 days) ✨"""
        else:
            message = f"🎉 {user} earned the {badge_name} badge! Keep up the great work! ✨"
        
        celebrations.append({
            "user": user,
            "badge": badge_name,
            "message": message
        })
    
    return celebrations

def main():
    """Main execution"""
    print("🏆 STREAKS AGENT: Badge Award System")
    print("=" * 50)
    
    # Sync achievements to badges
    awards_made, badges_data = sync_achievements_to_badges()
    
    print(f"\n🎉 AWARDS SUMMARY:")
    if awards_made:
        for award in awards_made:
            print(f"  ✅ {award}")
    else:
        print("  📊 No new badges to award")
    
    # Generate celebrations
    celebrations = generate_celebration_messages(awards_made)
    
    # Show badge stats
    total_badges = badges_data["stats"]["total_badges_awarded"]
    total_users = len(badges_data["user_badges"])
    
    print(f"\n📊 BADGE SYSTEM STATS:")
    print(f"  • Total badges awarded: {total_badges}")
    print(f"  • Users with badges: {total_users}")
    print(f"  • Available badge types: {len(badges_data['badge_definitions'])}")
    
    if celebrations:
        print(f"\n🎊 CELEBRATION MESSAGES:")
        for celebration in celebrations:
            print(f"\n--- DM to {celebration['user']} ---")
            print(celebration['message'])
    
    # Save status report
    status = {
        "timestamp": datetime.now().isoformat(),
        "awards_made": awards_made,
        "total_stats": {
            "badges_awarded": total_badges,
            "users_with_badges": total_users,
            "badge_types": len(badges_data['badge_definitions'])
        },
        "celebrations": celebrations
    }
    
    with open('badge_award_status.json', 'w') as f:
        json.dump(status, f, indent=2)
    
    print(f"\n💾 Status saved to badge_award_status.json")

if __name__ == "__main__":
    main()