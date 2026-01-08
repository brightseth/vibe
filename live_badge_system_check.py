#!/usr/bin/env python3
"""
Live badge system check and celebration by @streaks-agent
Checks current streak data against achievement thresholds and awards badges
"""

import json
from datetime import datetime, timezone

def load_json(filepath, default=None):
    """Load JSON with fallback"""
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default if default is not None else {}

def save_json(filepath, data):
    """Save JSON with pretty formatting"""
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

def check_and_award_badges():
    """Check streaks and award appropriate badges"""
    
    # Load current data
    streak_data = load_json('streak_data.json', {})
    achievements = load_json('achievements.json', {
        'badges': {},
        'user_achievements': {},
        'achievement_history': []
    })
    badges_data = load_json('badges.json', {
        'user_badges': {},
        'badge_log': [],
        'stats': {'total_badges_awarded': 0}
    })
    
    print("🎖️ Live Badge System Check")
    print("=" * 40)
    
    # Current users with streaks
    users = list(streak_data.keys()) if streak_data else []
    new_awards = []
    
    for user in users:
        user_data = streak_data[user]
        current_streak = user_data.get('current_streak', 0)
        best_streak = user_data.get('best_streak', 0)
        
        print(f"\n👤 {user}")
        print(f"   Current streak: {current_streak} days")
        print(f"   Best streak: {best_streak} days")
        
        # Ensure user exists in systems
        if user not in achievements['user_achievements']:
            achievements['user_achievements'][user] = []
        if user not in badges_data['user_badges']:
            badges_data['user_badges'][user] = []
        
        # Get already earned badge IDs
        earned_badge_ids = [badge.get('id', badge.get('name', '')) for badge in achievements['user_achievements'][user]]
        
        # Check for new badges to award
        badges_to_award = []
        
        # First Day Badge (1 day)
        if current_streak >= 1 and 'first_day' not in earned_badge_ids:
            badges_to_award.append({
                'id': 'first_day',
                'name': '🌱 First Day',
                'description': 'Started your streak journey',
                'threshold': 1
            })
        
        # Early Bird Badge (3 days)  
        if current_streak >= 3 and 'early_bird' not in earned_badge_ids:
            badges_to_award.append({
                'id': 'early_bird',
                'name': '🌅 Early Bird',
                'description': 'Active for 3 consecutive days',
                'threshold': 3
            })
        
        # Week Warrior (7 days)
        if current_streak >= 7 and 'week_streak' not in earned_badge_ids:
            badges_to_award.append({
                'id': 'week_streak', 
                'name': '💪 Week Warrior',
                'description': 'Maintained a 7-day activity streak',
                'threshold': 7
            })
        
        # Consistency King (14 days)
        if current_streak >= 14 and 'consistency_king' not in earned_badge_ids:
            badges_to_award.append({
                'id': 'consistency_king',
                'name': '🔥 Consistency King',
                'description': 'Maintained a 14-day streak',
                'threshold': 14
            })
            
        # Monthly Legend (30 days)
        if current_streak >= 30 and 'month_streak' not in earned_badge_ids:
            badges_to_award.append({
                'id': 'month_streak',
                'name': '🏆 Monthly Legend', 
                'description': 'Maintained a 30-day activity streak',
                'threshold': 30
            })
            
        # Century Club (100 days)
        if current_streak >= 100 and 'century_club' not in earned_badge_ids:
            badges_to_award.append({
                'id': 'century_club',
                'name': '👑 Century Club',
                'description': 'Maintained a 100-day activity streak',
                'threshold': 100
            })
        
        # Award new badges
        for badge in badges_to_award:
            now = datetime.now(timezone.utc).isoformat()
            
            # Add to achievements
            achievement_entry = {
                'id': badge['id'],
                'name': badge['name'],
                'description': badge['description'],
                'earned_at': now,
                'criteria': f"streak_days >= {badge['threshold']}"
            }
            achievements['user_achievements'][user].append(achievement_entry)
            
            # Add to achievement history
            achievements['achievement_history'].append({
                'handle': user,
                'badge': {
                    'id': badge['id'],
                    'name': badge['name'],
                    'description': badge['description'],
                    'earned_at': now
                },
                'timestamp': now
            })
            
            # Add to badges system
            badges_data['user_badges'][user].append(badge['name'])
            badges_data['badge_log'].append({
                'user': user,
                'badge': badge['name'],
                'earned_at': now,
                'milestone': f"{badge['threshold']} day streak"
            })
            
            new_awards.append((user, badge))
            print(f"   🎉 NEW BADGE: {badge['name']}")
    
    # Update stats
    badges_data['stats']['total_badges_awarded'] = sum(len(badges) for badges in badges_data['user_badges'].values())
    
    # Save updated data
    save_json('achievements.json', achievements)
    save_json('badges.json', badges_data)
    
    print(f"\n✅ Badge check complete!")
    print(f"   Total badges awarded: {badges_data['stats']['total_badges_awarded']}")
    print(f"   New awards this cycle: {len(new_awards)}")
    
    return new_awards

def main():
    """Main execution"""
    new_awards = check_and_award_badges()
    
    if new_awards:
        print(f"\n🎊 CELEBRATION NEEDED:")
        for user, badge in new_awards:
            print(f"   {user} earned {badge['name']}!")
            # TODO: Send DM celebration
    
    return new_awards

if __name__ == "__main__":
    main()