'use strict'

const { 
    privateUserSchema 
} = require('../../../shared/schemas/components/UserSchemaComponents');
const { createApiResponse, errorResponse } = require('../../../shared/schemas/components/BaseSchemaComponents');

const registerSchema = {
    tags: ['Authentication'],
    summary: 'Register new user',
    description: 'Create a new user account',
    body: {
        type: 'object',
        required: ['email', 'password', 'password_confirmation'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                maxLength: 100,
                description: 'Valid email address'
            },
            password: {
                type: 'string',
                minLength: 8,
                maxLength: 128,
                description: 'Password (minimum 8 characters)'
            },
            password_confirmation: {
                type: 'string',
                minLength: 8,
                maxLength: 128,
                description: 'Password confirmation (must match password)'
            },
            recaptcha_token: {
                type: 'string',
                minLength: 1,
                maxLength: 5000,
                description: 'reCAPTCHA token (required if reCAPTCHA is enabled)'
            }
        },
        additionalProperties: false
    },
    response: {
        200: createApiResponse({
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: {
                        ...privateUserSchema.properties,
                        tokens: {
                            type: 'object',
                            properties: {
                                accessToken: { type: 'string' },
                                refreshToken: { type: 'string' },
                                expiresIn: { type: 'string' }
                            }
                        }
                    }
                }
            },
            required: ['user']
        }),
        400: errorResponse,
        401: errorResponse
    }
};

const loginSchema = {
    tags: ['Authentication'],
    summary: 'Login user',
    description: 'Authenticate user and return tokens',
    body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
            email: {
                type: 'string',
                format: 'email',
                maxLength: 100,
                description: 'User email address'
            },
            password: {
                type: 'string',
                minLength: 8,
                maxLength: 128,
                description: 'User password'
            },
            recaptcha_token: {
                type: 'string',
                minLength: 1,
                maxLength: 5000,
                description: 'reCAPTCHA token (required if reCAPTCHA is enabled)'
            }
        },
        additionalProperties: false
    },
    response: {
        200: createApiResponse({
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: {
                        ...privateUserSchema.properties,
                        tokens: {
                            type: 'object',
                            properties: {
                                accessToken: { type: 'string' },
                                refreshToken: { type: 'string' },
                                expiresIn: { type: 'string' }
                            }
                        }
                    }
                }
            },
            required: ['user']
        }),
        400: errorResponse,
        401: errorResponse,
        423: errorResponse
    }
};

const refreshTokenSchema = {
    tags: ['Authentication'],
    summary: 'Refresh access token',
    description: 'Get new access token using refresh token',
    body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
            refreshToken: {
                type: 'string',
                minLength: 1,
                description: 'Valid refresh token'
            }
        },
        additionalProperties: false
    },
    response: {
        200: createApiResponse({
            type: 'object',
            properties: {
                tokens: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        expiresIn: { type: 'string' }
                    }
                }
            },
            required: ['tokens']
        }),
        400: errorResponse,
        401: errorResponse
    }
};

const logoutSchema = {
    tags: ['Authentication'],
    summary: 'Logout user',
    description: 'Logout current user',
    security: [{ bearerAuth: [] }],
    response: {
        200: createApiResponse({
            type: 'object',
            properties: {
                message: { type: 'string' }
            },
            required: ['message']
        }),
        401: errorResponse
    }
};

module.exports = {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    logoutSchema
};
