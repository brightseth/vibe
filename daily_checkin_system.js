#!/usr/bin/env node
/**
 * 📅 Daily Check-in System
 * Built by @streaks-agent for /vibe workshop
 * 
 * Simple, habit-forming daily check-in that drives streak engagement
 * Provides clear activity signals and builds consistency loops
 */

const fs = require('fs');
const path = require('path');

class DailyCheckinSystem {
    constructor() {
        this.dataFile = 'checkin_data.json';
        this.streakFile = 'streak_data.json';
        this.loadData();
    }

    loadData() {
        // Load existing checkin data
        try {
            const data = fs.readFileSync(this.dataFile, 'utf8');
            this.checkins = JSON.parse(data);
        } catch (error) {
            this.checkins = {
                users: {},
                daily_stats: {},
                milestones: [],
                system_started: new Date().toISOString()
            };
        }

        // Load streak data for integration
        try {
            const streakData = fs.readFileSync(this.streakFile, 'utf8');
            this.streaks = JSON.parse(streakData);
        } catch (error) {
            this.streaks = { streaks: {} };
        }
    }

    saveData() {
        fs.writeFileSync(this.dataFile, JSON.stringify(this.checkins, null, 2));
    }

    getCurrentDateKey() {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    }

    recordCheckin(user, mood = null, note = null) {
        const today = this.getCurrentDateKey();
        
        // Initialize user data if needed
        if (!this.checkins.users[user]) {
            this.checkins.users[user] = {
                total_checkins: 0,
                streak_checkins: 0,
                first_checkin: today,
                last_checkin: null,
                checkin_history: [],
                achievements: [],
                mood_patterns: {},
                notes: []
            };
        }

        const userData = this.checkins.users[user];
        
        // Check if already checked in today
        if (userData.checkin_history.some(checkin => checkin.date === today)) {
            return {
                success: false,
                message: "Already checked in today! 💫",
                current_streak: userData.streak_checkins
            };
        }

        // Record the checkin
        const checkinRecord = {
            date: today,
            timestamp: new Date().toISOString(),
            mood: mood,
            note: note,
            streak_day: userData.total_checkins + 1
        };

        userData.checkin_history.push(checkinRecord);
        userData.total_checkins += 1;
        userData.last_checkin = today;

        // Update mood tracking
        if (mood) {
            userData.mood_patterns[mood] = (userData.mood_patterns[mood] || 0) + 1;
        }

        // Add note if provided
        if (note) {
            userData.notes.push({
                date: today,
                note: note,
                day: userData.total_checkins
            });
        }

        // Calculate checkin streak
        this.updateCheckinStreak(user);

        // Update daily stats
        this.updateDailyStats(today);

        // Check for achievements
        const newAchievements = this.checkCheckinAchievements(user);

        // Sync with streak system
        this.syncWithStreaks(user);

        this.saveData();

        return {
            success: true,
            message: this.getCheckinMessage(userData),
            current_streak: userData.streak_checkins,
            total_checkins: userData.total_checkins,
            new_achievements: newAchievements,
            mood_recorded: mood,
            streak_sync: true
        };
    }

    updateCheckinStreak(user) {
        const userData = this.checkins.users[user];
        const history = userData.checkin_history.sort((a, b) => a.date.localeCompare(b.date));
        
        let currentStreak = 0;
        const today = new Date();
        
        // Work backwards from today to count consecutive days
        for (let i = 0; i <= 30; i++) { // Check last 30 days
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateKey = checkDate.toISOString().split('T')[0];
            
            if (history.some(checkin => checkin.date === dateKey)) {
                currentStreak++;
            } else if (i === 0) {
                // No checkin today yet, that's okay
                continue;
            } else {
                // Gap found, streak ends
                break;
            }
        }

        userData.streak_checkins = currentStreak;
    }

    updateDailyStats(date) {
        if (!this.checkins.daily_stats[date]) {
            this.checkins.daily_stats[date] = {
                total_checkins: 0,
                unique_users: [],
                moods_logged: {},
                notes_shared: 0
            };
        }

        const dayStats = this.checkins.daily_stats[date];
        dayStats.total_checkins += 1;

        // Count unique users (would need user info passed in for real implementation)
        // dayStats.unique_users.push(user) if not already present
    }

    checkCheckinAchievements(user) {
        const userData = this.checkins.users[user];
        const existingAchievements = userData.achievements.map(a => a.type);
        const newAchievements = [];

        const achievements = [
            { type: 'first_checkin', threshold: 1, message: '🎉 First Check-in!', description: 'Welcome to the daily rhythm!' },
            { type: 'three_day_habit', threshold: 3, message: '🌱 Habit Forming!', description: 'Three days of checking in - you\'re building consistency!' },
            { type: 'week_warrior', threshold: 7, message: '💪 Week Warrior!', description: 'Seven days of daily check-ins - you\'re committed!' },
            { type: 'two_week_legend', threshold: 14, message: '🔥 Two Week Legend!', description: 'Fourteen consecutive check-ins - incredible dedication!' },
            { type: 'monthly_master', threshold: 30, message: '🏆 Monthly Master!', description: 'Thirty days! You\'ve mastered the daily habit!' },
            { type: 'mood_tracker', threshold: null, message: '😊 Mood Tracker!', description: 'Shared your mood 5 times - emotional awareness!' },
            { type: 'note_taker', threshold: null, message: '📝 Note Taker!', description: 'Added 3 personal notes - reflective practice!' }
        ];

        // Check streak-based achievements
        for (const achievement of achievements) {
            if (achievement.threshold && 
                userData.streak_checkins >= achievement.threshold && 
                !existingAchievements.includes(achievement.type)) {
                
                userData.achievements.push({
                    type: achievement.type,
                    earned_date: new Date().toISOString(),
                    streak_at_earning: userData.streak_checkins
                });
                newAchievements.push(achievement);
            }
        }

        // Check special achievements
        const moodCount = Object.values(userData.mood_patterns).reduce((a, b) => a + b, 0);
        if (moodCount >= 5 && !existingAchievements.includes('mood_tracker')) {
            const achievement = achievements.find(a => a.type === 'mood_tracker');
            userData.achievements.push({
                type: achievement.type,
                earned_date: new Date().toISOString(),
                mood_count: moodCount
            });
            newAchievements.push(achievement);
        }

        const noteCount = userData.notes.length;
        if (noteCount >= 3 && !existingAchievements.includes('note_taker')) {
            const achievement = achievements.find(a => a.type === 'note_taker');
            userData.achievements.push({
                type: achievement.type,
                earned_date: new Date().toISOString(),
                note_count: noteCount
            });
            newAchievements.push(achievement);
        }

        return newAchievements;
    }

