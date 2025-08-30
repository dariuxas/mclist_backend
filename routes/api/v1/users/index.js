'use strict'

const { authenticate } = require('../../../../src/middleware/auth');
const {
    updateUserProfileBody,
    updateUserProfileResponse,
    getUserProfileResponse,
    changePasswordBody,
    changePasswordResponse,
} = require('../../../../src/domains/user/schemas/UserProfileSchemas');
const { errorResponse } = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
    const userProfileController = fastify.getService('userProfileController');

    // Current user profile endpoints
    fastify.get('/me', {
        schema: {
      tags: ['Users'],
            security: [{ bearerAuth: [] }],
            summary: 'Get current user profile',
            description: 'Get authenticated user profile with private information',
            response: {
                200: getUserProfileResponse,
                401: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate],
        handler: userProfileController.getCurrentProfile.bind(userProfileController)
    });

    fastify.put('/me', {
        schema: {
      tags: ['Users'],
            security: [{ bearerAuth: [] }],
            summary: 'Update current user profile',
            description: 'Update authenticated user profile information',
            // Validation handled by service layer
            response: {
                200: updateUserProfileResponse,
                400: errorResponse,
                401: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate],
        handler: userProfileController.updateCurrentProfile.bind(userProfileController)
    });

    fastify.post('/me/change-password', {
        schema: {
      tags: ['Users'],
            security: [{ bearerAuth: [] }],
            summary: 'Change user password',
            description: 'Change authenticated user password by providing current and new password',
            // Validation handled by service layer
            response: {
                200: changePasswordResponse,
                400: errorResponse,
                401: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate],
        handler: userProfileController.changePassword.bind(userProfileController)
    });

    fastify.log.info('👤 User routes registered');
};