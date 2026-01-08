#!/usr/bin/env python3
"""
Quick runner for the Streak Rescue System
"""

import subprocess
import sys

def run_rescue_system():
    """Run the streak rescue system and display results"""
    try:
        result = subprocess.run([sys.executable, 'streak_rescue_system.py'], 
                              capture_output=True, text=True, check=True)
        print("🛟 Streak Rescue System Output:")
        print(result.stdout)
        if result.stderr:
            print("Warnings/Errors:")
            print(result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running rescue system: {e}")
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)
        return False
    except FileNotFoundError:
        print("Error: streak_rescue_system.py not found")
        return False

if __name__ == '__main__':
    success = run_rescue_system()
    if success:
        print("\n✅ Streak Rescue System completed successfully!")
    else:
        print("\n❌ Streak Rescue System encountered errors")