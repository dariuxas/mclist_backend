'use strict';

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class FaviconUtils {
    constructor(logger) {
        this.logger = logger;
        this.faviconDir = path.join(process.cwd(), 'public', 'favicons');
        this.baseUrl = '/static/favicons';
    }

    /**
     * Save favicon from base64 data to file system
     * @param {string} faviconData - Base64 favicon data (with or without data URL prefix)
     * @param {number} serverId - Server ID for filename
     * @returns {Promise<string|null>} File path relative to static root, or null if failed
     */
    async saveFavicon(faviconData, serverId) {
        if (!faviconData || typeof faviconData !== 'string') {
            return null;
        }

        try {
            // Ensure favicon directory exists
            await fs.mkdir(this.faviconDir, { recursive: true });

            // Parse the favicon data
            const { base64Data, extension } = this.parseFaviconData(faviconData);
            if (!base64Data) {
                return null;
            }

            // Create filename with hash to handle updates
            const hash = crypto.createHash('md5').update(base64Data).digest('hex').substring(0, 8);
            const filename = `server_${serverId}_${hash}.${extension}`;
            const filePath = path.join(this.faviconDir, filename);
            const relativePath = `favicons/${filename}`;

            // Check if file already exists
            try {
                await fs.access(filePath);
                // File exists, return the relative path
                return relativePath;
            } catch (error) {
                // File doesn't exist, create it
            }

            // Delete old favicon files for this server
            await this.deleteOldFavicons(serverId, filename);

            // Convert base64 to buffer and save
            const buffer = Buffer.from(base64Data, 'base64');
            await fs.writeFile(filePath, buffer);

            this.logger.info({ serverId, filename, size: buffer.length }, 'Favicon saved successfully');
            return relativePath;

        } catch (error) {
            this.logger.error({ 
                serverId, 
                error: error.message,
                faviconLength: faviconData.length 
            }, 'Failed to save favicon');
            return null;
        }
    }

    /**
     * Parse favicon data to extract base64 and determine extension
     * @param {string} faviconData - Favicon data
     * @returns {Object} Object with base64Data and extension
     */
    parseFaviconData(faviconData) {
        try {
            let base64Data;
            let extension = 'png'; // default

            if (faviconData.startsWith('data:image/')) {
                // Extract format and base64 data from data URL
                const formatMatch = faviconData.match(/data:image\/([^;]+);base64,(.+)/);
                if (formatMatch) {
                    extension = formatMatch[1];
                    base64Data = formatMatch[2];
                } else {
                    return { base64Data: null, extension: null };
                }
            } else if (faviconData.match(/^[A-Za-z0-9+/]+=*$/)) {
                // Pure base64 data, assume PNG
                base64Data = faviconData;
                extension = 'png';
            } else {
                return { base64Data: null, extension: null };
            }

            // Validate base64
            Buffer.from(base64Data, 'base64');
            
            return { base64Data, extension };

        } catch (error) {
            return { base64Data: null, extension: null };
        }
    }

    /**
     * Delete old favicon files for a server
     * @param {number} serverId - Server ID
     * @param {string} currentFilename - Current filename to keep
     */
    async deleteOldFavicons(serverId, currentFilename) {
        try {
            const files = await fs.readdir(this.faviconDir);
            const serverFiles = files.filter(file => 
                file.startsWith(`server_${serverId}_`) && 
                file !== currentFilename
            );

            for (const file of serverFiles) {
                try {
                    await fs.unlink(path.join(this.faviconDir, file));
                    this.logger.debug({ serverId, file }, 'Deleted old favicon file');
                } catch (error) {
                    this.logger.warn({ serverId, file, error: error.message }, 'Failed to delete old favicon');
                }
            }
        } catch (error) {
            this.logger.warn({ serverId, error: error.message }, 'Failed to clean up old favicons');
        }
    }

    /**
     * Get favicon URL for serving
     * @param {string} faviconPath - Relative path to favicon
     * @returns {string} Full URL for favicon
     */
    getFaviconUrl(faviconPath) {
        if (!faviconPath) return null;
        return `${this.baseUrl}/${faviconPath}`;
    }

    /**
     * Delete favicon file
     * @param {string} faviconPath - Relative path to favicon
     */
    async deleteFavicon(faviconPath) {
        if (!faviconPath) return;

        try {
            const fullPath = path.join(this.faviconDir, faviconPath.replace('favicons/', ''));
            await fs.unlink(fullPath);
            this.logger.debug({ faviconPath }, 'Deleted favicon file');
        } catch (error) {
            this.logger.warn({ faviconPath, error: error.message }, 'Failed to delete favicon');
        }
    }
}

module.exports = FaviconUtils;