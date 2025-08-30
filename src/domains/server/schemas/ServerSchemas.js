'use strict'

const { createApiResponse, createPaginatedResponse, errorResponse } = require('../../../shared/schemas/components/BaseSchemaComponents');
const { 
    createStringField, 
    createNumberField, 
    createArrayField, 
    urlField,
    positiveIntegerField 
} = require('../../../shared/schemas/components/ValidationSchemaComponents');
const { voteStatsSummaryObject } = require('./components/ServerSchemaComponents');

// Server creation schema with Lithuanian validation
const createServerBody = {
    type: 'object',
    required: ['name', 'host', 'server_type_ids'],
    properties: {
        name: {
            type: 'string',
            minLength: 1,
            maxLength: parseInt(process.env.SERVER_NAME_LIMIT_LENGTH) || 60,
            description: 'Server name'
        },
        description: {
            type: 'string',
            maxLength: 1000,
            description: 'Server description'
        },
        host: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^localhost$|^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}$',
            description: 'Server hostname or IP address'
        },
        port: {
            type: 'integer',
            minimum: 1,
            maximum: 65535,
            default: 25565,
            description: 'Server port'
        },
        server_type_ids: {
            type: 'array',
            items: {
                type: 'integer',
                minimum: 1
            },
            minItems: 1,
            maxItems: 5,
            description: 'Array of server type IDs'
        },
        version_id: {
            type: 'integer',
            minimum: 1,
            description: 'Minecraft version ID'
        },
        website: {
            type: ['string', 'null'],
            format: 'uri',
            maxLength: 500,
            description: 'Server website URL'
        },
        discord_invite: {
            type: ['string', 'null'],
            pattern: '^[a-zA-Z0-9]{0,50}$',
            maxLength: 50,
            description: 'Discord invite code (without discord.gg/)'
        }
    },
    additionalProperties: false
};

// Server update schema
const updateServerBody = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            minLength: 1,
            maxLength: parseInt(process.env.SERVER_NAME_LIMIT_LENGTH) || 60,
            description: 'Server name'
        },
        description: {
            type: 'string',
            maxLength: 1000,
            description: 'Server description'
        },
        host: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^localhost$|^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z]{2,}$',
            description: 'Server hostname or IP address'
        },
        port: {
            type: 'integer',
            minimum: 1,
            maximum: 65535,
            description: 'Server port'
        },
        server_type_ids: {
            type: 'array',
            items: {
                type: 'integer',
                minimum: 1
            },
            minItems: 1,
            maxItems: 5,
            description: 'Array of server type IDs'
        },
        version_id: {
            type: 'integer',
            minimum: 1,
            description: 'Minecraft version ID'
        },
        website: {
            type: ['string', 'null'],
            format: 'uri',
            maxLength: 500,
            description: 'Server website URL (optional)'
        },
        discord_invite: {
            type: ['string', 'null'],
            pattern: '^[a-zA-Z0-9]{0,50}$',
            maxLength: 50,
            description: 'Discord invite code (without discord.gg/)'
        }
    },
    additionalProperties: false
};

// Server query parameters
const getServersQuery = {
    type: 'object',
    properties: {
        page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Page number'
        },
        limit: {
            type: 'integer',
            minimum: 1,
            maximum: 50,
            default: 10,
            description: 'Items per page'
        },
        server_type_ids: {
            type: 'string',
            pattern: '^\\d+(,\\d+)*$',
            description: 'Comma-separated list of server type IDs (e.g., "1,2,3")'
        },
        is_premium: {
            type: 'string',
            enum: ['true', 'false'],
            description: 'Filter by premium status'
        },
        search: {
            type: 'string',
            maxLength: 100,
            description: 'Search in name and description'
        },
        include_offline: {
            type: 'string',
            enum: ['true', 'false'],
            default: 'true',
            description: 'Include offline servers'
        },
        sort_by: {
            type: 'string',
            enum: ['votes', 'created_at', 'updated_at', 'name', 'players', 'version'],
            default: 'created_at',
            description: 'Sort servers by field'
        },
        sort_order: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
            description: 'Sort order'
        },
        version: {
            type: 'string',
            maxLength: 50,
            description: 'Filter by Minecraft version'
        },
        min_players: {
            type: 'integer',
            minimum: 0,
            description: 'Minimum current player count'
        },
        max_players: {
            type: 'integer',
            minimum: 0,
            description: 'Maximum current player count'
        }
    },
    additionalProperties: false
};

