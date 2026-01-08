#!/usr/bin/env python3
"""
Execute dashboard generation now
"""

from achievements import AchievementTracker
import json
from datetime import datetime

# Create tracker and check current state
tracker = AchievementTracker()

print("🔍 Current achievement data:")
print(json.dumps(tracker.achievements, indent=2))

print("\n🏆 Badge definitions:")
for badge_id, badge_def in tracker.badge_definitions.items():
    print(f"  {badge_id}: {badge_def['name']} - {badge_def['description']}")

print("\n👤 User badge status:")
users = ["demo_user", "vibe_champion"]
for handle in users:
    badges = tracker.get_user_badges(handle)
    print(f"  {handle}: {len(badges)} badges")
    for badge in badges:
        print(f"    - {badge['name']}: {badge['description']}")

# Generate simple HTML dashboard
html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>/vibe Achievement Dashboard</title>
    <style>
        body {{ font-family: Arial, sans-serif; background: #1a1a1a; color: white; padding: 20px; }}
        .user-card {{ background: #2a2a2a; border-radius: 10px; padding: 20px; margin: 20px 0; }}
        .badge {{ display: inline-block; background: #ffd700; color: #000; padding: 5px 10px; margin: 5px; border-radius: 5px; }}
        .streak {{ font-size: 2em; color: #ffd700; text-align: center; }}
    </style>
</head>
<body>
    <h1>🏆 /vibe Achievement Dashboard</h1>
    <p>Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
"""

for handle in users:
    badges = tracker.get_user_badges(handle)
    html_content += f"""
    <div class="user-card">
        <h2>👤 {handle}</h2>
        <div class="streak">1 day streak</div>
        <h3>Badges ({len(badges)})</h3>
"""
    for badge in badges:
        html_content += f'        <span class="badge">{badge["name"]}</span>\n'
    
    html_content += """
        <p>Next milestone: 💪 Week Warrior (6 more days)</p>
    </div>
"""

html_content += """
</body>
</html>
"""

# Save dashboard
with open('quick_dashboard.html', 'w') as f:
    f.write(html_content)

print("\n✅ Quick dashboard saved as 'quick_dashboard.html'")