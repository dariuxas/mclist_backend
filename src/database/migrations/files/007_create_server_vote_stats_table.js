'use strict'

module.exports = {
    async up(connection) {
        const createServerVoteStatsTable = `
            CREATE TABLE server_vote_stats (
                id SERIAL PRIMARY KEY,
                server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
                total_votes INTEGER DEFAULT 0,
                verified_votes INTEGER DEFAULT 0,
                flagged_votes INTEGER DEFAULT 0,
                daily_votes INTEGER DEFAULT 0,
                weekly_votes INTEGER DEFAULT 0,
                monthly_votes INTEGER DEFAULT 0,
                last_vote_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(server_id)
            )
        `;

        const createIndexes = `
            CREATE INDEX idx_server_vote_stats_server_id ON server_vote_stats(server_id);
            CREATE INDEX idx_server_vote_stats_total_votes ON server_vote_stats(total_votes);
            CREATE INDEX idx_server_vote_stats_verified_votes ON server_vote_stats(verified_votes);
            CREATE INDEX idx_server_vote_stats_last_vote ON server_vote_stats(last_vote_at);
        `;

        await connection.query(createServerVoteStatsTable);
        await connection.query(createIndexes);
        console.log('✅ Created server_vote_stats table');
    },

    async down(connection) {
        await connection.query('DROP TABLE IF EXISTS server_vote_stats');
        console.log('✅ Dropped server_vote_stats table');
    }
};