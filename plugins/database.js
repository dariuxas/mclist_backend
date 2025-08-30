'use strict'

const fp = require('fastify-plugin');
const dbConfig = require('../src/config/database');

async function databasePlugin(fastify, options) {
    const environment = process.env.NODE_ENV || 'development';
    const config = dbConfig[environment];

    try {
        // Log connection attempt
        fastify.log.info({
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user,
            ssl: !!config.ssl,
            max: config.max
        }, '🔌 Attempting to connect to PostgreSQL database...');

        // Register PostgreSQL plugin with the clean config
        await fastify.register(require('@fastify/postgres'), config);

        // Test the connection and set timezone
        await testConnection(fastify);
        await setTimezone(fastify);

        // Log successful connection
        fastify.log.info({
            host: config.host,
            port: config.port,
            database: config.database,
            max: config.max,
            timezone: 'Europe/Vilnius'
        }, '✅ Successfully connected to PostgreSQL database');

        // Add graceful shutdown
        fastify.addHook('onClose', async (instance) => {
            fastify.log.info('🔌 Closing database connections...');
            try {
                if (instance.pg && instance.pg.pool) {
                    await instance.pg.pool.end();
                    fastify.log.info('✅ Database connections closed');
                } else if (fastify.pg && fastify.pg.pool) {
                    await fastify.pg.pool.end();
                    fastify.log.info('✅ Database connections closed');
                }
            } catch (error) {
                fastify.log.warn({ error: error.message }, '⚠️ Error closing database connections');
            }
        });

        // Add database helper methods
        fastify.decorate('db', {
            // Helper method for transactions with retry logic
            async transaction(callback, maxRetries = 3) {
                let attempt = 0;
                while (attempt < maxRetries) {
                    const client = await fastify.pg.connect();
                    try {
                        await client.query('BEGIN');
                        const result = await callback(client);
                        await client.query('COMMIT');
                        return result;
                    } catch (error) {
                        await client.query('ROLLBACK');
                        
                        // Retry on connection issues
                        if ((error.code === '53300' || error.code === '08006') && attempt < maxRetries - 1) {
                            attempt++;
                            fastify.log.warn({ 
                                attempt, 
                                maxRetries, 
                                error: error.message 
                            }, 'Retrying transaction due to connection error');
                            
                            // Wait before retry with exponential backoff
                            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
                            continue;
                        }
                        
                        throw error;
                    } finally {
                        client.release();
                    }
                }
            },

            // Helper method for safe queries with logging and retry logic
            async query(sql, params = [], options = {}) {
                const { maxRetries = 5, timeout = 45000 } = options; // Increased retries and timeout
                const startTime = Date.now();
                let attempt = 0;

                while (attempt < maxRetries) {
                    try {
                        // Add query timeout with longer default
                        const queryPromise = fastify.pg.query(sql, params);
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('timeout exceeded when trying to connect')), timeout)
                        );
                        
                        const result = await Promise.race([queryPromise, timeoutPromise]);
                        const duration = Date.now() - startTime;

                        // Log slow queries (reduced threshold to catch performance issues)
                        if (duration > 500) {
                            fastify.log.warn({
                                sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
                                duration,
                                rowCount: result.rows.length,
                                attempt: attempt + 1
                            }, 'Slow database query detected');
                        } else {
                            fastify.log.debug({
                                sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
                                duration,
                                rowCount: result.rows.length,
                                attempt: attempt + 1
                            }, 'Database query executed');
                        }

                        return result;
                    } catch (error) {
                        const duration = Date.now() - startTime;
                        
                        // Enhanced retry conditions for connection issues and timeouts
                        const isRetryableError = (
                            error.code === '53300' || // too_many_connections
                            error.code === '08006' || // connection_failure
                            error.code === '08001' || // sqlclient_unable_to_establish_sqlconnection
                            error.code === '53000' || // insufficient_resources
                            error.code === '53200' || // out_of_memory
                            error.message === 'Query timeout' ||
                            error.message === 'timeout exceeded when trying to connect' ||
                            error.message.includes('connection terminated') ||
                            error.message.includes('server closed the connection unexpectedly') ||
                            error.message.includes('Connection terminated') ||
                            error.message.includes('pool is draining')
                        );

                        if (isRetryableError && attempt < maxRetries - 1) {
                            attempt++;
                            
                            // Exponential backoff with jitter for better load distribution
                            const baseDelay = Math.pow(2, attempt) * 200;
                            const jitter = Math.random() * 100;
                            const delay = baseDelay + jitter;
                            
                            fastify.log.warn({ 
                                attempt, 
                                maxRetries, 
                                duration,
                                error: error.message,
                                code: error.code,
                                delay,
                                sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : '')
                            }, 'Retrying query due to connection error');
                            
                            await new Promise(resolve => setTimeout(resolve, delay));
                            continue;
                        }

                        fastify.log.error({
                            sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
                            duration,
                            error: error.message,
                            code: error.code,
                            attempt: attempt + 1,
                            maxRetries
                        }, 'Database query failed');
                        throw error;
                    }
                }
            }
        });

    } catch (error) {
        // Enhanced error handling with specific error types
        const dbError = createDatabaseError(error, config);

        fastify.log.error({
            error: dbError.message,
            code: dbError.code,
            host: config.host,
            port: config.port,
            database: config.database,
            user: config.user
        }, '❌ Database connection failed');

        // Throw a user-friendly error
        throw new Error(`Database connection failed: ${dbError.friendlyMessage}`);
    }
}

