'use strict'

// Counts actual Corelink envelopes, not bitrate targets or estimated IP traffic.
// Separate ingress from each fan-out copy. Never log payloads or credentials.
module.exports = function trafficMetrics(emit, now = () => Number(process.hrtime.bigint()) / 1e6) {
  const rows = new Map()
  const metadata = new WeakMap()
  const ingressTimes = new WeakMap(), cadence = new Map()
  const bounds = [1, 5, 10, 20, 50, 100]
  const bucket = value => { const i = bounds.findIndex(b => value <= b); return i < 0 ? bounds.length : i }
  let omitted = 0
  function observe(direction, senderID, receiverID, packet, status = 'submitted') {
    if (!Buffer.isBuffer(packet) || packet.length < 8) return
    const headerBytes = packet.readUInt16LE(0) & 32767
    const payloadBytes = packet.readUInt16LE(2)
    if (packet.length !== 8 + headerBytes + payloadBytes) return
    let h = metadata.get(packet)
    if (!h) {
      h = {}
      try { h = JSON.parse(packet.toString('utf8', 8, 8 + headerBytes)) } catch (_) {}
      if (!h || typeof h !== 'object' || Array.isArray(h)) h = {}
      metadata.set(packet, h)
    }
    const epoch = String(h.ep || 'unknown')
    const channels = Number.isInteger(h.t) && h.t >= 1 && h.t <= 64 ? h.t : null
    const routeID = Number.isSafeInteger(h.rt) ? String(h.rt) : 'source'
    const generation = Number.isSafeInteger(h.og) ? h.og : null
    const time = now()
    if (direction === 'ingress' && status === 'received') ingressTimes.set(packet, time)
    const key = JSON.stringify([direction, senderID, receiverID, epoch, routeID, channels, generation, status])
    let row = rows.get(key)
    if (!row) {
      if (rows.size >= 4096) { omitted++; return }
      row = { direction, senderID, receiverID, epoch, routeID, channels, generation, status,
        firstMs: time, lastMs: time, packets: 0, audioPayloadBytes: 0, jsonHeaderBytes: 0,
        gapBoundsMs: bounds, packetGapBuckets: Array(7).fill(0), packetGapCount: 0, packetGapMaxMs: 0,
        frameGapBuckets: Array(7).fill(0), frameGapCount: 0, frameGapMaxMs: 0,
        relayDelayCount: 0, relayDelayTotalMs: 0, relayDelayMaxMs: 0,
        corelinkEnvelopeBytes: 0, corelinkBytes: 0 }
      rows.set(key, row)
    }
    const before = cadence.get(key)
    const frame = Number.isSafeInteger(h.a) ? h.a : null
    if (before && time >= before.time && time - before.time <= 10000) {
      const gap = time - before.time
      row.packetGapBuckets[bucket(gap)]++; row.packetGapCount++
      row.packetGapMaxMs = Math.max(row.packetGapMaxMs, gap)
      if (frame !== null && before.frame !== null && frame > before.frame) {
        const frameGap = time - before.frameTime
        row.frameGapBuckets[bucket(frameGap)]++; row.frameGapCount++
        row.frameGapMaxMs = Math.max(row.frameGapMaxMs, frameGap)
      }
    }
    if (before || cadence.size < 4096) cadence.set(key, {
      time, frame,
      frameTime: before && time - before.time <= 10000 && before.frame === frame ? before.frameTime : time
    })
    const ingress = ingressTimes.get(packet)
    if (direction === 'egress' && status === 'submitted' && ingress !== undefined && time >= ingress) {
      const delay = time - ingress
      row.relayDelayCount++; row.relayDelayTotalMs += delay
      row.relayDelayMaxMs = Math.max(row.relayDelayMaxMs, delay)
    }
    row.lastMs = time; row.packets++
    row.audioPayloadBytes += payloadBytes; row.jsonHeaderBytes += headerBytes
    row.corelinkEnvelopeBytes += 8; row.corelinkBytes += packet.length
  }
  let previous = now()
  function flush() {
    const end = now(), intervalMs = end - previous
    for (const row of rows.values()) emit('traffic_bytes', { ...row, intervalMs,
      intervalStartMs: previous, intervalEndMs: end,
      scope: 'Corelink application bytes; excludes IP/UDP/TCP/TLS/Ethernet and control traffic',
      timingScope: 'Local application cadence; bounds inclusive, final bucket >100ms. Relay delay only for unmodified packets observed at ingress; completion is not receiver delivery.' })
    if (omitted) emit('traffic_metrics_overflow', { omitted, intervalMs })
    rows.clear(); omitted = 0; previous = end
    for (const [key, clock] of cadence) if (end - clock.time > 10000) cadence.delete(key)
  }
  return { observe, flush }
}
