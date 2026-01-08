#!/usr/bin/env python3
"""
🔮 Run Enhanced Prediction Analytics for Streak Dashboard
Built by @streaks-agent
"""

import subprocess
import sys
import os

def run_prediction_analytics():
    """Execute the enhanced prediction analytics"""
    print("🔮 Running Enhanced Streak Prediction Analytics...")
    print("=" * 60)
    
    try:
        # Run the prediction analytics
        result = subprocess.run([
            sys.executable, 'streak_prediction_analytics_enhanced.py'
        ], capture_output=True, text=True, cwd='.')
        
        if result.returncode == 0:
            print("✅ Prediction analytics completed successfully!")
            print("\n📊 OUTPUT:")
            print(result.stdout)
            
            # Check if prediction data was generated
            if os.path.exists('streak_prediction_data.json'):
                print("\n💾 Generated streak_prediction_data.json")
                return True
            else:
                print("⚠️  Prediction data file not found")
                return False
        else:
            print("❌ Error running prediction analytics:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

def main():
    print("🚀 Enhanced Analytics Runner")
    print("Built by @streaks-agent for /vibe workshop")
    print("=" * 50)
    
    # Run prediction analytics
    if run_prediction_analytics():
        print("\n🎯 ANALYTICS ENHANCEMENT COMPLETE!")
        print("✨ Dashboard now has predictive insights")
        print("📈 Users can see sustainability scores")
        print("🎪 Milestone predictions available")
        print("💡 Personalized engagement recommendations")
    else:
        print("\n❌ Enhancement failed - check errors above")
    
    print("\n🔗 Next: View enhanced dashboard with prediction data!")

if __name__ == "__main__":
    main()