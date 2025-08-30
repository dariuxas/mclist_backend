'use strict'

const BaseRepository = require('../../../repositories/BaseRepository');
const ServerDataDTO = require('../dto/ServerDataDTO');

/**
 * Server Data Repository
 * Handles server ping data storage with JSONB
 */
class ServerDataRepository extends BaseRepository {
    constructor(database) {
        super(database);
    }

    async findByServerId(serverId) {
        const query = 'SELECT * FROM server_data WHERE server_id = $1 ORDER BY created_at DESC LIMIT 1';
        const result = await this.db.query(query, [serverId]);
        if (result.rows.length > 0) {
            return ServerDataDTO.fromDatabase(result.rows[0]);
        }
        return null;
    }

    async insert(data) {
        const query = `
            INSERT INTO server_data (server_id, data)
            VALUES ($1, $2)
            RETURNING id
        `;

        const result = await this.db.query(query, [
            data.server_id,
            JSON.stringify(data.data)
        ]);

        return this.findById(result.rows[0].id);
    }

    async update(serverId, data) {
        const query = `
            UPDATE server_data
            SET data = $1
            WHERE server_id = $2
        `;

        await this.db.query(query, [JSON.stringify(data.data), serverId]);
        return this.findByServerId(serverId);
    }

    async findById(id) {
        const query = 'SELECT * FROM server_data WHERE id = $1';
        const result = await this.db.query(query, [id]);
        if (result.rows.length > 0) {
            return ServerDataDTO.fromDatabase(result.rows[0]);
        }
        return null;
    }

    async deleteByServerId(serverId) {
        const query = 'DELETE FROM server_data WHERE server_id = $1';
        const result = await this.db.query(query, [serverId]);
        return result.rowCount > 0;
    }

    async getServerStats() {
        const query = `
            SELECT 
                COUNT(DISTINCT sd.server_id) as total_servers,
                COUNT(CASE WHEN (sd.data->>'online')::boolean = true THEN 1 END) as online_servers,
                SUM((sd.data->'players'->>'online')::integer) as total_players,
                COALESCE(SUM(svs.total_votes), 0) as total_votes
            FROM server_data sd
            LEFT JOIN server_vote_stats svs ON sd.server_id = svs.server_id
            WHERE sd.id IN (
                SELECT DISTINCT ON (server_id) id 
                FROM server_data 
                ORDER BY server_id, created_at DESC
            )
        `;

        const result = await this.db.query(query);
        const stats = result.rows[0];

        return {
            total_servers: parseInt(stats.total_servers) || 0,
            online_servers: parseInt(stats.online_servers) || 0,
            offline_servers: (parseInt(stats.total_servers) || 0) - (parseInt(stats.online_servers) || 0),
            total_players: parseInt(stats.total_players) || 0,
            total_votes: parseInt(stats.total_votes) || 0
        };
    }

    async getTopServersByPlayers(limit = 10) {
        const query = `
            SELECT 
                sd.*,
                s.name as server_name,
                s.host,
                s.port
            FROM server_data sd
            JOIN servers s ON sd.server_id = s.id
            WHERE (sd.data->>'online')::boolean = true AND s.is_active = true
            AND sd.id IN (
                SELECT DISTINCT ON (server_id) id 
                FROM server_data 
                ORDER BY server_id, created_at DESC
            )
            ORDER BY (sd.data->'players'->>'online')::integer DESC
            LIMIT $1
        `;

        const result = await this.db.query(query, [limit]);
        return result.rows.map(row => ServerDataDTO.fromDatabase(row));
    }

    async getServerHistory(serverId, limit = 100) {
        const query = `
            SELECT * FROM server_data 
            WHERE server_id = $1 
            ORDER BY created_at DESC 
            LIMIT $2
        `;

        const result = await this.db.query(query, [serverId, limit]);
        return result.rows.map(row => ServerDataDTO.fromDatabase(row));
    }

    async cleanupOldData(daysToKeep = 30) {
        const query = `
            DELETE FROM server_data 
            WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
        `;

        const result = await this.db.query(query);
        return result.rowCount;
    }

