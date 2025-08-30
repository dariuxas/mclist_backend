"use strict";

const fp = require("fastify-plugin");
const path = require("path");

async function staticPlugin(fastify, options) {
  // Register static file serving
  await fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/static/', // optional: default '/'
    constraints: {} // optional: default {}
  });

  fastify.log.info('📁 Static file serving registered at /static/');
}

module.exports = fp(staticPlugin, {
  name: "static"
});