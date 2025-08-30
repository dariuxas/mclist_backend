'use strict'

const path = require('node:path')
const AutoLoad = require('@fastify/autoload')

module.exports = async function (fastify, opts) {
  // Test if logger is working
  fastify.log.info('📝 App.js logger test - this should appear in logs');

  // Register global JSON Schemas for API responses (must be before routes)
  try {
    const {
      SuccessResponseSchema,
      ErrorResponseSchema,
      PaginatedEnvelopeSchema
    } = require('./src/shared/schemas/components/ResponseSchemas');

    fastify.addSchema(SuccessResponseSchema);
    fastify.addSchema(ErrorResponseSchema);
    fastify.addSchema(PaginatedEnvelopeSchema);
    fastify.log.info('✅ Response schemas registered');
  } catch (e) {
    fastify.log.warn({ err: e }, 'Could not register response schemas');
  }

  // Register database plugin first
  try {
    await fastify.register(require('./plugins/database'));
    fastify.log.info('✅ Database plugin registered successfully');
  } catch (error) {
    fastify.log.fatal({
      error: error.message,
      environment: process.env.NODE_ENV
    }, '💀 Application startup failed due to database connection error');

    process.exit(1);
  }

  // Add request timing
  fastify.addHook('onRequest', async (request, reply) => {
    request.startTime = Date.now();
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const responseTime = Date.now() - request.startTime;

    const logLevel = reply.statusCode >= 400 ? 'error' : 'info';
    request.log[logLevel]({
      reqId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime,
      userAgent: request.headers['user-agent'],
      ip: request.ip
    }, `${request.method} ${request.url} - ${reply.statusCode} (${responseTime}ms)`);
  });

  // Global error handler with logging and standardized response format
  // Simple unified error handler
  fastify.setErrorHandler(function (error, request, reply) {
    // If it's a validation error from our new system
    if (error.validationResponse) {
      error.validationResponse.meta.requestId = request.id;
      return reply.status(400).send(error.validationResponse);
    }

    // Use the simple error handler for everything else
    const ErrorHandler = require('./src/lib/ErrorHandler');
    return ErrorHandler.handleError(error, request, reply);
  });

  // Load plugins (excluding database.js since we loaded it manually)
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'plugins'),
    options: Object.assign({}, opts),
    ignorePattern: /database\.js$/
  })

  // Register API routes with prefix
  fastify.register(require('./routes/api'), { prefix: '/api' });

  // Load other routes (keeping existing ones for backward compatibility)
  fastify.register(AutoLoad, {
    dir: path.join(__dirname, 'routes'),
    options: Object.assign({}, opts),
    ignorePattern: /api/
  })

  // Custom 404 handler with standardized response format
  fastify.setNotFoundHandler(function (request, reply) {
    const url = request.url;
    const method = request.method;
    
    request.log.warn({
      reqId: request.id,
      method: method,
      url: url,
      userAgent: request.headers['user-agent'],
      ip: request.ip
    }, `Route not found: ${method} ${url}`);

    return reply.apiError(
      `Maršrutas ${method}:${url} nerastas`,
      [],
      404,
      'NOT_FOUND'
    );
  });

  // Log when ready and initialize startup services
  fastify.ready(async (err) => {
    if (err) {
      fastify.log.fatal({ error: err.message, stack: err.stack }, '💀 Fastify ready callback failed');
      throw err;
    }
    
    fastify.log.info('🎉 Fastify application ready');
    
    try {
      // Initialize startup services
      fastify.log.info('📍 Getting startup service...');
      const startupService = fastify.getService('startupService');
      fastify.log.info('📍 About to initialize startup service...');
      await startupService.initialize();
      fastify.log.info('📍 Startup service initialized successfully');
    } catch (error) {
      fastify.log.error({ error: error.message, stack: error.stack }, 'Failed to initialize startup services');
      throw error;
    }
  });

  // Handle graceful shutdown
  const gracefulShutdown = async (signal) => {
    fastify.log.info(`Received ${signal}, starting graceful shutdown...`);
    
    try {
      const startupService = fastify.getService('startupService');
      await startupService.shutdown();
    } catch (error) {
      fastify.log.error({ error: error.message }, 'Error during graceful shutdown');
    }
    
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}