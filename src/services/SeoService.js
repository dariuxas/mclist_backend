'use strict';

const BaseService = require('./BaseService');

// Define constants for character limits
const TITLE_MAX_LENGTH = 60;
const DESC_MAX_LENGTH = 160;
const KEYWORDS_MAX_LENGTH = 255; // ✅ FIX: Matched the database's VARCHAR(255) limit.

class SeoService extends BaseService {
    constructor(seoRepository, logger) {
        super(seoRepository, logger);
        this.frontendUrl = process.env.FRONTEND_URL || 'https://mclist.lt';
        this.defaultBannerUrl = `${this.frontendUrl}/default-banner.png`;
    }

    /**
     * Generates and saves comprehensive SEO data for a given server.
     * @param {object} server - The server object from the database.
     * @returns {Promise<object>} The result of the upsert operation.
     */
    async generateSeoForServer(server) {
        try {
            const serverData = server.toJSON ? server.toJSON() : server;

            const {
                id,
                name,
                description,
                host,
                port,
                max_players,
                version,
                vote_stats,
                server_data,
                server_types = []
            } = serverData;

            const slug = this._generateSlug(name);
            const canonicalUrl = `${this.frontendUrl}/servers/${slug}`;

            const totalVotes = vote_stats?.total_votes || 0;
            const rating = this._calculateRating(totalVotes);
            const reviewCount = totalVotes;
            const isOnline = server_data?.online || false;
            const playersOnline = server_data?.players?.online || 0;
            const serverVersion = server_data?.version || version;

            const serverTypeNames = server_types.map(t => t.name);
            const serverTypesString = serverTypeNames.map(name => name.charAt(0).toUpperCase() + name.slice(1)).join(', ');

            const titleServerTypes = serverTypeNames.slice(0, 2).map(name => name.charAt(0).toUpperCase() + name.slice(1)).join(' & ');
            let baseTitle = name;
            if (titleServerTypes) {
                baseTitle += ` | ${titleServerTypes} Serveris`;
            } else {
                baseTitle += ' | Minecraft Serveris';
            }
            const seoTitle = serverVersion ? `${baseTitle} (MC ${serverVersion})` : baseTitle;

            const fallbackDescription = `Ieškai naujų nuotykių? 🚀 Atrask ${name} – populiarų lietuvišką Minecraft serverį, palaikantį ${serverVersion} versiją. Šiuo metu žaidžia ${playersOnline} žaidėjai. Serverio tipai: ${serverTypesString}. Prisijunk šiandien adresu ${host}:${port} ir tapk mūsų bendruomenės dalimi!`;
            const baseDescription = description ? `${description} | Serverio adresas: ${host}:${port}.` : fallbackDescription;

            const finalTitle = this._truncateText(seoTitle, TITLE_MAX_LENGTH);
            const finalDescription = this._truncateText(baseDescription, DESC_MAX_LENGTH);

            const seoKeywords = this._generateKeywords(name, serverTypeNames, serverVersion);
            
            const serverIconUrl = server_data?.icon ? `${this.frontendUrl}/api/servers/${slug}/icon` : this.defaultBannerUrl;

            const structuredData = this._generateStructuredData({
                name,
                description: finalDescription,
                canonicalUrl,
                iconUrl: serverIconUrl,
                players_online: playersOnline,
                max_players,
                rating,
                reviewCount,
                status: isOnline ? 'online' : 'offline',
                version: serverVersion
            });

            const socialImage = `https://mclist.lt/api/og?slug=${slug}`;

            const seoData = {
                slug,
                seo_title: finalTitle,
                seo_description: finalDescription,
                seo_keywords: seoKeywords,
                og_title: finalTitle,
                og_description: finalDescription,
                og_image: socialImage,
                twitter_title: finalTitle,
                twitter_description: finalDescription,
                twitter_image: socialImage,
                canonical_url: canonicalUrl,
                meta_robots: 'index, follow',
                structured_data: structuredData,
            };

            this.logger.info(`SEO Service: Generating SEO data for server ID ${id}`);
            return await this.repository.upsertByServerId(id, seoData);
        } catch (error) {
            this.logger.error(`SEO Service: Error generating SEO data: ${error.message}`);
            throw error;
        }
    }

    _calculateRating(totalVotes) {
        if (totalVotes === 0) return null;
        const rating = Math.min(5.0, Math.max(1.0, (totalVotes / 100) * 4 + 1));
        return Math.round(rating * 10) / 10;
    }

    _generateSlug(text) {
        const lithuanianChars = {
            'ą': 'a', 'č': 'c', 'ę': 'e', 'ė': 'e', 'į': 'i', 'š': 's', 'ų': 'u', 'ū': 'u', 'ž': 'z'
        };
        return text
            .toLowerCase()
            .replace(/[ąčęėįšųūž]/g, char => lithuanianChars[char])
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }

    _truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        let truncated = text.substring(0, maxLength);
        truncated = truncated.substring(0, Math.min(truncated.length, truncated.lastIndexOf(' ')));
        return truncated + '...';
    }

    _generateKeywords(name, serverTypes = [], version = null) {
        const keywordSet = new Set([
            'minecraft serveriai', 'minecraft serveris', 'lietuviški minecraft serveriai',
            'mc serveriai', 'minecraft projektai', name.toLowerCase()
        ]);

        serverTypes.forEach(type => {
            const typeLower = type.toLowerCase();
            keywordSet.add(typeLower);
            keywordSet.add(`${typeLower} serveris`);
            keywordSet.add(`minecraft ${typeLower}`);
            keywordSet.add(`mc ${typeLower} serveriai`);
        });

        if (version) {
            const baseVersion = version.split(/[.-]/).slice(0, 2).join('.');
            if (baseVersion) {
                keywordSet.add(`minecraft ${baseVersion}`);
                keywordSet.add(`mc ${baseVersion} serveriai`);
            }
            keywordSet.add(`minecraft ${version} serveris`);
        }

        const fullKeywordString = Array.from(keywordSet).join(',');
        
        if (fullKeywordString.length <= KEYWORDS_MAX_LENGTH) {
            return fullKeywordString;
        }

        // If too long, cut it at the last comma to avoid partial keywords
        let truncated = fullKeywordString.substring(0, KEYWORDS_MAX_LENGTH);
        truncated = truncated.substring(0, Math.min(truncated.length, truncated.lastIndexOf(',')));
        return truncated;
    }

    _generateStructuredData(data) {
        const { name, description, canonicalUrl, iconUrl, players_online, max_players, rating, reviewCount, status, version } = data;

        const schema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": name,
            "description": description,
            "url": canonicalUrl,
            "image": iconUrl,
            "category": "Game Server",
            "brand": { "@type": "Brand", "name": "Minecraft" },
            "offers": {
                "@type": "Offer",
                "availability": status === 'online' ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "price": "0",
                "priceCurrency": "EUR"
            },
            "additionalProperty": [
                { "@type": "PropertyValue", "name": "Players Online", "value": players_online || 0 },
                { "@type": "PropertyValue", "name": "Max Players", "value": max_players || 0 },
                { "@type": "PropertyValue", "name": "Game Version", "value": version || "Unknown" },
                { "@type": "PropertyValue", "name": "Server Location", "value": "Lithuania" }
            ]
        };

        if (version) {
            schema.model = version;
        }

        if (rating && reviewCount > 0) {
            schema.aggregateRating = {
                "@type": "AggregateRating",
                "ratingValue": rating,
                "reviewCount": reviewCount,
                "bestRating": 5,
                "worstRating": 1
            };
        }

        return schema;
    }
}

module.exports = SeoService;