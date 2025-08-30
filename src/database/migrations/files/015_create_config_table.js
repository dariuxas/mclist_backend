'use strict'

module.exports = {
    async up(connection) {
        const createConfigTable = `
            CREATE TABLE config (
                id SERIAL PRIMARY KEY,
                key VARCHAR(100) NOT NULL UNIQUE,
                value TEXT,
                type VARCHAR(20) DEFAULT 'string',
                description TEXT,
                category VARCHAR(50) DEFAULT 'general',
                is_public BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createIndexes = `
            CREATE INDEX idx_config_key ON config(key);
            CREATE INDEX idx_config_category ON config(category);
            CREATE INDEX idx_config_public ON config(is_public);
        `;

        const insertDefaultConfig = `
            INSERT INTO config (key, value, type, description, category, is_public) VALUES
            -- reCAPTCHA settings
            ('recaptcha.enabled', 'true', 'boolean', 'Įjungti reCAPTCHA patvirtinimą', 'security', true),
            ('recaptcha.site_key', '6LetT6QrAAAAAIJVTY5vWI3UGpnmOVlVdfsHPwAs', 'string', 'reCAPTCHA svetainės raktas (viešas)', 'security', true),
            ('recaptcha.secret_key', '6LetT6QrAAAAAC9kqh4R8ncDLoPzZ94pkim_AzjQ', 'string', 'reCAPTCHA slaptas raktas (privatusis)', 'security', false),
            ('recaptcha.min_score', '0.5', 'float', 'Minimalus priimtinas reCAPTCHA balas', 'security', false),
            ('recaptcha.action', 'vote', 'string', 'reCAPTCHA veiksmo pavadinimas', 'security', false),
            
            -- Vote settings
            ('vote.daily_limit', '1', 'integer', 'Maksimalus balsų skaičius per IP per dieną', 'voting', true),
            
            -- Server limits
            ('server.max_per_user', '1', 'integer', 'Maksimalus serverių skaičius vienam naudotojui', 'server', false),
            
            -- Authentication security
            ('auth.max_login_attempts', '5', 'integer', 'Maksimalus prisijungimo bandymų skaičius prieš blokavimą', 'security', false),
            ('auth.lockout_duration', '3600', 'integer', 'Paskyros blokavimo trukmė sekundėmis (1 valanda)', 'security', false),
            ('auth.attempt_window', '600', 'integer', 'Laiko langas prisijungimo bandymų skaičiavimui sekundėmis (10 minučių)', 'security', false),
            
            -- IP security
            ('security.ip_abusedbip_api_key', '3cfcb213d8f96968da807840063a09431322343b546ee03701232aba17b80902666249393363b7f7', 'string', 'ABUSEIPDB API raktas', 'security', false),
            
            -- General settings
            ('site.name', 'MCList', 'string', 'Svetainės pavadinimas', 'general', true),
            ('site.description', 'Minecraft Server List', 'string', 'Svetainės aprašymas', 'general', true),
            ('site.maintenance_mode', 'false', 'boolean', 'Įjungti techninės priežiūros režimą', 'general', false),
            ('site.version', '0.0.1', 'string', 'Projekto versija', 'general', true)
        `;

        await connection.query(createConfigTable);
        await connection.query(createIndexes);
        await connection.query(insertDefaultConfig);
        
        console.log('✅ Created config table with default settings');
    },

    async down(connection) {
        await connection.query('DROP TABLE IF EXISTS config');
        console.log('✅ Dropped config table');
    }
};