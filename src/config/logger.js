const path = require('node:path');
const fs = require('node:fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
console.log('📁 Logs directory path:', logsDir);

if (!fs.existsSync(logsDir)) {
    console.log('📁 Creating logs directory...');
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('✅ Logs directory created');
} else {
    console.log('✅ Logs directory already exists');
}

const isDevelopment = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

console.log('🔧 Log level:', logLevel);
console.log('🔧 Is development:', isDevelopment);

const baseLoggerConfig = {
    level: logLevel,
    timestamp: true,
    serializers: {
        req: (request) => {
            return {
                method: request.method,
                url: request.url,
                headers: {
                    host: request.headers.host,
                    'user-agent': request.headers['user-agent'],
                    'content-type': request.headers['content-type']
                },
                remoteAddress: request.remoteAddress,
                remotePort: request.remotePort
            };
        },
        res: (reply) => {
            return {
                statusCode: reply.statusCode,
                headers: reply.getHeaders ? reply.getHeaders() : reply.headers
            };
        },
        err: (error) => {
            return {
                type: error.constructor.name,
                message: error.message,
                stack: error.stack,
                code: error.code,
                statusCode: error.statusCode
            };
        }
    }
};

// Development configuration
const developmentConfig = {
    ...baseLoggerConfig,
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                level: logLevel,
                options: {
                    colorize: true,
                    levelFirst: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss',
                    ignore: 'pid,hostname',
                    singleLine: false,
                    hideObject: false
                }
            },
            {
                target: 'pino/file',
                level: 'debug',
                options: {
                    destination: path.join(logsDir, 'app.log'),
                    mkdir: true
                }
            },
            {
                target: 'pino/file',
                level: 'error',
                options: {
                    destination: path.join(logsDir, 'error.log'),
                    mkdir: true
                }
            }
        ]
    }
};

// Production configuration with rotating files
const productionConfig = {
    ...baseLoggerConfig,
    transport: {
        targets: [
            {
                target: path.join(__dirname, '../utils/rotating-file-transport.js'),
                level: 'info',
                options: {
                    filename: 'app.log',
                    directory: logsDir,
                    maxSize: '50M',
                    maxFiles: 10
                }
            },
            {
                target: path.join(__dirname, '../utils/rotating-file-transport.js'),
                level: 'error',
                options: {
                    filename: 'error.log',
                    directory: logsDir,
                    maxSize: '50M',
                    maxFiles: 10
                }
            }
        ]
    }
};

// Test configuration (silent)
const testConfig = {
    level: 'silent'
};

console.log('📝 Logger configurations created');
console.log('📝 Available environments:', Object.keys({ development: developmentConfig, production: productionConfig, test: testConfig }));

module.exports = {
    development: developmentConfig,
    production: productionConfig,
    test: testConfig
};