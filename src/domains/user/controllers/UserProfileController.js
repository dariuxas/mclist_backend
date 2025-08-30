'use strict'

const BaseController = require('../../../controllers/BaseController');

/**
 * User Profile Controller
 * Handles HTTP requests for user profile operations
 */
class UserProfileController extends BaseController {
    constructor(userProfileService, logger) {
        super(userProfileService, logger);
        this.userProfileService = userProfileService;
        this.bindMethods();
    }

    /**
     * Get current user profile
     */
    async getCurrentProfile(request, reply) {
        try {
            const userProfile = await this.userProfileService.getCurrentUserProfile(request.user.id);
            
            return this.sendSuccess(
                reply,
                { user: userProfile.toJSON() },
                'Profilis sėkmingai gautas',
                {},
                request,
                'get current user profile'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get current user profile');
        }
    }

    /**
     * Update current user profile
     */
    async updateCurrentProfile(request, reply) {
        try {
            const updatedProfile = await this.userProfileService.updateUserProfile(
                request.user.id, 
                request.body
            );
            
            return this.sendSuccess(
                reply,
                { user: updatedProfile.toJSON() },
                'Profilis sėkmingai atnaujintas',
                {},
                request,
                'update current user profile'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'update current user profile');
        }
    }

    /**
     * Get public user profile by ID
     */
    async getPublicProfile(request, reply) {
        try {
            const userId = parseInt(request.params.id);
            if (isNaN(userId)) {
                return reply.apiError('Neteisingas vartotojo ID', [], 400, 'INVALID_USER_ID');
            }

            const userProfile = await this.userProfileService.getPublicUserProfile(userId);
            
            return this.sendSuccess(
                reply,
                { user: userProfile.toJSON() },
                'Profilis sėkmingai gautas',
                {},
                request,
                'get public user profile'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get public user profile');
        }
    }

    /**
     * Change user password
     */
    async changePassword(request, reply) {
        try {
            const { currentPassword, newPassword } = request.body;
            
            await this.userProfileService.changeUserPassword(
                request.user.id, 
                currentPassword, 
                newPassword
            );
            
            return this.sendSuccess(
                reply,
                { message: 'Slaptažodis sėkmingai pakeistas' },
                'Slaptažodis sėkmingai pakeistas',
                {},
                request,
                'change user password'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'change user password');
        }
    }

}

module.exports = UserProfileController;