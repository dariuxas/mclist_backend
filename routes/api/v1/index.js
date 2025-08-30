"use strict";

module.exports = async function (fastify, opts) {
  // Register auth and user API routes
  await fastify.register(require("./auth"), { prefix: "/auth" });
  await fastify.register(require("./users"), { prefix: "/users" });

  // Register server API routes
  await fastify.register(require("./servers"), { prefix: "/servers" });
  await fastify.register(require("./server-types"), { prefix: "/server-types" });
  await fastify.register(require("./minecraft"), { prefix: "/minecraft" });
  await fastify.register(require("./votes"), { prefix: "/votes" });
  await fastify.register(require("./votifier"), { prefix: "/votifier" });

  // Register config API routes
  await fastify.register(require("./config"), { prefix: "/config" });

  // Register admin API routes
  await fastify.register(require("./admin"), { prefix: "/admin" });

  fastify.log.info("📡 All API routes registered successfully");
};
