'use strict'

module.exports = {
    // Online user configuration
    onlineUser: {
        // Time in minutes after which a user is considered offline
        timeoutMinutes: parseInt(process.env.ONLINE_USER_TIMEOUT_MINUTES) || 10,
        
        // Get timeout in milliseconds
        getTimeoutMs() {
            return this.timeoutMinutes * 60 * 1000;
        },
        
        // Get cutoff timestamp for online users
        getOnlineCutoff() {
            return new Date(Date.now() - this.getTimeoutMs());
        }
    },
    
    // API versioning
    api: {
        version: 'v1',
        prefix: '/api'
    },
    
    // Pagination defaults
    pagination: {
        defaultLimit: 10,
        maxLimit: 100
    }
};