'use strict';

/**
 * Simple, unified validation system
 * Replaces all the complicated validation mess
 */
class Validator {
    /**
     * Validate server creation data
     */
    static validateCreateServer(data) {
        const errors = {};

        // Name validation
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
            errors.name = 'Pavadinimas yra privalomas';
        } else if (data.name.length > (parseInt(process.env.SERVER_NAME_LIMIT_LENGTH) || 60)) {
            errors.name = `Pavadinimas negali viršyti ${parseInt(process.env.SERVER_NAME_LIMIT_LENGTH) || 60} simbolių`;
        }

        // Host validation
        if (!data.host || typeof data.host !== 'string' || data.host.trim().length === 0) {
            errors.host = 'Serverio adresas yra privalomas';
        } else if (data.host.length > 255) {
            errors.host = 'Serverio adresas negali viršyti 255 simbolių';
        } else if (!this.isValidHost(data.host)) {
            errors.host = 'Neteisingas serverio adresas (turi būti IP adresas arba domenas)';
        }

        // Port validation
        if (data.port !== undefined) {
            const port = parseInt(data.port);
            if (isNaN(port) || port < 1 || port > 65535) {
                errors.port = 'Portas turi būti skaičius nuo 1 iki 65535';
            }
        }

        // Server type IDs validation
        if (!Array.isArray(data.server_type_ids) || data.server_type_ids.length === 0) {
            errors.server_type_ids = 'Reikalingas bent vienas serverio tipas';
        } else if (data.server_type_ids.length > 5) {
            errors.server_type_ids = 'Negalima pasirinkti daugiau nei 5 serverio tipų';
        } else {
            // Check if all are valid integers
            for (const id of data.server_type_ids) {
                if (!Number.isInteger(id) || id < 1) {
                    errors.server_type_ids = 'Visi serverio tipų ID turi būti teisingi skaičiai';
                    break;
                }
            }
        }

        // Website validation (optional)
        if (data.website && data.website.trim().length > 0) {
            try {
                new URL(data.website);
                if (data.website.length > 500) {
                    errors.website = 'Svetainės adresas negali viršyti 500 simbolių';
                }
            } catch (e) {
                errors.website = 'Svetainės formatas neteisingas';
            }
        }

        // Description validation (optional)
        if (data.description && data.description.length > 1000) {
            errors.description = 'Aprašymas negali viršyti 1000 simbolių';
        }

        // Discord invite validation (optional)
        if (data.discord_invite && data.discord_invite.trim().length > 0) {
            if (!/^[a-zA-Z0-9]{2,50}$/.test(data.discord_invite)) {
                errors.discord_invite = 'Discord pakvietimo kodas turi būti 2-50 raidžių ir skaičių';
            }
        }

