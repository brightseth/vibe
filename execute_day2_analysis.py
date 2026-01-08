#!/usr/bin/env python3
import json
from datetime import datetime

# Load data
with open('streak_data.json', 'r') as f:
    streak_data = json.load(f)

with open('achievements.json', 'r') as f:
    achievements = json.load(f)

print("🎯 CRITICAL DAY 2 TRANSITION ANALYSIS")
print("=" * 45)

current_time = datetime.now()
critical_users = []

for handle, data in streak_data.items():
    if data.get('current', 0) == 1:  # Day 1 → Day 2 transition
        # Calculate hours since last activity (assume yesterday noon)
        last_active = datetime.fromisoformat(f"{data['last_active']}T12:00:00")
        hours_inactive = (current_time - last_active).total_seconds() / 3600
        
        # Risk calculation
        if hours_inactive > 36:
            risk = 90
        elif hours_inactive > 24: 
            risk = 70
        elif hours_inactive > 12:
            risk = 40
        else:
            risk = 20
            
        # Check First Day badge
        has_badge = handle in achievements.get('user_achievements', {})
        
        critical_users.append({
            'handle': f"@{handle}",
            'hours_inactive': round(hours_inactive, 1),
            'risk_level': risk,
            'has_badge': has_badge
        })

print(f"🚨 CRITICAL: {len(critical_users)} users at Day 1 → Day 2 transition")
print()

for user in critical_users:
    risk_emoji = "🔴" if user['risk_level'] >= 70 else "🟡" if user['risk_level'] >= 40 else "🟢"
    badge_emoji = "✅" if user['has_badge'] else "❌"
    
    print(f"{risk_emoji} {user['handle']}: {user['hours_inactive']}h inactive, {user['risk_level']}% risk {badge_emoji}")
    
    if user['risk_level'] >= 70:
        print(f"   → HIGH PRIORITY: Send gentle check-in DM immediately")
        print(f"   → Message: \"Hey {user['handle']}! 🌱 Your Day 1 streak is looking great. Early Bird badge is just 2 days away! 🌅\"")
    elif user['risk_level'] >= 40:
        print(f"   → MEDIUM: Encourage when they come online via observe_vibe()")
    else:
        print(f"   → LOW: Monitor and provide positive reinforcement")
    print()

avg_risk = sum(u['risk_level'] for u in critical_users) / len(critical_users)
badges_awarded = sum(1 for u in critical_users if u['has_badge'])

print("📊 COMMUNITY HEALTH:")
print(f"   Average risk: {avg_risk:.1f}%")
print(f"   First Day badges: {badges_awarded}/{len(critical_users)}")

health = (100 - avg_risk) * 0.7 + (badges_awarded/len(critical_users)*100) * 0.3
print(f"   Overall health: {health:.1f}/100")
print()
print("💡 KEY: Day 2 has highest dropout rate. Focus on gentle encouragement!")
print("🎯 GOAL: Keep both users through Day 2 → Early Bird badges unlock tomorrow!")