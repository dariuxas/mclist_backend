'use strict'

module.exports = {
    async up(connection) {
        const createUsersTable = `
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

        const createIndexes = `
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_role ON users(role);
    `;

        await connection.query(createUsersTable);
        await connection.query(createIndexes);
        console.log('✅ Created users table');
    },

    async down(connection) {
        await connection.query('DROP TABLE IF EXISTS users');
        console.log('✅ Dropped users table');
    }
};