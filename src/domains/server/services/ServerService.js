'use strict'

const Validator = require('../../../lib/Validator');
const ErrorHandler = require('../../../lib/ErrorHandler');

/**
 * Server Service - Clean and Simple
 * Handles server management operations without the complicated validation mess
 */
class ServerService {
    constructor(serverRepository, serverTypeRepository, serverDataRepository, serverPingService, configService, seoService, logger) {
        this.serverRepository = serverRepository;
        this.serverTypeRepository = serverTypeRepository;
        this.serverDataRepository = serverDataRepository;
        this.serverPingService = serverPingService;
        this.configService = configService;
        this.seoService = seoService;
        this.logger = logger;
    }

    /**
     * Log with context
     */
    log(level, data, message) {
        if (this.logger) {
            this.logger[level](data, message);
        }
    }

    /**
     * Get all servers with filtering and pagination
     */
    async getServers(options = {}, isAdmin = false) {
        try {
            // For non-admin users, always filter out inactive servers
            if (!isAdmin) {
                options.is_active = true;
            }

            // Parse server_type_ids if provided as comma-separated string
            if (options.server_type_ids && typeof options.server_type_ids === 'string') {
                options.server_type_ids = options.server_type_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            }

            // Map controller options to repository options
            const limit = Number.isFinite(options.limit) ? options.limit : parseInt(options.limit) || 10;
            const page = Number.isFinite(options.page) ? options.page : parseInt(options.page) || 1;
            const offset = (Math.max(page, 1) - 1) * Math.max(limit, 1);

            const repoOptions = {
                limit: Math.max(Math.min(limit, 50), 1),
                offset,
                order_by: options.sort_by || 'created_at',
                order_direction: (options.sort_order || 'desc').toUpperCase(),
                server_type_ids: options.server_type_ids || null,
                is_premium: options.is_premium ?? null,
                include_offline: options.include_offline !== undefined ? !!options.include_offline : true,
                search: options.search || null,
                version: options.version || null,
                min_players: options.min_players ?? null,
                max_players: options.max_players ?? null,
                owned_by: options.owned_by ?? null
            };

            return await this.serverRepository.getPaginated(repoOptions);
        } catch (error) {
            this.log('error', { error: error.message, code: error.code }, 'Failed to get servers');
            throw ErrorHandler.serverError('Nepavyko gauti serverių');
        }
    }

