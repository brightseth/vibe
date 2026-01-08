#!/usr/bin/env python3
"""
Celebration system for badge achievements
Used by @streaks-agent to congratulate users on new badges
"""

def create_celebration_messages():
    """Create personalized celebration messages for badge achievements"""
    
    celebration_templates = {
        "first_day": {
            "emoji": "🌱",
            "title": "First Day",
            "message": "Welcome to your streak journey! Every expert was once a beginner. Keep it up! ✨",
            "encouragement": "Consistency starts with day one - you've got this!"
        },
        
        "early_bird": {
            "emoji": "🌅", 
            "title": "Early Bird",
            "message": "Three days strong! You're building momentum and creating a habit that will serve you well. 💪",
            "encouragement": "The hardest part is starting - you're already proving your commitment!"
        },
        
        "week_streak": {
            "emoji": "🔥",
            "title": "Week Warrior", 
            "message": "One full week of dedication! You've crossed the first major milestone. This is where habits solidify! 🏆",
            "encouragement": "Studies show it takes 21 days to form a habit - you're 1/3 of the way there!"
        },
        
        "consistency_king": {
            "emoji": "👑",
            "title": "Consistency King",
            "message": "Two weeks of unwavering commitment! You're not just participating, you're leading by example. Incredible! 🎯",
            "encouragement": "Your consistency is inspiring others - keep being the example!"
        },
        
        "month_streak": {
            "emoji": "🏆",
            "title": "Monthly Legend",
            "message": "30 days of excellence! You've proven that consistency isn't luck - it's a choice. Truly legendary! ✨",
            "encouragement": "You've built something special here. This is mastery in action!"
        },
        
        "century_club": {
            "emoji": "👑",
            "title": "Century Club",
            "message": "100 days of mastery! You've achieved what few dare to attempt. You are workshop royalty! 🌟",
            "encouragement": "This level of dedication transforms not just you, but everyone around you!"
        }
    }
    
    return celebration_templates

def format_celebration_dm(handle, badge_id):
    """Format a celebration DM for a specific user and badge"""
    templates = create_celebration_messages()
    
    if badge_id not in templates:
        # Generic celebration for unknown badges
        return f"🎉 Congratulations {handle}! You earned a new achievement badge! Keep up the amazing work! ✨"
    
    template = templates[badge_id]
    
    message = f"""🎉 {handle} earned the "{template['title']}" badge! {template['emoji']}

{template['message']}

{template['encouragement']}

Keep up the amazing work! ✨"""
    
    return message

def should_announce_publicly(badge_id):
    """Determine if badge should be announced to the board"""
    public_announcement_badges = ['week_streak', 'consistency_king', 'month_streak', 'century_club']
    return badge_id in public_announcement_badges

def format_public_announcement(handle, badge_id):
    """Format public announcement for significant milestones"""
    templates = create_celebration_messages()
    
    if badge_id not in templates:
        return f"🎖️ {handle} earned a new badge!"
    
    template = templates[badge_id]
    return f"🎉 {handle} earned the {template['title']} badge! {template['emoji']} {template['message'].split('!')[0]}!"

if __name__ == "__main__":
    # Test the celebration system
    print("🎉 Badge Celebration System")
    print("=" * 30)
    
    test_badges = ["first_day", "week_streak", "month_streak", "century_club"]
    
    for badge in test_badges:
        print(f"\n{badge.upper()}:")
        dm = format_celebration_dm("@demo_user", badge)
        print(dm)
        
        if should_announce_publicly(badge):
            public = format_public_announcement("@demo_user", badge)
            print(f"\nPublic announcement: {public}")
        
        print("-" * 40)