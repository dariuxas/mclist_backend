'use strict'

const BaseRepository = require('../../../repositories/BaseRepository');
const ServerDTO = require('../dto/ServerDTO');

/**
 * Server Repository
 * Updated to work with JSONB server_data structure
 */
class ServerRepository extends BaseRepository {
    constructor(database) {
        super(database);
    }

    async findById(id) {
        const query = `
            SELECT 
                s.*,
                mv.version,
                latest_sd.data,
                latest_sd.created_at as data_created_at,
                svs.id as vote_stats_id,
                svs.total_votes,
                svs.daily_votes,
                svs.weekly_votes,
                svs.monthly_votes,
                svs.last_vote_at,
                u.email as creator_email,
                ps.premium_until as premium_until,
                ps.pinned as premium_pinned
            FROM servers s
            LEFT JOIN minecraft_versions mv ON s.version_id = mv.id
            LEFT JOIN (
                SELECT 
                    server_id,
                    data,
                    created_at,
                    ROW_NUMBER() OVER (PARTITION BY server_id ORDER BY created_at DESC) as rn
                FROM server_data
            ) latest_sd ON s.id = latest_sd.server_id AND latest_sd.rn = 1
            LEFT JOIN server_vote_stats svs ON s.id = svs.server_id
            LEFT JOIN users u ON s.created_by = u.id
            LEFT JOIN premium_servers ps ON ps.server_id = s.id
            WHERE s.id = $1
        `;

        const result = await this.db.query(query, [id]);
        if (result.rows.length === 0) return null;

        const serverTypes = await this.getServerTypes(id);
        const serverData = result.rows[0];

        // Get SEO data from server_seo table
        try {
            const seoQuery = 'SELECT * FROM server_seo WHERE server_id = $1';
            const seoResult = await this.db.query(seoQuery, [id]);
            if (seoResult.rows.length > 0) {
                serverData.slug = seoResult.rows[0].slug;
                serverData.seo_data = seoResult.rows[0];
            }
        } catch (error) {
            console.log('ServerRepository - SEO fetch error:', error.message);
        }

        return ServerDTO.fromDatabase(serverData, serverTypes);
    }