    syncWithStreaks(user) {
        // Update the streak system with checkin activity
        if (this.streaks.streaks[user]) {
            // Checkin counts as activity for streak system
            // This would trigger streak updates in the main system
            this.streaks.last_updated = new Date().toISOString();
        }
    }

    getCheckinMessage(userData) {
        const messages = [
            `🌟 Day ${userData.total_checkins} complete! Keep the momentum going!`,
            `✨ Checked in! You're building something special.`,
            `🎯 Another day, another step forward! Day ${userData.total_checkins}`,
            `🚀 Consistency is key - Day ${userData.total_checkins} in the books!`,
            `💪 You showed up today! That's what matters most.`,
            `🌱 Growing day by day - this is Day ${userData.total_checkins}!`
        ];

        // Special messages for milestones
        if (userData.total_checkins === 1) {
            return "🎉 Welcome to daily check-ins! Day 1 complete - you've started something great!";
        } else if (userData.total_checkins === 3) {
            return "🌱 Day 3! The habit is forming - you're doing amazing!";
        } else if (userData.total_checkins === 7) {
            return "💪 One week of daily check-ins! You're building real consistency!";
        } else if (userData.total_checkins % 10 === 0) {
            return `🏆 Day ${userData.total_checkins}! Double digits - you're on fire! 🔥`;
        }

        return messages[userData.total_checkins % messages.length];
    }

    getUserCheckinStatus(user) {
        if (!this.checkins.users[user]) {
            return {
                checked_in_today: false,
                total_checkins: 0,
                current_streak: 0,
                message: "Ready for your first check-in! 🚀"
            };
        }

        const userData = this.checkins.users[user];
        const today = this.getCurrentDateKey();
        const checkedInToday = userData.checkin_history.some(checkin => checkin.date === today);

        return {
            checked_in_today: checkedInToday,
            total_checkins: userData.total_checkins,
            current_streak: userData.streak_checkins,
            achievements: userData.achievements,
            mood_pattern: userData.mood_patterns,
            recent_notes: userData.notes.slice(-3),
            message: checkedInToday ? 
                "✅ Already checked in today! Great consistency!" :
                `🌟 Ready for day ${userData.total_checkins + 1}? Check in now!`
        };
    }

    generateCheckinReport() {
        const today = this.getCurrentDateKey();
        const users = Object.keys(this.checkins.users);
        
        const report = {
            date: today,
            total_users: users.length,
            checked_in_today: 0,
            total_checkins_ever: 0,
            average_streak: 0,
            achievements_earned: 0,
            mood_summary: {},
            recent_notes: [],
            generated_at: new Date().toISOString()
        };

        let totalStreak = 0;
        users.forEach(user => {
            const userData = this.checkins.users[user];
            const checkedInToday = userData.checkin_history.some(checkin => checkin.date === today);
            
            if (checkedInToday) report.checked_in_today++;
            report.total_checkins_ever += userData.total_checkins;
            totalStreak += userData.streak_checkins;
            report.achievements_earned += userData.achievements.length;

            // Aggregate mood data
            Object.entries(userData.mood_patterns).forEach(([mood, count]) => {
                report.mood_summary[mood] = (report.mood_summary[mood] || 0) + count;
            });

            // Collect recent notes
            report.recent_notes.push(...userData.notes.slice(-2).map(note => ({
                user: user,
                note: note.note,
                date: note.date
            })));
        });

        if (users.length > 0) {
            report.average_streak = (totalStreak / users.length).toFixed(1);
        }

        return report;
    }
}

// Demo/CLI interface
if (require.main === module) {
    const checkinSystem = new DailyCheckinSystem();
    
    console.log("📅 Daily Check-in System Demo");
    console.log("=" * 40);
    
    // Simulate some checkins
    console.log("\\n🎯 Demo Checkins:");
    
    let result1 = checkinSystem.recordCheckin("@demo_user", "energetic", "Excited to start the day!");
    console.log(`@demo_user: ${result1.message}`);
    
    let result2 = checkinSystem.recordCheckin("@vibe_champion", "focused", "Ready to build consistency!");
    console.log(`@vibe_champion: ${result2.message}`);
    
    // Show status
    console.log("\\n📊 Current Status:");
    const report = checkinSystem.generateCheckinReport();
    console.log(`Daily Check-ins: ${report.checked_in_today}/${report.total_users}`);
    console.log(`Total Check-ins: ${report.total_checkins_ever}`);
    console.log(`Average Streak: ${report.average_streak} days`);
    
    console.log("\\n✨ Daily Check-in System ready!");
    console.log("Encourage users to check in daily to build habits and track mood/progress!");
}

module.exports = DailyCheckinSystem;