#!/usr/bin/env python3
"""
Run Critical Day 2 Analytics for current users
"""

import json
from datetime import datetime, timedelta

def load_streak_data():
    """Load current streak data"""
    try:
        with open('streak_data.json', 'r') as f:
            raw_data = json.load(f)
        
        # Convert to expected format
        streaks = {}
        for handle, data in raw_data.items():
            # Ensure handle has @ prefix
            clean_handle = f"@{handle}" if not handle.startswith('@') else handle
            streaks[clean_handle] = {
                'current_streak': data.get('current', 0),
                'best_streak': data.get('best', 0),
                'last_active': f"{data.get('last_active')}T12:00:00Z"  # Assume noon
            }
        return streaks
    except FileNotFoundError:
        return {}

def load_achievements():
    """Load achievement data"""
    try:
        with open('achievements.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"user_achievements": {}}

def analyze_day2_critical_users():
    """Analyze users at Day 1 → Day 2 transition"""
    streaks = load_streak_data()
    achievements = load_achievements()
    current_time = datetime.now()
    
    critical_users = []
    
    for handle, data in streaks.items():
        current_streak = data.get('current_streak', 0)
        last_activity = data.get('last_active')
        
        # Focus on users with exactly 1 day streak (Day 1 → Day 2 transition)
        if current_streak == 1:
            # Calculate time since last activity
            try:
                last_active = datetime.fromisoformat(last_activity.replace('Z', '+00:00'))
                hours_inactive = (current_time - last_active).total_seconds() / 3600
            except:
                hours_inactive = 24  # Default to 24h if parsing fails
            
            # Calculate risk level
            if hours_inactive < 12:
                risk_level = 20  # Very low risk
            elif hours_inactive < 24:
                risk_level = 40  # Low risk  
            elif hours_inactive < 36:
                risk_level = 70  # Moderate risk
            else:
                risk_level = 90  # High risk
            
            # Check for First Day badge
            clean_handle = handle.replace('@', '')
            user_badges = achievements.get('user_achievements', {}).get(clean_handle, [])
            has_first_day = any(badge.get('id') == 'first_day' for badge in user_badges)
            
            critical_users.append({
                'handle': handle,
                'current_streak': current_streak,
                'best_streak': data.get('best_streak', 0),
                'last_activity': last_activity,
                'hours_since_activity': round(hours_inactive, 1),
                'risk_level': risk_level,
                'has_first_day_badge': has_first_day,
                'next_milestone': 'Early Bird 🌅',
                'days_to_milestone': 2,
                'critical_period': 'Day 1 → Day 2 transition'
            })
    
    return critical_users

def generate_streaks_agent_recommendations(critical_users):
    """Generate specific actions for @streaks-agent"""
    if not critical_users:
        return {
            'status': 'no_critical_users',
            'message': 'No users at Day 2 transition currently',
            'action': 'monitor_general_engagement'
        }
    
    high_risk = [u for u in critical_users if u['risk_level'] >= 70]
    moderate_risk = [u for u in critical_users if u['risk_level'] >= 40 and u['risk_level'] < 70]
    low_risk = [u for u in critical_users if u['risk_level'] < 40]
    
    recommendations = {
        'total_critical_users': len(critical_users),
        'risk_breakdown': {
            'high': len(high_risk),
            'moderate': len(moderate_risk), 
            'low': len(low_risk)
        },
        'immediate_actions': [],
        'when_online_actions': [],
        'monitoring_actions': []
    }
    
    # High risk users need immediate gentle outreach
    for user in high_risk:
        recommendations['immediate_actions'].append({
            'handle': user['handle'],
            'action': 'gentle_dm',
            'message': f"Hey {user['handle']}! 🌱 Loving your Day 1 energy in the workshop. How are you finding the experience so far? Early Bird badge is just 2 days away! 🌅",
            'reason': f"High risk ({user['risk_level']}%) - {user['hours_since_activity']}h inactive"
        })
    
    # Moderate risk users get encouragement when they come online
    for user in moderate_risk:
        recommendations['when_online_actions'].append({
            'handle': user['handle'],
            'action': 'online_encouragement',
            'message': f"Great to see you back, {user['handle']}! 🔥 Day 1 streak complete - Early Bird badge unlocks at 3 days. You're doing awesome!",
            'reason': f"Moderate risk ({user['risk_level']}%) - Day 2 critical period"
        })
    
    # Low risk users get positive reinforcement
    for user in low_risk:
        recommendations['monitoring_actions'].append({
            'handle': user['handle'],
            'action': 'positive_reinforcement',
            'message': f"Love the consistency, {user['handle']}! 💪 Early Bird badge incoming in 2 days. Keep up the great momentum!",
            'reason': f"Low risk ({user['risk_level']}%) - maintain positive trajectory"
        })
    
    return recommendations

def main():
    """Run the critical Day 2 analysis"""
    print("🎯 CRITICAL DAY 2 TRANSITION ANALYSIS")
    print("=" * 45)
    print(f"📅 Analysis Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    critical_users = analyze_day2_critical_users()
    recommendations = generate_streaks_agent_recommendations(critical_users)
    
    if recommendations['status'] == 'no_critical_users':
        print("✅ No users currently at Day 2 transition")
        print("🎯 Action: Continue general engagement monitoring")
        return
    
    print(f"🚨 CRITICAL PERIOD: {len(critical_users)} users at Day 1 → Day 2 transition")
    print()
    
    print("👥 CRITICAL USERS:")
    for user in critical_users:
        risk_emoji = "🔴" if user['risk_level'] >= 70 else "🟡" if user['risk_level'] >= 40 else "🟢"
        badge_status = "✅" if user['has_first_day_badge'] else "❌"
        print(f"  {risk_emoji} {user['handle']}: {user['current_streak']} day streak")
        print(f"     Last active: {user['hours_since_activity']}h ago")
        print(f"     Risk level: {user['risk_level']}%")
        print(f"     First Day badge: {badge_status}")
        print(f"     Next milestone: {user['next_milestone']} ({user['days_to_milestone']} days)")
        print()
    
    print("🎯 IMMEDIATE ACTIONS FOR @streaks-agent:")
    if recommendations['immediate_actions']:
        print("  HIGH PRIORITY (Send DMs now):")
        for action in recommendations['immediate_actions']:
            print(f"    → DM {action['handle']}: {action['reason']}")
            print(f"      Message: \"{action['message']}\"")
            print()
    
    if recommendations['when_online_actions']:
        print("  WHEN ONLINE (via observe_vibe):")
        for action in recommendations['when_online_actions']:
            print(f"    → Encourage {action['handle']}: {action['reason']}")
            print()
    
    if recommendations['monitoring_actions']:
        print("  ONGOING MONITORING:")
        for action in recommendations['monitoring_actions']:
            print(f"    → Monitor {action['handle']}: {action['reason']}")
            print()
    
    # Calculate overall health
    avg_risk = sum(u['risk_level'] for u in critical_users) / len(critical_users)
    badges_complete = sum(1 for u in critical_users if u['has_first_day_badge'])
    
    print("📊 COMMUNITY DAY 2 HEALTH:")
    print(f"  Average risk level: {avg_risk:.1f}%")
    print(f"  First Day badges: {badges_complete}/{len(critical_users)} ({badges_complete/len(critical_users)*100:.0f}%)")
    
    health_score = (100 - avg_risk) * 0.7 + (badges_complete/len(critical_users)*100) * 0.3
    if health_score >= 80:
        health_status = "🟢 EXCELLENT"
    elif health_score >= 60:
        health_status = "🟡 GOOD" 
    elif health_score >= 40:
        health_status = "🟠 CONCERNING"
    else:
        health_status = "🔴 CRITICAL"
    
    print(f"  Overall health: {health_score:.1f}/100 {health_status}")
    
    print(f"\n💡 KEY INSIGHT: Day 2 is the highest dropout period. Focus on gentle encouragement!")
    print(f"🎯 SUCCESS METRIC: Maintain both users through Day 2 → unlock Early Bird badges tomorrow!")

if __name__ == "__main__":
    main()