'use strict'

// Ensure consistent timezone during tests
process.env.TZ = 'Europe/Vilnius'

const t = require('tap')

const StartupService = require('../src/services/StartupService')

function createLogger() {
  const logs = { info: [], warn: [], error: [] }
  return {
    logs,
    info: (...args) => logs.info.push(args),
    warn: (...args) => logs.warn.push(args),
    error: (...args) => logs.error.push(args),
  }
}

t.test('StartupService initializes: versions + scheduler + immediate ping', async t => {
  t.plan(4)

  // Stubs
  let startSchedulerCalled = 0
  let immediatePingCalled = 0
  const serverPingService = {
    startPingScheduler: async () => { startSchedulerCalled++ },
    pingAllServers: async (opts) => {
      immediatePingCalled++
      t.same(opts, { forceRefresh: true }, 'immediate ping runs with forceRefresh: true')
      return { pinged: 3, successful: 3, failed: 0, duration: 123, results: [] }
    },
    stopPingScheduler: () => {}
  }

  let versionsCalled = 0
  const minecraftVersionService = {
    fetchAndUpdateVersions: async () => { versionsCalled++ }
  }

  const logger = createLogger()

  const startup = new StartupService(serverPingService, minecraftVersionService, logger)

  await startup.initialize()

  t.equal(versionsCalled, 1, 'versions initialized once')
  t.equal(startSchedulerCalled, 1, 'scheduler started once')
  t.equal(immediatePingCalled, 1, 'immediate ping executed once')
})
