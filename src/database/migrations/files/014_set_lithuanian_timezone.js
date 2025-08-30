'use strict'

module.exports = {
    async up(connection) {
        // Set the session timezone to Lithuanian time
        await connection.query("SET timezone = 'Europe/Vilnius'");
        
        // Get the current database name
        const dbResult = await connection.query('SELECT current_database()');
        const dbName = dbResult.rows[0].current_database;
        
        // Set timezone for the specific database
        await connection.query(`ALTER DATABASE "${dbName}" SET timezone = 'Europe/Vilnius'`);
        
        console.log(`✅ Set database ${dbName} timezone to Europe/Vilnius (Lithuanian time)`);
    },

    async down(connection) {
        // Get the current database name
        const dbResult = await connection.query('SELECT current_database()');
        const dbName = dbResult.rows[0].current_database;
        
        // Reset to UTC
        await connection.query(`ALTER DATABASE "${dbName}" SET timezone = 'UTC'`);
        console.log(`✅ Reset database ${dbName} timezone to UTC`);
    }
};