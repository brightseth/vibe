#!/usr/bin/env python3
"""
Enhanced Achievement Analytics Dashboard
Built by @streaks-agent to fulfill backlog requirements for analytics with trend graphs and statistics.

Combines achievement tracking with advanced analytics:
- Trend graphs and streak distribution
- Achievement progression analysis  
- Gamification effectiveness metrics
- Interactive progress tracking
"""

import json
from datetime import datetime, timedelta
import os

def load_all_data():
    """Load all available data sources"""
    data = {}
    
    # Load streak data
    try:
        with open("streak_data.json", 'r') as f:
            data['streaks'] = json.load(f)
    except FileNotFoundError:
        data['streaks'] = {"streaks": {}, "metadata": {"last_updated": ""}}
    
    # Load achievement data
    try:
        with open("achievements.json", 'r') as f:
            data['achievements'] = json.load(f)
    except FileNotFoundError:
        data['achievements'] = {"badges": {}, "user_badges": {}, "achievement_log": []}
    
    # Load participation stats if available
    try:
        with open("participation_stats.json", 'r') as f:
            data['participation'] = json.load(f)
    except FileNotFoundError:
        data['participation'] = {}
    
    return data

def calculate_streak_distribution(streak_data):
    """Calculate streak length distribution for visualization"""
    streaks = [info["current"] for info in streak_data["streaks"].values()]
    
    # Create distribution buckets
    buckets = {
        "1 day": 0,
        "2-6 days": 0, 
        "1-2 weeks": 0,
        "2-4 weeks": 0,
        "1+ months": 0
    }
    
    for streak in streaks:
        if streak == 1:
            buckets["1 day"] += 1
        elif 2 <= streak <= 6:
            buckets["2-6 days"] += 1
        elif 7 <= streak <= 14:
            buckets["1-2 weeks"] += 1
        elif 15 <= streak <= 30:
            buckets["2-4 weeks"] += 1
        elif streak > 30:
            buckets["1+ months"] += 1
    
    return buckets

def calculate_achievement_velocity(achievement_data):
    """Calculate how quickly users are earning achievements"""
    logs = achievement_data.get("achievement_log", [])
    
    if not logs:
        return {"average_days_to_first": 0, "badges_per_week": 0, "velocity_trend": "No data"}
    
    # Calculate average days to first badge
    first_badges = {}
    for log in logs:
        user = log["user"]
        if user not in first_badges:
            first_badges[user] = log.get("streak_when_earned", 1)
    
    avg_days_to_first = sum(first_badges.values()) / len(first_badges) if first_badges else 0
    
    # Calculate badges per week
    total_badges = len(logs)
    # Estimate timespan (simplified calculation)
    date_strings = [log.get("awarded_at", "") for log in logs if log.get("awarded_at")]
    if date_strings:
        dates = sorted([datetime.fromisoformat(d.replace('Z', '+00:00')) for d in date_strings])
        if len(dates) > 1:
            timespan_days = (dates[-1] - dates[0]).days
            badges_per_week = (total_badges / max(timespan_days, 1)) * 7
        else:
            badges_per_week = total_badges  # All in one day
    else:
        badges_per_week = 0
    
    return {
        "average_days_to_first": avg_days_to_first,
        "badges_per_week": badges_per_week,
        "velocity_trend": "Increasing" if badges_per_week > 1 else "Steady"
    }

