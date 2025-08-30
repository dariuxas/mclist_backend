"use strict";

const fp = require("fastify-plugin");
const Container = require("../src/container/Container");

// Import repositories
const UserRepository = require("../src/domains/user/repositories/UserRepository");
const ServerRepository = require("../src/domains/server/repositories/ServerRepository");
const ServerTypeRepository = require("../src/domains/server/repositories/ServerTypeRepository");
const ServerDataRepository = require("../src/domains/server/repositories/ServerDataRepository");
const VotifierRepository = require("../src/domains/votifier/repositories/VotifierRepository");

// Import domain services
const UserProfileService = require("../src/domains/user/services/UserProfileService");
const UserProfileAggregator = require("../src/domains/user/aggregators/UserProfileAggregator");
const DomainAuthService = require("../src/domains/auth/services/AuthService");
const LoginLogRepository = require("../src/domains/auth/repositories/LoginLogRepository");
const ServerService = require("../src/domains/server/services/ServerService");
const ServerTypeService = require("../src/domains/server/services/ServerTypeService");
const ServerPingService = require("../src/domains/server/services/ServerPingService");
const ServerAggregator = require("../src/domains/server/aggregators/ServerAggregator");
const VotifierService = require("../src/domains/votifier/services/VotifierService");
const VoteService = require("../src/domains/vote/services/VoteService");
const SecurityService = require("../src/services/SecurityService");
const StartupService = require("../src/services/StartupService");
const MinecraftVersionRepository = require("../src/domains/server/repositories/MinecraftVersionRepository");
const MinecraftVersionService = require("../src/domains/server/services/MinecraftVersionService");

// Import vote repositories
const VoteRepository = require("../src/domains/vote/repositories/VoteRepository");

// Import SEO services
const SeoService = require("../src/services/SeoService");
const SeoRepository = require("../src/repositories/SeoRepository");
const VoteStatsRepository = require("../src/domains/vote/repositories/VoteStatsRepository");

// Import vote controllers
const VoteController = require("../src/domains/vote/controllers/VoteController");

// Import config domain
const ConfigRepository = require("../src/domains/config/repositories/ConfigRepository");
const ConfigService = require("../src/domains/config/services/ConfigService");
const ConfigController = require("../src/domains/config/controllers/ConfigController");
const MinecraftVersionController = require("../src/domains/server/controllers/MinecraftVersionController");

// Import domain controllers
const UserProfileController = require("../src/domains/user/controllers/UserProfileController");
const DomainAuthController = require("../src/domains/auth/controllers/AuthController");
const ServerController = require("../src/domains/server/controllers/ServerController");
const ServerTypeController = require("../src/domains/server/controllers/ServerTypeController");
const VotifierController = require("../src/domains/votifier/controllers/VotifierController");

