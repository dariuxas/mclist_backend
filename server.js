'use strict'

// Read the environment-specific .env file
const environment = process.env.NODE_ENV || 'development';
const envFile = environment === 'production' ? '.env.production' : '.env.local';
require('dotenv').config({ path: envFile });

// Require the framework
const Fastify = require('fastify');

// Import our logger config
const loggerConfig = require('./src/config/logger');

console.log('🔧 Environment:', environment);
console.log('🔧 Starting server with custom logger config');

// Instantiate Fastify with our custom logger
const fastify = Fastify({
    logger: loggerConfig[environment] || loggerConfig.development,
    trustProxy: true,
    ajv: {
        customOptions: {
            allErrors: true,
            removeAdditional: false
        }
    }
});

// Test logger immediately
fastify.log.info('🧪 Server.js logger test - should appear in files');

// Register your application as a plugin
const startServer = async () => {
    try {
        console.log('📍 Registering app plugin...');
        // Register the app plugin
        await fastify.register(require('./app'));
        console.log('📍 App plugin registered successfully');

        // Start listening
        const port = parseInt(process.env.PORT) || 8000;
        const host = process.env.HOST || '0.0.0.0';

        console.log(`📍 Starting server on ${host}:${port}...`);
        await fastify.listen({ port, host });
        console.log('📍 Server listen completed');

        // Get the actual server address
        const serverAddress = fastify.server.address();
        fastify.log.info({
            port: serverAddress.port,
            host: serverAddress.address,
            environment: environment,
            pid: process.pid,
            logsDirectory: require('path').join(process.cwd(), 'logs')
        }, `🚀 Server successfully started on port ${serverAddress.port}`);

        console.log('📍 Startup sequence completed');
    } catch (err) {
        console.error('📍 Error in startServer:', err);
        fastify.log.error(err);
        process.exit(1);
    }
};

// Handle unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    fastify.log.error({ reason, promise: promise.toString() }, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    fastify.log.fatal({ error }, 'Uncaught Exception');
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    fastify.log.info('Received SIGTERM, shutting down gracefully...');
    await fastify.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    fastify.log.info('Received SIGINT, shutting down gracefully...');
    await fastify.close();
    process.exit(0);
});

startServer();