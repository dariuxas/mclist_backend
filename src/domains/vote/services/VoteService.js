'use strict'

const Validator = require('../../../lib/Validator');
const ErrorHandler = require('../../../lib/ErrorHandler');
const axios = require('axios');

/**
 * Vote Service
 * Handles vote operations
 */
class VoteService {
    constructor(voteRepository, voteStatsRepository, votifierService, securityService, configService, seoService, serverService, logger) {
        this.voteRepository = voteRepository;
        this.voteStatsRepository = voteStatsRepository;
        this.votifierService = votifierService;
        this.securityService = securityService;
        this.configService = configService;
        this.seoService = seoService;
        this.serverService = serverService;
        
        // Inject database connection to security service
        if (this.securityService && this.voteRepository?.db) {
            this.securityService.db = this.voteRepository.db;
        }
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
     * Get top voters (by username) for a server
     * @param {number} serverId
     * @param {number} limit
     * @returns {Promise<Array<{username: string, vote_count: number}>>}
     */
    async getTopVotersByServer(serverId, limit = 10) {
        try {
            if (!serverId || isNaN(serverId) || serverId <= 0) {
                throw ErrorHandler.createError('Neteisingas serverio ID', 400, 'INVALID_SERVER_ID');
            }

            // Ensure server exists
            const existsQuery = 'SELECT id FROM servers WHERE id = $1';
            const exists = await this.voteRepository.db.query(existsQuery, [serverId]);
            if (exists.rows.length === 0) {
                throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
            }

            const safeLimit = Math.max(1, Math.min(parseInt(limit) || 10, 50));
            return await this.voteRepository.getTopVotersByServer(serverId, safeLimit);
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            this.log('error', { error: error.message }, 'Vote error: get top voters by server');
            throw ErrorHandler.serverError('Balsavimo klaida');
        }
    }

    /**
     * Create new vote
     * @param {Object} voteData - Vote data
     * @returns {Promise<VoteDTO>} Created vote
     */
    async createVote(voteData) {
        try {
            // Validate required fields
            if (!voteData.server_id || !voteData.username || !voteData.ip_address) {
                throw ErrorHandler.createError('Trūksta privalomų laukų', 400, 'MISSING_REQUIRED_FIELDS');
            }

            // Check if user can vote (early check to avoid expensive operations)
            const canVote = await this.canVoteForServer(voteData.server_id, voteData.ip_address);
            if (!canVote.can_vote) {
                throw ErrorHandler.createError('Tu jau esi prabalsavęs už šį serverį, balsuoti galėsi rytoj.', 409, 'ALREADY_VOTED_TODAY');
            }

            // Check if server exists and is active
            const serverQuery = `SELECT id, is_active FROM servers WHERE id = $1`;
            const serverResult = await this.voteRepository.db.query(serverQuery, [voteData.server_id]);

            if (serverResult.rows.length === 0) {
                throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
            }

            const server = serverResult.rows[0];
            if (!server.is_active) {
                throw ErrorHandler.createError('Serveris neaktyvus', 400, 'SERVER_NOT_ACTIVE');
            }

            // Verify reCAPTCHA if enabled
            const recaptchaResult = await this.securityService.verifyRecaptcha(
                voteData.recaptcha_token, 
                voteData.ip_address
            );

            if (!recaptchaResult.success && !recaptchaResult.disabled) {
                throw ErrorHandler.createError('reCAPTCHA patvirtinimas nepavyko', 400, 'RECAPTCHA_FAILED');
            }

            // Get AbuseIPDB analysis
            let abuseIpData = {};
            try {
                const result = await this.securityService.checkAbuseIPDB(voteData.ip_address);
                if (result) {
                    abuseIpData = result;
                    this.log('info', { 
                        ipAddress: voteData.ip_address, 
                        abuseScore: result.abuseConfidenceScore 
                    }, 'AbuseIPDB analysis completed');
                } else {
                    this.log('warn', { ipAddress: voteData.ip_address }, 'AbuseIPDB analysis returned null');
                }
            } catch (error) {
                this.log('error', { 
                    error: error.message, 
                    ipAddress: voteData.ip_address 
                }, 'Failed to get AbuseIPDB analysis');
                abuseIpData = { error: 'Analysis failed', timestamp: new Date().toISOString() };
            }

            // Create vote data
            const finalVoteData = {
                server_id: voteData.server_id,
                username: voteData.username.trim(),
                ip_address: voteData.ip_address,
                user_agent: voteData.user_agent,
                headers: voteData.headers,
                recaptcha_token: voteData.recaptcha_token,
                recaptcha_score: recaptchaResult.score,
                referrer: voteData.headers?.referer || voteData.headers?.referrer,
                verification_score: 0,
                ip_analysis: abuseIpData
            };

            // Create the vote
            const vote = await this.voteRepository.create(finalVoteData);

            // Update vote statistics
            await this.voteStatsRepository.incrementVoteCount(voteData.server_id);

            // Send to votifier
            if (this.votifierService) {
                try {
                    const votifierConfig = await this.votifierService.getVotifierByServerId(voteData.server_id);
                    if (votifierConfig && votifierConfig.is_enabled) {
                        const votifierResponse = await this.sendToVotifier(votifierConfig, finalVoteData);

                        // Update vote with votifier response
                        await this.voteRepository.update(vote.id, {
                            votifier_sent: votifierResponse.success,
                            votifier_response: votifierResponse.message
                        });
                    }
                } catch (votifierError) {
                    this.log('warn', {
                        voteId: vote.id,
                        serverId: voteData.server_id,
                        error: votifierError.message
                    }, 'Failed to send vote to votifier');
                }
            }

            this.log('info', {
                voteId: vote.id,
                serverId: voteData.server_id,
                username: voteData.username
            }, 'Vote created successfully');

            // Update SEO data with new vote count for rating calculation
            try {
                if (this.seoService && this.serverService) {
                    const server = await this.serverService.getServerById(voteData.server_id);
                    if (server) {
                        await this.seoService.generateSeoForServer(server);
                        this.log('info', { serverId: voteData.server_id }, 'SEO data updated after vote');
                    }
                }
            } catch (seoError) {
                this.log('warn', { 
                    serverId: voteData.server_id, 
                    error: seoError.message 
                }, 'Failed to update SEO data after vote');
            }

            return vote;
        } catch (error) {
            // Handle unique constraint violation for daily vote limit
            if (error.message && error.message.includes('idx_server_votes_daily_limit')) {
                throw ErrorHandler.createError('Tu jau esi prabalsavęs už šį serverį, balsuoti galėsi rytoj.', 409, 'ALREADY_VOTED_TODAY');
            }

            if (error.statusCode) {
                throw error;
            }
            this.log('error', { error: error.message }, 'Vote error: create vote');
            throw ErrorHandler.serverError('Balsavimo klaida');
        }
    }

    /**
     * Get votes for server (only for server owners and admins)
     * @param {number} serverId - Server ID
     * @param {Object} options - Query options
     * @param {number} userId - User ID requesting the votes
     * @param {string} userRole - User role
     * @returns {Promise<Object>} Votes with pagination
     */
    async getServerVotes(serverId, options = {}, userId, userRole) {
        try {
            // Check if user has permission to view votes
            if (userRole !== 'admin') {
                const serverQuery = `
                    SELECT created_by FROM servers WHERE id = $1
                `;
                const serverResult = await this.voteRepository.db.query(serverQuery, [serverId]);
                
                if (serverResult.rows.length === 0) {
                    throw ErrorHandler.createError('Serveris nerastas', 404, 'SERVER_NOT_FOUND');
                }
                
                const server = serverResult.rows[0];
                if (server.created_by !== userId) {
                    throw ErrorHandler.createError('Prieiga uždrausta. Tik serverio savininkai ir administratoriai gali peržiūrėti balsus.', 403, 'ACCESS_DENIED');
                }
            }

            const { page = 1, limit = 20 } = options;
            const offset = (page - 1) * limit;

            const votes = await this.voteRepository.findByServerId(serverId, {
                limit,
                offset,
                includeServer: true
            });

            const total = await this.voteRepository.count({ server_id: serverId });

            return {
                votes,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            this.log('error', { error: error.message }, 'Vote error: get server votes');
            throw ErrorHandler.serverError('Balsavimo klaida');
        }
    }

    /**
     * Delete vote (admin only)
     * @param {number} voteId - Vote ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteVote(voteId) {
        try {
            const existingVote = await this.voteRepository.findById(voteId);
            if (!existingVote) {
                throw ErrorHandler.createError('Balsas nerastas', 404, 'VOTE_NOT_FOUND');
            }

            const deleted = await this.voteRepository.delete(voteId);

            this.log('info', {
                voteId
            }, 'Vote deleted successfully');

            return deleted;
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            this.log('error', { error: error.message }, 'Vote error: delete vote');
            throw ErrorHandler.serverError('Balsavimo klaida');
        }
    }

    /**
     * Get vote analytics
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Vote analytics
     */
    async getVoteAnalytics(options = {}) {
        try {
            return await this.voteStatsRepository.getVoteAnalytics(options);
        } catch (error) {
            this.log('error', { error: error.message }, 'Vote error: get vote analytics');
            throw ErrorHandler.serverError('Balsavimo klaida');
        }
    }

    /**
     * Check if user can vote for server
     * @param {number} serverId - Server ID
     * @param {string} ipAddress - IP address
     * @returns {Promise<Object>} Can vote status
     */
    async canVoteForServer(serverId, ipAddress) {
        try {
            // Check daily voting limit (24 hours) - optimized query
            const limitQuery = `
                SELECT 
                    1 as found,
                    created_at as last_vote,
                    (created_at + INTERVAL '24 hours') as next_vote_time,
                    EXTRACT(EPOCH FROM ((created_at + INTERVAL '24 hours') - NOW()))::int as remaining_seconds
                FROM server_votes 
                WHERE server_id = $1 
                AND ip_address = $2
                AND created_at > NOW() - INTERVAL '24 hours'
                ORDER BY created_at DESC
                LIMIT 1
            `;
            
            const limitResult = await this.voteRepository.db.query(limitQuery, [serverId, ipAddress]);
            const hasVotedRecently = limitResult.rows.length > 0;

            if (hasVotedRecently) {
                const row = limitResult.rows[0];
                const remainingSeconds = Math.max(0, row.remaining_seconds || 0);
                const nextVoteTime = new Date(row.next_vote_time);

                // If somehow remaining time is 0 or negative, allow voting
                if (remainingSeconds <= 0) {
                    return {
                        can_vote: true,
                        reason: 'Eligible to vote',
                        next_vote_time: null,
                    };
                }

                // Calculate time remaining (hours/minutes)
                const hours = Math.floor(remainingSeconds / 3600);
                const minutes = Math.floor((remainingSeconds % 3600) / 60);

                let timeMessage;
                if (hours > 0) {
                    timeMessage = minutes > 0 ? `už ${hours} val. ${minutes} min.` : `už ${hours} val.`;
                } else if (minutes > 0) {
                    timeMessage = `už ${minutes} min.`;
                } else {
                    timeMessage = 'už kelių sekundžių';
                }

                return {
                    can_vote: false,
                    reason: `Balsuoti galima tik vieną kartą per dieną, balsuoti galėsi ${timeMessage}`,
                    next_vote_time: nextVoteTime.toISOString(),
                };
            }

            return {
                can_vote: true,
                reason: 'Eligible to vote',
                next_vote_time: null,
            };
        } catch (error) {
            this.log('error', { error: error.message, serverId, ipAddress }, 'Error checking vote eligibility');
            this.log('error', { error: error.message }, 'Vote error: check can vote');
            throw ErrorHandler.serverError('Balsavimo klaida');
        }
    }

    /**
     * Send vote to votifier via mcstatus.io API (token-only)
     * @param {Object} votifierConfig
     * @param {Object} voteData
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async sendToVotifier(votifierConfig, voteData) {
        try {
            if (!votifierConfig?.host || !votifierConfig?.token) {
                throw new Error('Invalid Votifier configuration: host and token are required');
            }

            const url = 'https://api.mcstatus.io/v2/vote';
            const params = {
                host: votifierConfig.host,
                port: votifierConfig.port || 8192,
                timeout: 5.0,
                username: voteData.username,
                serviceName: 'mclist',
                token: votifierConfig.token,
                ip: voteData.ip_address
            };

            const response = await axios.post(url, null, { params, timeout: 5000 });
            const ok = response.status >= 200 && response.status < 300;

            this.log('info', {
                serverId: votifierConfig.server_id,
                username: voteData.username,
                status: response.status
            }, 'Sent vote via mcstatus.io API');

            return {
                success: ok,
                message: ok ? `mcstatus.io vote sent (status ${response.status})` : `mcstatus.io responded with status ${response.status}`
            };
        } catch (error) {
            const status = error.response?.status;
            const data = error.response?.data;
            this.log('warn', {
                serverId: votifierConfig?.server_id,
                username: voteData?.username,
                status,
                data
            }, 'Failed to send vote via mcstatus.io API');
            return {
                success: false,
                message: status ? `mcstatus.io error ${status}: ${typeof data === 'string' ? data : JSON.stringify(data)}` : error.message
            };
        }
    }
}

module.exports = VoteService;