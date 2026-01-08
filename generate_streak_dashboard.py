#!/usr/bin/env python3
"""
Generate streak analytics dashboard for current users
@streaks-agent implementation
"""

import json
import datetime

# Current streak data (from get_streaks()):
# @demo_user: 1 days (best: 1)  
# @vibe_champion: 1 days (best: 1)

current_streaks = {
    "@demo_user": {"current": 1, "best": 1},
    "@vibe_champion": {"current": 1, "best": 1}
}

def calculate_analytics():
    """Calculate key analytics from current data"""
    total_users = len(current_streaks)
    active_streaks = sum(1 for data in current_streaks.values() if data["current"] > 0)
    avg_streak = sum(data["current"] for data in current_streaks.values()) / total_users
    longest_current = max(data["current"] for data in current_streaks.values())
    
    # Health assessment
    health_score = (active_streaks / total_users) * 50 + min(avg_streak * 10, 30) + (20 if longest_current >= 3 else 0)
    
    if health_score >= 70:
        health_status = "thriving"
        health_desc = "Strong engagement across all users"
    elif health_score >= 50:
        health_status = "healthy"  
        health_desc = "Good foundation, building momentum"
    else:
        health_status = "building"
        health_desc = "Early stage, establishing habits"
    
    # Insights based on current state
    insights = []
    
    if active_streaks == total_users:
        insights.append("🔥 Perfect engagement! All users maintaining streaks")
        
    if all(data["current"] == 1 for data in current_streaks.values()):
        insights.append("🌱 Everyone at day 1 - perfect time for habit formation!")
        
    next_day_potential = sum(1 for data in current_streaks.values() if data["current"] == 1)
    if next_day_potential > 0:
        insights.append(f"📈 {next_day_potential} user(s) can reach 2-day streak tomorrow!")
        
    insights.append("🎯 Early Bird milestone (3 days) is the next major goal")
    
    return {
        "total_users": total_users,
        "active_streaks": active_streaks, 
        "avg_streak": round(avg_streak, 1),
        "longest_current": longest_current,
        "health_score": int(health_score),
        "health_status": health_status,
        "health_desc": health_desc,
        "insights": insights
    }

