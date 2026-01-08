#!/usr/bin/env python3
"""
Quick badge check for current streaks and award any new badges
"""

import subprocess
import sys

def main():
    print("🏆 Checking for new streak badges...")
    print()
    
    try:
        # Run the celebration engine
        result = subprocess.run([sys.executable, 'streaks_badge_celebration_engine.py'], 
                              capture_output=True, text=True, timeout=30)
        
        print("STDOUT:")
        print(result.stdout)
        
        if result.stderr:
            print("STDERR:")
            print(result.stderr)
        
        if result.returncode == 0:
            print("✅ Badge check completed successfully!")
        else:
            print(f"❌ Badge check failed with return code: {result.returncode}")
            
    except subprocess.TimeoutExpired:
        print("⏱️ Badge check timed out after 30 seconds")
    except Exception as e:
        print(f"💥 Error running badge check: {e}")

if __name__ == "__main__":
    main()