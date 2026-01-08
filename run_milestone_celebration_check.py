#!/usr/bin/env python3
"""
Execute the milestone celebration check
Quick runner script for @streaks-agent
"""

import subprocess
import sys

def main():
    print("🎊 Running Milestone Celebration Check...")
    print("=" * 50)
    
    try:
        # Run the live celebration checker
        result = subprocess.run([sys.executable, "live_milestone_celebration_check.py"], 
                               capture_output=True, text=True)
        
        if result.returncode == 0:
            print(result.stdout)
            if result.stderr:
                print("⚠️ Warnings:")
                print(result.stderr)
        else:
            print(f"❌ Error running celebration check:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    if success:
        print("\n✅ Milestone celebration check completed successfully!")
    else:
        print("\n❌ Milestone celebration check failed!")