'use strict'

const axios = require('axios');
const crypto = require('crypto');

/**
 * Enhanced Security Service
 * Handles comprehensive bot detection, device fingerprinting, and security scoring
 */
class SecurityService {
    constructor(logger, db = null, configService = null) {
        this.logger = logger;
        this.db = db;
        this.configService = configService;
        
        // Security thresholds
        this.RISK_THRESHOLDS = {
            LOW: 30,
            MEDIUM: 50,
            HIGH: 70,
            CRITICAL: 85
        };
    }

    /**
     * Verify reCAPTCHA token
     * @param {string} token - reCAPTCHA token
     * @param {string} remoteip - Client IP address
     * @returns {Promise<Object>} Verification result
     */
    async verifyRecaptcha(token, remoteip) {
        const recaptchaEnabled = this.configService 
            ? await this.configService.get('recaptcha.enabled', false)
            : false;
        
        if (!recaptchaEnabled) {
            this.logger.warn('reCAPTCHA verification skipped - disabled in config');
            return {
                success: true,
                score: 0.5,
                action: 'vote',
                challenge_ts: new Date().toISOString(),
                hostname: 'localhost'
            };
        }

        const recaptchaSecret = this.configService 
            ? await this.configService.get('recaptcha.secret_key')
            : null;

        if (!recaptchaSecret) {
            this.logger.warn('reCAPTCHA verification skipped - no secret key configured');
            return {
                success: true,
                score: 0.5,
                action: 'vote',
                challenge_ts: new Date().toISOString(),
                hostname: 'localhost'
            };
        }

        try {
            const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
                params: {
                    secret: recaptchaSecret,
                    response: token,
                    remoteip: remoteip
                },
                timeout: 5000
            });

            const result = response.data;
            
            this.logger.info({
                success: result.success,
                score: result.score,
                action: result.action,
                hostname: result.hostname,
                'error-codes': result['error-codes'],
                challenge_ts: result.challenge_ts,
                token_prefix: token?.substring(0, 20),
                remoteip: remoteip
            }, 'reCAPTCHA verification completed');

            return result;
        } catch (error) {
            this.logger.error({
                error: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                responseData: error.response?.data,
                token: token?.substring(0, 20) + '...',
                remoteip: remoteip,
                isTimeout: error.code === 'ECONNABORTED',
                isNetworkError: !error.response
            }, 'reCAPTCHA verification failed');

            // Return failure for network errors
            return {
                success: false,
                score: 0,
                'error-codes': ['network-error']
            };
        }
    }

    /**
     * Check if IP address is private/local
     * @param {string} ip - IP address
     * @returns {boolean} True if private IP
     */
    isPrivateIP(ip) {
        const privateRanges = [
            /^127\./,           // 127.0.0.0/8
            /^10\./,            // 10.0.0.0/8
            /^172\.(1[6-9]|2\d|3[01])\./,  // 172.16.0.0/12
            /^192\.168\./,      // 192.168.0.0/16
            /^::1$/,            // IPv6 localhost
            /^fc00:/,           // IPv6 private
            /^fe80:/            // IPv6 link-local
        ];

        return privateRanges.some(range => range.test(ip)) || ip === 'localhost';
    }

    /**
     * Check IP against AbuseIPDB
     * @param {string} ipAddress - IP address to check
     * @returns {Promise<Object>} AbuseIPDB analysis result
     */
    async checkAbuseIPDB(ipAddress) {
        try {
            // Skip for localhost/private IPs
            if (this.isPrivateIP(ipAddress)) {
                return {
                    ipAddress,
                    isPublic: false,
                    abuseConfidenceScore: 0,
                    isAbusive: false,
                    countryCode: null,
                    reports: []
                };
            }

            // Get API key from config
            const apiKey = this.configService 
                ? await this.configService.get('security.ip_abusedbip_api_key')
                : null;

            if (!apiKey) {
                this.logger.warn('AbuseIPDB API key not configured');
                return {
                    error: 'API key not configured',
                    ipAddress,
                    timestamp: new Date().toISOString()
                };
            }

            const response = await axios.get('https://api.abuseipdb.com/api/v2/check', {
                params: {
                    ipAddress: ipAddress,
                    maxAgeInDays: 90,
                    verbose: true
                },
                headers: {
                    'Key': apiKey,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });

            // Return the full data object from AbuseIPDB
            const data = response.data.data;
            
            this.logger.info({
                ipAddress,
                abuseConfidenceScore: data.abuseConfidenceScore,
                isAbusive: data.abuseConfidenceScore > 25,
                countryCode: data.countryCode,
                reportCount: data.totalReports
            }, 'AbuseIPDB check completed');

            // Add isAbusive flag based on confidence score
            return {
                ...data,
            };
        } catch (error) {
            this.logger.error({
                error: error.message,
                status: error.response?.status,
                ipAddress
            }, 'AbuseIPDB check failed');
            return null;
        }
    }
}

module.exports = SecurityService;