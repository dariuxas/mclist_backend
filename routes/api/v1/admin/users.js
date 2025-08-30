'use strict'

const { authenticate, requireRole } = require('../../../../src/middleware/auth');
const { 
    createApiResponse, 
    createPaginatedResponse, 
    combineQueries, 
    paginationQuery, 
    searchQuery,
    idParam,
    errorResponse 
} = require('../../../../src/shared/schemas/components/BaseSchemaComponents');
const { adminUserObject } = require('../../../../src/domains/admin/schemas/AdminSchemas');

module.exports = async function (fastify) {
    const userProfileController = fastify.getService('userProfileController');

    // Get all users (admin view)
    fastify.get('/', {
        schema: {
      tags: ['Admin - Users'],
            security: [{ bearerAuth: [] }],
            summary: 'Get all users (admin)',
            description: 'Get paginated list of users with admin data',
            querystring: {
                type: 'object',
                properties: {
                    role: { type: 'string', enum: ['user', 'admin'] }
                }
            },
            response: {
                200: createPaginatedResponse(adminUserObject, 'users'),
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const userService = fastify.getService('userProfileService');
            const {
                page = 1,
                limit = 20,
                search,
                role
            } = request.query;

            const options = {
                limit: Math.min(parseInt(limit), 100),
                offset: (parseInt(page) - 1) * Math.min(parseInt(limit), 100),
                search: search || null,
                role: role || null
            };

            const users = await userService.userRepository.getUsersAdmin(options);
            const total = await userService.userRepository.countUsersAdmin(options);

            return reply.apiSuccess({
                users: users.map(user => ({
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                    last_login: user.last_login,
                    last_activity: user.last_activity,
                    server_count: user.server_count || 0,
                    vote_count: user.vote_count || 0
                })),
                pagination: {
                    page: parseInt(page),
                    limit: Math.min(parseInt(limit), 100),
                    total,
                    totalPages: Math.ceil(total / Math.min(parseInt(limit), 100)),
                    hasNext: parseInt(page) * Math.min(parseInt(limit), 100) < total,
                    hasPrev: parseInt(page) > 1
                }
            }, 'Users retrieved successfully');
        }
    });

    // Update user (email and/or role)
    fastify.put('/:id', {
        schema: {
      tags: ['Admin - Users'],
            security: [{ bearerAuth: [] }],
            summary: 'Update user (admin)',
            description: 'Update user email and/or role (admin only)',
            
            body: {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string', enum: ['user', 'admin'] }
                },
                additionalProperties: false,
                minProperties: 1
            },
            response: {
                200: createApiResponse({
                    type: 'object',
                    properties: {
                        user: adminUserObject
                    }
                }),
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const userId = parseInt(request.params.id);
            const { email, role } = request.body;
            const userService = fastify.getService('userProfileService');

            const existing = await userService.userRepository.findById(userId);
            if (!existing) {
                return reply.apiError('User not found', [], 404, 'USER_NOT_FOUND');
            }

            // Prevent changing own role
            if (role && userId === request.user.id) {
                return reply.apiError('Cannot change your own role', [], 400, 'CANNOT_CHANGE_OWN_ROLE');
            }

            // Unique email check
            if (email && email !== existing.email) {
                const exists = await userService.userRepository.emailExists(email);
                if (exists) {
                    return reply.apiError('Email already in use', [], 409, 'EMAIL_EXISTS');
                }
            }

            const updateData = {};
            if (email) updateData.email = email;
            if (role) updateData.role = role;

            const updated = await userService.userRepository.update(userId, updateData);

            return reply.apiSuccess({
                user: {
                    id: updated.id,
                    email: updated.email,
                    role: updated.role,
                    created_at: updated.created_at,
                    updated_at: updated.updated_at,
                    last_login: updated.last_login,
                    last_activity: updated.last_activity,
                    server_count: 0,
                    vote_count: 0
                }
            }, 'User updated successfully');
        }
    });

    // Delete user
    fastify.delete('/:id', {
        schema: {
      tags: ['Admin - Users'],
            security: [{ bearerAuth: [] }],
            summary: 'Delete user (admin)',
            description: 'Delete a user account (admin only)',
            
            response: {
                200: createApiResponse({
                    type: 'object',
                    properties: {
                        deleted: { type: 'boolean' }
                    }
                }),
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const userId = parseInt(request.params.id);
            const userService = fastify.getService('userProfileService');

            // Prevent deleting yourself
            if (userId === request.user.id) {
                return reply.apiError('Cannot delete your own account', [], 400, 'CANNOT_DELETE_SELF');
            }

            const existing = await userService.userRepository.findById(userId);
            if (!existing) {
                return reply.apiError('User not found', [], 404, 'USER_NOT_FOUND');
            }

            const deleted = await userService.userRepository.delete(userId);
            if (!deleted) {
                return reply.apiError('Failed to delete user', [], 500, 'DELETE_FAILED');
            }

            return reply.apiSuccess({ deleted: true }, 'User deleted successfully');
        }
    });

    // Get user by ID (admin view)
    fastify.get('/:id', {
        schema: {
      tags: ['Admin - Users'],
            security: [{ bearerAuth: [] }],
            summary: 'Get user by ID (admin)',
            description: 'Get detailed user information',
            
            response: {
                200: createApiResponse({
                    type: 'object',
                    properties: {
                        user: adminUserObject
                    }
                }),
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const userId = parseInt(request.params.id);
            const userService = fastify.getService('userProfileService');
            
            const user = await userService.userRepository.findById(userId);
            if (!user) {
                return reply.apiError('User not found', [], 404, 'USER_NOT_FOUND');
            }

            // Get additional stats
            const serverCount = await userService.userRepository.getUserServerCount(userId);
            const voteCount = await userService.userRepository.getUserVoteCount(userId);

            return reply.apiSuccess({
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                    last_login: user.last_login,
                    last_activity: user.last_activity,
                    server_count: serverCount,
                    vote_count: voteCount
                }
            }, 'User retrieved successfully');
        }
    });

    // Update user role
    fastify.put('/:id/role', {
        schema: {
      tags: ['Admin - Users'],
            security: [{ bearerAuth: [] }],
            summary: 'Update user role',
            description: 'Change user role (admin only)',
            
            body: {
                type: 'object',
                required: ['role'],
                properties: {
                    role: {
                        type: 'string',
                        enum: ['user', 'admin'],
                        description: 'New user role'
                    }
                },
                additionalProperties: false
            },
            response: {
                200: createApiResponse({
                    type: 'object',
                    properties: {
                        user: adminUserObject
                    }
                }),
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const userId = parseInt(request.params.id);
            const { role } = request.body;
            const userService = fastify.getService('userProfileService');
            
            // Prevent admin from changing their own role
            if (userId === request.user.id) {
                return reply.apiError('Cannot change your own role', [], 400, 'CANNOT_CHANGE_OWN_ROLE');
            }

            const user = await userService.userRepository.findById(userId);
            if (!user) {
                return reply.apiError('User not found', [], 404, 'USER_NOT_FOUND');
            }

            const updatedUser = await userService.userRepository.update(userId, { role });

            return reply.apiSuccess({
                user: {
                    id: updatedUser.id,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    created_at: updatedUser.created_at,
                    updated_at: updatedUser.updated_at,
                    last_login: updatedUser.last_login,
                    last_activity: updatedUser.last_activity,
                    server_count: 0,
                    vote_count: 0
                }
            }, `User role updated to ${role} successfully`);
        }
    });

    fastify.log.info('👥 Admin user routes registered');
};