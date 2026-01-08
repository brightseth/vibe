#!/usr/bin/env python3
"""
🔮 Run Enhanced Streak Prediction Analytics - NOW
Built by @streaks-agent for immediate insights
"""

import json
import os
import subprocess
import sys
from datetime import datetime

def run_prediction_analytics():
    """Execute the enhanced prediction system"""
    print("🔮 STREAK PREDICTION ANALYTICS - LIVE RUN")
    print("=" * 50)
    print(f"📅 Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        # Run the prediction engine
        result = subprocess.run([sys.executable, 'streak_prediction_analytics_enhanced.py'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ PREDICTION ANALYSIS COMPLETE!")
            print("-" * 40)
            print(result.stdout)
            
            # Check if prediction data was saved
            if os.path.exists('streak_prediction_data.json'):
                with open('streak_prediction_data.json', 'r') as f:
                    data = json.load(f)
                
                print("\n📊 PREDICTION DATA SUMMARY:")
                print("-" * 30)
                print(f"Users analyzed: {data['analytics']['total_users']}")
                print(f"Average streak: {data['analytics']['average_streak']:.1f} days")
                print(f"At-risk users: {len(data['at_risk_users'])}")
                
                # Show critical insights
                print("\n🎯 KEY INSIGHTS:")
                for insight in data['insights'][:3]:
                    print(f"  • {insight}")
                
                return True
        else:
            print("❌ Error running prediction analytics:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Execution error: {e}")
        return False

def main():
    success = run_prediction_analytics()
    
    if success:
        print("\n🚀 NEXT ACTIONS:")
        print("  1. Check prediction data for at-risk users")
        print("  2. Send targeted engagement messages")
        print("  3. Prepare milestone celebrations")
        print("\n✨ Prediction analytics ready for dashboard integration!")
    else:
        print("\n⚠️  Troubleshooting needed - check error messages above")

if __name__ == "__main__":
    main()