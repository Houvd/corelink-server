'use strict'

// Counts actual Corelink envelopes, not bitrate targets or estimated IP traffic.
// Separate ingress from each fan-out copy. Never log payloads or credentials.
module.exports = function trafficMetrics(emit, now = () => Number(process.hrtime.bigint()) / 1e6) {
  const rows = new Map()
  const metadata = new WeakMap()
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
    const key = JSON.stringify([direction, senderID, receiverID, epoch, routeID, channels, generation, status])
    let row = rows.get(key)
    if (!row) {
      if (rows.size >= 4096) { omitted++; return }
      row = { direction, senderID, receiverID, epoch, routeID, channels, generation, status,
        firstMs: now(), lastMs: now(), packets: 0, audioPayloadBytes: 0, jsonHeaderBytes: 0,
        corelinkEnvelopeBytes: 0, corelinkBytes: 0 }
      rows.set(key, row)
    }
    row.lastMs = now(); row.packets++
    row.audioPayloadBytes += payloadBytes; row.jsonHeaderBytes += headerBytes
    row.corelinkEnvelopeBytes += 8; row.corelinkBytes += packet.length
  }
  let previous = now()
  function flush() {
    const end = now(), intervalMs = end - previous
    for (const row of rows.values()) emit('traffic_bytes', { ...row, intervalMs,
      intervalStartMs: previous, intervalEndMs: end,
      scope: 'Corelink application bytes; excludes IP/UDP/TCP/TLS/Ethernet and control traffic' })
    if (omitted) emit('traffic_metrics_overflow', { omitted, intervalMs })
    rows.clear(); omitted = 0; previous = end
  }
  return { observe, flush }
}