// Server response schemas
const serverObject = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        description: { type: ['string', 'null'] },
        host: { type: 'string' },
        port: { type: 'integer' },
        version: { type: ['string', 'null'] },
        max_players: { type: 'integer' },
        website: { type: ['string', 'null'] },
        discord_invite: { type: ['string', 'null'] },
        slug: { type: ['string', 'null'] },
        is_premium: { type: 'boolean' },
        premium_until: { type: ['string', 'null'], format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        server_types: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    color: { type: 'string' },
                    icon: { type: 'string' }
                }
            }
        },
        server_data: {
            type: 'object',
            properties: {
                online: { type: 'boolean' },
                players: {
                    type: 'object',
                    properties: {
                        online: { type: 'integer' },
                        max: { type: 'integer' },
                        list: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    uuid: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                version: { type: ['string', 'null'] },
                motd: {
                    type: 'object',
                    properties: {
                        raw: { type: 'array', items: { type: 'string' } },
                        clean: { type: 'array', items: { type: 'string' } },
                        html: { type: 'array', items: { type: 'string' } }
                    }
                },
                software: { type: ['string', 'null'] },
                icon: { type: ['string', 'null'] },
                ping_time: { type: ['integer', 'null'] },
                last_updated: { type: ['string', 'null'], format: 'date-time' }
            }
        },
        vote_stats: voteStatsSummaryObject
    }
};

const getServersResponse = createPaginatedResponse(serverObject, 'servers');

// Detailed server object
const detailedServerObject = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        description: { type: ['string', 'null'] },
        host: { type: 'string' },
        port: { type: 'integer' },
        version: { type: ['string', 'null'] },
        max_players: { type: 'integer' },
        website: { type: ['string', 'null'] },
        discord_invite: { type: ['string', 'null'] },
        slug: { type: ['string', 'null'] },
        is_premium: { type: 'boolean' },
        premium_until: { type: ['string', 'null'], format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        server_types: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    description: { type: ['string', 'null'] },
                    color: { type: 'string' },
                    icon: { type: 'string' }
                }
            }
        },
        server_data: {
            type: 'object',
            properties: {
                online: { type: 'boolean' },
                players: {
                    type: 'object',
                    properties: {
                        online: { type: 'integer' },
                        max: { type: 'integer' },
                        list: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    uuid: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                version: { type: ['string', 'null'] },
                motd: {
                    type: 'object',
                    properties: {
                        raw: { type: 'array', items: { type: 'string' } },
                        clean: { type: 'array', items: { type: 'string' } },
                        html: { type: 'array', items: { type: 'string' } }
                    }
                },
                software: { type: ['string', 'null'] },
                icon: { type: ['string', 'null'] },
                ping_time: { type: ['integer', 'null'] },
                last_updated: { type: ['string', 'null'], format: 'date-time' }
            }
        },
        vote_stats: voteStatsSummaryObject,
        seo_data: {
            type: ['object', 'null'],
            properties: {
                id: { type: 'integer' },
                server_id: { type: 'integer' },
                slug: { type: 'string' },
                seo_title: { type: ['string', 'null'] },
                seo_description: { type: ['string', 'null'] },
                seo_keywords: { type: ['string', 'null'] },
                og_title: { type: ['string', 'null'] },
                og_description: { type: ['string', 'null'] },
                og_image: { type: ['string', 'null'] },
                twitter_title: { type: ['string', 'null'] },
                twitter_description: { type: ['string', 'null'] },
                twitter_image: { type: ['string', 'null'] },
                canonical_url: { type: ['string', 'null'] },
                meta_robots: { type: ['string', 'null'] },
                structured_data: { 
                    type: ['object', 'null'],
                    additionalProperties: true
                },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' }
            }
        }
    }
};

const getServerResponse = createApiResponse({
    type: 'object',
    properties: { server: detailedServerObject },
    required: ['server']
});

const createServerResponse = createApiResponse({
    type: 'object',
    properties: { server: serverObject },
    required: ['server']
});

const updateServerResponse = createServerResponse;

const deleteServerResponse = createApiResponse({ type: 'object' });

// Update: sub-route schemas (owner-only partial updates)
// 1) Update Name
const updateServerNameBody = {
    type: 'object',
    properties: {
        server_id: { type: 'integer', minimum: 1, description: 'Server ID' },
        name: { type: 'string', minLength: 1, maxLength: parseInt(process.env.SERVER_NAME_LIMIT_LENGTH) || 60, description: 'New server name' }
    },
    required: ['server_id', 'name'],
    additionalProperties: false
};

const updateServerNameResponse = createApiResponse({
    type: 'object',
    properties: {
        server: {
            type: 'object',
            properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                slug: { type: ['string', 'null'] }
            }
        }
    },
    required: ['server']
});

// 2) Update Description
const updateServerDescriptionBody = {
    type: 'object',
    properties: {
        server_id: { type: 'integer', minimum: 1, description: 'Server ID' },
        description: { type: 'string', maxLength: 1000, description: 'New server description' }
    },
    required: ['server_id', 'description'],
    additionalProperties: false
};

