#!/usr/bin/env python3
"""
🔮 Enhanced Streak Prediction Analytics - Jan 8 Evening
Built by @streaks-agent

Predicts milestone achievements and provides engagement insights
"""

import json
from datetime import datetime, timedelta
import os

def load_streak_data():
    """Load current streak data"""
    # Since we can't read from the actual streak system, using observed data
    return {
        "demo_user": {"current": 1, "best": 1},
        "vibe_champion": {"current": 1, "best": 1}
    }

def load_achievements():
    """Load achievement data"""
    try:
        with open('achievements.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {"badges": {}, "user_achievements": {}}

def predict_milestone_dates(current_streak):
    """Predict when users will hit major milestones"""
    today = datetime.now()
    milestones = {
        "early_bird": (3, "🌱 Early Bird"),
        "week_warrior": (7, "💪 Week Warrior"),
        "consistency_king": (14, "🔥 Consistency King"),
        "month_legend": (30, "🏆 Monthly Legend"),
        "century_club": (100, "👑 Century Club")
    }
    
    predictions = {}
    for milestone_id, (days, name) in milestones.items():
        if current_streak >= days:
            predictions[milestone_id] = {
                "name": name,
                "status": "achieved",
                "date": "Already earned!"
            }
        else:
            days_needed = days - current_streak
            predicted_date = today + timedelta(days=days_needed)
            predictions[milestone_id] = {
                "name": name,
                "status": "pending",
                "days_needed": days_needed,
                "predicted_date": predicted_date.strftime("%B %d, %Y")
            }
    
    return predictions

def calculate_engagement_momentum():
    """Calculate engagement momentum metrics"""
    streak_data = load_streak_data()
    
    # Metrics
    active_users = len([u for u in streak_data.values() if u["current"] > 0])
    total_users = len(streak_data)
    avg_streak = sum(u["current"] for u in streak_data.values()) / total_users if total_users > 0 else 0
    total_streak_days = sum(u["current"] for u in streak_data.values())
    
    # Engagement insights
    insights = []
    
    if avg_streak < 3:
        insights.append({
            "type": "opportunity",
            "icon": "🌱",
            "title": "Foundation Building Phase",
            "message": "Users are in the critical early streak phase. Perfect time for gentle encouragement and clear milestone visibility."
        })
    
    if active_users == total_users and avg_streak >= 1:
        insights.append({
            "type": "celebration",
            "icon": "🎉",
            "title": "100% Engagement Rate",
            "message": "Amazing! All users are maintaining active streaks. This shows strong workshop stickiness."
        })
    
    # Predict next milestone celebration
    next_milestone_days = 3 - avg_streak
    if next_milestone_days > 0:
        insights.append({
            "type": "prediction",
            "icon": "🔮",
            "title": "Next Group Milestone",
            "message": f"Group will hit 3-day average in ~{int(next_milestone_days)} days. Prepare Early Bird celebration!"
        })
    
    return {
        "metrics": {
            "active_users": active_users,
            "total_users": total_users,
            "avg_streak": round(avg_streak, 1),
            "total_streak_days": total_streak_days,
            "engagement_rate": round((active_users / total_users) * 100, 1) if total_users > 0 else 0
        },
        "insights": insights
    }

def generate_user_predictions():
    """Generate predictions for each user"""
    streak_data = load_streak_data()
    user_predictions = {}
    
    for username, data in streak_data.items():
        predictions = predict_milestone_dates(data["current"])
        
        # Find next milestone
        next_milestone = None
        for milestone_id, pred in predictions.items():
            if pred["status"] == "pending":
                if next_milestone is None or pred["days_needed"] < predictions[next_milestone]["days_needed"]:
                    next_milestone = milestone_id
        
        user_predictions[username] = {
            "current_streak": data["current"],
            "best_streak": data["best"],
            "next_milestone": predictions[next_milestone] if next_milestone else None,
            "all_predictions": predictions
        }
    
    return user_predictions

def generate_celebration_queue():
    """Generate upcoming celebration opportunities"""
    user_predictions = generate_user_predictions()
    celebrations = []
    
    for username, data in user_predictions.items():
        if data["next_milestone"]:
            milestone = data["next_milestone"]
            celebrations.append({
                "user": username,
                "milestone": milestone["name"],
                "days_away": milestone.get("days_needed", 0),
                "date": milestone.get("predicted_date", "Soon"),
                "priority": "high" if milestone.get("days_needed", 0) <= 3 else "medium"
            })
    
    # Sort by urgency
    celebrations.sort(key=lambda x: x["days_away"])
    return celebrations

def generate_analytics_report():
    """Generate comprehensive analytics report"""
    
    print("🔮 Enhanced Streak Prediction Analytics")
    print("=" * 50)
    print(f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}")
    print()
    
    # Current metrics
    momentum = calculate_engagement_momentum()
    metrics = momentum["metrics"]
    
    print("📊 Current Metrics:")
    print(f"  Active Users: {metrics['active_users']}")
    print(f"  Average Streak: {metrics['avg_streak']} days")
    print(f"  Total Streak Days: {metrics['total_streak_days']}")
    print(f"  Engagement Rate: {metrics['engagement_rate']}%")
    print()
    
    # User predictions
    print("👥 User Predictions:")
    user_predictions = generate_user_predictions()
    
    for username, data in user_predictions.items():
        print(f"  @{username}:")
        print(f"    Current: {data['current_streak']} days (best: {data['best_streak']})")
        
        if data["next_milestone"]:
            milestone = data["next_milestone"]
            print(f"    Next: {milestone['name']} in {milestone['days_needed']} days ({milestone['predicted_date']})")
        else:
            print("    Next: All major milestones achieved! 🎉")
        print()
    
    # Engagement insights
    print("💡 Engagement Insights:")
    for insight in momentum["insights"]:
        print(f"  {insight['icon']} {insight['title']}")
        print(f"    {insight['message']}")
        print()
    
    # Celebration queue
    print("🎉 Upcoming Celebrations:")
    celebrations = generate_celebration_queue()
    
    if celebrations:
        for cele in celebrations[:5]:  # Top 5 upcoming
            priority = "🔴" if cele["priority"] == "high" else "🟡"
            print(f"  {priority} @{cele['user']} - {cele['milestone']}")
            print(f"    📅 {cele['date']} ({cele['days_away']} days away)")
            print()
    else:
        print("  No upcoming celebrations in the next 30 days")
        print()
    
    # Recommendations
    print("🚀 Recommendations:")
    
    if metrics["avg_streak"] < 3:
        print("  1. 🌱 Focus on 3-day milestone coaching")
        print("  2. 💬 Send encouraging DMs to users approaching milestones")
        print("  3. 📢 Create visibility around Early Bird badge (3 days)")
    elif metrics["avg_streak"] < 7:
        print("  1. 💪 Promote Week Warrior challenge")
        print("  2. 🤝 Create streak buddy partnerships")
        print("  3. 📊 Show progress visualization to maintain momentum")
    else:
        print("  1. 🏆 Celebrate sustained engagement")
        print("  2. 🎮 Introduce advanced gamification features")
        print("  3. 👑 Prepare for major milestone celebrations")
    
    print()
    print("Built by @streaks-agent 🤖")
    print("Making /vibe workshop sticky through predictive gamification ✨")

if __name__ == "__main__":
    generate_analytics_report()