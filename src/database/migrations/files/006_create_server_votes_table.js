'use strict'

module.exports = {
    async up(connection) {
        const createServerVotesTable = `
            CREATE TABLE server_votes (
                id SERIAL PRIMARY KEY,
                server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
                username VARCHAR(100),
                ip_address INET NOT NULL,
                user_agent TEXT,
                headers JSONB,
                recaptcha_token TEXT,
                recaptcha_score DECIMAL(3,2),
                referrer TEXT,
                verification_score INTEGER DEFAULT 0,
                ip_analysis JSONB DEFAULT '{}',
                votifier_sent BOOLEAN DEFAULT false,
                votifier_response TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createIndexes = `
            CREATE INDEX idx_server_votes_server_id ON server_votes(server_id);
            CREATE INDEX idx_server_votes_ip ON server_votes(ip_address);
            CREATE INDEX idx_server_votes_username ON server_votes(username);
            CREATE INDEX idx_server_votes_created_at ON server_votes(created_at);
            CREATE INDEX idx_server_votes_recaptcha_score ON server_votes(recaptcha_score);
            CREATE INDEX idx_server_votes_verification_score ON server_votes(verification_score);
            CREATE INDEX idx_server_votes_ip_analysis ON server_votes USING GIN (ip_analysis);
            CREATE UNIQUE INDEX idx_server_votes_daily_limit ON server_votes(server_id, ip_address, DATE(created_at));
        `;

        await connection.query(createServerVotesTable);
        await connection.query(createIndexes);
        console.log('✅ Created server_votes table');
    },

    async down(connection) {
        await connection.query('DROP TABLE IF EXISTS server_votes');
        console.log('✅ Dropped server_votes table');
    }
}