    async getServerStatsById(serverId, limit = 100) {
        const query = `
            SELECT 
                sd.id,
                sd.server_id,
                sd.data,
                sd.created_at,
                s.name,
                s.host,
                s.port,
                s.max_players,
                COALESCE(svs.total_votes, 0) as total_votes,
                COALESCE(svs.daily_votes, 0) as daily_votes,
                COALESCE(svs.weekly_votes, 0) as weekly_votes,
                COALESCE(svs.monthly_votes, 0) as monthly_votes
            FROM server_data sd
            JOIN servers s ON sd.server_id = s.id
            LEFT JOIN server_vote_stats svs ON sd.server_id = svs.server_id
            WHERE sd.server_id = $1 AND s.is_active = true
            ORDER BY sd.created_at DESC
            LIMIT $2
        `;

        const result = await this.db.query(query, [serverId, limit]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const data = result.rows.map(row => {
            const dto = ServerDataDTO.fromDatabase(row);
            
            // Filter out icon and motd from data for statistics (they're too long)
            const filteredData = { ...dto.data };
            delete filteredData.icon;
            delete filteredData.motd;
            
            return {
                id: dto.id,
                server_id: dto.server_id,
                data: filteredData,
                created_at: dto.created_at,
                total_votes: parseInt(row.total_votes) || 0,
                daily_votes: parseInt(row.daily_votes) || 0,
                weekly_votes: parseInt(row.weekly_votes) || 0,
                monthly_votes: parseInt(row.monthly_votes) || 0,
                server_name: row.name,
                host: row.host,
                port: row.port,
                max_players: row.max_players
            };
        });

        // Get hourly player count stats for the last 24 hours
        const hourlyQuery = `
            WITH hourly_data AS (
                SELECT 
                    date_trunc('hour', created_at) as hour,
                    (data->'players'->>'online')::integer as online_players,
                    (data->>'online')::boolean as server_online,
                    ROW_NUMBER() OVER (PARTITION BY date_trunc('hour', created_at) ORDER BY created_at DESC) as rn
                FROM server_data 
                WHERE server_id = $1 
                AND created_at >= NOW() - INTERVAL '24 hours'
                ORDER BY created_at DESC
            )
            SELECT 
                hour,
                COALESCE(online_players, 0) as player_count,
                server_online
            FROM hourly_data 
            WHERE rn = 1 
            ORDER BY hour DESC
        `;

        const hourlyResult = await this.db.query(hourlyQuery, [serverId]);
        
        // Get daily stats for the last 30 days
        const dailyQuery = `
            WITH daily_data AS (
                SELECT 
                    date_trunc('day', created_at) as day,
                    MAX((data->'players'->>'online')::integer) as max_players,
                    AVG((data->'players'->>'online')::integer) as avg_players,
                    COUNT(CASE WHEN (data->>'online')::boolean = true THEN 1 END) as online_checks,
                    COUNT(*) as total_checks
                FROM server_data 
                WHERE server_id = $1 
                AND created_at >= NOW() - INTERVAL '30 days'
                GROUP BY date_trunc('day', created_at)
                ORDER BY day DESC
            )
            SELECT 
                day,
                COALESCE(max_players, 0) as max_players,
                ROUND(COALESCE(avg_players, 0), 2) as avg_players,
                ROUND((online_checks::decimal / NULLIF(total_checks, 0) * 100), 2) as uptime_percentage
            FROM daily_data
        `;

        const dailyResult = await this.db.query(dailyQuery, [serverId]);

        return {
            server_info: {
                id: serverId,
                name: data[0].server_name,
                host: data[0].host,
                port: data[0].port,
                max_players: data[0].max_players
            },
            current_stats: data[0] || null,
            voting_stats: {
                total_votes: data[0]?.total_votes || 0,
                daily_votes: data[0]?.daily_votes || 0,
                weekly_votes: data[0]?.weekly_votes || 0,
                monthly_votes: data[0]?.monthly_votes || 0
            },
            hourly_player_data: hourlyResult.rows.map(row => ({
                timestamp: row.hour,
                player_count: parseInt(row.player_count) || 0,
                online: row.server_online || false
            })),
            daily_stats: dailyResult.rows.map(row => ({
                date: row.day.toISOString().split('T')[0],
                max_players: parseInt(row.max_players) || 0,
                avg_players: parseFloat(row.avg_players) || 0,
                uptime_percentage: parseFloat(row.uptime_percentage) || 0
            })),
            recent_data: data.slice(0, Math.min(50, data.length)).map(item => item.toJSON ? item.toJSON() : item)
        };
    }
}

module.exports = ServerDataRepository;