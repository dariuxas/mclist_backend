'use strict';

const serverTypes = require("../../../routes/api/v1/admin/server-types");

/**
 * Enhanced validation error formatter for better frontend integration
 */
class ValidationErrorFormatter {
    /**
     * Format validation errors into a frontend-friendly structure
     * @param {Array} validationErrors - Array of validation errors
     * @returns {Object} Formatted error object
     */
    static formatErrors(validationErrors) {
        const result = {
            errors: {},
            summary: [],
            hasErrors: false
        };

        if (!Array.isArray(validationErrors) || validationErrors.length === 0) {
            return result;
        }

        result.hasErrors = true;

        for (const error of validationErrors) {
            try {
                const fieldInfo = this.extractFieldInfo(error);
                const message = this.formatErrorMessage(error, fieldInfo);

                // Add to field-specific errors
                if (fieldInfo.field) {
                    if (!result.errors[fieldInfo.field]) {
                        result.errors[fieldInfo.field] = [];
                    }
                    result.errors[fieldInfo.field].push({
                        code: error.keyword || 'validation_error',
                        message: message,
                        constraint: this.extractConstraint(error),
                        path: fieldInfo.path || fieldInfo.field,
                        hint: this.getFieldHint(fieldInfo.field, error.keyword)
                    });
                }

                // Add to summary for general display
                result.summary.push({
                    field: fieldInfo.field || 'general',
                    message: message,
                    code: error.keyword || 'validation_error'
                });
            } catch (err) {
                // Fallback for any errors in processing individual validation errors
                console.warn('Error processing validation error:', err);
                result.summary.push({
                    field: 'general',
                    message: error.message || 'Validacijos klaida',
                    code: 'validation_error'
                });
            }
        }

        return result;
    }

