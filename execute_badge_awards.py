#!/usr/bin/env python3
"""
Execute badge awards for current users
"""

import json
from datetime import datetime

# Load current data
with open('achievements.json', 'r') as f:
    achievements = json.load(f)

with open('badges.json', 'r') as f:
    badges = json.load(f)

awards_made = []

# Award first_ship badges to users who have first_day achievement
for user_handle, user_achievements in achievements.get("user_achievements", {}).items():
    # Check if they have first_day achievement
    has_first_day = any(a.get("id") == "first_day" for a in user_achievements)
    
    if has_first_day:
        # Check if they already have first_ship badge
        user_badges = badges["user_badges"].get(user_handle, [])
        has_first_ship = any(b["badge_key"] == "first_ship" for b in user_badges)
        
        if not has_first_ship:
            # Award the badge
            if user_handle not in badges["user_badges"]:
                badges["user_badges"][user_handle] = []
            
            awarded_badge = {
                "badge_key": "first_ship",
                "awarded_at": datetime.now().isoformat(),
                "reason": "Earned first_day achievement - started their journey"
            }
            
            badges["user_badges"][user_handle].append(awarded_badge)
            
            # Log it
            badges["badge_log"].append({
                "user": user_handle,
                "badge": "first_ship",
                "badge_name": "First Ship 🚢",
                "points": 10,
                "awarded_at": awarded_badge["awarded_at"],
                "reason": awarded_badge["reason"]
            })
            
            awards_made.append(f"{user_handle}: First Ship 🚢")

# Update stats
badges["stats"]["total_badges_awarded"] = len([entry for entries in badges["user_badges"].values() for entry in entries])

# Save updated badges
with open('badges.json', 'w') as f:
    json.dump(badges, f, indent=2)

# Create award summary
award_summary = f"""🎉 BADGE AWARDS COMPLETED
=========================
Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Awards Made ({len(awards_made)}):
"""

if awards_made:
    for award in awards_made:
        award_summary += f"• {award}\n"
else:
    award_summary += "• No new badges awarded\n"

# Generate leaderboard
award_summary += f"""
🏆 CURRENT LEADERBOARD:
"""

user_scores = {}
for user_handle, user_badges_list in badges["user_badges"].items():
    total_points = sum(badges["badge_definitions"][b["badge_key"]]["points"] for b in user_badges_list)
    user_scores[user_handle] = {"points": total_points, "badge_count": len(user_badges_list)}

if user_scores:
    sorted_users = sorted(user_scores.items(), key=lambda x: x[1]["points"], reverse=True)
    for i, (user, data) in enumerate(sorted_users, 1):
        award_summary += f"{i}. {user}: {data['points']} pts ({data['badge_count']} badges)\n"
else:
    award_summary += "No badges awarded yet\n"

print(award_summary)

# Save summary
with open('badge_awards_summary.md', 'w') as f:
    f.write(award_summary)