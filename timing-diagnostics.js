'use strict'
const fs = require('fs')
const path = require('path')
const os = require('os')
const { performance, PerformanceObserver } = require('perf_hooks')

// No audio/credentials; bounded asynchronous writes and one-second aggregates.
module.exports = function createTimingDiagnostics(directory = process.env.CORELINK_TIMING_DIR || path.join(os.homedir(), '.netmusic3d', 'metrics')) {
  let stream, bytes = 0, dropped = 0, last = performance.now(), lagMax = 0, activeUntil = 0
  let previousCpu = process.cpuUsage(), previousWall = performance.now()
  let previousUtilization = performance.eventLoopUtilization()
  const gcObserver = new PerformanceObserver(list => {
    for (const entry of list.getEntries()) observe('gc', entry.duration)
  })
  gcObserver.observe({ entryTypes: ['gc'] })
  let summaries = Object.create(null), events = []
  fs.mkdir(directory, { recursive: true }, (error) => {
    if (error) { dropped++; return }
    stream = fs.createWriteStream(path.join(directory, `corelink-timing-${Date.now()}-${process.pid}-v1.jsonl`), { flags: 'wx' })
    stream.on('error', () => { dropped++; stream = null })
  })
  function event(kind, data) {
    activeUntil = performance.now() + 3000
    if (events.length < 512) events.push({ schema: 1, utc: new Date().toISOString(), monotonicMs: performance.now(), event: kind, data })
    else dropped++
  }
  function observe(kind, milliseconds, identity) {
    activeUntil = performance.now() + 3000
    const s = summaries[kind] || (summaries[kind] = { count: 0, totalMs: 0, maxMs: 0 })
    s.count++; s.totalMs += milliseconds
    if (milliseconds > s.maxMs) { s.maxMs = milliseconds; s.peak = identity }
  }
  const tick = setInterval(() => {
    const now = performance.now(); lagMax = Math.max(lagMax, now - last - 100); last = now
  }, 100)
  tick.unref()
  function flush() {
    if (performance.now() > activeUntil && !events.length && !Object.keys(summaries).length) { lagMax = 0; return }
    const wall = performance.now(), cpu = process.cpuUsage()
    const utilization = performance.eventLoopUtilization()
    const intervalMs = wall - previousWall
    const processCpuMs = (cpu.user - previousCpu.user + cpu.system - previousCpu.system) / 1000
    const eventLoopUtilization = performance.eventLoopUtilization(utilization, previousUtilization).utilization
    previousCpu = cpu; previousWall = wall; previousUtilization = utilization
    // Preserve aggregate evidence even when detailed events fill the write buffer.
    events.unshift({ schema: 1, utc: new Date().toISOString(), monotonicMs: wall, event: 'server_timing', data: {
      eventLoopLagMaxMs: Math.max(0, lagMax), stages: summaries, dropped,
      intervalMs, processCpuMs, processCpuPercent: intervalMs > 0 ? 100 * processCpuMs / intervalMs : 0,
      eventLoopUtilization, rssBytes: process.memoryUsage().rss
    } })
    lagMax = 0; summaries = Object.create(null)
    const rows = events; events = []
    try {
      if (!stream) { dropped += rows.length; return }
      for (const row of rows) {
        const line = JSON.stringify(row) + '\n'
        if (bytes + Buffer.byteLength(line) > 20 * 1024 * 1024 || stream.writableLength > 65536) { dropped++; continue }
        bytes += Buffer.byteLength(line); stream.write(line)
      }
    } catch (_) { dropped += rows.length }
  }
  const writer = setInterval(flush, 1000); writer.unref()
  return { observe, event, flush, close() { clearInterval(tick); clearInterval(writer); gcObserver.disconnect(); flush(); if (stream) stream.end() } }
}