async function containerPlugin(fastify, options) {
  const container = new Container();

  // Register repositories
  container.register("userRepository", () => {
    return new UserRepository(fastify.db);
  });

  container.register("serverRepository", () => {
    return new ServerRepository(fastify.db);
  });

  container.register("serverTypeRepository", () => {
    return new ServerTypeRepository(fastify.db);
  });

  container.register("serverDataRepository", () => {
    return new ServerDataRepository(fastify.db);
  });


  container.register("votifierRepository", () => {
    return new VotifierRepository(fastify.db);
  });

  container.register("voteRepository", () => {
    return new VoteRepository(fastify.db);
  });

  container.register("seoRepository", () => {
    return new SeoRepository(fastify.db);
  });

  container.register("voteStatsRepository", () => {
    return new VoteStatsRepository(fastify.db);
  });

  container.register("configRepository", () => {
    return new ConfigRepository(fastify.db);
  });

  container.register("minecraftVersionRepository", () => {
    return new MinecraftVersionRepository(fastify.db);
  });

  // Register aggregators
  container.register("userProfileAggregator", (container) => {
    const userRepository = container.get("userRepository");
    return new UserProfileAggregator(userRepository, fastify.log);
  });

  container.register("serverAggregator", (container) => {
    const serverRepository = container.get("serverRepository");
    const serverTypeRepository = container.get("serverTypeRepository");
    const serverDataRepository = container.get("serverDataRepository");
    return new ServerAggregator(serverRepository, serverTypeRepository, serverDataRepository, fastify.log);
  });

  // Register domain services
  container.register("loginLogRepository", () => {
    return new LoginLogRepository(fastify.db);
  });

  container.register("authService", (container) => {
    const userRepository = container.get("userRepository");
    const userProfileAggregator = container.get("userProfileAggregator");
    const securityService = container.get("securityService");
    const configService = container.get("configService");
    const loginLogRepository = container.get("loginLogRepository");
    return new DomainAuthService(
      userRepository,
      userProfileAggregator,
      fastify.jwtUtils,
      securityService,
      configService,
      loginLogRepository,
      fastify.log,
    );
  });

  container.register("userProfileService", (container) => {
    const userRepository = container.get("userRepository");
    const userProfileAggregator = container.get("userProfileAggregator");
    return new UserProfileService(
      userRepository,
      userProfileAggregator,
      fastify.log,
    );
  });

  container.register("serverPingService", (container) => {
    const serverRepository = container.get("serverRepository");
    const serverDataRepository = container.get("serverDataRepository");
    const configService = container.get("configService");
    return new ServerPingService(serverRepository, serverDataRepository, configService, fastify.log);
  });

  container.register("serverTypeService", (container) => {
    const serverTypeRepository = container.get("serverTypeRepository");
    return new ServerTypeService(serverTypeRepository, fastify.log);
  });

  container.register("votifierService", (container) => {
    const votifierRepository = container.get("votifierRepository");
    return new VotifierService(votifierRepository, fastify.log);
  });

  container.register("securityService", (container) => {
    const configService = container.get("configService");
    return new SecurityService(fastify.log, fastify.db, configService);
  });

  container.register("voteService", (container) => {
    const voteRepository = container.get("voteRepository");
    const voteStatsRepository = container.get("voteStatsRepository");
    const votifierService = container.get("votifierService");
    const securityService = container.get("securityService");
    const configService = container.get("configService");
    const seoService = container.get("seoService");
    const serverService = container.get("serverService");
    return new VoteService(voteRepository, voteStatsRepository, votifierService, securityService, configService, seoService, serverService, fastify.log);
  });

  container.register("seoService", (container) => {
    const seoRepository = container.get("seoRepository");
    return new SeoService(seoRepository, fastify.log);
  });

  container.register("serverService", (container) => {
    const serverRepository = container.get("serverRepository");
    const serverTypeRepository = container.get("serverTypeRepository");
    const serverDataRepository = container.get("serverDataRepository");
    const serverPingService = container.get("serverPingService");
    const configService = container.get("configService");
    const seoService = container.get("seoService");
    return new ServerService(
      serverRepository,
      serverTypeRepository,
      serverDataRepository,
      serverPingService,
      configService,
      seoService,
      fastify.log
    );
  });

  container.register("configService", (container) => {
    const configRepository = container.get("configRepository");
    return new ConfigService(configRepository, fastify.log);
  });

  container.register("minecraftVersionService", (container) => {
    return new MinecraftVersionService(fastify.db);
  });

  container.register("startupService", (container) => {
    const serverPingService = container.get("serverPingService");
    const minecraftVersionService = container.get("minecraftVersionService");
    return new StartupService(serverPingService, minecraftVersionService, fastify.log);
  });

  // Register domain controllers
  container.register("authController", (container) => {
    const authService = container.get("authService");
    return new DomainAuthController(authService, fastify.log);
  });

  container.register("userProfileController", (container) => {
    const userProfileService = container.get("userProfileService");
    return new UserProfileController(userProfileService, fastify.log);
  });

  container.register("serverController", (container) => {
    const serverService = container.get("serverService");
    return new ServerController(serverService, fastify.log);
  });

  container.register("serverTypeController", (container) => {
    const serverTypeService = container.get("serverTypeService");
    return new ServerTypeController(serverTypeService, fastify.log);
  });

  container.register("votifierController", (container) => {
    const votifierService = container.get("votifierService");
    return new VotifierController(votifierService, fastify.log);
  });

  container.register("voteController", (container) => {
    const voteService = container.get("voteService");
    return new VoteController(voteService, fastify.log);
  });

  container.register("configController", (container) => {
    const configService = container.get("configService");
    return new ConfigController(configService, fastify.log);
  });

  container.register("minecraftVersionController", (container) => {
    const minecraftVersionService = container.get("minecraftVersionService");
    return new MinecraftVersionController(minecraftVersionService, fastify.log);
  });

  // Decorate fastify with container
  fastify.decorate("container", container);

  // Add helper method to get services
  fastify.decorate("getService", (name) => {
    return container.get(name);
  });

  fastify.log.info(
    {
      services: container.getServiceNames(),
    },
    "📦 Dependency injection container registered successfully",
  );
}

module.exports = fp(containerPlugin, {
  name: "container",
  dependencies: ["database", "jwt"],
});
