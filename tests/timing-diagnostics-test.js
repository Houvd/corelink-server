'use strict'
const fs = require('fs')
const os = require('os')
const path = require('path')
const assert = require('assert')
const create = require('../timing-diagnostics')
async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'corelink-timing-test-'))
  const timing = create(directory)
  await new Promise(resolve => setTimeout(resolve, 50))
  timing.observe('audioRelay', 3, { sourceID: 1, packetID: 2 })
  for (let i = 0; i < 600; i++) timing.event('feedback_timing', { sequence: i })
  const until = Date.now() + 180
  while (Date.now() < until) {} // Deliberate event-loop stall, isolated test only.
  await new Promise(resolve => setTimeout(resolve, 200))
  timing.close()
  await new Promise(resolve => setTimeout(resolve, 100))
  const files = fs.readdirSync(directory)
  assert.strictEqual(files.length, 1)
  const rows = fs.readFileSync(path.join(directory, files[0]), 'utf8').trim().split('\n').map(JSON.parse)
  const summary = rows.find(r => r.event === 'server_timing').data
  assert(summary.eventLoopLagMaxMs > 50)
  assert.strictEqual(summary.stages.audioRelay.count, 1)
  assert.strictEqual(summary.stages.audioRelay.maxMs, 3)
  assert(summary.dropped >= 88)
  assert(summary.intervalMs > 0)
  assert(summary.processCpuMs >= 0)
  assert(summary.processCpuPercent >= 0)
  assert(summary.eventLoopUtilization >= 0 && summary.eventLoopUtilization <= 1)
  assert(summary.rssBytes > 0)
  fs.rmSync(directory, { recursive: true })
  console.log('PASS timing aggregates, event-loop stall and bounded logging')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
