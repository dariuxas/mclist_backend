'use strict'

module.exports = {
    async up(connection) {
        const createServerSeoTable = `
            CREATE TABLE server_seo (
                id SERIAL PRIMARY KEY,
                server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
                slug VARCHAR(255) UNIQUE NOT NULL,
                seo_title VARCHAR(60),
                seo_description VARCHAR(160),
                seo_keywords VARCHAR(255),
                og_title VARCHAR(60),
                og_description VARCHAR(160),
                og_image VARCHAR(255),
                twitter_title VARCHAR(60),
                twitter_description VARCHAR(160),
                twitter_image VARCHAR(255),
                canonical_url VARCHAR(255),
                meta_robots VARCHAR(50) DEFAULT 'index,follow',
                structured_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createIndexes = `
            CREATE INDEX idx_server_seo_server_id ON server_seo(server_id);
            CREATE INDEX idx_server_seo_slug ON server_seo(slug);
            CREATE INDEX idx_server_seo_title ON server_seo(seo_title);
            CREATE INDEX idx_server_seo_keywords ON server_seo USING GIN(to_tsvector('english', seo_keywords));
        `;

        await connection.query(createServerSeoTable);
        await connection.query(createIndexes);
        console.log('✅ Created server_seo table with comprehensive SEO fields');
    },

    async down(connection) {
        await connection.query('DROP TABLE IF EXISTS server_seo');
        console.log('✅ Dropped server_seo table');
    }
}; 