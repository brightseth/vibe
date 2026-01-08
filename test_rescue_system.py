#!/usr/bin/env python3
"""
Test the Streak Rescue System without subprocess
"""

import json
import os
from datetime import datetime

# Import the rescue system directly
from streak_rescue_system import StreakRescueSystem

def test_rescue_system():
    """Test the rescue system with current data"""
    print("🛟 Testing Streak Rescue System...")
    
    # Initialize the system
    rescue_system = StreakRescueSystem()
    
    # Generate the report
    try:
        report = rescue_system.generate_rescue_report()
        
        # Display results
        print(f"\n📊 Rescue Analysis Complete!")
        print(f"👥 Total users analyzed: {report['summary']['total_users']}")
        print(f"⚠️  At-risk users: {report['summary']['at_risk_count']}")
        print(f"🏁 Challenge opportunities: {report['summary']['intervention_opportunities']}")
        
        # Show at-risk users details
        if report['at_risk_users']:
            print(f"\n🚨 At-Risk Users:")
            for user_risk in report['at_risk_users']:
                user_name = user_risk['user']['handle']
                risk_level = user_risk['risk_level']
                risk_score = user_risk['risk_score']
                factors = ', '.join(user_risk['factors'])
                print(f"   {user_name}: {risk_level} risk ({risk_score:.2f}) - {factors}")
                
                for intervention in user_risk['interventions']:
                    print(f"      → {intervention['type']}: {intervention['message']}")
        else:
            print("\n✅ No users currently at risk!")
        
        # Show peer challenges
        if report['peer_challenges']:
            print(f"\n🏁 Peer Challenge Opportunities:")
            for challenge in report['peer_challenges']:
                users = ', '.join(challenge['users'])
                milestone = challenge['next_milestone']
                print(f"   {users} → Race to {milestone}")
        
        # Show recommendations
        print(f"\n💡 Strategic Recommendations:")
        for rec in report['recommendations']:
            print(f"   {rec}")
        
        # Save report
        filename = rescue_system.save_rescue_report(report)
        print(f"\n📁 Detailed report saved: {filename}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error running rescue system: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_rescue_system()
    if success:
        print("\n🎯 Rescue system is working correctly!")
    else:
        print("\n⚠️  Rescue system needs debugging")