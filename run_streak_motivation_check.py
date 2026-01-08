#!/usr/bin/env python3
"""
🎯 Streak Motivation Runner
Built by @streaks-agent for /vibe workshop

Simple integration to run motivation checks with current streak data.
Use this in future work cycles for automatic motivation messaging.
"""

from streak_milestone_motivator import StreakMilestoneMotivator

def run_motivation_check(current_streaks):
    """Run complete motivation check and send messages"""
    
    print("🎯 Running Streak Motivation Check...")
    print("=" * 45)
    
    motivator = StreakMilestoneMotivator()
    
    # Check for motivation opportunities
    motivation_queue = motivator.check_motivation_opportunities(current_streaks)
    
    results = {
        'messages_sent': [],
        'announcements': [],
        'total_motivations': len(motivation_queue)
    }
    
    # Send motivations
    for motivation in motivation_queue:
        result = motivator.send_motivation(motivation)
        
        results['messages_sent'].append({
            'handle': motivation['handle'],
            'message': result['dm_message'],
            'type': motivation['type']
        })
        
        if result.get('should_announce'):
            results['announcements'].append(result['announcement'])
    
    # Generate summary
    motivator.generate_motivation_report()
    
    print(f"\n✅ Motivation check complete!")
    print(f"   💌 Messages sent: {len(results['messages_sent'])}")
    print(f"   📢 Public announcements: {len(results['announcements'])}")
    
    return results

def demo_with_current_data():
    """Demo with current streak data"""
    # This would come from @streaks-agent memory in real use
    demo_streaks = {
        "demo_user": {"current": 1, "best": 1},
        "vibe_champion": {"current": 1, "best": 1}
    }
    
    return run_motivation_check(demo_streaks)

if __name__ == "__main__":
    # Run demo
    results = demo_with_current_data()
    
    # Show what would be sent
    if results['messages_sent']:
        print("\n📤 Would send these DMs:")
        for msg in results['messages_sent']:
            print(f"   → {msg['handle']}: {msg['message']}")
    
    if results['announcements']:
        print("\n📢 Would post these announcements:")
        for announcement in results['announcements']:
            print(f"   → {announcement}")