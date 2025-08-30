'use strict'

module.exports = {
  async up(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS premium_servers (
        id SERIAL PRIMARY KEY,
        server_id INTEGER NOT NULL UNIQUE REFERENCES servers(id) ON DELETE CASCADE,
        premium_until TIMESTAMPTZ,
        pinned BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await connection.query('CREATE INDEX IF NOT EXISTS idx_premium_servers_premium_until ON premium_servers(premium_until)');
    await connection.query('CREATE INDEX IF NOT EXISTS idx_premium_servers_pinned ON premium_servers(pinned)');

    // Trigger to auto-update updated_at
    await connection.query(`
      CREATE OR REPLACE FUNCTION set_timestamp() RETURNS trigger AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await connection.query(`
      DROP TRIGGER IF EXISTS set_premium_servers_timestamp ON premium_servers;
      CREATE TRIGGER set_premium_servers_timestamp
      BEFORE UPDATE ON premium_servers
      FOR EACH ROW
      EXECUTE FUNCTION set_timestamp();
    `);

    console.log('✅ Created premium_servers table');
  },

  async down(connection) {
    await connection.query('DROP TRIGGER IF EXISTS set_premium_servers_timestamp ON premium_servers');
    await connection.query('DROP TABLE IF EXISTS premium_servers');
    console.log('↩️  Dropped premium_servers table');
  }
}