    /**
     * Extract field information from error
     */
    static extractFieldInfo(error) {
        let field = 'unknown';
        let path = '';

        // Handle different error types and field extraction methods
        if (error.keyword === 'required' && error.params?.missingProperty) {
            // Required field errors
            field = error.params.missingProperty;
        } else if (error.keyword === 'additionalProperties' && error.params?.additionalProperty) {
            // Additional property errors
            field = error.params.additionalProperty;
        } else if (error.instancePath) {
            // Remove leading slash and convert to dot notation
            path = error.instancePath.replace(/^\//, '').replace(/\//g, '.');
            field = path || 'root';
        } else if (error.dataPath) {
            // Legacy AJV format
            field = error.dataPath.replace(/^\./, '') || 'root';
        } else if (error.schemaPath) {
            // Extract from schema path like #/properties/fieldName
            const pathParts = error.schemaPath.split('/');
            const propIndex = pathParts.indexOf('properties');
            if (propIndex >= 0 && pathParts.length > propIndex + 1) {
                field = pathParts[propIndex + 1];
            }
        } else if (error.field) {
            // Already formatted
            field = error.field;
        }

        // Fallback: try to extract from error message
        if (field === 'unknown' && error.message) {
            const fieldMatch = error.message.match(/property['"]\s*([^'"]+)['"]/);
            if (fieldMatch) {
                field = fieldMatch[1];
            }
        }

        return { field, path };
    }

    /**
     * Format error message with context in Lithuanian
     */
    static formatErrorMessage(error, fieldInfo) {
        const field = fieldInfo.field;
        const keyword = error.keyword;

        // Get the actual constraint value from params or schema
        const getConstraintValue = (error) => {
            if (error.params?.limit !== undefined) return error.params.limit;
            if (error.schema !== undefined) return error.schema;
            return null;
        };

        // Custom error messages in Lithuanian based on validation type
        const messageMap = {
            required: `${this.humanizeField(field)} yra privalomas`,
            format: this.getFormatMessage(error, field),
            minLength: `${this.humanizeField(field)} turi būti bent ${getConstraintValue(error) || 'N/A'} simbolių`,
            maxLength: `${this.humanizeField(field)} negali viršyti ${getConstraintValue(error) || 'N/A'} simbolių`,
            minimum: `${this.humanizeField(field)} turi būti bent ${getConstraintValue(error) || 'N/A'}`,
            maximum: `${this.humanizeField(field)} negali viršyti ${getConstraintValue(error) || 'N/A'}`,
            minItems: `${this.humanizeField(field)} turi turėti bent ${getConstraintValue(error) || 'N/A'} elementų`,
            maxItems: `${this.humanizeField(field)} negali turėti daugiau nei ${getConstraintValue(error) || 'N/A'} elementų`,
            pattern: `${this.humanizeField(field)} formatas neteisingas`,
            enum: this.getEnumMessage(error, field),
            type: `${this.humanizeField(field)} turi būti ${this.getTypeInLithuanian(error.schema, field)}`,
            additionalProperties: `${this.humanizeField(error.params?.additionalProperty || field)} neleidžiamas`
        };

        return messageMap[keyword] || error.message || `${this.humanizeField(field)} neteisingas`;
    }

    /**
     * Get enum-specific error message in Lithuanian
     */
    static getEnumMessage(error, field) {
        // Special handling for specific fields
        if (field === 'include_offline') {
            return `${this.humanizeField(field)} turi būti 'true' arba 'false'`;
        }
        if (field === 'is_premium') {
            return `${this.humanizeField(field)} turi būti 'true' arba 'false'`;
        }
        if (field === 'sort_order') {
            return `${this.humanizeField(field)} turi būti 'asc' arba 'desc'`;
        }
        if (field === 'sort_by') {
            return `${this.humanizeField(field)} turi būti vienas iš: votes, created_at, updated_at, name, players, version`;
        }

        // Default enum message
        if (Array.isArray(error.schema)) {
            return `${this.humanizeField(field)} turi būti vienas iš: ${error.schema.join(', ')}`;
        }
        
        return `${this.humanizeField(field)} turi būti teisingas pasirinkimas`;
    }

    /**
     * Get format-specific error message in Lithuanian
     */
    static getFormatMessage(error, field) {
        const formatMessages = {
            email: `${this.humanizeField(field)} turi būti teisingas el. pašto adresas`,
            date: `${this.humanizeField(field)} turi būti teisinga data (YYYY-MM-DD)`,
            'date-time': `${this.humanizeField(field)} turi būti teisinga data ir laikas`,
            uri: `${this.humanizeField(field)} turi būti teisingas URL`,
            uuid: `${this.humanizeField(field)} turi būti teisingas UUID`
        };

        return formatMessages[error.schema] || `${this.humanizeField(field)} formatas neteisingas`;
    }

    /**
     * Get type name in Lithuanian
     */
    static getTypeInLithuanian(type, field = null) {
        const typeMap = {
            string: 'tekstas',
            number: 'skaičius',
            integer: 'skaičius',
            boolean: 'loginis',
            array: 'sąrašas',
            object: 'objektas'
        };

        if (!type) {
            // If no type is provided, try to infer from field name
            if (field === 'page' || field === 'limit' || field === 'offset') {
                return 'skaičius';
            }
            if (field === 'email') {
                return 'el. pašto adresas';
            }
            if (field === 'password' || field === 'name' || field === 'title') {
                return 'tekstas';
            }
            // Default fallback
            return 'teisingas formatas';
        }

        return typeMap[type] || type;
    }

    /**
     * Extract constraint information for frontend validation
     */
    static extractConstraint(error) {
        const constraints = {};

        switch (error.keyword) {
            case 'minLength':
                constraints.minLength = error.schema;
                break;
            case 'maxLength':
                constraints.maxLength = error.schema;
                break;
            case 'minimum':
                constraints.min = error.schema;
                break;
            case 'maximum':
                constraints.max = error.schema;
                break;
            case 'minItems':
                constraints.minItems = error.schema;
                break;
            case 'maxItems':
                constraints.maxItems = error.schema;
                break;
            case 'pattern':
                constraints.pattern = error.schema;
                break;
            case 'format':
                constraints.format = error.schema;
                break;
            case 'enum':
                constraints.enum = error.schema;
                break;
        }

        return Object.keys(constraints).length > 0 ? constraints : null;
    }

    /**
     * Convert field names to human-readable format in Lithuanian
     */
    static humanizeField(field) {
        if (!field || field === 'root' || field === 'unknown') {
            return 'Laukas';
        }

        // Common field translations
        const fieldTranslations = {
            email: 'El. paštas',
            password: 'Slaptažodis',
            confirmPassword: 'Slaptažodžio patvirtinimas',
            name: 'Vardas',
            surname: 'Pavardė',
            username: 'Vartotojo vardas',
            phone: 'Telefono numeris',
            address: 'Adresas',
            city: 'Miestas',
            country: 'Šalis',
            age: 'Amžius',
            date: 'Data',
            time: 'Laikas',
            description: 'Aprašymas',
            title: 'Pavadinimas',
            content: 'Turinys',
            message: 'Žinutė',
            comment: 'Komentaras',
            url: 'Nuoroda',
            website: 'Svetainės',
            company: 'Įmonė',
            position: 'Pareigos',
            recaptcha_token: 'reCAPTCHA žetonas',
            refreshToken: 'Atnaujinimo žetonas',
            accessToken: 'Prieigos žetonas',
            firstName: 'Vardas',
            lastName: 'Pavardė',
            phoneNumber: 'Telefono numeris',
            discord_invite: 'Discord pakvietimo',
            page: 'Puslapis',
            limit: 'Limitas',
            server_type_ids: 'Serverio tipo ID',
            is_premium: 'Premium statusą',
            search: 'Paiešką',
            include_offline: '',
            sort_by: 'Rūšiavimo kriterijų',
            sort_order: 'Rūšiavimo tvarką',
            version: 'Versija',
            min_players: 'Minimalų žaidėjų skaičių',
            max_players: 'Maksimalų žaidėjų skaičių',
            host: 'Host',
            port: 'Portą',
            name: 'Pavadinimą',
            version_id: 'Versijos ID',
        };

        // Check if we have a direct translation
        if (fieldTranslations[field]) {
            return fieldTranslations[field];
        }

        // Convert snake_case and camelCase to readable format
        return field
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Create a validation summary for display in Lithuanian
     */
    static createSummary(formattedErrors) {
        if (!formattedErrors.hasErrors) {
            return 'Validacijos klaidų nėra';
        }

        const errorCount = formattedErrors.summary.length;
        const fieldCount = Object.keys(formattedErrors.errors).length;

        if (errorCount === 1) {
            return formattedErrors.summary[0].message;
        }

        const fieldText = fieldCount === 1 ? 'lauke' : 'laukuose';
        return `Rasta ${errorCount} validacijos ${errorCount === 1 ? 'klaida' : 'klaidų'} ${fieldCount} ${fieldText}`;
    }

    /**
     * Get helpful hints for frontend implementation
     */
    static getFieldHint(field, keyword) {
        const hints = {
            email: {
                required: 'Įveskite savo el. pašto adresą',
                format: 'Pavyzdys: vardas@example.com'
            },
            password: {
                required: 'Įveskite savo slaptažodį',
                minLength: 'Slaptažodis turi būti saugus',
                pattern: 'Naudokite raides, skaičius ir specialius simbolius'
            },
            confirmPassword: {
                required: 'Pakartokite slaptažodį',
                const: 'Slaptažodžiai turi sutapti'
            },
            additionalProperties: field ? `Laukas "${field}" nėra leidžiamas šiame kontekste` : 'Papildomi laukai neleidžiami'
        };

        if (keyword === 'additionalProperties') {
            return hints.additionalProperties;
        }

        return hints[field]?.[keyword] || null;
    }
}

module.exports = ValidationErrorFormatter;
