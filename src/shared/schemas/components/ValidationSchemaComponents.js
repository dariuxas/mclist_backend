'use strict';

/**
 * Enhanced validation schema components with frontend-friendly error messages
 * Error messages are handled by ValidationErrorFormatter instead of errorMessage keyword
 */

// Common field validations
const emailField = {
    type: 'string',
    format: 'email',
    maxLength: 100
};

const passwordField = {
    type: 'string',
    minLength: 8,
    maxLength: 128,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$'
};

const simplePasswordField = {
    type: 'string',
    minLength: 8,
    maxLength: 128
};

const nameField = {
    type: 'string',
    minLength: 1,
    maxLength: 50,
    pattern: '^[a-zA-ZąčęėįšųūžĄČĘĖĮŠŲŪŽ\\s\\-\']+$'
};

const usernameField = {
    type: 'string',
    minLength: 3,
    maxLength: 30,
    pattern: '^[a-zA-Z0-9_-]+$'
};

const phoneField = {
    type: 'string',
    pattern: '^\\+?[1-9]\\d{1,14}$'
};

const urlField = {
    type: 'string',
    format: 'uri',
    maxLength: 500
};

const dateField = {
    type: 'string',
    format: 'date'
};

const dateTimeField = {
    type: 'string',
    format: 'date-time'
};

const positiveIntegerField = {
    type: 'integer',
    minimum: 1
};

const nonNegativeIntegerField = {
    type: 'integer',
    minimum: 0
};

// Validation helpers for common patterns
const createStringField = (minLength = 1, maxLength = 255, pattern = null) => {
    const field = {
        type: 'string',
        minLength,
        maxLength
    };

    if (pattern) {
        field.pattern = pattern;
    }

    return field;
};

const createNumberField = (minimum = null, maximum = null, type = 'number') => {
    const field = {
        type
    };

    if (minimum !== null) {
        field.minimum = minimum;
    }

    if (maximum !== null) {
        field.maximum = maximum;
    }

    return field;
};

const createEnumField = (values) => ({
    type: 'string',
    enum: values
});

// Array validation helpers
const createArrayField = (itemSchema, minItems = 0, maxItems = null) => {
    const field = {
        type: 'array',
        items: itemSchema,
        minItems
    };

    if (maxItems !== null) {
        field.maxItems = maxItems;
    }

    return field;
};

// File upload validation
const fileUploadField = {
    type: 'object',
    properties: {
        filename: { type: 'string', minLength: 1 },
        mimetype: { type: 'string', minLength: 1 },
        size: { type: 'number', minimum: 1 }
    },
    required: ['filename', 'mimetype', 'size']
};

// Conditional validation helpers
const createConditionalSchema = (condition, thenSchema, elseSchema = {}) => ({
    if: condition,
    then: thenSchema,
    else: elseSchema
});

// Common validation patterns
const validationPatterns = {
    alphanumeric: '^[a-zA-Z0-9]+$',
    alphanumericWithSpaces: '^[a-zA-Z0-9\\s]+$',
    noSpecialChars: '^[a-zA-Z0-9\\s\\-_]+$',
    slug: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
    hexColor: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
    ipv4: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
    uuid: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
};

module.exports = {
    // Field types
    emailField,
    passwordField,
    simplePasswordField,
    nameField,
    usernameField,
    phoneField,
    urlField,
    dateField,
    dateTimeField,
    positiveIntegerField,
    nonNegativeIntegerField,
    fileUploadField,

    // Helpers
    createStringField,
    createNumberField,
    createEnumField,
    createArrayField,
    createConditionalSchema,

    // Patterns
    validationPatterns
};