def create_dashboard_html(analytics):
    """Create interactive HTML dashboard"""
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔥 /vibe Streak Analytics</title>
    <style>
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0; padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }}
        .container {{ 
            max-width: 1000px; margin: 0 auto; 
            background: white; border-radius: 20px; 
            padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.15);
        }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .header h1 {{ color: #2c3e50; font-size: 2.5em; margin-bottom: 10px; }}
        .timestamp {{ color: #7f8c8d; font-size: 14px; }}
        .stats-grid {{ 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; margin-bottom: 30px; 
        }}
        .stat-card {{ 
            background: #f8f9fa; padding: 25px; border-radius: 15px; 
            text-align: center; transition: transform 0.2s;
            border-left: 5px solid #3498db;
        }}
        .stat-card:hover {{ transform: translateY(-3px); }}
        .stat-number {{ font-size: 2.5em; font-weight: bold; color: #2c3e50; }}
        .stat-label {{ color: #7f8c8d; font-size: 14px; margin-top: 5px; }}
        .health-banner {{ 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; padding: 30px; border-radius: 15px; 
            text-align: center; margin-bottom: 30px;
        }}
        .health-score {{ font-size: 3em; font-weight: bold; }}
        .insights {{ 
            background: #fff3cd; border: 1px solid #ffeaa7; 
            padding: 25px; border-radius: 15px; margin-bottom: 30px;
        }}
        .insights h3 {{ color: #856404; margin-top: 0; }}
        .insight-item {{ 
            margin: 15px 0; padding: 15px; background: white; 
            border-radius: 8px; font-size: 16px;
        }}
        .users-grid {{ 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; margin-bottom: 30px;
        }}
        .user-card {{ 
            background: #f8f9fa; padding: 20px; border-radius: 15px;
            border-left: 4px solid #e74c3c;
        }}
        .user-handle {{ font-weight: bold; font-size: 18px; color: #2c3e50; }}
        .user-streak {{ color: #e74c3c; font-size: 24px; font-weight: bold; margin: 10px 0; }}
        .user-best {{ color: #7f8c8d; font-size: 14px; }}
        .milestones {{ 
            background: #e8f5e8; padding: 25px; border-radius: 15px; 
            margin-bottom: 30px;
        }}
        .milestones h3 {{ color: #27ae60; margin-top: 0; }}
        .milestone-item {{ 
            padding: 15px; margin: 10px 0; background: white; 
            border-radius: 8px; border-left: 3px solid #27ae60;
        }}
        .footer {{ 
            text-align: center; color: #7f8c8d; 
            margin-top: 30px; padding-top: 20px; 
            border-top: 1px solid #ecf0f1;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔥 /vibe Streak Analytics</h1>
            <div class="timestamp">Updated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">{analytics['total_users']}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{analytics['active_streaks']}</div>
                <div class="stat-label">Active Streaks</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{analytics['avg_streak']}</div>
                <div class="stat-label">Average Days</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{analytics['longest_current']}</div>
                <div class="stat-label">Longest Streak</div>
            </div>
        </div>
        
        <div class="health-banner">
            <div class="health-score">{analytics['health_score']}/100</div>
            <h2>Community Health: {analytics['health_status'].title()}</h2>
            <p>{analytics['health_desc']}</p>
        </div>
        
        <div class="insights">
            <h3>🧠 Key Insights</h3>
"""
    
    for insight in analytics['insights']:
        html += f'<div class="insight-item">{insight}</div>'
    
    html += f"""
        </div>
        
        <div class="users-grid">
"""
    
    for user, data in current_streaks.items():
        html += f"""
            <div class="user-card">
                <div class="user-handle">{user}</div>
                <div class="user-streak">{data['current']} day streak</div>
                <div class="user-best">Personal best: {data['best']} days</div>
            </div>
"""
    
    html += f"""
        </div>
        
        <div class="milestones">
            <h3>🎯 Upcoming Milestones</h3>
            <div class="milestone-item">
                🌱 <strong>Early Bird (3 days)</strong> - All users are 2 days away!
            </div>
            <div class="milestone-item">
                💪 <strong>Week Warrior (7 days)</strong> - 6 days away from first major milestone
            </div>
            <div class="milestone-item">
                🔥 <strong>Consistency King (14 days)</strong> - The commitment milestone
            </div>
        </div>
        
        <div class="footer">
            <p>📊 Built by @streaks-agent for the /vibe workshop</p>
            <p>Gamification that makes consistency sticky ✨</p>
        </div>
    </div>
</body>
</html>"""
    
    return html

def main():
    print("🔥 Generating Streak Analytics Dashboard...")
    
    # Calculate analytics
    analytics = calculate_analytics()
    
    print(f"📊 Analytics Summary:")
    print(f"   👥 Users: {analytics['total_users']}")
    print(f"   ⚡ Active: {analytics['active_streaks']}")
    print(f"   📈 Health: {analytics['health_score']}/100 ({analytics['health_status']})")
    print(f"   🎯 Status: {analytics['health_desc']}")
    
    # Create dashboard
    dashboard_html = create_dashboard_html(analytics)
    
    # Save dashboard
    with open('streak_analytics_dashboard.html', 'w') as f:
        f.write(dashboard_html)
    
    # Save JSON data
    analytics['users'] = current_streaks
    analytics['timestamp'] = datetime.datetime.now().isoformat()
    
    with open('streak_analytics.json', 'w') as f:
        json.dump(analytics, f, indent=2)
    
    print(f"✅ Dashboard created: streak_analytics_dashboard.html")
    print(f"💾 Data saved: streak_analytics.json")
    
    return analytics

if __name__ == "__main__":
    main()