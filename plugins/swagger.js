'use strict'

const fp = require('fastify-plugin');

async function swaggerPlugin(fastify) {
    const environment = process.env.NODE_ENV || 'development';
    const apiUrl = process.env.API_URL || 'http://localhost:8000';
    const apiTitle = process.env.API_TITLE || 'MCList API';
    const apiDescription = process.env.API_DESCRIPTION || 'Minecraft Server List API';
    const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true' || environment === 'development';

    fastify.log.info({ 
        swaggerEnabled, 
        environment, 
        swaggerEnvVar: process.env.SWAGGER_ENABLED 
    }, '📚 Swagger configuration check');

    // Skip swagger registration if disabled
    if (!swaggerEnabled) {
        fastify.log.info('📚 Swagger documentation disabled in production');
        return;
    }

    // Register @fastify/swagger for OpenAPI spec generation
    await fastify.register(require('@fastify/swagger'), {
        openapi: {
            openapi: '3.0.3',
            info: {
                title: apiTitle,
                description: apiDescription,
                version: '1.0.0',
                contact: {
                    name: 'MCList Support',
                    email: 'support@mclist.lt'
                },
                license: {
                    name: 'MIT',
                    url: 'https://opensource.org/licenses/MIT'
                }
            },
            servers: [
                {
                    url: apiUrl,
                    description: `${environment.charAt(0).toUpperCase() + environment.slice(1)} server`
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'Enter your JWT token in the format: Bearer <token>'
                    }
                }
            },
            tags: [
                {
                    name: 'Authentication',
                    description: 'User registration, login, and token management'
                },
                {
                    name: 'Users',
                    description: 'User profile and management endpoints'
                },
                {
                    name: 'Servers',
                    description: 'Minecraft server management and listing'
                },
                {
                    name: 'Votes',
                    description: 'Server voting system'
                },
                {
                    name: 'Admin',
                    description: 'Administrative endpoints'
                }
            ]
        },
        // Transform the OpenAPI object before returning it
        transform: ({ schema, url }) => {
            // You can modify the schema here if needed
            return { schema, url };
        },
        // Hide routes from documentation based on tags or other criteria
        hideUntagged: true,
        // Expose route for getting the OpenAPI spec
        exposeRoute: true
    });

    // Register @fastify/swagger-ui for the Swagger UI interface
    await fastify.register(require('@fastify/swagger-ui'), {
        routePrefix: '/docs',
        uiConfig: {
            docExpansion: 'list', // 'list', 'full', 'none'
            deepLinking: true,
            defaultModelsExpandDepth: 2,
            defaultModelExpandDepth: 2,
            displayRequestDuration: true,
            filter: true,
            showExtensions: true,
            showCommonExtensions: true,
            tryItOutEnabled: true
        },
        uiHooks: {
            onRequest: function (_request, _reply, next) {
                // You can add authentication here if needed
                next();
            },
            preHandler: function (_request, _reply, next) {
                // Additional pre-handler logic
                next();
            }
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
        // Custom logo and theme (optional)
        logo: {
            type: 'image/png',
            content: Buffer.from(''), // Add your base64 logo here
            href: '/docs',
            target: '_blank'
        }
    });

    fastify.log.info('📚 Swagger documentation available at /docs');
}

module.exports = fp(swaggerPlugin, {
    name: 'swagger',
    dependencies: []
});