def analyze_gamification_effectiveness(data):
    """Analyze how well gamification is working"""
    streak_data = data['streaks']
    achievement_data = data['achievements']
    
    total_users = len(streak_data["streaks"])
    if total_users == 0:
        return {"engagement_score": 0, "analysis": "No users to analyze"}
    
    # Calculate metrics
    active_streaks = sum(1 for info in streak_data["streaks"].values() if info["current"] > 0)
    long_streaks = sum(1 for info in streak_data["streaks"].values() if info["current"] >= 7)
    users_with_badges = len(achievement_data.get("user_badges", {}))
    total_badges_awarded = sum(len(badges) for badges in achievement_data.get("user_badges", {}).values())
    
    # Engagement metrics (0-100 scale)
    streak_engagement = (active_streaks / total_users) * 100
    retention_rate = (long_streaks / total_users) * 100
    badge_adoption = (users_with_badges / total_users) * 100
    badge_density = total_badges_awarded / max(total_users, 1)
    
    overall_score = (streak_engagement + retention_rate + badge_adoption) / 3
    
    analysis = []
    if overall_score >= 80:
        analysis.append("🔥 Excellent engagement! Gamification is highly effective")
    elif overall_score >= 60:
        analysis.append("💪 Good engagement with room for improvement")
    elif overall_score >= 40:
        analysis.append("📈 Moderate engagement - consider new features")
    else:
        analysis.append("🚨 Low engagement - gamification needs attention")
    
    if retention_rate < 30:
        analysis.append("⚠️ Low 7+ day retention - consider motivation features")
    if badge_adoption < 50:
        analysis.append("💡 Consider making achievements more discoverable")
    
    return {
        "engagement_score": overall_score,
        "streak_engagement": streak_engagement,
        "retention_rate": retention_rate,
        "badge_adoption": badge_adoption,
        "badge_density": badge_density,
        "analysis": " | ".join(analysis)
    }

def generate_progress_visualization(data):
    """Generate ASCII visualization of progress trends"""
    streak_data = data['streaks']
    
    # Create simple ASCII chart of current streaks
    streaks = [(user, info["current"]) for user, info in streak_data["streaks"].items()]
    streaks.sort(key=lambda x: x[1], reverse=True)
    
    print("📊 STREAK LEADERBOARD VISUALIZATION")
    print("-" * 50)
    
    max_streak = max([s[1] for s in streaks]) if streaks else 1
    
    for user, streak in streaks:
        # Create visual bar
        bar_length = int((streak / max_streak) * 30) if max_streak > 0 else 0
        bar = "█" * bar_length + "░" * (30 - bar_length)
        
        # Add milestone indicators
        milestone = ""
        if streak >= 100:
            milestone = "👑"
        elif streak >= 30:
            milestone = "🏆"
        elif streak >= 7:
            milestone = "💪"
        elif streak >= 1:
            milestone = "🌱"
        
        print(f"{user:15} │{bar}│ {streak:3d} days {milestone}")
    
    return streaks

