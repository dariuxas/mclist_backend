'use strict'

const { 
    baseUserSchema, 
    privateUserSchema, 
} = require('../../../shared/schemas/components/UserSchemaComponents');
const { createApiResponse, errorResponse } = require('../../../shared/schemas/components/BaseSchemaComponents');
const { emailField } = require('../../../shared/schemas/components/ValidationSchemaComponents');

const updateUserProfileBody = {
    type: 'object',
    properties: {
        email: {
            type: 'string',
            format: 'email',
            maxLength: 100,
            description: 'Valid email address'
        }
    },
    additionalProperties: false
};

const updateUserProfileResponse = createApiResponse({
    type: 'object',
    properties: {
        user: privateUserSchema
    },
    required: ['user']
});

const getUserProfileResponse = createApiResponse({
    type: 'object',
    properties: {
        user: privateUserSchema
    },
    required: ['user']
});

const userIdParam = {
    type: 'object',
    properties: {
        id: {
            type: 'string',
            pattern: '^[0-9]+$',
            description: 'User ID',
            errorMessage: {
                type: 'Vartotojo ID turi būti tekstas',
                pattern: 'Vartotojo ID turi būti skaičius'
            }
        }
    },
    required: ['id'],
    errorMessage: {
        required: {
            id: 'Vartotojo ID yra privalomas'
        }
    }
};

const publicUserProfileResponse = createApiResponse({
    type: 'object',
    properties: {
        user: baseUserSchema
    },
    required: ['user']
});

const changePasswordBody = {
    type: 'object',
    properties: {
        currentPassword: {
            type: 'string',
            minLength: 6,
            maxLength: 100,
            description: 'Current password'
        },
        newPassword: {
            type: 'string',
            minLength: 6,
            maxLength: 100,
            description: 'New password (minimum 6 characters)'
        }
    },
    required: ['currentPassword', 'newPassword'],
    additionalProperties: false
};

const changePasswordResponse = createApiResponse({
    type: 'object',
    properties: {
        message: {
            type: 'string',
            description: 'Success message'
        }
    },
    required: ['message']
});

module.exports = {
    updateUserProfileBody,
    updateUserProfileResponse,
    getUserProfileResponse,
    userIdParam,
    publicUserProfileResponse,
    changePasswordBody,
    changePasswordResponse,
};