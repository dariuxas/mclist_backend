'use strict'

/**
 * Base Service class providing common service functionality
 * Implements dependency injection pattern and common service methods
 */
class BaseService {
    constructor(repository, logger) {
        this.repository = repository;
        this.logger = logger;
    }

    /**
     * Create a service error with proper structure
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {string} errorCode - Application error code
     * @returns {Error} Structured error
     */
    createError(message, statusCode = 400, errorCode = 'SERVICE_ERROR') {
        const error = new Error(message);
        error.statusCode = statusCode;
        error.errorCode = errorCode;
        return error;
    }

    /**
     * Log service operation
     * @param {string} level - Log level (info, error, debug, warn)
     * @param {Object} data - Log data
     * @param {string} message - Log message
     */
    log(level, data, message) {
        if (this.logger && typeof this.logger[level] === 'function') {
            this.logger[level](data, message);
        }
    }

    /**
     * Validate required fields
     * @param {Object} data - Data to validate
     * @param {Array} requiredFields - Array of required field names
     * @throws {Error} If validation fails
     */
    validateRequiredFields(data, requiredFields) {
        const missingFields = requiredFields.filter(field => 
            data[field] === undefined || data[field] === null || data[field] === ''
        );

        if (missingFields.length > 0) {
            throw this.createError(
                `Trūksta privalomų laukų: ${missingFields.join(', ')}`,
                400,
                'VALIDATION_ERROR'
            );
        }
    }

    /**
     * Sanitize data by removing sensitive fields
     * @param {Object} data - Data to sanitize
     * @param {Array} sensitiveFields - Fields to remove
     * @returns {Object} Sanitized data
     */
    sanitizeData(data, sensitiveFields = ['password', 'password_hash']) {
        if (!data) return data;

        const sanitized = { ...data };
        sensitiveFields.forEach(field => {
            delete sanitized[field];
        });

        return sanitized;
    }

    /**
     * Handle repository errors and convert to service errors
     * @param {Error} error - Repository error
     * @param {string} operation - Operation being performed
     * @throws {Error} Service error
     */
    handleRepositoryError(error, operation) {
        this.log('error', { error: error.message, operation }, `Repository error during ${operation}`);

        // Check for specific database errors
        if (error.code === 'ER_DUP_ENTRY') {
            throw this.createError('Išteklius jau egzistuoja', 409, 'CONFLICT');
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            throw this.createError('Nurodomas išteklius nerastas', 400, 'INVALID_REFERENCE');
        }

        // Generic repository error
        throw this.createError(
            `Nepavyko ${operation}: ${error.message}`,
            500,
            'REPOSITORY_ERROR'
        );
    }
}

module.exports = BaseService;