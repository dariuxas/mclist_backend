'use strict';

const DateUtils = require('../../../utils/dateUtils');

/**
 * Minecraft Server Ping Service using mcsrvstat.us API
 * Simple and reliable server status checking with rich data
 */
class ServerPingService {
    constructor(serverRepository, serverDataRepository, configService, logger) {
        this.serverRepository = serverRepository;
        this.serverDataRepository = serverDataRepository;
        this.configService = configService;
        this.logger = logger;
        this.activePings = new Set();

        // mcsrvstat.us API configuration
        this.apiBaseUrl = 'https://api.mcsrvstat.us/3';
        this.requestTimeout = 10000; // 10 seconds
        this.maxConcurrentPings = 20; // Lower since we're using external API
        this.retryAttempts = 2;
        this.retryDelay = 2000; // 2 seconds between retries

        // Cache settings (mcsrvstat.us caches for 5 minutes)
        this.cacheInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
        // Scheduler drift buffer to avoid boundary issues where last ping is a second after the batch start
        this.schedulerDriftBufferMs = 10 * 1000; // 10 seconds
    }

    /**
     * Ping a server by ID using mcsrvstat.us API
     */
    async pingServer(serverId, options = {}) {
        const startTime = Date.now();

        try {
            if (this.activePings.size >= this.maxConcurrentPings) {
                throw new Error('Too many concurrent pings - rate limited');
            }

            const server = await this.serverRepository.findById(serverId);
            if (!server) {
                throw new Error('Server not found');
            }

            this.activePings.add(serverId);

            // Check if we have recent data (within cache interval)
            const recentData = await this.getRecentServerData(serverId);
            if (recentData && !options.forceRefresh) {
                this.logger.debug({ serverId }, 'Using cached server data');
                return this.formatServerResponse(recentData);
            }

            // Fetch fresh data from API
            for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
                try {
                    if (attempt > 0) {
                        await this.sleep(this.retryDelay * attempt);
                        this.logger.debug({ serverId, attempt }, 'Retrying server ping');
                    }

                    const apiData = await this.fetchServerStatus(server.host, server.port);
                    const serverData = await this.processAndStoreServerData(serverId, apiData);
                    const pingTime = Date.now() - startTime;

                    this.logger.debug({
                        serverId,
                        host: server.host,
                        port: server.port,
                        online: apiData.online,
                        pingTime,
                        attempt: attempt + 1
                    }, 'Server ping completed successfully');

                    return {
                        server_id: serverId,
                        online: serverData.data?.online ?? false,
                        data: serverData.data,
                        ping_time: pingTime,
                        timestamp: DateUtils.toLithuanianTime(new Date())
                    };

                } catch (error) {
                    if (attempt === this.retryAttempts) {
                        throw error;
                    }
                }
            }

        } catch (error) {
            const pingTime = Date.now() - startTime;
            await this.handlePingError(serverId, error, pingTime);

            this.logger.warn({
                serverId,
                error: error.message,
                pingTime
            }, 'Server ping failed after all retries');

            return {
                server_id: serverId,
                online: false,
                error: error.message,
                ping_time: pingTime,
                timestamp: DateUtils.toLithuanianTime(new Date())
            };

        } finally {
            this.activePings.delete(serverId);
        }
    }

    /**
     * Normalize mcsrvstat.us payload to our stored schema
     */
    normalizeApiData(apiData) {
        // Online flag
        const online = Boolean(apiData.online);

        // Players
        const playersRaw = apiData.players || {};
        const players = {
            online: Number.isFinite(playersRaw.online) ? playersRaw.online : (parseInt(playersRaw.online) || 0),
            max: Number.isFinite(playersRaw.max) ? playersRaw.max : (playersRaw.max != null ? parseInt(playersRaw.max) : null)
        };
        if (Array.isArray(playersRaw.list)) {
            players.list = playersRaw.list.map(p => ({ name: p.name, uuid: p.uuid })).filter(p => p.name);
        }

        // Version cleanup
        let version = apiData.protocol?.name || apiData.version || null;
        if (typeof version === 'string') {
            // Example messy string: "Purpur 2.0.3 ⇒ 1.21.8 | 6/820"
            if (version.includes('⇒')) {
                version = version.split('⇒').pop().trim();
            }
            // Drop anything after a pipe like "| 6/820"
            if (version.includes('|')) {
                version = version.split('|')[0].trim();
            }
            // Keep only reasonable version token (e.g., 1.21.4 / 1.21.5)
            const match = version.match(/\b\d+\.\d+(?:\.\d+)?\b/);
            if (match) {
                version = match[0];
            }
        }

        // MOTD
        const motd = apiData.motd ? {
            raw: Array.isArray(apiData.motd.raw) ? apiData.motd.raw : [],
            clean: Array.isArray(apiData.motd.clean) ? apiData.motd.clean : [],
            html: Array.isArray(apiData.motd.html) ? apiData.motd.html : []
        } : null;

        // Software and icon
        const software = apiData.software || null;
        const icon = apiData.icon || null;

        return {
            online,
            players,
            version,
            motd,
            software,
            icon
        };
    }

    /**
     * Fetch server status from mcsrvstat.us API
     */
    async fetchServerStatus(host, port = 25565) {
        const serverAddress = port === 25565 ? host : `${host}:${port}`;
        const apiUrl = `${this.apiBaseUrl}/${encodeURIComponent(serverAddress)}`;

        this.logger.debug({ apiUrl, host, port }, 'Fetching server status from API');

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'MCList-API/1.0',
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data) {
                throw new Error('API returned null or empty response');
            }

            this.logger.debug({
                host,
                port,
                online: data.online,
                hasPlayers: !!data.players,
                hasMotd: !!data.motd
            }, 'API response received');

            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error(`API request timeout after ${this.requestTimeout}ms`);
            }
            throw new Error(`API request failed: ${error.message}`);
        }
    }

    /**
     * Process and store server data from API response
     */
    async processAndStoreServerData(serverId, apiData) {
        try {
            // Ensure apiData is not null/undefined
            if (!apiData) {
                throw new Error('API data is null or undefined');
            }

            // Normalize external API data into our stable shape
            const normalized = this.normalizeApiData(apiData);

            const serverData = {
                server_id: serverId,
                data: normalized
            };

            await this.serverDataRepository.insert(serverData);

            // Update server's max_players if available and different
            if (apiData.online && apiData.players?.max) {
                const server = await this.serverRepository.findById(serverId);
                if (server && apiData.players.max !== server.max_players) {
                    await this.serverRepository.update(serverId, {
                        max_players: apiData.players.max
                    });
                }
            }

            return serverData;

        } catch (error) {
            this.logger.error({
                serverId,
                error: error.message,
                apiDataKeys: Object.keys(apiData)
            }, 'Failed to store server data');
            throw error;
        }
    }

    /**
     * Handle ping errors by storing offline status
     */
    async handlePingError(serverId, error, pingTime) {
        try {
            const errorData = {
                server_id: serverId,
                data: {
                    online: false,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                    ping_time: pingTime
                }
            };

            await this.serverDataRepository.insert(errorData);
        } catch (updateError) {
            this.logger.error({
                serverId,
                error: updateError.message,
                originalError: error.message
            }, 'Failed to store error data');
        }
    }

    /**
     * Get recent server data from database (within cache interval)
     * Excludes initial/placeholder data to ensure real API data is used
     */
    async getRecentServerData(serverId) {
        try {
            const cutoffTime = new Date(Date.now() - this.cacheInterval);

            const query = `
                SELECT data, created_at 
                FROM server_data 
                WHERE server_id = $1 
                AND created_at > $2 
                AND (data->>'initial') IS NULL
                ORDER BY created_at DESC 
                LIMIT 1
            `;

            const result = await this.serverDataRepository.db.query(query, [serverId, cutoffTime]);

            if (result.rows.length > 0) {
                return {
                    data: result.rows[0].data,
                    created_at: result.rows[0].created_at
                };
            }

            return null;
        } catch (error) {
            this.logger.warn({ serverId, error: error.message }, 'Failed to get recent server data');
            return null;
        }
    }

    /**
     * Format server response for consistent API
     */
    formatServerResponse(serverData) {
        const data = serverData.data;
        return {
            server_id: data.server_id || serverData.server_id,
            online: data.online || false,
            data: data,
            cached: true,
            timestamp: DateUtils.toLithuanianTime(serverData.created_at || new Date())
        };
    }

    /**
     * Batch ping multiple servers
     */
    async pingServers(serverIds, options = {}) {
        const { batchSize = 5, delayBetweenBatches = 1000 } = options; // Smaller batches for API
        const results = [];

        for (let i = 0; i < serverIds.length; i += batchSize) {
            const batch = serverIds.slice(i, i + batchSize);

            const batchResults = await Promise.allSettled(
                batch.map(serverId => this.pingServer(serverId, options))
            );

            const processedResults = batchResults.map((result, index) => ({
                server_id: batch[index],
                success: result.status === 'fulfilled',
                data: result.status === 'fulfilled' ? result.value : null,
                error: result.status === 'rejected' ? result.reason.message : null,
                timestamp: DateUtils.toLithuanianTime(new Date())
            }));

            results.push(...processedResults);

            // Longer delay between batches to respect API limits
            if (i + batchSize < serverIds.length && delayBetweenBatches > 0) {
                await this.sleep(delayBetweenBatches);
            }
        }

        return results;
    }

    /**
     * Ping all servers that need updating
     */
    async pingAllServers(options = {}) {
        const { maxServers = 100 } = options;

        try {
            // Get servers that haven't been pinged recently (older than cache interval)
            // Compute cutoff on DB side to avoid timezone mismatches
            const servers = await this.serverRepository.findServersForPing({
                limit: maxServers,
                olderThanMs: this.cacheInterval
            });

            // Diagnostic: log cutoff info and selection size
            const jsCutoffIso = new Date(Date.now() - this.cacheInterval).toISOString();
            this.logger.debug({
                olderThanMs: this.cacheInterval,
                jsCutoffIso,
                selectedCount: servers.length
            }, 'Ping selection window');

            if (servers.length === 0) {
                this.logger.debug('No servers need pinging at this time');
                return { pinged: 0, results: [] };
            }

            // Log which servers are selected with their last ping times for visibility
            this.logger.info({
                count: servers.length,
                servers: servers.map(s => ({ id: s.id, last_ping_at: s.last_ping_at }))
            }, 'Starting server ping batch');

            const startTime = Date.now();
            const results = await this.pingServers(servers.map(s => s.id), options);
            const duration = Date.now() - startTime;

            const successful = results.filter(r => r.success).length;
            const failed = results.length - successful;

            this.logger.info({
                total: servers.length,
                successful,
                failed,
                duration
            }, 'Server ping batch completed');

            return {
                pinged: servers.length,
                successful,
                failed,
                duration,
                results
            };

        } catch (error) {
            this.logger.error({ error: error.message }, 'Failed to ping servers');
            throw error;
        }
    }

    /**
     * Start ping scheduler (runs every 5 minutes to respect API cache)
     */
    async startPingScheduler(intervalMs = null) {
        if (this.pingScheduler) {
            this.logger.warn('Ping scheduler already running');
            return;
        }

        // Default to 5 minutes plus small buffer to avoid boundary misses
        if (intervalMs === null) {
            intervalMs = this.cacheInterval + this.schedulerDriftBufferMs;
        }

        this.logger.info({ intervalMs }, 'Starting ping scheduler');

        this.pingScheduler = setInterval(async () => {
            try {
                await this.pingAllServers({ forceRefresh: true });
            } catch (error) {
                this.logger.error({ error: error.message }, 'Scheduled ping batch failed');
            }
        }, intervalMs);
    }

    /**
     * Stop ping scheduler
     */
    stopPingScheduler() {
        if (this.pingScheduler) {
            clearInterval(this.pingScheduler);
            this.pingScheduler = null;
            this.logger.info('Ping scheduler stopped');
        }
    }

    /**
     * Get server statistics from stored data
     */
    async getServerStats(serverId, options = {}) {
        const { days = 7 } = options;

        try {
            const cutoffTime = new Date();
            cutoffTime.setDate(cutoffTime.getDate() - days);

            const query = `
                SELECT 
                    data,
                    created_at,
                    (data->>'online')::boolean as online,
                    (data->'players'->>'online')::integer as online_players,
                    (data->'players'->>'max')::integer as max_players
                FROM server_data 
                WHERE server_id = $1 
                AND created_at > $2 
                ORDER BY created_at DESC
            `;

            const result = await this.serverDataRepository.db.query(query, [serverId, cutoffTime]);

            if (result.rows.length === 0) {
                return null;
            }

            const records = result.rows;
            const onlineRecords = records.filter(r => r.online);

            return {
                server_id: serverId,
                total_checks: records.length,
                online_checks: onlineRecords.length,
                uptime_percentage: (onlineRecords.length / records.length) * 100,
                avg_players: onlineRecords.length > 0
                    ? onlineRecords.reduce((sum, r) => sum + (r.online_players || 0), 0) / onlineRecords.length
                    : 0,
                max_players_seen: Math.max(...records.map(r => r.max_players || 0)),
                last_seen_online: onlineRecords.length > 0 ? onlineRecords[0].created_at : null,
                period_days: days
            };

        } catch (error) {
            this.logger.error({ serverId, error: error.message }, 'Failed to get server stats');
            throw error;
        }
    }

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ServerPingService;