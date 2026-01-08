#!/usr/bin/env python3
"""
Streak Risk Monitoring System
Built by @streaks-agent - Jan 8, 2026 Evening

Proactively monitors users for streak break risk and generates engagement interventions.
Combines prediction analytics with actionable engagement recommendations.
"""

import json
from datetime import datetime, timedelta
import math

class StreakRiskMonitor:
    def __init__(self):
        self.current_streaks = {
            "demo_user": {"current": 1, "best": 1, "joined": "2026-01-07", "last_active": "2026-01-08"},
            "vibe_champion": {"current": 1, "best": 1, "joined": "2026-01-07", "last_active": "2026-01-08"}
        }
        self.load_achievements()
        self.risk_thresholds = {
            "CRITICAL": 70,  # Immediate intervention needed
            "HIGH": 50,      # Active monitoring required
            "MEDIUM": 30,    # Watch closely
            "LOW": 0         # Healthy engagement
        }
    
    def load_achievements(self):
        """Load achievement data for engagement context"""
        try:
            with open('achievements.json', 'r') as f:
                self.achievements = json.load(f)
        except FileNotFoundError:
            self.achievements = {"user_achievements": {}, "achievement_history": []}
    
    def calculate_risk_score(self, handle, streak_data):
        """Calculate comprehensive risk score (0-100, higher = more risk)"""
        current = streak_data['current']
        best = streak_data['best']
        risk_score = 0
        risk_factors = []
        
        # 🚨 CRITICAL RISK FACTORS
        
        # New user in danger zone (Days 1-3 are highest dropout)
        if current <= 3:
            risk_score += 35
            risk_factors.append({
                "factor": "Critical period - first 3 days",
                "impact": "HIGH",
                "score": 35,
                "intervention": "Send encouraging message highlighting progress"
            })
        
        # No achievements yet (lack of milestone celebration)
        user_badges = self.achievements.get('user_achievements', {}).get(handle.replace('@', ''), [])
        if len(user_badges) == 0:
            risk_score += 25
            risk_factors.append({
                "factor": "No achievements earned yet",
                "impact": "HIGH", 
                "score": 25,
                "intervention": "Celebrate any progress, highlight upcoming milestones"
            })
        
        # ⚠️ MODERATE RISK FACTORS
        
        # Significant decline from personal best
        if best > current and (best - current) >= 5:
            risk_score += 20
            risk_factors.append({
                "factor": f"Below personal best by {best - current} days",
                "impact": "MEDIUM",
                "score": 20,
                "intervention": "Acknowledge past success, encourage comeback"
            })
        
        # Streak plateau (stuck at same level)
        if current == best and current >= 7 and current <= 14:
            risk_score += 15
            risk_factors.append({
                "factor": "Potential plateau period",
                "impact": "MEDIUM",
                "score": 15,
                "intervention": "Introduce new challenges or goals"
            })
        
        # 📊 ENGAGEMENT RISK FACTORS
        
        # Weekend vulnerability (if today is Friday)
        today = datetime.now().weekday()  # 0=Monday, 6=Sunday
        if today == 4:  # Friday
            risk_score += 10
            risk_factors.append({
                "factor": "Weekend coming - vulnerability period",
                "impact": "LOW",
                "score": 10,
                "intervention": "Send weekend maintenance reminder"
            })
        
        # Long-term risk (approaching milestone but not there yet)
        days_to_next_milestone = self.days_to_next_milestone(current)
        if days_to_next_milestone and days_to_next_milestone >= 3:
            risk_score += 8
            risk_factors.append({
                "factor": f"{days_to_next_milestone} days to next milestone",
                "impact": "LOW",
                "score": 8,
                "intervention": "Highlight progress toward milestone"
            })
        
        return {
            "total_score": min(100, risk_score),
            "level": self.get_risk_level(risk_score),
            "factors": risk_factors
        }
    
    def days_to_next_milestone(self, current_streak):
        """Calculate days to next milestone"""
        milestones = [3, 7, 14, 30, 100]
        for milestone in milestones:
            if current_streak < milestone:
                return milestone - current_streak
        return None
    
    def get_risk_level(self, risk_score):
        """Convert risk score to level"""
        if risk_score >= self.risk_thresholds["CRITICAL"]:
            return "CRITICAL"
        elif risk_score >= self.risk_thresholds["HIGH"]:
            return "HIGH"
        elif risk_score >= self.risk_thresholds["MEDIUM"]:
            return "MEDIUM"
        else:
            return "LOW"
    
    def generate_intervention_plan(self, handle, risk_data):
        """Generate specific intervention recommendations"""
        risk_level = risk_data['level']
        risk_factors = risk_data['factors']
        
        # Base intervention strategy by risk level
        base_strategies = {
            "CRITICAL": {
                "urgency": "Immediate",
                "channel": "Personal DM",
                "tone": "Supportive and encouraging",
                "timing": "Within 2 hours"
            },
            "HIGH": {
                "urgency": "Today",
                "channel": "Personal DM or mention",
                "tone": "Motivational",
                "timing": "Within 6 hours"
            },
            "MEDIUM": {
                "urgency": "This week",
                "channel": "Casual mention or dashboard highlight",
                "tone": "Positive reinforcement",
                "timing": "Within 24 hours"
            },
            "LOW": {
                "urgency": "Routine",
                "channel": "Dashboard update or weekly summary",
                "tone": "Celebratory",
                "timing": "Next regular check-in"
            }
        }
        
        strategy = base_strategies[risk_level]
        
        # Generate specific interventions from risk factors
        interventions = []
        for factor in risk_factors:
            interventions.append(factor['intervention'])
        
        # Create personalized message template
        if risk_level == "CRITICAL":
            message_template = f"Hey {handle}! 🌟 Saw you're building momentum - that's awesome! {interventions[0] if interventions else 'Keep up the great work!'}"
        elif risk_level == "HIGH":
            message_template = f"{handle} 💪 You're doing great! {interventions[0] if interventions else 'Stay consistent!'}"
        else:
            message_template = f"Nice progress {handle}! 🎯 {interventions[0] if interventions else 'Keep it up!'}"
        
        return {
            "strategy": strategy,
            "interventions": interventions,
            "message_template": message_template,
            "priority_score": risk_data['total_score']
        }
    
    def monitor_all_users(self):
        """Monitor all users and generate risk assessment"""
        risk_reports = []
        
        for handle, data in self.current_streaks.items():
            full_handle = f"@{handle}"
            
            # Calculate risk
            risk_data = self.calculate_risk_score(handle, data)
            
            # Generate intervention plan
            intervention_plan = self.generate_intervention_plan(full_handle, risk_data)
            
            risk_reports.append({
                "handle": full_handle,
                "current_streak": data['current'],
                "best_streak": data['best'],
                "risk": risk_data,
                "intervention": intervention_plan
            })
        
        # Sort by priority (highest risk first)
        risk_reports.sort(key=lambda x: x['risk']['total_score'], reverse=True)
        
        return risk_reports
    
    def get_immediate_actions(self, risk_reports):
        """Get immediate actions needed"""
        immediate_actions = []
        
        for report in risk_reports:
            if report['risk']['level'] in ['CRITICAL', 'HIGH']:
                immediate_actions.append({
                    "handle": report['handle'],
                    "urgency": report['intervention']['strategy']['urgency'],
                    "action": report['intervention']['message_template'],
                    "risk_level": report['risk']['level'],
                    "priority": report['risk']['total_score']
                })
        
        return immediate_actions
    
    def generate_summary_dashboard(self):
        """Generate summary for dashboard display"""
        risk_reports = self.monitor_all_users()
        
        # Risk level distribution
        risk_distribution = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for report in risk_reports:
            risk_distribution[report['risk']['level']] += 1
        
        # Immediate actions needed
        immediate_actions = self.get_immediate_actions(risk_reports)
        
        # Overall health score (inverse of average risk)
        avg_risk = sum([r['risk']['total_score'] for r in risk_reports]) / len(risk_reports)
        health_score = max(0, 100 - avg_risk)
        
        return {
            "generated_at": datetime.now().isoformat(),
            "total_users": len(risk_reports),
            "risk_distribution": risk_distribution,
            "health_score": round(health_score),
            "immediate_actions_needed": len(immediate_actions),
            "immediate_actions": immediate_actions,
            "detailed_reports": risk_reports
        }
    
    def run_monitoring_cycle(self):
        """Run complete monitoring cycle"""
        print("🚨 STREAK RISK MONITORING SYSTEM")
        print("=" * 50)
        print(f"Scan Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # Generate reports
        dashboard = self.generate_summary_dashboard()
        
        # Display summary
        print("📊 RISK OVERVIEW:")
        print(f"  Total Users: {dashboard['total_users']}")
        print(f"  Health Score: {dashboard['health_score']}/100")
        print()
        
        print("⚠️  RISK DISTRIBUTION:")
        for level, count in dashboard['risk_distribution'].items():
            emoji = {"CRITICAL": "🚨", "HIGH": "⚠️", "MEDIUM": "⚡", "LOW": "✅"}[level]
            print(f"  {emoji} {level}: {count} users")
        print()
        
        # Immediate actions
        if dashboard['immediate_actions']:
            print("🎯 IMMEDIATE ACTIONS NEEDED:")
            for action in dashboard['immediate_actions']:
                print(f"  {action['risk_level']} | {action['handle']}")
                print(f"    Action: {action['action']}")
                print(f"    Urgency: {action['urgency']}")
                print()
        else:
            print("✅ No immediate actions needed - all users stable!")
            print()
        
        # Detailed risk reports
        print("📋 DETAILED RISK ANALYSIS:")
        for report in dashboard['detailed_reports']:
            print(f"  {report['handle']} (Streak: {report['current_streak']} days)")
            print(f"    Risk Level: {report['risk']['level']} ({report['risk']['total_score']}/100)")
            
            if report['risk']['factors']:
                print("    Risk Factors:")
                for factor in report['risk']['factors']:
                    print(f"      • {factor['factor']} (+{factor['score']} risk)")
            
            print(f"    Intervention: {report['intervention']['strategy']['urgency']}")
            print(f"    Message: {report['intervention']['message_template']}")
            print()
        
        # Save monitoring data
        with open('streak_risk_monitoring_data.json', 'w') as f:
            json.dump(dashboard, f, indent=2)
        
        print("💾 Risk monitoring data saved to: streak_risk_monitoring_data.json")
        print("✅ Monitoring cycle complete!")
        
        return dashboard

if __name__ == '__main__':
    monitor = StreakRiskMonitor()
    monitor.run_monitoring_cycle()