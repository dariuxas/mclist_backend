const pino = require('pino');
const config = require('../config/logger');

const environment = process.env.NODE_ENV || 'development';
const loggerConfig = config[environment] || config.development;

// Create logger instance
const logger = pino(loggerConfig);

// Create specialized loggers
const createChildLogger = (service) => {
    return logger.child({ service });
};

// Error logger with additional context
const logError = (error, context = {}) => {
    logger.error({
        err: error,
        context,
        timestamp: new Date().toISOString()
    }, error.message || 'An error occurred');
};

// Request logger
const logRequest = (request, response, responseTime) => {
    const logLevel = response.statusCode >= 400 ? 'error' : 'info';
    logger[logLevel]({
        req: request,
        res: response,
        responseTime
    }, `${request.method} ${request.url} - ${response.statusCode}`);
};

// Security logger for authentication events
const logSecurity = (event, details = {}) => {
    logger.warn({
        event,
        details,
        timestamp: new Date().toISOString(),
        type: 'security'
    }, `Security event: ${event}`);
};

// Performance logger
const logPerformance = (operation, duration, metadata = {}) => {
    logger.info({
        operation,
        duration,
        metadata,
        type: 'performance'
    }, `Performance: ${operation} took ${duration}ms`);
};

// Startup logger
const logStartup = (message, metadata = {}) => {
    logger.info({
        ...metadata,
        type: 'startup'
    }, message);
};

module.exports = {
    logger,
    createChildLogger,
    logError,
    logRequest,
    logSecurity,
    logPerformance,
    logStartup
};