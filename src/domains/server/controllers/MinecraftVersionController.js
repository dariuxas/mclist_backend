'use strict'

const BaseController = require('../../../controllers/BaseController');

/**
 * Minecraft Version Controller
 * Handles HTTP requests for minecraft version operations
 */
class MinecraftVersionController extends BaseController {
    constructor(minecraftVersionService, logger) {
        super(minecraftVersionService, logger);
        this.minecraftVersionService = minecraftVersionService;
        this.bindMethods();
    }

    /**
     * Get all active minecraft versions
     */
    async getVersions(request, reply) {
        try {
            const versions = await this.minecraftVersionService.getAllActiveVersions();

            return this.sendSuccess(
                reply,
                { versions },
                'Minecraft versijos sėkmingai gautos',
                {},
                request,
                'get minecraft versions'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get minecraft versions');
        }
    }
}

module.exports = MinecraftVersionController;