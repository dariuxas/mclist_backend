'use strict'

const Validator = require('../../../lib/Validator');
const ErrorHandler = require('../../../lib/ErrorHandler');
const AuthUserDTO = require('../dto/AuthUserDTO');
const bcrypt = require('bcrypt');

/**
 * Auth Service
 * Handles authentication operations using modern DTO pattern
 */
class AuthService {
    constructor(userRepository, userProfileAggregator, jwtUtils, securityService, configService, loginLogRepository, logger) {
        this.userRepository = userRepository;
        this.userProfileAggregator = userProfileAggregator;
        this.jwtUtils = jwtUtils;
        this.securityService = securityService;
        this.configService = configService;
        this.loginLogRepository = loginLogRepository;
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
     * Hash password using bcrypt
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    async hashPassword(password) {
        return await bcrypt.hash(password, 10);
    }

    /**
     * Verify password against hash
     * @param {string} password - Plain text password
     * @param {string} hash - Hashed password
     * @returns {Promise<boolean>} True if password matches
     */
    async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Register new user
     * @param {Object} userData - User registration data
     * @param {Object} requestInfo - Request information (IP, user agent, etc.)
     * @returns {Promise<AuthUserDTO>} Registered user with tokens
     */
    async register(userData, requestInfo = {}) {
        try {
            const { email, password, password_confirmation, recaptcha_token } = userData;
            const { ipAddress = 'unknown', userAgent = 'unknown' } = requestInfo;

            // 1. Validate input data
            const validation = Validator.validateRegister(userData);
            if (!validation.isValid) {
                const response = Validator.createErrorResponse(validation.errors);
                const error = new Error(response.message);
                error.statusCode = 400;
                error.errorCode = 'VALIDATION_ERROR';
                error.validationResponse = response;
                throw error;
            }

            // Verify reCAPTCHA if enabled
            if (this.securityService && this.configService) {
                const isRecaptchaEnabled = await this.configService.isRecaptchaEnabled();
                
                if (isRecaptchaEnabled) {
                    // Check if token is provided and not null/empty
                    if (!recaptcha_token || recaptcha_token === null || (typeof recaptcha_token === 'string' && recaptcha_token.trim() === '')) {
                        throw ErrorHandler.createError('reCAPTCHA patvirtinimas reikalingas', 400, 'RECAPTCHA_REQUIRED');
                    }

                    const recaptchaResult = await this.securityService.verifyRecaptcha(
                        recaptcha_token, 
                        ipAddress, 
                        'register'
                    );

                    if (!recaptchaResult.success && !recaptchaResult.disabled) {
                        throw ErrorHandler.createError('reCAPTCHA patvirtinimas nepavyko', 400, 'RECAPTCHA_FAILED');
                    }

                    // Check minimum score if enabled
                    if (recaptchaResult.score !== undefined) {
                        const minScore = await this.configService.getRecaptchaMinScore();
                        if (recaptchaResult.score < minScore) {
                            throw ErrorHandler.createError('reCAPTCHA įvertinimas per žemas', 400, 'RECAPTCHA_LOW_SCORE');
                        }
                    }
                }
            }

            // Check if user already exists
            const existingUserByEmail = await this.userRepository.findByEmail(email);
            if (existingUserByEmail) {
                throw ErrorHandler.conflict('Toks el. pašto adresas jau egzistuoja');
            }

            // Hash password and create user with proper field names
            const hashedPassword = await this.hashPassword(password);

            const user = await this.userRepository.create({
                email,
                password_hash: hashedPassword,
                role: 'user'
            });

            // Get complete user profile using aggregator
            const userWithCompleteProfile = await this.userProfileAggregator.getUserProfile(user.id, {
                includePrivateData: true
            });

            // Generate tokens
            const tokenPayload = {
                id: user.id,
                email: user.email,
                role: user.role
            };

            const tokens = await this.jwtUtils.generateTokenPair(tokenPayload);

            this.log('info', {
                userId: user.id,
                email: user.email
            }, 'Naujas vartotojas sėkmingai užregistruotas');

            return AuthUserDTO.forAuthResponse(userWithCompleteProfile, tokens);
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            this.log('error', { error: error.message }, 'Failed to register user');
            throw ErrorHandler.serverError('Nepavyko užregistruoti vartotojo');
            throw ErrorHandler.serverError('Autentifikacijos klaida');
        }
    }

    /**
     * Login user
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {Object} requestInfo - Request information
     * @returns {Promise<AuthUserDTO>} Logged in user with tokens
     */
    async login(loginData, requestInfo = {}) {
        const { email, password } = loginData;
        const { ipAddress = 'unknown', userAgent = 'unknown', recaptcha_token } = requestInfo;
        let user = null;
        let loginStatus = 'failed_validation';
        let failureReason = null;

        try {
            // Debug logging
            this.log('info', { 
                loginData, 
                loginDataKeys: Object.keys(loginData || {}),
                email, 
                password: password ? '***' : 'missing' 
            }, 'Login attempt debug info');
            
            // 1. Validate input data
            const validation = Validator.validateLogin(loginData);
            if (!validation.isValid) {
                const response = Validator.createErrorResponse(validation.errors);
                const error = new Error(response.message);
                error.statusCode = 400;
                error.errorCode = 'VALIDATION_ERROR';
                error.validationResponse = response;
                throw error;
            }

            // 2. Check if account is locked
            if (this.loginLogRepository && this.configService) {
                const lockoutDuration = await this.configService.getLockoutDuration();
                const lockStatus = await this.loginLogRepository.isAccountLocked(email, lockoutDuration / 60);
                
                if (lockStatus.locked) {
                    failureReason = 'Account locked due to too many failed attempts';
                    loginStatus = 'account_locked';
                    
                    // Log the blocked attempt
                    await this.loginLogRepository.logAttempt({
                        email,
                        user_id: null,
                        ip_address: ipAddress,
                        user_agent: userAgent,
                        attempt_result: 'account_locked',
                        failure_reason: failureReason
                    });

                    const unlockTime = lockStatus.unlock_at;
                    const minutesLeft = Math.ceil((unlockTime - new Date()) / (1000 * 60));
                    
                    throw ErrorHandler.createError(
                        `Paskyra užblokuota dėl per daug nesėkmingų prisijungimo bandymų. Bandykite vėl po ${minutesLeft} minučių.`, 
                        423, 
                        'ACCOUNT_LOCKED'
                    );
                }
            }

            // Verify reCAPTCHA if enabled
            if (this.securityService && this.configService) {
                const isRecaptchaEnabled = await this.configService.isRecaptchaEnabled();
                
                if (isRecaptchaEnabled) {
                    // Check if token is provided and not null/empty
                    if (!recaptcha_token || recaptcha_token === null || recaptcha_token.trim() === '') {
                        failureReason = 'reCAPTCHA token missing';
                        loginStatus = 'recaptcha_failed';
                        
                        await this.logFailedAttempt(email, null, ipAddress, userAgent, loginStatus, failureReason);
                        throw ErrorHandler.createError('reCAPTCHA patvirtinimas reikalingas', 400, 'RECAPTCHA_REQUIRED');
                    }

                    const recaptchaResult = await this.securityService.verifyRecaptcha(
                        recaptcha_token, 
                        ipAddress, 
                        'login'
                    );

                    if (!recaptchaResult.success && !recaptchaResult.disabled) {
                        failureReason = 'reCAPTCHA verification failed';
                        loginStatus = 'recaptcha_failed';
                        
                        await this.logFailedAttempt(email, null, ipAddress, userAgent, loginStatus, failureReason);
                        throw ErrorHandler.createError('reCAPTCHA patvirtinimas nepavyko', 400, 'RECAPTCHA_FAILED');
                    }

                    // Check minimum score if enabled
                    if (recaptchaResult.score !== undefined) {
                        const minScore = await this.configService.getRecaptchaMinScore();
                        if (recaptchaResult.score < minScore) {
                            failureReason = `reCAPTCHA score too low: ${recaptchaResult.score}`;
                            loginStatus = 'recaptcha_failed';
                            
                            await this.logFailedAttempt(email, null, ipAddress, userAgent, loginStatus, failureReason);
                            throw ErrorHandler.createError('reCAPTCHA įvertinimas per žemas', 400, 'RECAPTCHA_LOW_SCORE');
                        }
                    }
                }
            }

            // Find user by email
            user = await this.userRepository.findByEmail(email);
            if (!user) {
                failureReason = 'User not found';
                loginStatus = 'invalid_credentials';
                
                await this.logFailedAttempt(email, null, ipAddress, userAgent, loginStatus, failureReason);
                await this.checkAndLockAccount(email, ipAddress, userAgent);
                
                throw ErrorHandler.createError('Neteisingi prisijungimo duomenys', 401, 'INVALID_CREDENTIALS');
            }

            // Verify password
            const isValidPassword = await this.verifyPassword(password, user.password_hash);
            if (!isValidPassword) {
                failureReason = 'Invalid password';
                loginStatus = 'invalid_credentials';
                
                await this.logFailedAttempt(email, user.id, ipAddress, userAgent, loginStatus, failureReason);
                await this.checkAndLockAccount(email, ipAddress, userAgent);
                
                throw ErrorHandler.createError('Neteisingi prisijungimo duomenys', 401, 'INVALID_CREDENTIALS');
            }

            // Successful login - log it
            if (this.loginLogRepository) {
                await this.loginLogRepository.logAttempt({
                    email,
                    user_id: user.id,
                    ip_address: ipAddress,
                    user_agent: userAgent,
                    attempt_result: 'success',
                    failure_reason: null
                });
            }

            // Get complete user profile using aggregator
            const userWithCompleteProfile = await this.userProfileAggregator.getUserProfile(user.id, {
                includePrivateData: true
            });

            // Generate tokens
            const tokenPayload = {
                id: user.id,
                email: user.email,
                role: user.role
            };

            const tokens = await this.jwtUtils.generateTokenPair(tokenPayload);

            this.log('info', {
                userId: user.id,
                email: user.email,
                ipAddress
            }, 'Vartotojas sėkmingai prisijungė');

            return AuthUserDTO.forAuthResponse(userWithCompleteProfile, tokens);
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            this.log('error', { error: error.message }, 'Auth error: login user');
            throw ErrorHandler.serverError('Autentifikacijos klaida');
        }
    }

    /**
     * Refresh authentication tokens
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<Object>} New token pair
     */
    async refreshTokens(refreshToken) {
        try {
            this.validateRequiredFields({ refreshToken }, ['refreshToken']);

            // Verify refresh token
            const decoded = await this.jwtUtils.verifyToken(refreshToken);

            // Check if user is still active
            const user = await this.userRepository.findById(decoded.id);
            if (!user) {
                throw ErrorHandler.createError('Vartotojas nerastas', 404, 'USER_NOT_FOUND');
            }

            // Generate new token pair
            const tokenPayload = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            };

            const tokens = await this.jwtUtils.generateTokenPair(tokenPayload);

            this.log('info', {
                userId: decoded.id,
                email: decoded.email
            }, 'Žetonai sėkmingai atnaujinti');

            return { tokens };
        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                throw ErrorHandler.createError('Neteisingas atnaujinimo žetonas', 401, 'INVALID_REFRESH_TOKEN');
            }
            throw error;
        }
    }

    /**
     * Get user profile by ID
     * @param {number} userId - User ID
     * @returns {Promise<AuthUserDTO>} User profile
     */
    async getUserProfile(userId) {
        try {
            const user = await this.userProfileAggregator.getUserProfile(userId, {
                includePrivateData: true
            });

            if (!user) {
                throw ErrorHandler.createError('Vartotojas nerastas', 404, 'USER_NOT_FOUND');
            }

            return AuthUserDTO.forProfile(user);
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            this.log('error', { error: error.message }, 'Auth error: get user profile');
            throw ErrorHandler.serverError('Autentifikacijos klaida');
        }
    }

    /**
     * Log failed login attempt
     */
    async logFailedAttempt(email, userId, ipAddress, userAgent, status, reason) {
        if (this.loginLogRepository) {
            try {
                await this.loginLogRepository.logAttempt({
                    email,
                    user_id: userId,
                    ip_address: ipAddress,
                    user_agent: userAgent,
                    attempt_result: status,
                    failure_reason: reason
                });
            } catch (error) {
                this.logger.warn({ error: error.message }, 'Failed to log login attempt');
            }
        }
    }

    /**
     * Check if account should be locked after failed attempts
     */
    async checkAndLockAccount(email, ipAddress, userAgent) {
        if (!this.loginLogRepository || !this.configService) return;

        try {
            const maxAttempts = await this.configService.getMaxLoginAttempts();
            const attemptWindow = await this.configService.getAttemptWindow();
            
            const failedAttempts = await this.loginLogRepository.getFailedAttempts(email, attemptWindow / 60);
            
            if (failedAttempts.count >= maxAttempts) {
                // Lock the account
                await this.loginLogRepository.logAttempt({
                    email,
                    user_id: null,
                    ip_address: ipAddress,
                    user_agent: userAgent,
                    attempt_result: 'account_locked',
                    failure_reason: `Account locked after ${failedAttempts.count} failed attempts`
                });

                this.logger.warn({
                    email,
                    ipAddress,
                    failedAttempts: failedAttempts.count,
                    maxAttempts
                }, 'Account locked due to too many failed login attempts');
            }
        } catch (error) {
            this.logger.error({ error: error.message }, 'Failed to check account lock status');
            throw ErrorHandler.serverError('Autentifikacijos klaida');
        }
    }

    /**
     * Check server limit for user
     */
    async checkServerLimit(userId) {
        if (!this.configService) return true;

        try {
            const maxServers = await this.configService.getMaxServersPerUser();
            
            // Count user's current servers
            const serverCount = await this.userRepository.db.query(
                'SELECT COUNT(*) as count FROM servers WHERE created_by = $1 AND is_active = true',
                [userId]
            );
            
            const currentCount = parseInt(serverCount.rows[0].count);
            
            if (currentCount >= maxServers) {
                throw ErrorHandler.createError(
                    `Jūs jau turite maksimalų serverių skaičių (${maxServers}). Ištrinkite seną serverį, kad galėtumėte pridėti naują.`,
                    400,
                    'SERVER_LIMIT_EXCEEDED'
                );
            }

            return true;
        } catch (error) {
            if (error.statusCode) throw error;
            this.logger.error({ error: error.message }, 'Failed to check server limit');
            return true; // Allow if check fails
        }
    }
}

module.exports = AuthService;