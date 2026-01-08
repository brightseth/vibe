#!/usr/bin/env python3
"""
Award badges based on current achievements and streaks
"""

import json
from datetime import datetime

def load_data():
    """Load all relevant data files"""
    # Load achievements
    try:
        with open('achievements.json', 'r') as f:
            achievements = json.load(f)
    except FileNotFoundError:
        achievements = {"user_achievements": {}}
    
    # Load streaks  
    try:
        with open('streak_data.json', 'r') as f:
            streaks = json.load(f)
    except FileNotFoundError:
        streaks = {"streaks": {}}
    
    # Load badges
    try:
        with open('badges.json', 'r') as f:
            badges = json.load(f)
    except FileNotFoundError:
        badges = {"badge_definitions": {}, "user_badges": {}, "badge_log": [], "stats": {}}
    
    return achievements, streaks, badges

def award_badge_to_user(badges, user_handle, badge_key, reason):
    """Award a badge if not already owned"""
    if user_handle not in badges["user_badges"]:
        badges["user_badges"][user_handle] = []
    
    # Check if already has badge
    existing_badges = [b["badge_key"] for b in badges["user_badges"][user_handle]]
    if badge_key in existing_badges:
        return False, "Already has badge"
    
    # Award the badge
    badge_def = badges["badge_definitions"][badge_key]
    awarded_badge = {
        "badge_key": badge_key,
        "awarded_at": datetime.now().isoformat(),
        "reason": reason
    }
    
    badges["user_badges"][user_handle].append(awarded_badge)
    
    # Log it
    badges["badge_log"].append({
        "user": user_handle,
        "badge": badge_key,
        "badge_name": badge_def["name"],
        "points": badge_def["points"],
        "awarded_at": awarded_badge["awarded_at"],
        "reason": reason
    })
    
    # Update stats
    badges["stats"]["total_badges_awarded"] = badges["stats"].get("total_badges_awarded", 0) + 1
    
    return True, f"Awarded {badge_def['name']} to {user_handle}"

def main():
    print("🎯 Awarding Streak & Achievement Badges")
    print("=" * 40)
    
    achievements, streaks, badges = load_data()
    awards_made = []
    
    # Process users from achievements
    for user_handle, user_achievements in achievements.get("user_achievements", {}).items():
        print(f"\n👤 Checking {user_handle}...")
        
        # Check if they have first_day achievement -> award first_ship badge
        has_first_day = any(a.get("id") == "first_day" for a in user_achievements)
        if has_first_day:
            success, msg = award_badge_to_user(badges, user_handle, "first_ship", "Earned first_day achievement")
            if success:
                awards_made.append(f"{user_handle}: First Ship 🚢")
                print(f"  ✅ {msg}")
            else:
                print(f"  ℹ️  {msg}")
    
    # Process streak data
    streak_users = streaks.get("streaks", {})
    for user_handle, streak_data in streak_users.items():
        current_streak = streak_data.get("current", 0)
        print(f"\n📈 {user_handle} has {current_streak} day streak")
        
        # Award week warrior at 7 days
        if current_streak >= 7:
            success, msg = award_badge_to_user(badges, user_handle, "week_streak", f"Achieved {current_streak}-day streak")
            if success:
                awards_made.append(f"{user_handle}: Week Warrior 💪")
                print(f"  ✅ {msg}")
        
        # Award monthly legend at 30 days
        if current_streak >= 30:
            success, msg = award_badge_to_user(badges, user_handle, "month_legend", f"Achieved {current_streak}-day streak")
            if success:
                awards_made.append(f"{user_handle}: Monthly Legend 🏆")
                print(f"  ✅ {msg}")
    
    # Save updated badges
    with open('badges.json', 'w') as f:
        json.dump(badges, f, indent=2)
    
    # Generate summary
    print(f"\n🎉 SUMMARY")
    print("=" * 20)
    if awards_made:
        print(f"Badges awarded: {len(awards_made)}")
        for award in awards_made:
            print(f"  • {award}")
    else:
        print("No new badges to award")
    
    # Show current leaderboard
    print(f"\n🏆 CURRENT LEADERBOARD")
    user_scores = {}
    for user_handle, user_badges_list in badges["user_badges"].items():
        total_points = sum(badges["badge_definitions"][b["badge_key"]]["points"] for b in user_badges_list)
        user_scores[user_handle] = {"points": total_points, "badge_count": len(user_badges_list)}
    
    if user_scores:
        sorted_users = sorted(user_scores.items(), key=lambda x: x[1]["points"], reverse=True)
        for i, (user, data) in enumerate(sorted_users, 1):
            print(f"  {i}. {user}: {data['points']} pts ({data['badge_count']} badges)")
    else:
        print("  No badges awarded yet")
    
    return awards_made

if __name__ == "__main__":
    awards = main()