'use strict'

const {
    getMinecraftVersionsResponse
} = require('../../../../src/domains/server/schemas/MinecraftVersionSchemas');
const { errorResponse } = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
    const minecraftVersionController = fastify.getService('minecraftVersionController');

    // Public endpoints
    fastify.get('/versions', {
        schema: {
      tags: ['Minecraft Versions'],
            summary: 'Get all active Minecraft versions',
            description: 'Get list of all active Minecraft versions',
            response: {
                200: getMinecraftVersionsResponse,
                400: errorResponse,
                500: errorResponse
            }
        }
    }, minecraftVersionController.getVersions);
};