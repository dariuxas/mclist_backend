'use strict'

const config = {
    development: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'api_dev',
        // PostgreSQL connection pool options
        max: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 60000,
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
        ssl: process.env.DB_SSL === 'true' ? {
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
        } : false,
        // Set timezone to Lithuanian time
        options: '--timezone=Europe/Vilnius'
    },
    production: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'api_prod',
        // PostgreSQL connection pool options - optimized for Aiven (400 connection limit)
        max: parseInt(process.env.DB_CONNECTION_LIMIT) || 350, // Use most of Aiven's 400 connection limit
        min: parseInt(process.env.DB_MIN_CONNECTIONS) || 20, // Higher minimum for production load
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 20000, // Reduced idle timeout for faster connection recycling
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000, // Increased timeout for Aiven cloud latency
        acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 120000, // 2 minutes to handle high load
        createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT) || 10000, // Increased create timeout
        destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000, // Added destroy timeout
        reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL) || 500, // More frequent connection reaping
        createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL) || 100, // Faster retry interval
        propagateCreateError: false, // Don't propagate errors during pool initialization
        // Connection validation for cloud database
        testOnBorrow: true, // Test connections before use
        evictionRunIntervalMillis: parseInt(process.env.DB_EVICTION_INTERVAL) || 30000, // Run eviction every 30s
        numTestsPerEvictionRun: parseInt(process.env.DB_TESTS_PER_EVICTION) || 5, // Test 5 connections per eviction run
        softIdleTimeoutMillis: parseInt(process.env.DB_SOFT_IDLE_TIMEOUT) || 15000, // Soft idle timeout
        ssl: process.env.DB_SSL === 'true' ? {
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
        } : false,
        // Set timezone to Lithuanian time
        options: '--timezone=Europe/Vilnius',
        // Query timeout for individual queries
        query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
        // Statement timeout at connection level
        statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 60000
    },
    test: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'api_test',
        // PostgreSQL connection pool options
        max: parseInt(process.env.DB_CONNECTION_LIMIT) || 5,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
        ssl: process.env.DB_SSL === 'true' ? {
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
        } : false,
        // Set timezone to Lithuanian time
        options: '--timezone=Europe/Vilnius'
    }
};

module.exports = config;