    async findAll(options = {}) {
        const {
            limit = 20,
            offset = 0,
            order_by = 'created_at',
            order_direction = 'DESC',
            server_type_ids = null,
            is_premium = null,
            include_offline = true,
            search = null,
            version = null,
            min_players = null,
            max_players = null,
            owned_by = null
        } = options;

        const whereConditions = ['s.is_active = true'];
        const params = [];
        let paramIndex = 1;

        // Join clause for server types
        let joinClause = '';
        if (server_type_ids && server_type_ids.length > 0) {
            joinClause = `
                JOIN server_server_types sst ON s.id = sst.server_id
                JOIN server_types st ON sst.server_type_id = st.id
            `;
            whereConditions.push(`st.id = ANY($${paramIndex++})`);
            params.push(server_type_ids);
        }

        if (owned_by !== null) {
            whereConditions.push(`s.created_by = $${paramIndex++}`);
            params.push(owned_by);
        }

        if (is_premium !== null) {
            const premiumExpr = `(ps.id IS NOT NULL AND (ps.pinned = true OR ps.premium_until IS NULL OR ps.premium_until > NOW()))`;
            whereConditions.push(is_premium ? premiumExpr : `NOT ${premiumExpr}`);
        }

        if (!include_offline) {
            whereConditions.push(`(sd.data->>'online')::boolean = true`);
        }

        if (search) {
            whereConditions.push(`(s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (version) {
            whereConditions.push(`(mv.version ILIKE $${paramIndex} OR sd.data->>'version' ILIKE $${paramIndex})`);
            params.push(`%${version}%`);
            paramIndex++;
        }

        if (min_players !== null) {
            whereConditions.push(`(sd.data->'players'->>'online')::integer >= $${paramIndex++}`);
            params.push(min_players);
        }

        if (max_players !== null) {
            whereConditions.push(`(sd.data->'players'->>'online')::integer <= $${paramIndex++}`);
            params.push(max_players);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Order by mapping
        const orderByMap = {
            'created_at': 's.created_at',
            'name': 's.name',
            'votes': 'sort_votes',
            'players': 'sort_players',
            'version': 'sort_version'
        };

        const orderBy = orderByMap[order_by] || 's.created_at';

        const query = `
            SELECT 
                s.*,
                mv.version,
                sd.data,
                sd.created_at as data_created_at,
                svs.id as vote_stats_id,
                svs.total_votes,
                svs.daily_votes,
                svs.weekly_votes,
                svs.monthly_votes,
                svs.last_vote_at,
                u.email as creator_email,
                ps.premium_until as premium_until,
                ps.pinned as premium_pinned,
                COALESCE(svs.total_votes, 0) as sort_votes,
                COALESCE((sd.data->'players'->>'online')::integer, 0) as sort_players,
                COALESCE(sd.data->>'version', mv.version) as sort_version,
                seo.slug as seo_slug,
                -- Aggregate server types into array for efficient fetching
                ARRAY_AGG(
                    DISTINCT CASE WHEN st_all.id IS NOT NULL 
                    THEN jsonb_build_object(
                        'id', st_all.id,
                        'name', st_all.name,
                        'slug', null,
                        'description', st_all.description,
                        'icon', st_all.icon,
                        'color', st_all.color,
                        'is_active', st_all.is_active
                    ) END
                ) FILTER (WHERE st_all.id IS NOT NULL) as server_types
            FROM servers s
            LEFT JOIN minecraft_versions mv ON s.version_id = mv.id
            ${joinClause}
            LEFT JOIN (
                SELECT 
                    server_id,
                    data,
                    created_at,
                    ROW_NUMBER() OVER (PARTITION BY server_id ORDER BY created_at DESC) as rn
                FROM server_data
            ) sd ON s.id = sd.server_id AND sd.rn = 1
            LEFT JOIN server_vote_stats svs ON s.id = svs.server_id
            LEFT JOIN users u ON s.created_by = u.id
            LEFT JOIN premium_servers ps ON ps.server_id = s.id
            LEFT JOIN server_seo seo ON s.id = seo.server_id
            -- Join all server types for aggregation (separate from filtering join)
            LEFT JOIN server_server_types sst_all ON s.id = sst_all.server_id
            LEFT JOIN server_types st_all ON sst_all.server_type_id = st_all.id
            ${whereClause}
            GROUP BY 
                s.id, s.name, s.description, s.host, s.port, s.version_id, s.max_players,
                s.website, s.discord_invite,
                s.is_active, s.created_at, s.updated_at, s.created_by,
                mv.version, sd.data, sd.created_at, 
                svs.id, svs.total_votes, svs.daily_votes, svs.weekly_votes, svs.monthly_votes, svs.last_vote_at,
                u.email, ps.premium_until, ps.pinned, seo.slug
            ORDER BY
                CASE WHEN ps.pinned THEN 1 ELSE 0 END DESC,
                COALESCE(ps.premium_until, to_timestamp(0)) DESC,
                ${orderBy} ${order_direction}
            LIMIT $${paramIndex++} OFFSET $${paramIndex++}
        `;

        params.push(limit, offset);
        const result = await this.db.query(query, params, { timeout: 15000 });

        // Transform results efficiently without N+1 queries
        const servers = result.rows.map(row => {
            // Parse aggregated server types
            const serverTypes = row.server_types || [];
            
            // Set slug from seo_slug
            row.slug = row.seo_slug;
            
            // Clean up the row object
            delete row.seo_slug;
            delete row.server_types;

            return ServerDTO.fromDatabase(row, serverTypes);
        });

        return servers;
    }

    async findByHostAndPort(host, port) {
        const query = `
            SELECT 
                s.*,
                mv.version,
                sd.data,
                sd.created_at as data_created_at,
                svs.id as vote_stats_id,
                svs.total_votes,
                svs.daily_votes,
                svs.weekly_votes,
                svs.monthly_votes,
                svs.last_vote_at
            FROM servers s
            LEFT JOIN minecraft_versions mv ON s.version_id = mv.id
            LEFT JOIN (
                SELECT 
                    server_id,
                    data,
                    created_at,
                    ROW_NUMBER() OVER (PARTITION BY server_id ORDER BY created_at DESC) as rn
                FROM server_data
            ) sd ON s.id = sd.server_id AND sd.rn = 1
            LEFT JOIN server_vote_stats svs ON s.id = svs.server_id
            WHERE s.host = $1 AND s.port = $2
        `;

        const result = await this.db.query(query, [host, port]);
        if (result.rows.length === 0) return null;

        const serverTypes = await this.getServerTypes(result.rows[0].id);
        return ServerDTO.fromDatabase(result.rows[0], serverTypes);
    }

    async findServersForPing(options = {}) {
        const { limit = 100, olderThan = null, olderThanMs = null } = options;

        let query = `
            SELECT 
                s.id, 
                s.host, 
                s.port, 
                s.is_active,
                latest_sd.created_at as last_ping_at
            FROM servers s
            LEFT JOIN (
                SELECT 
                    server_id, 
                    created_at,
                    ROW_NUMBER() OVER (PARTITION BY server_id ORDER BY created_at DESC) as rn
                FROM server_data
            ) latest_sd ON s.id = latest_sd.server_id AND latest_sd.rn = 1
            WHERE s.is_active = true
        `;

        const params = [];

        // Prefer DB-side cutoff when olderThanMs is provided (avoids timezone mismatches)
        if (Number.isInteger(olderThanMs) && olderThanMs > 0) {
            query += ` AND (latest_sd.created_at IS NULL OR latest_sd.created_at <= (NOW() - ($${params.length + 1}::int * INTERVAL '1 millisecond')))`;
            params.push(olderThanMs);
        } else if (olderThan) {
            // Fallback: accept a JS Date if provided
            query += ` AND (latest_sd.created_at IS NULL OR latest_sd.created_at <= $${params.length + 1})`;
            params.push(olderThan);
        }

        query += ` ORDER BY latest_sd.created_at ASC NULLS FIRST LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await this.db.query(query, params);

        return result.rows.map(row => ({
            id: row.id,
            host: row.host,
            port: row.port,
            last_ping_at: row.last_ping_at
        }));
    }

    async getServerTypes(serverId) {
        const query = `
            SELECT st.* 
            FROM server_types st
            JOIN server_server_types sst ON st.id = sst.server_type_id
            WHERE sst.server_id = $1
        `;

        const result = await this.db.query(query, [serverId]);
        return result.rows;
    }

    async create(serverData) {
        const query = `
            INSERT INTO servers (
                name, description, host, port, version_id, max_players, 
                website, discord_invite, is_active, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id
        `;

        const result = await this.db.query(query, [
            serverData.name,
            serverData.description,
            serverData.host,
            serverData.port,
            serverData.version_id,
            serverData.max_players,
            serverData.website,
            serverData.discord_invite,
            serverData.is_active !== undefined ? serverData.is_active : true,
            serverData.created_by
        ]);

        return this.findById(result.rows[0].id);
    }

    async update(id, updateData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        const allowedFields = [
            'name', 'description', 'host', 'port', 'version_id', 'max_players',
            'website', 'discord_invite', 'is_active'
        ];

        Object.entries(updateData).forEach(([key, value]) => {
            if (allowedFields.includes(key) && value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (fields.length === 0) {
            return this.findById(id);
        }

        values.push(id);

        const query = `
            UPDATE servers 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
        `;

        await this.db.query(query, values);
        return this.findById(id);
    }

    async delete(id) {
        const query = 'DELETE FROM servers WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rowCount > 0;
    }

    async setServerTypes(serverId, serverTypeIds) {
        // First, remove existing server type associations
        await this.db.query('DELETE FROM server_server_types WHERE server_id = $1', [serverId]);

        // Then, add new associations
        if (serverTypeIds && serverTypeIds.length > 0) {
            const values = serverTypeIds.map((typeId, index) =>
                `($1, $${index + 2})`
            ).join(', ');

            const query = `INSERT INTO server_server_types (server_id, server_type_id) VALUES ${values}`;
            await this.db.query(query, [serverId, ...serverTypeIds]);
        }
    }

    async countAll() {
        const query = 'SELECT COUNT(id) as total FROM servers';
        const result = await this.db.query(query);
        return parseInt(result.rows[0].total) || 0;
    }

    async countActive() {
        const query = 'SELECT COUNT(id) as total FROM servers WHERE is_active = true';
        const result = await this.db.query(query);
        return parseInt(result.rows[0].total) || 0;
    }

    async countCreatedSinceDays(days) {
        const query = `
            SELECT COUNT(id) as total
            FROM servers
            WHERE created_at > NOW() - INTERVAL '${days} days'
        `;
        const result = await this.db.query(query);
        return parseInt(result.rows[0].total) || 0;
    }

    async getPaginated(options = {}) {
        const servers = await this.findAll(options);
        const total = await this.count(options);

        return {
            data: servers,
            total,
            page: Math.floor((options.offset || 0) / (options.limit || 20)) + 1,
            limit: options.limit || 20,
            pages: Math.ceil(total / (options.limit || 20))
        };
    }

    async count(options = {}) {
        const {
            server_type_ids = null,
            is_premium = null,
            include_offline = true,
            search = null,
            version = null,
            min_players = null,
            max_players = null,
            owned_by = null
        } = options;

        const whereConditions = ['s.is_active = true'];
        const params = [];
        let paramIndex = 1;

        // Join clause for server types
        let joinClause = '';
        if (server_type_ids && server_type_ids.length > 0) {
            joinClause = `
                JOIN server_server_types sst ON s.id = sst.server_id
                JOIN server_types st ON sst.server_type_id = st.id
            `;
            whereConditions.push(`st.id = ANY($${paramIndex++})`);
            params.push(server_type_ids);
        }

        if (owned_by !== null) {
            whereConditions.push(`s.created_by = $${paramIndex++}`);
            params.push(owned_by);
        }

        if (is_premium !== null) {
            const premiumExpr = `(ps.id IS NOT NULL AND (ps.pinned = true OR ps.premium_until IS NULL OR ps.premium_until > NOW()))`;
            whereConditions.push(is_premium ? premiumExpr : `NOT ${premiumExpr}`);
        }

        if (!include_offline) {
            whereConditions.push(`(sd.data->>'online')::boolean = true`);
        }

        if (search) {
            whereConditions.push(`(s.name ILIKE $${paramIndex} OR s.description ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        if (version) {
            whereConditions.push(`(mv.version ILIKE $${paramIndex} OR sd.data->>'version' ILIKE $${paramIndex})`);
            params.push(`%${version}%`);
            paramIndex++;
        }

        if (min_players !== null) {
            whereConditions.push(`(sd.data->'players'->>'online')::integer >= $${paramIndex++}`);
            params.push(min_players);
        }

        if (max_players !== null) {
            whereConditions.push(`(sd.data->'players'->>'online')::integer <= $${paramIndex++}`);
            params.push(max_players);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const countQuery = `
            SELECT COUNT(DISTINCT s.id) as total
            FROM servers s
            LEFT JOIN minecraft_versions mv ON s.version_id = mv.id
            ${joinClause}
            LEFT JOIN (
                SELECT 
                    server_id,
                    data,
                    created_at,
                    ROW_NUMBER() OVER (PARTITION BY server_id ORDER BY created_at DESC) as rn
                FROM server_data
            ) sd ON s.id = sd.server_id AND sd.rn = 1
            LEFT JOIN premium_servers ps ON ps.server_id = s.id
            ${whereClause}
        `;

        const result = await this.db.query(countQuery, params);
        return parseInt(result.rows[0].total) || 0;
    }
}

module.exports = ServerRepository;