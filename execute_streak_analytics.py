#!/usr/bin/env python3

import subprocess
import sys

def run_analytics():
    try:
        result = subprocess.run([sys.executable, "run_streak_analytics_enhanced.py"], 
                              capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print("Errors:", result.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"Error running analytics: {e}")
        return False

if __name__ == "__main__":
    success = run_analytics()
    if success:
        print("✅ Analytics generation completed successfully!")
    else:
        print("❌ Analytics generation failed")