const updateServerDescriptionResponse = createApiResponse({
    type: 'object',
    properties: {
        server: {
            type: 'object',
            properties: {
                id: { type: 'integer' },
                description: { type: 'string' },
                slug: { type: ['string', 'null'] }
            }
        }
    },
    required: ['server']
});

// 3) Update Server Types
const updateServerTypeBody = {
    type: 'object',
    properties: {
        server_id: { type: 'integer', minimum: 1, description: 'Server ID' },
        server_type_ids: {
            type: 'array',
            items: { type: 'integer', minimum: 1 },
            minItems: 1,
            maxItems: 5,
            description: 'Array of server type IDs'
        }
    },
    required: ['server_id', 'server_type_ids'],
    additionalProperties: false
};

const updateServerTypeResponse = createApiResponse({
    type: 'object',
    properties: {
        server: {
            type: 'object',
            properties: {
                id: { type: 'integer' },
                server_type_ids: { type: 'array', items: { type: 'integer' } },
                slug: { type: ['string', 'null'] }
            }
        }
    },
    required: ['server']
});

// 4) Update IP (host & port)
const updateServerIpBody = {
    type: 'object',
    properties: {
        server_id: { type: 'integer', minimum: 1, description: 'Server ID' },
        host: { type: 'string', minLength: 1, maxLength: 255, description: 'Server hostname or IP address' },
        port: { type: 'integer', minimum: 1, maximum: 65535, default: 25565, description: 'Server port' }
    },
    required: ['server_id', 'host', 'port'],
    additionalProperties: false
};

const updateServerIpResponse = createApiResponse({
    type: 'object',
    properties: {
        server: {
            type: 'object',
            properties: {
                id: { type: 'integer' },
                host: { type: 'string' },
                port: { type: 'integer' },
                slug: { type: ['string', 'null'] }
            }
        }
    },
    required: ['server']
});

const pingServerResponse = createApiResponse({
    type: 'object',
    properties: {
        ping_result: {
            type: 'object',
            properties: {
                server_id: { type: 'integer' },
                online: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        online: { type: 'boolean' },
                        players: {
                            type: 'object',
                            properties: {
                                online: { type: 'integer' },
                                max: { type: ['integer', 'null'] },
                                list: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            uuid: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        version: { type: ['string', 'null'] },
                        software: { type: ['string', 'null'] },
                        motd: {
                            type: ['object', 'null'],
                            properties: {
                                raw: { type: 'array', items: { type: 'string' } },
                                clean: { type: 'array', items: { type: 'string' } },
                                html: { type: 'array', items: { type: 'string' } }
                            }
                        },
                        icon: { type: ['string', 'null'] }
                    }
                },
                ping_time: { type: ['integer', 'null'] },
                error: { type: ['string', 'null'] },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    },
    required: ['ping_result']
});

const getServerStatsResponse = createApiResponse({
    type: 'object',
    properties: {
        stats: {
            type: 'object',
            properties: {
                total_servers: { type: 'integer' },
                online_servers: { type: 'integer' },
                offline_servers: { type: 'integer' },
                total_players: { type: 'integer' },
                total_votes: { type: 'integer' }
            }
        }
    },
    required: ['stats']
});

const getTopServersResponse = createApiResponse({
    type: 'object',
    properties: {
        servers: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'integer' },
                    server_id: { type: 'integer' },
                    server_name: { type: 'string' },
                    host: { type: 'string' },
                    port: { type: 'integer' },
                    data: {
                        type: 'object',
                        properties: {
                            online: { type: 'boolean' },
                            players: {
                                type: 'object',
                                properties: {
                                    online: { type: 'integer' },
                                    max: { type: 'integer' }
                                }
                            },
                            version: { type: ['string', 'null'] },
                            software: { type: ['string', 'null'] }
                        }
                    },
                    created_at: { type: 'string', format: 'date-time' }
                }
            }
        }
    },
    required: ['servers']
});

// Server ownership check response
const serverOwnershipResponse = createApiResponse({
    type: 'object',
    properties: {
        is_owned: { type: 'boolean', description: 'Whether the server is owned by the authenticated user' },
        server_id: { type: 'integer', description: 'The server ID that was checked' }
    },
    required: ['is_owned', 'server_id']
});

module.exports = {
    createServerBody,
    updateServerBody,
    getServersQuery,
    getServersResponse,
    getServerResponse,
    createServerResponse,
    updateServerResponse,
    deleteServerResponse,
    pingServerResponse,
    getServerStatsResponse,
    getTopServersResponse,
    serverOwnershipResponse,
    serverObject,
    detailedServerObject,
    updateServerNameBody,
    updateServerDescriptionBody,
    updateServerTypeBody,
    updateServerIpBody,
    updateServerNameResponse,
    updateServerDescriptionResponse,
    updateServerTypeResponse,
    updateServerIpResponse
};
