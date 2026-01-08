// Achievement Badges System for /vibe Workshop
// Tracks and awards badges for various workshop activities

class BadgeSystem {
    constructor() {
        this.badges = {
            // Streak Badges
            'first_day': {
                name: 'Getting Started',
                description: 'Showed up for your first day! 🌱',
                emoji: '🌱',
                requirement: 'streak_1_day'
            },
            'week_streak': {
                name: 'Week Warrior',
                description: 'One week of consistent showing up! 💪',
                emoji: '💪',
                requirement: 'streak_7_days'
            },
            'two_week_streak': {
                name: 'Commitment Level',
                description: 'Two weeks strong! You\'re committed! 🔥',
                emoji: '🔥',
                requirement: 'streak_14_days'
            },
            'month_streak': {
                name: 'Monthly Legend',
                description: 'A full month of dedication! 🏆',
                emoji: '🏆',
                requirement: 'streak_30_days'
            },
            'century_club': {
                name: 'Century Club',
                description: '100 days! You are workshop royalty! 👑',
                emoji: '👑',
                requirement: 'streak_100_days'
            },
            
            // Activity Badges
            'first_ship': {
                name: 'First Ship',
                description: 'Shipped your first creation to the board! 🚢',
                emoji: '🚢',
                requirement: 'ships_1'
            },
            'prolific_shipper': {
                name: 'Prolific Shipper',
                description: 'Shipped 10 amazing creations! ⚡',
                emoji: '⚡',
                requirement: 'ships_10'
            },
            'shipping_legend': {
                name: 'Shipping Legend',
                description: '50 ships! You\'re a creation machine! 🚀',
                emoji: '🚀',
                requirement: 'ships_50'
            },
            
            // Game Badges
            'first_game': {
                name: 'Game Pioneer',
                description: 'Created your first workshop game! 🎮',
                emoji: '🎮',
                requirement: 'games_created_1'
            },
            'game_master': {
                name: 'Game Master',
                description: 'Created 5 games! You bring the fun! 🎯',
                emoji: '🎯',
                requirement: 'games_created_5'
            },
            'game_architect': {
                name: 'Game Architect',
                description: 'Built 10 games! Workshop entertainment legend! 🏗️',
                emoji: '🏗️',
                requirement: 'games_created_10'
            },
            
            // Social Badges
            'encourager': {
                name: 'Team Encourager',
                description: 'Celebrated 10 other people\'s wins! 🎉',
                emoji: '🎉',
                requirement: 'celebrations_10'
            },
            'mentor': {
                name: 'Workshop Mentor',
                description: 'Helped onboard 3 new people! 🤝',
                emoji: '🤝',
                requirement: 'mentorships_3'
            },
            
            // Special Badges
            'early_adopter': {
                name: 'Early Adopter',
                description: 'One of the first 10 workshop members! 🏃‍♂️',
                emoji: '🏃‍♂️',
                requirement: 'member_number_10'
            },
            'vibe_keeper': {
                name: 'Vibe Keeper',
                description: 'Consistently maintained positive workshop energy! ✨',
                emoji: '✨',
                requirement: 'vibe_contributions_high'
            }
        };
        
        this.userBadges = new Map(); // handle -> Set of badge_ids
        this.userStats = new Map();  // handle -> activity stats
    }
    
    // Award a badge to a user
    awardBadge(handle, badgeId) {
        if (!this.userBadges.has(handle)) {
            this.userBadges.set(handle, new Set());
        }
        
        const userBadges = this.userBadges.get(handle);
        if (!userBadges.has(badgeId)) {
            userBadges.add(badgeId);
            return this.badges[badgeId]; // Return badge info for celebration
        }
        return null; // Already has this badge
    }
    
    // Check if user qualifies for any new badges
    checkBadgeEligibility(handle, stats) {
        const newBadges = [];
        
        // Streak badges
        if (stats.currentStreak >= 1) {
            const badge = this.awardBadge(handle, 'first_day');
            if (badge) newBadges.push({id: 'first_day', ...badge});
        }
        if (stats.currentStreak >= 7) {
            const badge = this.awardBadge(handle, 'week_streak');
            if (badge) newBadges.push({id: 'week_streak', ...badge});
        }
        if (stats.currentStreak >= 14) {
            const badge = this.awardBadge(handle, 'two_week_streak');
            if (badge) newBadges.push({id: 'two_week_streak', ...badge});
        }
        if (stats.currentStreak >= 30) {
            const badge = this.awardBadge(handle, 'month_streak');
            if (badge) newBadges.push({id: 'month_streak', ...badge});
        }
        if (stats.currentStreak >= 100) {
            const badge = this.awardBadge(handle, 'century_club');
            if (badge) newBadges.push({id: 'century_club', ...badge});
        }
        
        // Activity badges
        if (stats.shipsCount >= 1) {
            const badge = this.awardBadge(handle, 'first_ship');
            if (badge) newBadges.push({id: 'first_ship', ...badge});
        }
        if (stats.shipsCount >= 10) {
            const badge = this.awardBadge(handle, 'prolific_shipper');
            if (badge) newBadges.push({id: 'prolific_shipper', ...badge});
        }
        if (stats.shipsCount >= 50) {
            const badge = this.awardBadge(handle, 'shipping_legend');
            if (badge) newBadges.push({id: 'shipping_legend', ...badge});
        }
        
        // Game badges
        if (stats.gamesCreated >= 1) {
            const badge = this.awardBadge(handle, 'first_game');
            if (badge) newBadges.push({id: 'first_game', ...badge});
        }
        if (stats.gamesCreated >= 5) {
            const badge = this.awardBadge(handle, 'game_master');
            if (badge) newBadges.push({id: 'game_master', ...badge});
        }
        if (stats.gamesCreated >= 10) {
            const badge = this.awardBadge(handle, 'game_architect');
            if (badge) newBadges.push({id: 'game_architect', ...badge});
        }
        
        return newBadges;
    }
    
    // Get user's badge collection
    getUserBadges(handle) {
        const badgeIds = this.userBadges.get(handle) || new Set();
        return Array.from(badgeIds).map(id => ({id, ...this.badges[id]}));
    }
    
    // Generate badge display for user
    getBadgeDisplay(handle) {
        const badges = this.getUserBadges(handle);
        if (badges.length === 0) return "No badges yet - keep showing up! 🌟";
        
        return badges.map(badge => `${badge.emoji} ${badge.name}`).join(' ');
    }
    
    // Get leaderboard by badge count
    getBadgeLeaderboard() {
        const leaderboard = [];
        for (const [handle, badgeSet] of this.userBadges.entries()) {
            leaderboard.push({
                handle,
                badgeCount: badgeSet.size,
                badges: Array.from(badgeSet)
            });
        }
        return leaderboard.sort((a, b) => b.badgeCount - a.badgeCount);
    }
}

// Export for use by streaks-agent
module.exports = { BadgeSystem };