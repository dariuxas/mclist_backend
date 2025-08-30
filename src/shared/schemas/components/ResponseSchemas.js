'use strict'

// JSON Schemas with $id for reuse via fastify.addSchema and $ref
// Draft-07 compatible

const SuccessResponseSchema = {
  $id: 'Response.Success',
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    message: { type: 'string' },
    data: {},
    errors: { type: 'array', items: { type: 'string' } },
    meta: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        requestId: { type: 'string' },
        language: { type: 'string' }
      },
      additionalProperties: true
    }
  },
  required: ['success', 'message', 'data']
};

const ErrorResponseSchema = {
  $id: 'Response.Error',
  type: 'object',
  properties: {
    success: { type: 'boolean', const: false },
    message: { type: 'string' },
    data: { type: 'null' },
    errors: {
      type: 'object',
      additionalProperties: { type: 'string' },
      description: 'Field-specific error messages for backward compatibility'
    },
    errorCode: { type: 'string' },
    validation: {
      type: 'object',
      properties: {
        hasErrors: { type: 'boolean' },
        fields: { 
          type: 'object',
          additionalProperties: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                constraint: { 
                  anyOf: [
                    { type: 'object' },
                    { type: 'null' }
                  ]
                },
                path: { type: 'string' },
                hint: { 
                  anyOf: [
                    { type: 'string' },
                    { type: 'null' }
                  ]
                }
              },
              required: ['code', 'message', 'path']
            }
          }
        },
        summary: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              field: { type: 'string' },
              message: { type: 'string' },
              code: { type: 'string' }
            },
            required: ['field', 'message', 'code']
          }
        },
        count: { type: 'integer', minimum: 0 }
      },
      required: ['hasErrors', 'fields', 'summary', 'count'],
      additionalProperties: false
    },
    meta: {
      type: 'object',
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        requestId: { type: 'string' },
        language: { type: 'string', enum: ['lt', 'en'] }
      },
      required: ['timestamp', 'requestId', 'language'],
      additionalProperties: false
    },
    debug: {
      type: 'object',
      properties: {
        originalError: { type: 'string' },
        validation: { 
          type: 'array',
          items: { type: 'object' }
        },
        nodeEnv: { type: 'string' }
      },
      additionalProperties: true,
      description: 'Debug information (only in development)'
    }
  },
  required: ['success', 'message', 'data', 'errors', 'errorCode', 'meta'],
  additionalProperties: false
};

const PaginatedEnvelopeSchema = {
  $id: 'Response.PaginatedEnvelope',
  type: 'object',
  properties: {
    pagination: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1 },
        limit: { type: 'integer', minimum: 1 },
        total: { type: 'integer', minimum: 0 },
        totalPages: { type: 'integer', minimum: 0 },
        hasNext: { type: 'boolean' },
        hasPrev: { type: 'boolean' }
      },
      required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev']
    }
  }
};

module.exports = {
  SuccessResponseSchema,
  ErrorResponseSchema,
  PaginatedEnvelopeSchema
};
