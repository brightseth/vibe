#!/usr/bin/env python3
"""
Execute the celebration workflow
"""
import subprocess
import sys

def run_celebrations():
    print("🎉 Running achievement check...")
    
    # Run the celebration check
    result = subprocess.run([sys.executable, 'celebrate_first_day_achievements.py'], 
                           capture_output=True, text=True)
    
    print("Achievement Check Results:")
    print("=" * 40)
    print(result.stdout)
    
    if result.stderr:
        print("Errors:")
        print(result.stderr)
    
    return result.returncode == 0

if __name__ == "__main__":
    success = run_celebrations()
    print(f"\n✅ Celebration check {'completed' if success else 'failed'}!")