#!/usr/bin/env python3
"""
Run enhanced streak analytics and generate dashboard data
For @streaks-agent workflow
"""

import sys
import os
sys.path.append('.')

from enhanced_streak_analytics import StreakAnalytics
import json
import datetime

def main():
    print("🔥 Running Enhanced Streak Analytics...")
    print("=" * 50)
    
    # Initialize analytics
    analytics = StreakAnalytics()
    
    # Generate comprehensive report
    report = analytics.generate_analytics_report()
    
    # Display key insights
    print(f"👥 Community Status: {report['health']['status'].upper()}")
    print(f"📊 Health Score: {report['health']['score']}/100")
    print(f"⚡ Active Users: {report['summary']['active_streaks']}/{report['summary']['total_users']}")
    print(f"📈 Average Streak: {report['summary']['avg_streak']} days")
    
    print("\n🧠 Key Insights:")
    for insight in report['patterns'][:3]:  # Show top 3
        print(f"   {insight['icon']} {insight['message']}")
    
    print("\n🎯 Immediate Opportunities:")
    predictions = report['predictions']
    
    # Show users close to milestones
    if predictions['seedling_3day']:
        close_users = [p for p in predictions['seedling_3day'] if p['days'] <= 2]
        if close_users:
            for user_pred in close_users:
                print(f"   🌱 {user_pred['user']} needs {user_pred['days']} more days for Seedling!")
    
    if predictions['warrior_7day']:
        close_users = [p for p in predictions['warrior_7day'] if p['days'] <= 3]
        if close_users:
            for user_pred in close_users:
                print(f"   💪 {user_pred['user']} needs {user_pred['days']} more days for Week Warrior!")
    
    # Save report
    with open('streak_analytics_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n💾 Full analytics saved to: streak_analytics_report.json")
    
    # Create dashboard HTML
    create_dashboard_html(report)
    
    print("✅ Analytics complete!")

def create_dashboard_html(report):
    """Create an interactive HTML dashboard"""
    
    html_template = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔥 Streak Analytics Dashboard</title>
    <style>
        body {{ 
            font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            min-height: 100vh;
        }}
        
        .container {{ 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.1);
        }}
        
        .header {{ 
            text-align: center; 
            margin-bottom: 40px; 
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
        }}
        
        .header h1 {{ 
            color: #2c3e50; 
            margin: 0 0 10px 0;
            font-size: 2.5em;
            font-weight: 700;
        }}
        
        .timestamp {{ 
            color: #7f8c8d; 
            font-size: 14px;
        }}
        
        .stats-grid {{ 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 40px; 
        }}
        
        .stat-card {{ 
            background: #f8f9fa; 
            padding: 25px; 
            border-radius: 15px; 
            text-align: center;
            border-left: 5px solid #3498db;
            transition: transform 0.2s;
        }}
        
        .stat-card:hover {{ transform: translateY(-5px); }}
        
        .stat-number {{ 
            font-size: 2.5em; 
            font-weight: bold; 
            color: #2c3e50; 
            margin-bottom: 5px;
        }}
        
        .stat-label {{ 
            color: #7f8c8d; 
            font-size: 14px;
            font-weight: 500;
        }}
        
        .health-status {{ 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            border-radius: 15px; 
            margin-bottom: 30px; 
            text-align: center;
        }}
        
        .health-score {{ 
            font-size: 4em; 
            font-weight: bold; 
            margin-bottom: 10px;
        }}
        
        .insights {{ 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            padding: 25px; 
            border-radius: 15px; 
            margin-bottom: 30px; 
        }}
        
        .insight-item {{ 
            margin-bottom: 15px; 
            padding: 15px;
            background: white;
            border-radius: 10px;
            font-size: 16px;
        }}
        
        .distribution {{ 
            background: #f8f9fa; 
            padding: 25px; 
            border-radius: 15px; 
            margin-bottom: 30px; 
        }}
        
        .distribution h3, .insights h3 {{ 
            color: #2c3e50; 
            margin-top: 0;
            font-size: 1.5em;
        }}
        
        .user-list {{ 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 15px; 
        }}
        
        .user-card {{ 
            background: white; 
            padding: 20px; 
            border-radius: 10px; 
            border-left: 4px solid #e74c3c;
        }}
        
        .user-handle {{ 
            font-weight: bold; 
            color: #2c3e50; 
            font-size: 18px;
        }}
        
        .user-streak {{ 
            color: #e74c3c; 
            font-size: 24px; 
            font-weight: bold;
        }}
        
        .predictions {{ 
            background: #e8f5e8; 
            padding: 25px; 
            border-radius: 15px; 
        }}
        
        .milestone-item {{ 
            padding: 10px 15px; 
            margin-bottom: 10px; 
            background: white; 
            border-radius: 8px; 
            border-left: 3px solid #27ae60;
        }}
        
        .footer {{ 
            text-align: center; 
            color: #7f8c8d; 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #ecf0f1;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔥 Streak Analytics Dashboard</h1>
            <p class="timestamp">Generated at {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">{report['summary']['total_users']}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{report['summary']['active_streaks']}</div>
                <div class="stat-label">Active Streaks</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{report['summary']['avg_streak']}</div>
                <div class="stat-label">Average Days</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{report['summary']['longest_current']}</div>
                <div class="stat-label">Longest Streak</div>
            </div>
        </div>
        
        <div class="health-status">
            <div class="health-score">{report['health']['score']}/100</div>
            <h2>Community Health: {report['health']['status'].title()}</h2>
            <p>{report['health']['description']}</p>
            <p><strong>Active Rate:</strong> {report['health']['active_rate']:.1f}%</p>
        </div>
        
        <div class="insights">
            <h3>🧠 Key Insights</h3>
"""
    
    for insight in report['patterns']:
        html_template += f"""
            <div class="insight-item">
                <strong>{insight['icon']}</strong> {insight['message']}
            </div>
"""
    
    html_template += f"""
        </div>
        
        <div class="predictions">
            <h3>🎯 Upcoming Milestones</h3>
"""
    
    # Add milestone predictions
    if report['predictions']['seedling_3day']:
        for pred in report['predictions']['seedling_3day'][:3]:
            html_template += f"""
            <div class="milestone-item">
                🌱 <strong>{pred['user']}</strong> reaches Seedling in <strong>{pred['days']} days</strong>
            </div>
"""
    
    if report['predictions']['warrior_7day']:
        for pred in report['predictions']['warrior_7day'][:3]:
            html_template += f"""
            <div class="milestone-item">
                💪 <strong>{pred['user']}</strong> reaches Week Warrior in <strong>{pred['days']} days</strong>
            </div>
"""
    
    html_template += f"""
        </div>
        
        <div class="distribution">
            <h3>📊 Streak Distribution</h3>
            <div class="user-list">
"""
    
    # Add current user streaks
    for user, data in report['users'].items():
        html_template += f"""
                <div class="user-card">
                    <div class="user-handle">{user}</div>
                    <div class="user-streak">{data['current']} days</div>
                    <div>Best: {data['best']} days</div>
                </div>
"""
    
    html_template += """
            </div>
        </div>
        
        <div class="footer">
            <p>📊 Dashboard powered by Enhanced Streak Analytics</p>
            <p>Built for the /vibe workshop community</p>
        </div>
    </div>
</body>
</html>
"""
    
    # Save dashboard
    with open('streak_analytics_dashboard.html', 'w') as f:
        f.write(html_template)
    
    print("📊 Dashboard HTML created: streak_analytics_dashboard.html")

if __name__ == "__main__":
    main()