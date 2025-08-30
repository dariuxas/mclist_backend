'use strict'

module.exports = {
    async up(connection) {
        const createLoginLogsTable = `
            CREATE TABLE login_logs (
                id SERIAL PRIMARY KEY,
                email VARCHAR(100) NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                ip_address INET NOT NULL,
                user_agent TEXT,
                attempt_result VARCHAR(20) NOT NULL CHECK (attempt_result IN ('success', 'invalid_credentials', 'account_locked', 'recaptcha_failed')),
                failure_reason VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createIndexes = `
            CREATE INDEX idx_login_logs_email ON login_logs(email);
            CREATE INDEX idx_login_logs_user_id ON login_logs(user_id);
            CREATE INDEX idx_login_logs_ip_address ON login_logs(ip_address);
            CREATE INDEX idx_login_logs_created_at ON login_logs(created_at);
            CREATE INDEX idx_login_logs_email_created_at ON login_logs(email, created_at);
            CREATE INDEX idx_login_logs_ip_created_at ON login_logs(ip_address, created_at);
        `;

        await connection.query(createLoginLogsTable);
        await connection.query(createIndexes);
        
        console.log('✅ Created login_logs table with indexes');
    },

    async down(connection) {
        await connection.query('DROP TABLE IF EXISTS login_logs');
        console.log('✅ Dropped login_logs table');
    }
};