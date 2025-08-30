'use strict'

const fp = require('fastify-plugin')

module.exports = fp(async function (fastify, opts) {
  await fastify.register(require('@fastify/cors'), {
    // Allow all origins
    origin: true,
    // Allow all methods
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS', 'PATCH'],
    // Allow all headers
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-Language'],
    // Allow credentials
    credentials: true,
    // Handle preflight requests
    preflightContinue: false,
    // Set preflight response status code
    optionsSuccessStatus: 204
  })

  fastify.log.info('🌐 CORS plugin registered - all origins allowed')
})

