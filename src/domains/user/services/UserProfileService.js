'use strict'

const Validator = require('../../../lib/Validator');
const ErrorHandler = require('../../../lib/ErrorHandler');
const bcrypt = require('bcrypt');

/**
 * User Profile Service
 * Handles user profile operations using the aggregator pattern
 */
class UserProfileService {
    constructor(userRepository, userProfileAggregator, logger) {
        this.userRepository = userRepository;
        this.userProfileAggregator = userProfileAggregator;
        this.logger = logger;
    }

    /**
     * Log with context
     */
    log(level, data, message) {
        if (this.logger) {
            this.logger[level](data, message);
        }
    }

    /**
     * Get current user's profile (private data included)
     * @param {number} userId - User ID
     * @returns {Promise<UserProfileDTO>} User profile
     */
    async getCurrentUserProfile(userId) {
        try {
            return await this.userProfileAggregator.getUserProfile(userId, {
                includePrivateData: true
            });
        } catch (error) {
            if (error.message === 'User not found') {
                throw ErrorHandler.notFound('Vartotojas nerastas', 404, 'USER_NOT_FOUND');
            }
            this.log('error', { error: error.message }, 'User error: get current user profile');
            throw ErrorHandler.serverError('Vartotojo klaida');
        }
    }

    /**
     * Get public user profile by ID
     * @param {number} userId - User ID
     * @returns {Promise<UserProfileDTO>} Public user profile
     */
    async getPublicUserProfile(userId) {
        try {
            return await this.userProfileAggregator.getUserProfile(userId, {
                includePrivateData: false
            });
        } catch (error) {
            if (error.message === 'User not found') {
                throw ErrorHandler.notFound('Vartotojas nerastas', 404, 'USER_NOT_FOUND');
            }
            this.log('error', { error: error.message }, 'User error: get public user profile');
            throw ErrorHandler.serverError('Vartotojo klaida');
        }
    }

    /**
     * Update user profile
     * @param {number} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<UserProfileDTO>} Updated user profile
     */
    async updateUserProfile(userId, updateData) {
        try {
            // Check if user exists
            const existingUser = await this.userRepository.findById(userId);
            if (!existingUser) {
                throw ErrorHandler.notFound('Vartotojas nerastas', 404, 'USER_NOT_FOUND');
            }

            // Check for duplicate email if being updated
            if (updateData.email) {
                const emailExists = await this.userRepository.emailExists(updateData.email);
                if (emailExists) {
                    throw ErrorHandler.notFound('Toks el. pašto adresas jau egzistuoja', 409, 'EMAIL_EXISTS');
                }
            }

            // Update user profile
            const updatedUser = await this.userRepository.update(userId, updateData);
            if (!updatedUser) {
                throw ErrorHandler.notFound('Profilio atnaujinimas nepavyko', 500, 'UPDATE_FAILED');
            }

            this.log('info', {
                userId,
                updatedFields: Object.keys(updateData)
            }, 'Vartotojo profilis sėkmingai atnaujintas');

            // Return updated profile with all data
            return await this.getCurrentUserProfile(userId);
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            this.log('error', { error: error.message }, 'User error: update user profile');
            throw ErrorHandler.serverError('Vartotojo klaida');
        }
    }

    /**
     * Change user password
     * @param {number} userId - User ID
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<void>}
     */
    async changeUserPassword(userId, currentPassword, newPassword) {
        try {
            // Validate required fields
            this.validateRequiredFields({ currentPassword, newPassword }, ['currentPassword', 'newPassword']);

            // Get user with password hash
            const user = await this.userRepository.findById(userId);
            if (!user) {
                throw ErrorHandler.notFound('Vartotojas nerastas', 404, 'USER_NOT_FOUND');
            }

            // Verify current password
            const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isValidPassword) {
                throw ErrorHandler.notFound('Dabartinis slaptažodis neteisingas', 401, 'INVALID_CURRENT_PASSWORD');
            }

            // Check if new password is different from current
            const isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
            if (isSamePassword) {
                throw ErrorHandler.notFound('Naujas slaptažodis turi skirtis nuo dabartinio', 400, 'SAME_PASSWORD');
            }

            // Hash new password
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            // Update password in database
            await this.userRepository.update(userId, {
                password_hash: hashedNewPassword
            });

            this.log('info', {
                userId,
                email: user.email
            }, 'Vartotojo slaptažodis sėkmingai pakeistas');

        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            this.log('error', { error: error.message }, 'User error: change user password');
            throw ErrorHandler.serverError('Vartotojo klaida');
        }
    }

    // Removed getOnlineUsers and updateUserActivity since we removed online functionality
}

module.exports = UserProfileService;