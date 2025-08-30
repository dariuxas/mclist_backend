'use strict'

const UserProfileDTO = require('../dto/UserProfileDTO');

/**
 * User Profile Aggregator
 * Combines data from multiple sources to build complete user profiles
 */
class UserProfileAggregator {
    constructor(userRepository, logger) {
        this.userRepository = userRepository;
        this.logger = logger;
    }

    /**
     * Get complete user profile by ID
     * @param {number} userId - User ID
     * @param {Object} options - Options for data inclusion
     * @returns {Promise<UserProfileDTO>} Complete user profile
     */
    async getUserProfile(userId, options = {}) {
        const {
            includePrivateData = false
        } = options;

        try {
            // Get user
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Convert user to plain object if it's a DTO
            const userData = user.toJSON ? user.toJSON() : user;

            // Return appropriate DTO
            return includePrivateData
                ? UserProfileDTO.forPrivate(userData)
                : UserProfileDTO.forPublic(userData);

        } catch (error) {
            this.logger.error({
                userId,
                error: error.message,
                stack: error.stack
            }, 'Failed to aggregate user profile');
            throw error;
        }
    }


    /**
     * Get multiple user profiles (for lists, leaderboards, etc.)
     * @param {Array<number>} userIds - Array of user IDs
     * @param {Object} options - Options for data inclusion
     * @returns {Promise<Array<UserProfileDTO>>} Array of user profiles
     */
    async getUserProfiles(userIds, options = {}) {
        try {
            const profiles = await Promise.all(
                userIds.map(userId => this.getUserProfile(userId, options))
            );
            return profiles.filter(profile => profile !== null);
        } catch (error) {
            this.logger.error({
                userIds,
                error: error.message
            }, 'Failed to get multiple user profiles');
            throw error;
        }
    }


}

module.exports = UserProfileAggregator;
