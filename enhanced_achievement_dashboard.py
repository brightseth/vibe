#!/usr/bin/env python3
"""
Enhanced Achievement Dashboard for /vibe Workshop
Visual interface for tracking badges, streaks, and milestones
"""

from achievements import AchievementTracker
from streaks_agent_achievement_integration import StreaksAgentAchievements
import json
from datetime import datetime, timedelta

class AchievementDashboard:
    def __init__(self):
        self.tracker = AchievementTracker()
        self.agent = StreaksAgentAchievements()
    
    def generate_html_dashboard(self):
        """Generate a complete HTML dashboard"""
        
        html = """
<!DOCTYPE html>
<html>
<head>
    <title>/vibe Workshop - Achievement Dashboard</title>
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container { 
            background: white; 
            border-radius: 20px; 
            padding: 30px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .header { 
            text-align: center; 
            margin-bottom: 40px;
            background: linear-gradient(45deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin-bottom: 40px; 
        }
        .stat-card { 
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 20px; 
            border-radius: 15px; 
            text-align: center;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .stat-number { 
            font-size: 2.5em; 
            font-weight: bold; 
            display: block; 
        }
        .leaderboard { 
            background: #f8f9fa; 
            border-radius: 15px; 
            padding: 25px; 
            margin-bottom: 30px;
        }
        .badge-showcase { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
            gap: 15px; 
        }
        .badge { 
            background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
            border: 2px solid #e9ecef;
            border-radius: 12px; 
            padding: 15px; 
            text-align: center; 
            transition: transform 0.2s;
        }
        .badge:hover { 
            transform: translateY(-5px); 
            box-shadow: 0 10px 20px rgba(0,0,0,0.15);
        }
        .badge-icon { 
            font-size: 2em; 
            margin-bottom: 10px; 
        }
        .user-row { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 15px; 
            border-bottom: 1px solid #eee; 
        }
        .user-row:last-child { 
            border-bottom: none; 
        }
        .progress-bar { 
            background: #e9ecef; 
            border-radius: 10px; 
            height: 8px; 
            overflow: hidden; 
        }
        .progress-fill { 
            background: linear-gradient(45deg, #667eea, #764ba2);
            height: 100%; 
            transition: width 0.3s ease; 
        }
        h1 { 
            margin: 0; 
            font-size: 2.5em; 
        }
        h2 { 
            color: #495057; 
            border-bottom: 3px solid #667eea; 
            padding-bottom: 10px; 
        }
        .milestone-alert { 
            background: #fff3cd; 
            border: 1px solid #ffeeba; 
            border-radius: 10px; 
            padding: 15px; 
            margin: 20px 0; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏆 /vibe Achievement Dashboard</h1>
            <p>Celebrating consistency and community building</p>
        </div>
"""
        
        # Generate stats
        leaderboard = self.tracker.get_leaderboard()
        total_users = len(leaderboard)
        total_badges = sum(entry['badge_count'] for entry in leaderboard)
        
        # Load streak data for active users
        try:
            with open('streak_data.json', 'r') as f:
                streak_data = json.load(f)
            active_streaks = sum(1 for data in streak_data.values() if data.get('current', 0) > 0)
        except:
            active_streaks = 0
        
        html += f"""
        <div class="stats-grid">
            <div class="stat-card">
                <span class="stat-number">{total_users}</span>
                <div>Badge Earners</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">{total_badges}</span>
                <div>Total Badges Earned</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">{active_streaks}</span>
                <div>Active Streaks</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">{len(self.tracker.badge_definitions)}</span>
                <div>Badge Types Available</div>
            </div>
        </div>
        
        <div class="leaderboard">
            <h2>🏆 Badge Leaderboard</h2>
"""
        
        if leaderboard:
            for i, entry in enumerate(leaderboard[:10]):  # Top 10
                medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉" if i == 2 else "🏅"
                latest = ", ".join(entry['latest_badges'][-2:]) if entry['latest_badges'] else "None yet"
                
                html += f"""
            <div class="user-row">
                <div>
                    <strong>{medal} {entry['handle']}</strong>
                    <small style="color: #6c757d; margin-left: 10px;">Latest: {latest}</small>
                </div>
                <div style="text-align: right;">
                    <strong>{entry['badge_count']} badges</strong>
                </div>
            </div>
"""
        else:
            html += "<p>No badges earned yet - be the first! 🌟</p>"
        
        html += """
        </div>
        
        <h2>🏅 Available Badges</h2>
        <div class="badge-showcase">
"""
        
        # Show all available badges
        for badge_id, badge_def in self.tracker.badge_definitions.items():
            icon = badge_def['name'].split()[0]  # Extract emoji
            name = badge_def['name']
            desc = badge_def['description']
            threshold = badge_def['threshold']
            criteria = badge_def['criteria']
            
            html += f"""
            <div class="badge">
                <div class="badge-icon">{icon}</div>
                <h4 style="margin: 10px 0 5px 0;">{name}</h4>
                <p style="margin: 0; font-size: 0.9em; color: #6c757d;">{desc}</p>
                <small style="color: #495057;">Requirement: {threshold} {criteria.replace('_', ' ')}</small>
            </div>
"""
        
        html += f"""
        </div>
        
        <div style="margin-top: 40px; text-align: center; color: #6c757d;">
            <p>Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p>Keep showing up, keep earning badges! 🌟</p>
        </div>
    </div>
</body>
</html>
"""
        
        return html
    
    def save_dashboard(self, filename='badge_dashboard.html'):
        """Save dashboard to HTML file"""
        html = self.generate_html_dashboard()
        with open(filename, 'w') as f:
            f.write(html)
        return filename
    
    def get_celebration_candidates(self):
        """Find users who might need celebration messages"""
        try:
            with open('streak_data.json', 'r') as f:
                streak_data = json.load(f)
        except:
            return []
        
        candidates = []
        
        for handle, data in streak_data.items():
            clean_handle = handle.lstrip('@')
            current_streak = data.get('current', 0)
            best_streak = data.get('best', 0)
            
            if current_streak > 0:
                # Check for milestone achievements
                result = self.agent.check_user_for_new_badges(clean_handle, current_streak, best_streak)
                
                if result['celebration_needed']:
                    candidates.append({
                        'handle': clean_handle,
                        'streak': current_streak,
                        'new_badges': result['new_badges'],
                        'dm_message': result['dm_message'],
                        'board_announcement': result['board_announcement']
                    })
        
        return candidates

def main():
    dashboard = AchievementDashboard()
    
    # Generate dashboard
    filename = dashboard.save_dashboard()
    print(f"📊 Dashboard saved to {filename}")
    
    # Check for celebrations needed
    candidates = dashboard.get_celebration_candidates()
    
    if candidates:
        print("\n🎉 USERS NEED CELEBRATION:")
        for candidate in candidates:
            print(f"  {candidate['handle']}: {len(candidate['new_badges'])} new badges")
    else:
        print("\n✅ No pending celebrations")
    
    # Show current stats
    leaderboard = dashboard.tracker.get_leaderboard()
    print(f"\n📈 CURRENT STATS:")
    print(f"  Badge earners: {len(leaderboard)}")
    print(f"  Total badges: {sum(entry['badge_count'] for entry in leaderboard)}")
    
    return filename

if __name__ == "__main__":
    main()