        // Version ID validation (optional)
        if (data.version_id !== undefined && data.version_id !== null) {
            const versionId = parseInt(data.version_id);
            if (isNaN(versionId) || versionId < 1) {
                errors.version_id = 'Versijos ID turi būti teisingas skaičius';
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Validate server update data
     */
    static validateUpdateServer(data) {
        const errors = {};

        // Name validation (if provided)
        if (data.name !== undefined) {
            if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
                errors.name = 'Pavadinimas yra privalomas';
            } else if (data.name.length > (parseInt(process.env.SERVER_NAME_LIMIT_LENGTH) || 60)) {
                errors.name = `Pavadinimas negali viršyti ${parseInt(process.env.SERVER_NAME_LIMIT_LENGTH) || 60} simbolių`;
            }
        }

        // Host validation (if provided)
        if (data.host !== undefined) {
            if (!data.host || typeof data.host !== 'string' || data.host.trim().length === 0) {
                errors.host = 'Serverio adresas yra privalomas';
            } else if (data.host.length > 255) {
                errors.host = 'Serverio adresas negali viršyti 255 simbolių';
            } else if (!this.isValidHost(data.host)) {
                errors.host = 'Neteisingas serverio adresas (turi būti IP adresas arba domenas)';
            }
        }

        // Port validation (if provided)
        if (data.port !== undefined) {
            const port = parseInt(data.port);
            if (isNaN(port) || port < 1 || port > 65535) {
                errors.port = 'Portas turi būti skaičius nuo 1 iki 65535';
            }
        }

        // Server type IDs validation (if provided)
        if (data.server_type_ids !== undefined) {
            if (!Array.isArray(data.server_type_ids) || data.server_type_ids.length === 0) {
                errors.server_type_ids = 'Reikalingas bent vienas serverio tipas';
            } else if (data.server_type_ids.length > 5) {
                errors.server_type_ids = 'Negalima pasirinkti daugiau nei 5 serverio tipų';
            } else {
                for (const id of data.server_type_ids) {
                    if (!Number.isInteger(id) || id < 1) {
                        errors.server_type_ids = 'Visi serverio tipų ID turi būti teisingi skaičiai';
                        break;
                    }
                }
            }
        }

        // Website validation (if provided)
        if (data.website !== undefined && data.website !== null && data.website.trim().length > 0) {
            try {
                new URL(data.website);
                if (data.website.length > 500) {
                    errors.website = 'Svetainės adresas negali viršyti 500 simbolių';
                }
            } catch (e) {
                errors.website = 'Svetainės formatas neteisingas';
            }
        }

        // Description validation (if provided)
        if (data.description !== undefined && data.description && data.description.length > 1000) {
            errors.description = 'Aprašymas negali viršyti 1000 simbolių';
        }

        // Discord invite validation (if provided)
        if (data.discord_invite !== undefined && data.discord_invite && data.discord_invite.trim().length > 0) {
            if (!/^[a-zA-Z0-9]{2,50}$/.test(data.discord_invite)) {
                errors.discord_invite = 'Discord pakvietimo kodas turi būti 2-50 raidžių ir skaičių';
            }
        }

        // Version ID validation (if provided)
        if (data.version_id !== undefined && data.version_id !== null) {
            const versionId = parseInt(data.version_id);
            if (isNaN(versionId) || versionId < 1) {
                errors.version_id = 'Versijos ID turi būti teisingas skaičius';
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Validate specific field updates
     */
    static validateFieldUpdate(field, value, serverId) {
        const errors = {};

        // Server ID validation
        const id = parseInt(serverId);
        if (isNaN(id) || id < 1) {
            errors.server_id = 'Serverio ID turi būti teisingas skaičius';
            return { isValid: false, errors };
        }

        switch (field) {
            case 'name':
                if (!value || typeof value !== 'string' || value.trim().length === 0) {
                    errors.name = 'Pavadinimas yra privalomas';
                } else if (value.length > (parseInt(process.env.SERVER_NAME_LIMIT_LENGTH) || 60)) {
                    errors.name = `Pavadinimas negali viršyti ${parseInt(process.env.SERVER_NAME_LIMIT_LENGTH) || 60} simbolių`;
                }
                break;

            case 'description':
                if (value && value.length > 1000) {
                    errors.description = 'Aprašymas negali viršyti 1000 simbolių';
                }
                break;

            case 'server_type_ids':
                if (!Array.isArray(value) || value.length === 0) {
                    errors.server_type_ids = 'Reikalingas bent vienas serverio tipas';
                } else if (value.length > 5) {
                    errors.server_type_ids = 'Negalima pasirinkti daugiau nei 5 serverio tipų';
                } else {
                    for (const id of value) {
                        if (!Number.isInteger(id) || id < 1) {
                            errors.server_type_ids = 'Visi serverio tipų ID turi būti teisingi skaičiai';
                            break;
                        }
                    }
                }
                break;

            case 'host':
                if (!value || typeof value !== 'string' || value.trim().length === 0) {
                    errors.host = 'Serverio adresas yra privalomas';
                } else if (value.length > 255) {
                    errors.host = 'Serverio adresas negali viršyti 255 simbolių';
                } else if (!this.isValidHost(value)) {
                    errors.host = 'Neteisingas serverio adresas (turi būti IP adresas arba domenas)';
                }
                break;

            case 'port':
                const port = parseInt(value);
                if (isNaN(port) || port < 1 || port > 65535) {
                    errors.port = 'Portas turi būti skaičius nuo 1 iki 65535';
                }
                break;

            default:
                errors.general = 'Neteisingas laukas';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Validate user registration data
     */
    static validateRegister(data) {
        const errors = {};

        // Email validation
        if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
            errors.email = 'El. paštas yra privalomas';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                errors.email = 'El. pašto formatas neteisingas';
            } else if (data.email.length > 255) {
                errors.email = 'El. paštas negali viršyti 255 simbolių';
            }
        }

        // Password validation
        if (!data.password || typeof data.password !== 'string') {
            errors.password = 'Slaptažodis yra privalomas';
        } else if (data.password.length < 8) {
            errors.password = 'Slaptažodis turi būti bent 8 simbolių';
        } else if (data.password.length > 100) {
            errors.password = 'Slaptažodis negali viršyti 100 simbolių';
        }

        // Password confirmation validation
        if (!data.password_confirmation || typeof data.password_confirmation !== 'string') {
            errors.password_confirmation = 'Slaptažodžio patvirtinimas yra privalomas';
        } else if (data.password_confirmation.length < 8) {
            errors.password_confirmation = 'Slaptažodžio patvirtinimas turi būti bent 8 simbolių';
        } else if (data.password_confirmation.length > 100) {
            errors.password_confirmation = 'Slaptažodžio patvirtinimas negali viršyti 100 simbolių';
        } else if (data.password && data.password !== data.password_confirmation) {
            errors.password_confirmation = 'Slaptažodžiai nesutampa';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Validate user login data
     */
    static validateLogin(data) {
        const errors = {};

        // Email validation
        if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
            errors.email = 'El. paštas yra privalomas';
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                errors.email = 'El. pašto formatas neteisingas';
            }
        }

        // Password validation
        if (!data.password || typeof data.password !== 'string' || data.password.trim().length === 0) {
            errors.password = 'Slaptažodis yra privalomas';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Validate user profile update data
     */
    static validateUpdateProfile(data) {
        const errors = {};

        // Email validation (if provided)
        if (data.email !== undefined) {
            if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
                errors.email = 'El. paštas yra privalomas';
            } else {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(data.email)) {
                    errors.email = 'El. pašto formatas neteisingas';
                } else if (data.email.length > 255) {
                    errors.email = 'El. paštas negali viršyti 255 simbolių';
                }
            }
        }

        // Display name validation (if provided)
        if (data.display_name !== undefined && data.display_name !== null) {
            if (typeof data.display_name !== 'string') {
                errors.display_name = 'Vardas turi būti tekstas';
            } else if (data.display_name.trim().length === 0) {
                errors.display_name = 'Vardas negali būti tuščias';
            } else if (data.display_name.length > 50) {
                errors.display_name = 'Vardas negali viršyti 50 simbolių';
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Validate password change data
     */
    static validatePasswordChange(data) {
        const errors = {};

        // Current password validation
        if (!data.current_password || typeof data.current_password !== 'string' || data.current_password.trim().length === 0) {
            errors.current_password = 'Dabartinis slaptažodis yra privalomas';
        }

        // New password validation
        if (!data.new_password || typeof data.new_password !== 'string') {
            errors.new_password = 'Naujas slaptažodis yra privalomas';
        } else if (data.new_password.length < 8) {
            errors.new_password = 'Naujas slaptažodis turi būti bent 8 simbolių';
        } else if (data.new_password.length > 100) {
            errors.new_password = 'Naujas slaptažodis negali viršyti 100 simbolių';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Validate vote creation data
     */
    static validateCreateVote(data) {
        const errors = {};

        // Server ID validation
        const serverId = parseInt(data.server_id);
        if (isNaN(serverId) || serverId < 1) {
            errors.server_id = 'Serverio ID turi būti teisingas skaičius';
        }

        // Username validation (optional but if provided must be valid)
        if (data.username !== undefined && data.username !== null) {
            if (typeof data.username !== 'string') {
                errors.username = 'Vartotojo vardas turi būti tekstas';
            } else if (data.username.trim().length === 0) {
                errors.username = 'Vartotojo vardas negali būti tuščias';
            } else if (data.username.length > 50) {
                errors.username = 'Vartotojo vardas negali viršyti 50 simbolių';
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Validate host (IP address or domain)
     */
    static isValidHost(host) {
        // IPv4 validation - properly validates 0-255 range
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        
        // Domain validation - requires at least one dot (except for localhost)
        const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
        
        // Special case for localhost
        if (host === 'localhost') {
            return true;
        }
        
        // Validate IPv4
        if (ipv4Regex.test(host)) {
            // Additional check to ensure each octet is <= 255
            const octets = host.split('.');
            return octets.every(octet => parseInt(octet, 10) <= 255);
        }
        
        // Validate domain
        return domainRegex.test(host);
    }

    /**
     * Create standard error response
     */
    static createErrorResponse(errors, message = null) {
        const errorCount = Object.keys(errors).length;
        const defaultMessage = errorCount === 1 ? 
            'Rasta validacijos klaida' : 
            `Rasta ${errorCount} validacijos klaidų`;

        return {
            success: false,
            message: message || defaultMessage,
            data: null,
            errors: errors,
            errorCode: 'VALIDATION_ERROR',
            meta: {
                timestamp: new Date().toISOString(),
                language: 'lt'
            }
        };
    }
}

module.exports = Validator;