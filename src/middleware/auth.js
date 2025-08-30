'use strict'

const authenticate = async function (request, reply) {
    try {
        const token = request.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            const authError = new Error('Access token is required');
            authError.statusCode = 401;
            authError.errorCode = 'MISSING_TOKEN';
            throw authError;
        }

        const decoded = await this.jwtUtils.verifyToken(token);
        request.user = decoded;

        // Removed ban check since we removed admin domain

    } catch (error) {
        request.log.debug({ error: error.message }, 'Authentication failed');

        // Determine specific error type
        let errorCode = 'INVALID_TOKEN';
        let message = 'Invalid or expired token';

        if (error.message && error.message.includes('expired')) {
            errorCode = 'TOKEN_EXPIRED';
            message = 'Token has expired';
        } else if (error.message && error.message.includes('malformed')) {
            errorCode = 'MALFORMED_TOKEN';
            message = 'Token format is invalid';
        }

        const authError = new Error(message);
        authError.statusCode = 401;
        authError.errorCode = errorCode;
        throw authError;
    }
};

const optionalAuthenticate = async function (request, reply) {
    try {
        const token = request.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            // No token provided, continue without authentication
            return;
        }

        const decoded = await this.jwtUtils.verifyToken(token);
        request.user = decoded;

    } catch (error) {
        request.log.debug({ error: error.message }, 'Optional authentication failed');
        // Don't fail the request, just continue without user context
        request.user = null;
    }
};

const authorize = (roles = []) => {
    return async function (request, reply) {
        if (!request.user) {
            const authError = new Error('Authentication required');
            authError.statusCode = 401;
            authError.errorCode = 'UNAUTHORIZED';
            throw authError;
        }

        if (roles.length && !roles.includes(request.user.role)) {
            const authError = new Error('You do not have permission to access this resource');
            authError.statusCode = 403;
            authError.errorCode = 'INSUFFICIENT_PERMISSIONS';
            throw authError;
        }
    };
};

const requireRole = (role) => {
    return async function (request, reply) {
        if (!request.user) {
            const authError = new Error('Authentication required');
            authError.statusCode = 401;
            authError.errorCode = 'UNAUTHORIZED';
            throw authError;
        }

        if (request.user.role !== role) {
            const authError = new Error('You do not have permission to access this resource');
            authError.statusCode = 403;
            authError.errorCode = 'INSUFFICIENT_PERMISSIONS';
            throw authError;
        }
    };
};

module.exports = {
    authenticate,
    optionalAuthenticate,
    authorize,
    requireRole
};