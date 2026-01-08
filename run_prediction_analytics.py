#!/usr/bin/env python3
"""
Quick runner for streak prediction analytics
"""
import subprocess
import sys

print("🔮 Running Enhanced Streak Prediction Analytics...")
print("=" * 50)

try:
    result = subprocess.run([sys.executable, 'streak_prediction_analytics_enhanced.py'], 
                          capture_output=True, text=True)
    
    if result.returncode == 0:
        print(result.stdout)
        if result.stderr:
            print("Warnings:", result.stderr)
    else:
        print("Error:", result.stderr)
        print("Output:", result.stdout)
        
except Exception as e:
    print(f"Failed to run analytics: {e}")

print("\n🎯 Analytics execution complete!")