    /**
     * Get server by ID
     */
    async getServerById(id) {
        try {
            const server = await this.serverRepository.findById(id);
            if (!server) {
                throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
            }
            return server;
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { error: error.message, serverId: id }, 'Failed to get server by id');
            throw ErrorHandler.serverError('Nepavyko gauti serverio');
        }
    }

    /**
     * Get server by slug
     */
    async getServerBySlug(slug) {
        try {
            // Get server by querying the database directly for the slug
            const query = `
                SELECT s.*, seo.slug
                FROM servers s
                JOIN server_seo seo ON s.id = seo.server_id
                WHERE seo.slug = $1
            `;
            const result = await this.serverRepository.db.query(query, [slug]);
            
            if (result.rows.length === 0) {
                throw ErrorHandler.createError('Server not found', 404, 'SERVER_NOT_FOUND');
            }
            
            const serverData = result.rows[0];
            const server = await this.serverRepository.findById(serverData.id);
            
            return server;
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { error: error.message }, 'Database error in get server by slug');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Create new server - Clean and Simple
     */
    async createServer(serverData, userId) {
        // 1. Validate input data
        const validation = Validator.validateCreateServer(serverData);
        if (!validation.isValid) {
            const response = Validator.createErrorResponse(validation.errors);
            const error = new Error(response.message);
            error.statusCode = 400;
            error.errorCode = 'VALIDATION_ERROR';
            error.validationResponse = response;
            throw error;
        }

        // 2. Check server limit
        if (this.configService) {
            const maxServers = await this.configService.getMaxServersPerUser();
            const serverCountResult = await this.serverRepository.db.query(
                'SELECT COUNT(*) as count FROM servers WHERE created_by = $1 AND is_active = true',
                [userId]
            );
            const currentCount = parseInt(serverCountResult.rows[0].count);

            if (currentCount >= maxServers) {
                throw ErrorHandler.badRequest(
                    `Jūs jau turite maksimalų serverių skaičių (${maxServers}). Ištrinkite seną serverį, kad galėtumėte pridėti naują.`
                );
            }
        }

        // 3. Check if server types exist
        for (const typeId of serverData.server_type_ids) {
            const serverType = await this.serverTypeRepository.findById(typeId);
            if (!serverType) {
                throw ErrorHandler.notFound(`Serverio tipas su ID ${typeId} nerastas`);
            }
        }

        // 4. Check for duplicate host:port
        const existingServer = await this.serverRepository.findByHostAndPort(
            serverData.host,
            serverData.port || 25565
        );

        if (existingServer) {
            throw ErrorHandler.conflict('Serveris su šiuo adresu ir portu jau egzistuoja');
        }

        // 5. Clean up data
        const cleanData = {
            name: serverData.name.trim(),
            description: serverData.description?.trim() || null,
            host: serverData.host.trim(),
            port: serverData.port || 25565,
            version_id: serverData.version_id || null,
            max_players: 0,
            website: serverData.website?.trim() || null,
            discord_invite: serverData.discord_invite?.trim() || null,
            is_active: true,
            created_by: userId
        };

        try {
            // 6. Create the server
            const server = await this.serverRepository.create(cleanData);
            this.log('info', { serverId: server.id, userId }, 'Server created in database');

            // 7. Set server types
            await this.serverRepository.setServerTypes(server.id, serverData.server_type_ids);

            // 8. Initialize server data
            await this.serverDataRepository.insert({
                server_id: server.id,
                data: {
                    online: false,
                    players: { online: 0, max: 0 },
                    version: null,
                    motd: null,
                    software: null,
                    timestamp: new Date().toISOString(),
                    initial: true
                }
            });

            // 9. Auto-generate SEO data
            if (this.seoService) {
                await this.seoService.generateSeoForServer(server);
            }

            // Server type retrieval
            const serverTypes = await this.serverRepository.getServerTypes(server.id);

            // 10. Start ping (background, non-blocking) 
            this.startPingInBackground(server.id);

            this.log('info', { serverId: server.id, userId }, 'Server created successfully');

            // Return fresh server data
            return await this.serverRepository.findById(server.id);

        } catch (dbError) {
            this.log('error', { error: dbError.message, userId }, 'Database error during server creation');
            throw ErrorHandler.serverError('Nepavyko sukurti serverio');
        }
    }

    /**
     * Generate slug manually from server name
     */
    generateSlug(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    }


    /**
     * Background ping (non-blocking)
     */
    async startPingInBackground(serverId) {
        try {
            const pingResult = await this.serverPingService.pingServer(serverId);
            this.log('info', { serverId, online: pingResult.online }, 'Initial ping completed');
        } catch (pingError) {
            this.log('warn', { serverId, error: pingError.message }, 'Initial ping failed');
        }
    }

    /**
     * Update server
     */
    async updateServer(id, serverData, userId, userRole = 'user') {
        try {
            const existingServer = await this.serverRepository.findById(id);
            if (!existingServer) {
                throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
            }

            // Check permissions (only creator or admin can update)
            if (existingServer.created_by !== userId && userRole !== 'admin') {
                throw ErrorHandler.createError('Galite redaguoti tik savo sukurtus serverius', 403, 'INSUFFICIENT_PERMISSIONS');
            }

            // Filter out admin-only fields for regular users
            const allowedFields = ['name', 'description', 'host', 'port', 'server_type_ids', 'version_id', 'website', 'discord_invite', 'votifier_host', 'votifier_port', 'votifier_token'];
            const filteredData = {};

            Object.keys(serverData).forEach(key => {
                if (allowedFields.includes(key)) {
                    filteredData[key] = serverData[key];
                }
            });

            // Use new validation system for filtered data
            await this.validateServerData(filteredData, 'updateServer');

            // Business logic validation - check server types exist if being updated
            if (filteredData.server_type_ids) {
                for (const typeId of filteredData.server_type_ids) {
                    const serverType = await this.serverTypeRepository.findById(typeId);
                    if (!serverType) {
                        throw ErrorHandler.createError(`Serverio tipas su ID ${typeId} nerastas`, 404, 'SERVER_TYPE_NOT_FOUND');
                    }
                }
            }

            // Normalize website field
            if (filteredData.website && filteredData.website.trim()) {
                filteredData.website = filteredData.website.trim();
            } else if (filteredData.website === '') {
                filteredData.website = null; // Convert empty string to null
            }

            // Check for duplicate host:port only if host or port is actually changing
            if (filteredData.host || filteredData.port) {
                const newHost = filteredData.host || existingServer.host;
                const newPort = filteredData.port || existingServer.port;
                
                // Only check for duplicates if the host/port combination is actually changing
                if (newHost !== existingServer.host || newPort !== existingServer.port) {
                    const duplicateServer = await this.serverRepository.findByHostAndPort(newHost, newPort);
                    if (duplicateServer && parseInt(duplicateServer.id) !== parseInt(id)) {
                        const validation = Validator.createErrorResponse({
                            host: 'Serveris su šiuo adresu ir portu jau egzistuoja'
                        });
                        throw ErrorHandler.createValidationError(validation.errors, validation.message);
                    }
                }
            }

            // Hold onto types if provided; not a column update
            const incomingTypeIds = filteredData.server_type_ids ? [...filteredData.server_type_ids] : null;

            // Ensure we don't pass server_type_ids to repository.update (not a direct column)
            if ('server_type_ids' in filteredData) delete filteredData.server_type_ids;

            let updatedServer = await this.serverRepository.update(id, filteredData);

            // If types provided, update junction table and refetch server
            if (incomingTypeIds) {
                await this.serverRepository.setServerTypes(id, incomingTypeIds);
                updatedServer = await this.serverRepository.findById(id);
            }


            this.log('info', { serverId: id, userId, updatedFields: Object.keys({ ...filteredData, ...(incomingTypeIds ? { server_type_ids: true } : {}) }) }, 'Server updated successfully');
            
            // Update SEO data if name or description changed
            if ((filteredData.name || filteredData.description) && this.seoService) {
                const serverForSeo = await this.serverRepository.findById(id);
                await this.seoService.generateSeoForServer(serverForSeo);
            }
            
            if (filteredData.name || filteredData.description || incomingTypeIds) {
                return await this.serverRepository.findById(id);
            }
            
            return updatedServer;
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { error: error.message }, 'Database error in update server');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Delete server
     */
    async deleteServer(id, userId, userRole = 'user') {
        try {
            const server = await this.serverRepository.findById(id);
            if (!server) {
                throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
            }

            // Check permissions (only creator or admin can delete)
            if (server.created_by !== userId && userRole !== 'admin') {
                throw ErrorHandler.createError('Galite ištrinti tik savo sukurtus serverius', 403, 'INSUFFICIENT_PERMISSIONS');
            }

            const deleted = await this.serverRepository.delete(id);
            if (!deleted) {
                throw ErrorHandler.createError('Nepavyko ištrinti serverio', 500, 'DELETE_FAILED');
            }


            this.log('info', { serverId: id, userId }, 'Server deleted successfully');
            return true;
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { error: error.message }, 'Database error in delete server');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Ping server manually
     */
    async pingServer(id) {
        try {
            const server = await this.serverRepository.findById(id);
            if (!server) {
                throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
            }

            const pingResult = await this.serverPingService.pingServer(id);
            return pingResult;
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { error: error.message }, 'Database error in ping server');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Get server statistics
     */
    async getServerStats() {
        try {
            return await this.serverDataRepository.getServerStats();
        } catch (error) {
            this.log('error', { error: error.message }, 'Database error in get server stats');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Get detailed statistics for a specific server
     */
    async getServerStatsById(serverId) {
        try {
            const stats = await this.serverDataRepository.getServerStatsById(serverId);
            if (!stats) {
                throw ErrorHandler.createError('Serveris nerastas arba neaktyvus', 404, 'SERVER_NOT_FOUND');
            }
            return stats;
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { error: error.message, serverId }, 'Database error in get server stats by id');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Get top servers by player count
     */
    async getTopServers(limit = 10) {
        try {
            return await this.serverDataRepository.getTopServersByPlayers(limit);
        } catch (error) {
            this.log('error', { error: error.message }, 'Database error in get top servers');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Admin: Set or update premium status. If no row exists, create it.
     */
    async setPremium(id, { pinned, premium_until } = {}) {
        try {
            const server = await this.serverRepository.findById(id);
            if (!server) {
                throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
            }

            const pinnedVal = typeof pinned === 'boolean' ? pinned : null;
            const untilVal = premium_until ? new Date(premium_until) : null;

            await this.serverRepository.db.query(
                `INSERT INTO premium_servers (server_id, pinned, premium_until)
                 VALUES ($1, COALESCE($2, true), $3)
                 ON CONFLICT (server_id)
                 DO UPDATE SET
                   pinned = COALESCE($2, premium_servers.pinned),
                   premium_until = COALESCE($3, premium_servers.premium_until)`,
                [id, pinnedVal, untilVal]
            );

            this.log('info', { serverId: id, pinned: pinnedVal, premium_until: untilVal }, 'Premium set/updated');
            return await this.serverRepository.findById(id);
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { error: error.message }, 'Database error in set premium');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Admin: Clear premium status by deleting the premium_servers row
     */
    async clearPremium(id) {
        try {
            const server = await this.serverRepository.findById(id);
            if (!server) {
                throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
            }

            await this.serverRepository.db.query('DELETE FROM premium_servers WHERE server_id = $1', [id]);
            this.log('info', { serverId: id }, 'Premium cleared');
            return await this.serverRepository.findById(id);
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { error: error.message }, 'Database error in clear premium');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Admin: Set pinned flag via upsert
     */
    async setPremiumPinned(id, pinned) {
        try {
            const server = await this.serverRepository.findById(id);
            if (!server) {
                throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
            }

            await this.serverRepository.db.query(
                `INSERT INTO premium_servers (server_id, pinned)
                 VALUES ($1, $2)
                 ON CONFLICT (server_id)
                 DO UPDATE SET pinned = EXCLUDED.pinned`,
                [id, !!pinned]
            );

            this.log('info', { serverId: id, pinned: !!pinned }, 'Premium pinned updated');
            return await this.serverRepository.findById(id);
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { error: error.message }, 'Database error in set premium pinned');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Admin: Set premium_until via upsert (nullable)
     */
    async setPremiumUntil(id, premium_until) {
        try {
            const server = await this.serverRepository.findById(id);
            if (!server) {
                throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
            }

            const untilVal = premium_until ? new Date(premium_until) : null;

            await this.serverRepository.db.query(
                `INSERT INTO premium_servers (server_id, premium_until)
                 VALUES ($1, $2)
                 ON CONFLICT (server_id)
                 DO UPDATE SET premium_until = EXCLUDED.premium_until`,
                [id, untilVal]
            );

            this.log('info', { serverId: id, premium_until: untilVal }, 'Premium until updated');
            return await this.serverRepository.findById(id);
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { error: error.message }, 'Database error in set premium until');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Check if server is owned by user
     */
    async checkServerOwnership(serverId, userId) {
        try {
            const server = await this.serverRepository.findById(serverId);
            if (!server) {
                throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
            }

            return server.isOwnedBy(userId);
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { error: error.message }, 'Database error in check server ownership');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Update specific server field
     */
    async updateServerField(serverId, updateData, userId) {
        try {
            const server = await this.serverRepository.findById(serverId);
            if (!server) {
                throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
            }

            // Check ownership
            if (!server.isOwnedBy(userId)) {
                throw ErrorHandler.createError('Jūs nevaldote šio serverio', 403, 'FORBIDDEN');
            }

            // Use new validation system for update data
            await this.validateServerData(updateData, 'updateServer');

            // Business logic validation - check server types exist if being updated
            if (updateData.server_type_ids) {
                for (const typeId of updateData.server_type_ids) {
                    const serverType = await this.serverTypeRepository.findById(typeId);
                    if (!serverType) {
                        throw ErrorHandler.createError(`Serverio tipas su ID ${typeId} nerastas`, 400, 'INVALID_SERVER_TYPE');
                    }
                }
            }

            // Check for host/port conflicts if updating IP
            if (updateData.host || updateData.port) {
                const host = updateData.host || server.host;
                const port = updateData.port || server.port;

                const existingServer = await this.serverRepository.findByHostAndPort(host, port);
                if (existingServer && existingServer.id !== serverId) {
                    throw ErrorHandler.createError('Serveris su šiuo adresu ir portu jau egzistuoja', 400, 'DUPLICATE_HOST_PORT');
                }
            }

            // Update the server
            const updatedServer = await this.serverRepository.update(serverId, updateData);


            this.log('info', {
                serverId,
                userId,
                updatedFields: Object.keys(updateData)
            }, 'Server field updated successfully');

            return updatedServer;
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { error: error.message }, 'Database error in update server field');
            throw ErrorHandler.serverError('Duomenų bazės klaida');
        }
    }

    /**
     * Validate server data using new validation system
     */
    async validateServerData(data, schemaName) {
        const ValidationErrorFormatter = require('../../../shared/validation/ValidationErrorFormatter');
        const schemaRegistry = require('../../../shared/validation/SchemaRegistry');
        const Ajv = require('ajv');
        const addFormats = require('ajv-formats');

        try {
            // Initialize schema registry if not already done
            if (schemaRegistry.getNames().length === 0) {
                schemaRegistry.initialize();
            }

            // Get schema
            if (!schemaRegistry.has(schemaName)) {
                throw ErrorHandler.createError(`Validacijos schema '${schemaName}' nerasta`, 500, 'VALIDATION_SCHEMA_NOT_FOUND');
            }

            const schema = schemaRegistry.get(schemaName);

            // Create AJV instance with formats
            const ajv = new Ajv({ allErrors: true });
            addFormats(ajv);

            // Compile and validate
            const validate = ajv.compile(schema);
            const isValid = validate(data);

            if (!isValid) {
                const formattedErrors = ValidationErrorFormatter.formatErrors(validate.errors);
                const summary = ValidationErrorFormatter.createSummary(formattedErrors);

                // Throw validation error with formatted Lithuanian messages
                const validationError = ErrorHandler.createError(summary, 400, 'VALIDATION_ERROR');
                validationError.details = formattedErrors;
                validationError.validation = validate.errors; // Add original AJV errors for error handler
                throw validationError;
            }

            return true;
        } catch (error) {
            if (error.statusCode) throw error;
            this.log('error', { data, schemaName, error: error.message }, 'Validation failed');
            throw ErrorHandler.createError('Validacijos klaida', 500, 'VALIDATION_SYSTEM_ERROR');
        }
    }
}

module.exports = ServerService;