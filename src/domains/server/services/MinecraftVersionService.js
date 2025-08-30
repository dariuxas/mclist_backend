'use strict'

const MinecraftVersionRepository = require('../repositories/MinecraftVersionRepository');

class MinecraftVersionService {
    constructor(database) {
        this.database = database;
        this.minecraftVersionRepository = new MinecraftVersionRepository(database);
    }

    async fetchAndUpdateVersions() {
        try {
            console.log('🔄 Fetching Minecraft versions from API...');
            
            const response = await fetch('https://mc-versions-api.net/api/java');
            
            if (!response.ok) {
                throw new Error(`API request failed with status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.result || !Array.isArray(data.result)) {
                throw new Error('Invalid API response format');
            }

            const versions = data.result;
            console.log(`📥 Found ${versions.length} Minecraft versions`);

            await this.minecraftVersionRepository.deactivateAll();

            const insertedVersions = await this.minecraftVersionRepository.insertVersions(versions);
            
            console.log(`✅ Successfully updated ${insertedVersions.length} Minecraft versions`);
            return insertedVersions;
        } catch (error) {
            console.error('❌ Failed to fetch Minecraft versions:', error.message);
            throw error;
        }
    }

    async getAllActiveVersions() {
        return await this.minecraftVersionRepository.getAllActive();
    }

    async getVersionById(id) {
        return await this.minecraftVersionRepository.findById(id);
    }

    async getVersionByString(version) {
        return await this.minecraftVersionRepository.findByVersion(version);
    }
}

module.exports = MinecraftVersionService;