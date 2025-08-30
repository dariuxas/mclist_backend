'use strict'

const BaseController = require('../../../controllers/BaseController');

/**
 * Auth Controller
 * Handles HTTP requests for authentication operations using modern DTO pattern
 */
class AuthController extends BaseController {
    constructor(authService, logger) {
        super(authService, logger);
        this.authService = authService;
        this.bindMethods();
    }

    /**
     * Register new user
     */
    async register(request, reply) {
        try {
            const requestInfo = {
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'] || 'unknown'
            };
            
            const userDto = await this.authService.register(request.body, requestInfo);
            return this.sendSuccess(
                reply, 
                { 
                    user: userDto.toJSON()
                }, 
                'Vartotojas sėkmingai užregistruotas',
                {},
                request,
                'user registration'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'user registration');
        }
    }

    /**
     * Login user
     */
    async login(request, reply) {
        try {
            const { email, password, recaptcha_token } = request.body;
            const requestInfo = {
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'] || 'unknown',
                recaptcha_token
            };
            
            const userDto = await this.authService.login({ email, password }, requestInfo);
            return this.sendSuccess(
                reply,
                {
                    user: userDto.toJSON()
                },
                'Prisijungimas sėkmingas',
                {},
                request,
                'user login'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'user login');
        }
    }

    /**
     * Refresh tokens
     */
    async refreshToken(request, reply) {
        try {
            const { refreshToken } = request.body;
            const result = await this.authService.refreshTokens(refreshToken);
            return this.sendSuccess(
                reply,
                result,
                'Žetonai sėkmingai atnaujinti',
                {},
                request,
                'token refresh'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'token refresh');
        }
    }

    /**
     * Logout user
     */
    async logout(request, reply) {
        try {
            return this.sendSuccess(
                reply,
                { message: 'Atsijungimas sėkmingas' },
                'Atsijungimas sėkmingas',
                {},
                request,
                'user logout'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'user logout');
        }
    }
}

module.exports = AuthController;