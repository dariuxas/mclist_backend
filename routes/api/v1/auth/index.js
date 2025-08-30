'use strict';

const { authenticate } = require('../../../../src/middleware/auth');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
} = require('../../../../src/domains/auth/schemas/AuthSchemas');

module.exports = async function (fastify) {
  const authController = fastify.getService('authController');

  // Authentication endpoints
  fastify.post('/register', {
    schema: {
      ...registerSchema,
      tags: ['Authentication'],
      summary: 'Register new user',
      description: 'Create a new user account'
    },
    handler: authController.register.bind(authController),
  });

  fastify.post('/login', {
    schema: {
      ...loginSchema,
      tags: ['Authentication'],
      summary: 'Authenticate user',
      description: 'Login with email and password'
    },
    handler: authController.login.bind(authController),
  });

  fastify.post('/refresh', {
    schema: {
      ...refreshTokenSchema,
      tags: ['Authentication'],
      summary: 'Refresh access token',
      description: 'Get new access token using refresh token'
    },
    handler: authController.refreshToken.bind(authController),
  });

  fastify.post('/logout', {
    schema: { ...logoutSchema },
    preHandler: [authenticate],
    handler: authController.logout.bind(authController),
  });

  fastify.log.info('🔐 Authentication routes registered');
};