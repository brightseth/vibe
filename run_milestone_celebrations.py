#!/usr/bin/env python3
"""
Execute milestone celebration checks and send appropriate messages
Integration point for @streaks-agent workflow
"""

import sys
from datetime import datetime
from streak_milestone_celebrations import MilestoneCelebrationEngine

def run_celebration_check():
    """Main execution function for celebration system"""
    print("🎉 Running milestone celebration check...")
    print(f"⏰ Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-" * 50)
    
    engine = MilestoneCelebrationEngine()
    
    # Check for new milestone celebrations
    celebrations = engine.check_all_users_for_celebrations()
    
    results = {
        "celebrations_sent": 0,
        "progress_updates": 0,
        "users_checked": len(engine.current_streaks),
        "messages_generated": []
    }
    
    if celebrations:
        print(f"🎊 Found {len(celebrations)} milestone celebrations!")
        
        for celebration in celebrations:
            print(f"\n🎉 MILESTONE REACHED!")
            print(f"   User: {celebration['user']}")
            print(f"   Achievement: {celebration['title']}")
            print(f"   Message: {celebration['message']}")
            print(f"   Encouragement: {celebration['encouragement']}")
            
            # Format for DM sending
            dm_message = f"""🎉 {celebration['title']}

{celebration['message']}

{celebration['encouragement']}

Keep up the amazing consistency! Every day you show up builds momentum for tomorrow! 🚀"""
            
            results["messages_generated"].append({
                "type": "milestone_celebration",
                "user": celebration['user'],
                "message": dm_message,
                "milestone": celebration['milestone_day']
            })
            
            # Save celebration to history
            engine.save_celebration_history(celebration)
            results["celebrations_sent"] += 1
    
    else:
        print("📅 No new milestones reached today")
    
    # Generate daily progress updates for motivation
    print(f"\n📈 Daily Progress Check")
    print("-" * 25)
    
    progress_updates = engine.generate_daily_progress_updates()
    
    for update in progress_updates:
        print(f"\n👤 {update['user']} - Day {update['current_streak']}")
        
        if "next_milestone" in update:
            print(f"   🎯 Next: {update['next_milestone']}")
            print(f"   📊 Progress: {update['progress_bar']}")
            print(f"   ⏰ ETA: {update['estimated_completion']}")
        
        print(f"   💪 {update['motivation']}")
        
        # Only send progress DMs for specific days (not every day to avoid spam)
        milestone_reminder_days = [2, 4, 6, 9, 13, 20, 27]  # Strategic encouragement days
        
        if update['current_streak'] in milestone_reminder_days:
            progress_dm = f"""📅 Day {update['current_streak']} Update!

{update['motivation']}

{f"🎯 Next milestone: {update.get('next_milestone', 'Keep going!')} in {update.get('days_remaining', '?')} days!" if 'next_milestone' in update else '🏆 You\'re crushing it!'}

{update.get('progress_bar', '█████████░ Almost there!')}

Every day counts! 💪"""
            
            results["messages_generated"].append({
                "type": "progress_update",
                "user": update['user'],
                "message": progress_dm,
                "streak_day": update['current_streak']
            })
            
            results["progress_updates"] += 1
    
    # Summary
    print(f"\n📊 Execution Summary")
    print("-" * 20)
    print(f"👥 Users checked: {results['users_checked']}")
    print(f"🎉 Celebrations: {results['celebrations_sent']}")
    print(f"📈 Progress updates: {results['progress_updates']}")
    print(f"💬 Total messages: {len(results['messages_generated'])}")
    
    return results

def format_for_agent_actions(results):
    """Format results for @streaks-agent to take action"""
    actions = []
    
    for message_data in results["messages_generated"]:
        if message_data["type"] == "milestone_celebration":
            actions.append({
                "action": "celebrate_milestone",
                "handle": message_data["user"],
                "milestone": f"Day {message_data['milestone']}",
                "message": message_data["message"]
            })
        elif message_data["type"] == "progress_update":
            actions.append({
                "action": "dm_user", 
                "to": message_data["user"],
                "message": message_data["message"]
            })
    
    return actions

if __name__ == "__main__":
    # Run the celebration check
    results = run_celebration_check()
    
    # Output actions for agent integration
    actions = format_for_agent_actions(results)
    
    if actions:
        print(f"\n🤖 Agent Actions Recommended:")
        print("-" * 30)
        for i, action in enumerate(actions, 1):
            print(f"{i}. {action['action']} -> {action.get('handle', action.get('to'))}")
    
    print(f"\n✅ Celebration check complete!")