#!/usr/bin/env python3
import subprocess
import sys

# Run the badge status check
result = subprocess.run([sys.executable, 'current_badge_status_check.py'], 
                       capture_output=True, text=True)

print("STDOUT:")
print(result.stdout)
if result.stderr:
    print("STDERR:")
    print(result.stderr)
print(f"Return code: {result.returncode}")