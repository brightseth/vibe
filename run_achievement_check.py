#!/usr/bin/env python3
"""
Run achievement check and return actionable results for streaks-agent
"""

from badge_check_now import check_badges_for_current_users

def main():
    results = check_badges_for_current_users()
    
    print("🏆 Achievement Badge Check Results")
    print("=" * 50)
    
    celebrations_to_send = []
    announcements_to_make = []
    
    for result in results:
        if result.get('should_dm', False):
            celebrations_to_send.append(result)
            print(f"🎉 DM to send: {result['handle']} - {result['message']}")
        
        if result.get('should_announce', False):
            announcements_to_make.append(result)
            print(f"📢 Public announcement: {result['message']}")
        
        if result.get('type') == 'progress':
            print(f"📊 Progress update: {result['message']}")
    
    print(f"\nSummary:")
    print(f"  - DMs to send: {len(celebrations_to_send)}")
    print(f"  - Public announcements: {len(announcements_to_make)}")
    
    return {
        'celebrations': celebrations_to_send,
        'announcements': announcements_to_make,
        'all_results': results
    }

if __name__ == "__main__":
    main()