"use strict";

const ValidationErrorFormatter = require('../shared/validation/ValidationErrorFormatter');

function errorHandler(error, request, reply) {
  request.log.info('🔍 Middleware error handler called', {
    errorCode: error.code,
    hasValidation: !!error.validation,
    validationCount: error.validation?.length || 0
  });

  request.log.error(
    {
      err: error,
      reqId: request.id,
      method: request.method,
      url: request.url,
      userAgent: request.headers["user-agent"],
      ip: request.ip,
    },
    error.message || "An error occurred",
  );

  const isDevelopment = process.env.NODE_ENV !== "production";

  // Handle Fastify validation errors (when validation fails)
  if (
    error.code === "FST_ERR_VALIDATION" ||
    error.validation ||
    error.validationError ||
    (error.statusCode === 400 &&
      error.message &&
      error.message.includes("body/"))
  ) {
    request.log.info('🔍 Middleware: Processing validation error', {
      errorCode: error.code,
      hasValidation: !!error.validation,
      hasValidationError: !!error.validationError,
      statusCode: error.statusCode,
      messageIncludesBody: error.message?.includes("body/")
    });

    // Use the validation error formatter for all validation errors
    const validationErrors = error.validation || [];
    const formattedErrors = ValidationErrorFormatter.formatErrors(validationErrors);
    
    request.log.info('🔍 Middleware: Formatted errors', {
      hasErrors: formattedErrors.hasErrors,
      errorCount: formattedErrors.summary.length,
      fieldCount: Object.keys(formattedErrors.errors).length
    });
    
    // Legacy format for backward compatibility
    const errorsMap = {};
    Object.keys(formattedErrors.errors).forEach(field => {
      const fieldErrors = formattedErrors.errors[field];
      errorsMap[field] = fieldErrors.map(e => e.message).join('; ');
    });

    const responseObject = {
      success: false,
      message: ValidationErrorFormatter.createSummary(formattedErrors),
      data: null,
      errors: errorsMap,
      errorCode: 'VALIDATION_ERROR',
      // Clean validation information for frontend
      validation: {
        hasErrors: formattedErrors.hasErrors,
        fields: formattedErrors.errors,
        summary: formattedErrors.summary,
        count: formattedErrors.summary.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        language: 'lt'
      },
      ...(isDevelopment && { 
        debug: {
          originalError: error.message,
          validation: validationErrors,
          nodeEnv: process.env.NODE_ENV
        }
      })
    };

    request.log.info('🔍 Middleware: Sending response', {
      hasValidation: !!responseObject.validation,
      hasDebug: !!responseObject.debug,
      responseKeys: Object.keys(responseObject),
      replySent: reply.sent
    });

    if (reply.sent) {
      request.log.warn('🔍 Middleware: Response already sent, cannot send validation response');
      return;
    }

    return reply.status(400).send(responseObject);
  }

  // Handle JWT errors
  if (
    error.code === "FST_JWT_BAD_REQUEST" ||
    error.code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER"
  ) {
    const response = {
      success: false,
      message: "Neteisingas arba trūkstamas autentifikacijos žetonas",
      data: null,
      errors: {},
      errorCode: "UNAUTHORIZED",
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        language: 'lt'
      },
    };
    return reply.status(401).send(response);
  }

  if (error.code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED") {
    const response = {
      success: false,
      message: "Autentifikacijos žetonas pasibaigė",
      data: null,
      errors: {},
      errorCode: "TOKEN_EXPIRED",
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        language: 'lt'
      },
    };
    return reply.status(401).send(response);
  }

  // Handle database errors
  if (error.code && error.code.startsWith("ER_")) {
    let message = "Įvyko duomenų bazės klaida";
    let statusCode = 500;
    let errorCode = "DATABASE_ERROR";

    if (error.code === "ER_DUP_ENTRY") {
      message = "Išteklius jau egzistuoja";
      statusCode = 409;
      errorCode = "CONFLICT";
    }

    const response = {
      success: false,
      message,
      data: null,
      errors: {},
      errorCode,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        language: 'lt'
      },
    };

    return reply.status(statusCode).send(response);
  }

  // Handle @fastify/sensible errors and other HTTP errors
  if (error.statusCode && error.statusCode >= 400) {
    const response = {
      success: false,
      message: error.message || "Įvyko klaida",
      data: null,
      errors: {},
      errorCode: error.errorCode || error.code || `HTTP_${error.statusCode}`,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        language: 'lt'
      },
    };

    return reply.status(error.statusCode).send(response);
  }

  // Default server error
  const message = isDevelopment
    ? error.message
    : "Įvyko netikėta klaida";
  const response = {
    success: false,
    message,
    data: null,
    errors: {},
    errorCode: "INTERNAL_SERVER_ERROR",
    meta: {
      timestamp: new Date().toISOString(),
      requestId: request.id,
      language: 'lt'
    },
  };

  // Add stack trace in development
  if (isDevelopment && error.stack) {
    response.debug = { stack: error.stack };
  }

  return reply.status(500).send(response);
}

module.exports = errorHandler;
