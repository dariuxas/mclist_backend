'use strict'

module.exports = {
  async up(connection) {
    await connection.query('ALTER TABLE servers DROP COLUMN IF EXISTS is_featured');
    console.log('✅ Dropped is_featured column from servers table');
  },

  async down(connection) {
    await connection.query("ALTER TABLE servers ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false");
    await connection.query('CREATE INDEX IF NOT EXISTS idx_servers_featured ON servers(is_featured)');
    console.log('↩️  Restored is_featured column on servers table');
  }
}
