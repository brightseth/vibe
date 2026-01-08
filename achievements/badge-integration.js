// Badge System Integration for @streaks-agent
// Connects badges to streak tracking and workshop activities

const { BadgeSystem } = require('./badges.js');

class BadgeIntegration {
    constructor() {
        this.badgeSystem = new BadgeSystem();
        this.lastChecked = new Map(); // handle -> timestamp
    }
    
    // Check and award badges for a user based on current data
    async checkAndAwardBadges(handle, streakData, activityData = {}) {
        const stats = {
            currentStreak: streakData.current || 0,
            bestStreak: streakData.best || 0,
            shipsCount: activityData.ships || 0,
            gamesCreated: activityData.games || 0,
            celebrations: activityData.celebrations || 0,
            mentorships: activityData.mentorships || 0,
            memberNumber: activityData.memberNumber || 999,
            vibeContributions: activityData.vibeContributions || 'medium'
        };
        
        // Check for new badges
        const newBadges = this.badgeSystem.checkBadgeEligibility(handle, stats);
        
        return {
            newBadges,
            allBadges: this.badgeSystem.getUserBadges(handle),
            badgeDisplay: this.badgeSystem.getBadgeDisplay(handle)
        };
    }
    
    // Get celebration message for a new badge
    getBadgeCelebrationMessage(badge) {
        const messages = {
            'first_day': "🌱 Welcome to your workshop journey! Your first day badge shows you're committed to growth.",
            'week_streak': "💪 One week strong! You're building a habit that will transform your creative practice.",
            'two_week_streak': "🔥 Two weeks of consistency! This is where momentum becomes unstoppable.",
            'month_streak': "🏆 A full month! You've proven your dedication. This is legendary status!",
            'century_club': "👑 100 DAYS! You are workshop royalty! Your consistency is an inspiration to everyone.",
            'first_ship': "🚢 Your first ship has sailed! Every creator starts with that brave first share.",
            'prolific_shipper': "⚡ 10 ships! You're becoming a creation machine. Your output is incredible!",
            'shipping_legend': "🚀 50 ships! You're officially a shipping legend. Your creativity knows no bounds!",
            'first_game': "🎮 Game pioneer! You've brought fun and interactivity to our workshop.",
            'game_master': "🎯 Game Master level achieved! You're the workshop entertainment architect.",
            'game_architect': "🏗️ 10 games! You've built an entire arcade of workshop experiences!",
            'encourager': "🎉 Team Encourager! Your celebrations lift everyone up. Thank you for the positive energy!",
            'mentor': "🤝 Workshop Mentor! You're helping others grow. Leadership through service!",
            'early_adopter': "🏃‍♂️ Early Adopter! You were here from the beginning, helping build this community.",
            'vibe_keeper': "✨ Vibe Keeper! Your positive energy makes this workshop a better place for everyone."
        };
        
        return messages[badge.id] || `🎉 Congratulations on earning ${badge.name}! ${badge.description}`;
    }
    
    // Get summary for @streaks-agent to announce
    getBadgeAnnouncement(handle, newBadges) {
        if (newBadges.length === 0) return null;
        
        if (newBadges.length === 1) {
            const badge = newBadges[0];
            return `🎉 ${handle} earned "${badge.name}" ${badge.emoji} - ${badge.description}`;
        } else {
            const badgeList = newBadges.map(b => `${b.emoji} ${b.name}`).join(', ');
            return `🌟 ${handle} is on fire! Earned ${newBadges.length} badges: ${badgeList}`;
        }
    }
    
    // Get leaderboard for periodic sharing
    getLeaderboardSummary(limit = 5) {
        const leaderboard = this.badgeSystem.getBadgeLeaderboard();
        if (leaderboard.length === 0) return "🏆 Badge leaderboard is waiting for its first champions!";
        
        const top = leaderboard.slice(0, limit);
        let summary = "🏆 Badge Leaderboard:\n";
        top.forEach((entry, index) => {
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";
            summary += `${medal} ${entry.handle}: ${entry.badgeCount} badges\n`;
        });
        
        return summary.trim();
    }
    
    // Check if it's time to share leaderboard (weekly)
    shouldShareLeaderboard() {
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday
        const hour = now.getHours();
        
        // Share on Fridays at 5pm (end of week celebration)
        return day === 5 && hour === 17;
    }
    
    // Export user's badge data
    exportUserBadges(handle) {
        return {
            handle,
            badges: this.badgeSystem.getUserBadges(handle),
            badgeCount: this.badgeSystem.userBadges.get(handle)?.size || 0,
            display: this.badgeSystem.getBadgeDisplay(handle)
        };
    }
    
    // Get all badge definitions (for display/documentation)
    getAllBadgeDefinitions() {
        return this.badgeSystem.badges;
    }
}

// Usage example for @streaks-agent:
/*
const integration = new BadgeIntegration();

// When updating streaks:
const result = await integration.checkAndAwardBadges('@demo_user', {
    current: 7,
    best: 10
}, {
    ships: 3,
    games: 1
});

if (result.newBadges.length > 0) {
    // Celebrate each new badge
    for (const badge of result.newBadges) {
        await dm_user('@demo_user', integration.getBadgeCelebrationMessage(badge));
    }
    
    // Announce to board
    const announcement = integration.getBadgeAnnouncement('@demo_user', result.newBadges);
    if (announcement) {
        await announce_ship(announcement);
    }
}

// Weekly leaderboard sharing
if (integration.shouldShareLeaderboard()) {
    await announce_ship(integration.getLeaderboardSummary());
}
*/

module.exports = { BadgeIntegration };