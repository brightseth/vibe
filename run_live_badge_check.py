#!/usr/bin/env python3

import subprocess
import sys

# Run the live badge check
result = subprocess.run([sys.executable, "live_badge_check_jan8_evening.py"], 
                       capture_output=True, text=True)

print(result.stdout)
if result.stderr:
    print("ERRORS:", result.stderr)

print("Exit code:", result.returncode)