async function testConnection(fastify) {
    try {
        await fastify.pg.query('SELECT 1');
    } catch (error) {
        throw error;
    }
}

async function setTimezone(fastify) {
    try {
        const timezone = process.env.DB_TIMEZONE || 'Europe/Vilnius';
        
        // Set the session timezone
        await fastify.pg.query(`SET timezone = '${timezone}'`);
        
        // Verify the timezone was set
        const result = await fastify.pg.query('SHOW timezone');
        fastify.log.info({ 
            timezone: result.rows[0].TimeZone,
            configured: timezone
        }, '🌍 Database timezone configured');
    } catch (error) {
        fastify.log.warn({ error: error.message }, '⚠️ Failed to set database timezone, using default');
    }
}

function createDatabaseError(error, config) {
    const dbError = {
        message: error.message,
        code: error.code,
        friendlyMessage: 'Unknown database error'
    };

    // Map common PostgreSQL errors to user-friendly messages
    switch (error.code) {
        case 'ECONNREFUSED':
            dbError.friendlyMessage = `Cannot connect to PostgreSQL server at ${config.host}:${config.port}. Please ensure PostgreSQL is running and accessible.`;
            break;
        case 'ENOTFOUND':
            dbError.friendlyMessage = `PostgreSQL host '${config.host}' not found. Please check your database host configuration.`;
            break;
        case 'ETIMEDOUT':
            dbError.friendlyMessage = `Connection to PostgreSQL server timed out. Please check your network connection and database server status.`;
            break;
        case '28P01':
            dbError.friendlyMessage = `Authentication failed for user '${config.user}'. Please check your database credentials.`;
            break;
        case '3D000':
            dbError.friendlyMessage = `Database '${config.database}' doesn't exist. Please create the database or check your configuration.`;
            break;
        case '53300':
            dbError.friendlyMessage = 'Too many connections to the database. Please try again later.';
            break;
        case '08006':
            dbError.friendlyMessage = 'Connection to PostgreSQL server was lost. Please check your network connection.';
            break;
        case '53000':
            dbError.friendlyMessage = 'PostgreSQL server is out of memory.';
            break;
        case '53200':
            dbError.friendlyMessage = 'PostgreSQL server is out of disk space.';
            break;
        default:
            dbError.friendlyMessage = `Database error (${error.code}): ${error.message}`;
    }

    return dbError;
}

module.exports = fp(databasePlugin, {
    name: 'database'
});