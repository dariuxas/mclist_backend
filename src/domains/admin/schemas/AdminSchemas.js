'use strict'

// Admin user object schema (includes sensitive data)
const adminUserObject = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        email: { type: 'string' },
        role: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        last_login: { type: ['string', 'null'], format: 'date-time' },
        last_activity: { type: ['string', 'null'], format: 'date-time' },
        server_count: { type: 'integer' },
        vote_count: { type: 'integer' }
    }
};

module.exports = {
    adminUserObject,
    // Stats object for admin dashboard
    adminStatsObject: {
        type: 'object',
        properties: {
            total_users: { type: 'integer' },
            new_users_week: { type: 'integer' },
            total_servers: { type: 'integer' },
            active_servers: { type: 'integer' },
            new_servers_week: { type: 'integer' },
            total_votes: { type: 'integer' },
            votes_week: { type: 'integer' }
        }
    }
};