def generate_enhanced_dashboard():
    """Generate comprehensive analytics dashboard"""
    data = load_all_data()
    
    print("🎯 ENHANCED ACHIEVEMENT ANALYTICS DASHBOARD")
    print("=" * 70)
    print(f"📅 Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🎮 Built by @streaks-agent")
    print()
    
    # === OVERVIEW METRICS ===
    print("📊 OVERVIEW METRICS")
    print("-" * 40)
    
    streak_data = data['streaks']
    achievement_data = data['achievements']
    
    total_users = len(streak_data["streaks"])
    total_badges_available = len(achievement_data["badges"])
    total_badges_awarded = sum(len(badges) for badges in achievement_data.get("user_badges", {}).values())
    
    print(f"👥 Total Users: {total_users}")
    print(f"🏆 Badge Types: {total_badges_available}")
    print(f"🎖️ Total Badges Awarded: {total_badges_awarded}")
    print(f"📈 Avg Badges/User: {total_badges_awarded/max(total_users,1):.1f}")
    print()
    
    # === STREAK DISTRIBUTION ANALYSIS ===
    print("📈 STREAK DISTRIBUTION ANALYSIS")
    print("-" * 40)
    
    distribution = calculate_streak_distribution(streak_data)
    
    for bucket, count in distribution.items():
        percentage = (count / max(total_users, 1)) * 100
        bar = "█" * int(percentage / 5)  # Scale bar
        print(f"{bucket:12} │{bar:<20}│ {count:2d} users ({percentage:4.1f}%)")
    
    print()
    
    # === ACHIEVEMENT VELOCITY ===
    print("🚀 ACHIEVEMENT VELOCITY ANALYSIS")
    print("-" * 40)
    
    velocity = calculate_achievement_velocity(achievement_data)
    print(f"⏱️  Avg Days to First Badge: {velocity['average_days_to_first']:.1f}")
    print(f"📊 Badges Awarded per Week: {velocity['badges_per_week']:.1f}")
    print(f"📈 Velocity Trend: {velocity['velocity_trend']}")
    print()
    
    # === GAMIFICATION EFFECTIVENESS ===
    print("🎮 GAMIFICATION EFFECTIVENESS")
    print("-" * 40)
    
    effectiveness = analyze_gamification_effectiveness(data)
    print(f"🎯 Overall Engagement Score: {effectiveness['engagement_score']:.1f}/100")
    print(f"🔥 Active Streak Rate: {effectiveness['streak_engagement']:.1f}%")
    print(f"💪 7+ Day Retention: {effectiveness['retention_rate']:.1f}%")
    print(f"🏆 Badge Adoption Rate: {effectiveness['badge_adoption']:.1f}%")
    print(f"🎖️  Avg Badges per User: {effectiveness['badge_density']:.1f}")
    print(f"📊 Analysis: {effectiveness['analysis']}")
    print()
    
    # === VISUAL LEADERBOARD ===
    generate_progress_visualization(data)
    print()
    
    # === MILESTONE PIPELINE ===
    print("🎯 MILESTONE PIPELINE")
    print("-" * 40)
    
    milestones = {1: "First Day", 7: "Week Warrior", 14: "Fortnight Hero", 30: "Monthly Legend", 100: "Century Club"}
    
    for threshold, name in milestones.items():
        qualified = sum(1 for info in streak_data["streaks"].values() if info["current"] >= threshold)
        approaching = sum(1 for info in streak_data["streaks"].values() 
                         if threshold - 3 <= info["current"] < threshold)
        
        print(f"{name:15} │ {qualified:2d} achieved, {approaching:2d} approaching")
    
    print()
    
    # === RECENT ACTIVITY ===
    print("📜 RECENT ACHIEVEMENT ACTIVITY")
    print("-" * 40)
    
    logs = achievement_data.get("achievement_log", [])
    if logs:
        recent_logs = sorted(logs, key=lambda x: x.get("awarded_at", ""), reverse=True)[:5]
        for log in recent_logs:
            date = log.get("awarded_at", "")[:10] if log.get("awarded_at") else "Unknown"
            celebration = "🎉" if log.get("celebration_sent") else "📬"
            print(f"   {celebration} {log['user']}: {log['badge_name']} (day {log.get('streak_when_earned', '?')}, {date})")
    else:
        print("   No recent achievement activity")
    
    print()
    
    # === RECOMMENDATIONS ===
    print("💡 RECOMMENDATIONS")
    print("-" * 40)
    
    recommendations = []
    
    if effectiveness['retention_rate'] < 50:
        recommendations.append("🎯 Add mid-streak motivation features (day 3-5 encouragement)")
    if effectiveness['badge_adoption'] < 70:
        recommendations.append("🔔 Improve badge visibility and progress notifications")
    if total_users < 5:
        recommendations.append("👥 Focus on user onboarding and invitation features")
    
    approaching_week = sum(1 for info in streak_data["streaks"].values() if 3 <= info["current"] <= 6)
    if approaching_week > 0:
        recommendations.append(f"💪 {approaching_week} users approaching Week Warrior - send encouragement!")
    
    if not recommendations:
        recommendations.append("✨ System performing well! Consider advanced features like seasonal badges")
    
    for i, rec in enumerate(recommendations, 1):
        print(f"   {i}. {rec}")
    
    print(f"\n{'=' * 70}")
    print("🎮 Enhanced Analytics by @streaks-agent")
    print("Making /vibe workshop progress visible and irresistible!")

if __name__ == "__main__":
    generate_enhanced_dashboard()