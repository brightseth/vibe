#!/usr/bin/env node
/**
 * 🚀 Daily Check-in System Demo Runner
 * Demonstrates the check-in system with our current users
 */

const DailyCheckinSystem = require('./daily_checkin_system.js');

async function runCheckinDemo() {
    console.log("🎯 Daily Check-in System - Live Demo");
    console.log("=" * 50);
    
    const checkinSystem = new DailyCheckinSystem();
    
    console.log("\\n🌟 Simulating Today's Check-ins...");
    
    // Simulate our current users checking in
    const users = [
        {
            handle: "@demo_user",
            mood: "motivated", 
            note: "Day 2 and feeling great! Building momentum 💪"
        },
        {
            handle: "@vibe_champion",
            mood: "determined",
            note: "Love the consistency system - streaks are motivating! 🔥"
        }
    ];
    
    // Process check-ins
    for (const user of users) {
        console.log(`\\n--- ${user.handle} ---`);
        
        const result = checkinSystem.recordCheckin(user.handle, user.mood, user.note);
        
        if (result.success) {
            console.log(`✅ ${result.message}`);
            console.log(`   Check-in Streak: ${result.current_streak} days`);
            console.log(`   Total Check-ins: ${result.total_checkins}`);
            console.log(`   Mood: ${user.mood} 😊`);
            
            if (result.new_achievements.length > 0) {
                console.log(`   🏆 New Achievement: ${result.new_achievements[0].message}`);
            }
        } else {
            console.log(`ℹ️  ${result.message}`);
        }
    }
    
    // Generate and display report
    console.log("\\n📊 Today's Check-in Report");
    console.log("-" * 30);
    
    const report = checkinSystem.generateCheckinReport();
    console.log(`📅 Date: ${report.date}`);
    console.log(`👥 Users: ${report.total_users} registered`);
    console.log(`✅ Today's Check-ins: ${report.checked_in_today}/${report.total_users} (${(report.checked_in_today/report.total_users*100).toFixed(0)}%)`);
    console.log(`🔥 Average Streak: ${report.average_streak} days`);
    console.log(`🏆 Total Achievements: ${report.achievements_earned}`);
    
    // Show mood patterns
    if (Object.keys(report.mood_summary).length > 0) {
        console.log("\\n😊 Mood Tracking:");
        Object.entries(report.mood_summary).forEach(([mood, count]) => {
            console.log(`   ${mood}: ${count} check-ins`);
        });
    }
    
    // Show recent notes
    if (report.recent_notes.length > 0) {
        console.log("\\n📝 Recent Notes:");
        report.recent_notes.slice(0, 2).forEach(note => {
            console.log(`   ${note.user}: "${note.note}"`);
        });
    }
    
    console.log("\\n🎉 Check-in System Features:");
    console.log("   ✨ Simple daily habit building");
    console.log("   🎯 Streak tracking integration");  
    console.log("   😊 Mood pattern awareness");
    console.log("   📝 Personal reflection notes");
    console.log("   🏆 Achievement unlocking");
    console.log("   📊 Community progress visibility");
    
    console.log("\\n🚀 Ready to enhance daily engagement!");
    console.log("Next: Integrate with /vibe interface for seamless user experience");
}

// Run the demo
if (require.main === module) {
    runCheckinDemo().catch(console.error);
}

module.exports = runCheckinDemo;