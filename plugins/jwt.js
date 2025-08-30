'use strict'

const fp = require('fastify-plugin');

async function jwtPlugin(fastify, options) {
    try {
        // Validate required environment variables
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET environment variable is required');
        }

        if (process.env.JWT_SECRET.length < 32) {
            fastify.log.warn('JWT_SECRET should be at least 32 characters long for security');
        }

        const jwtOptions = {
            secret: process.env.JWT_SECRET,
            sign: {
                algorithm: process.env.JWT_ALGORITHM || 'HS256',
                expiresIn: process.env.JWT_EXPIRES_IN || '24h'
            },
            verify: {
                algorithms: [process.env.JWT_ALGORITHM || 'HS256']
            }
        };

        // Register JWT plugin
        await fastify.register(require('@fastify/jwt'), jwtOptions);

        fastify.log.info({
            algorithm: jwtOptions.sign.algorithm,
            expiresIn: jwtOptions.sign.expiresIn
        }, '🔐 JWT plugin registered successfully');

        // Decorate fastify with JWT utilities using a different name
        fastify.decorate('jwtUtils', {
            // Generate access token
            generateAccessToken: async (payload) => {
                return fastify.jwt.sign(payload, {
                    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
                });
            },

            // Generate refresh token
            generateRefreshToken: async (payload) => {
                return fastify.jwt.sign(payload, {
                    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
                });
            },

            // Generate token pair
            generateTokenPair: async (payload) => {
                const accessToken = await fastify.jwtUtils.generateAccessToken(payload);
                const refreshToken = await fastify.jwtUtils.generateRefreshToken(payload);

                return {
                    accessToken,
                    refreshToken,
                    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
                };
            },

            // Verify and decode token
            verifyToken: async (token) => {
                try {
                    return await fastify.jwt.verify(token);
                } catch (error) {
                    fastify.log.debug({ error: error.message }, 'Token verification failed');
                    throw error;
                }
            }
        });

    } catch (error) {
        fastify.log.error({
            error: error.message
        }, '❌ JWT plugin registration failed');
        throw error;
    }
}

module.exports = fp(jwtPlugin, {
    name: 'jwt',
    dependencies: []
});