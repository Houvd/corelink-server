'use strict'

// Deliberately independent of the database/server bootstrap for protocol tests.
module.exports = function createReceiverFeedback({ tokens, apps, source, target, streamRelay, now = Date.now }) {
  const limits = new WeakMap()
  return function feedback(message, connection) {
    const reject = (text) => ({ statusCode: 1, message: text })
    const owner = tokens[message.token] || apps[message.token]
    if (!owner || owner.conn !== connection) return reject('Feedback requires the owning control connection')
    const { senderID, receiverID } = message
    if (!Number.isInteger(senderID) || !Number.isInteger(receiverID) || !source[senderID] || !target[receiverID]
        || !owner.streams.includes(receiverID) || !streamRelay[senderID] || !streamRelay[senderID][receiverID]) return reject('Receiver is not subscribed to this sender')
    if (message.version !== 1 || typeof message.epoch !== 'string' || !/^[1-9][0-9]{0,19}$/.test(message.epoch || '')
        || !Number.isSafeInteger(message.sequence) || message.sequence < 1
        || !Number.isFinite(message.echo) || message.echo <= 0) return reject('Invalid feedback identity')
    const ranges = { packets: 1000000, extraDelayMs: 60000, jitterMs: 60000, gapPercent: 100, latePercent: 100, bufferMs: 60000 }
    for (const [key, maximum] of Object.entries(ranges)) {
      if (!Number.isFinite(message[key]) || message[key] < 0 || message[key] > maximum) return reject('Invalid feedback metric')
    }
    // Bound report rate per authenticated connection without an unbounded peer map.
    let rate = limits.get(connection)
    if (!rate || now() - rate.start >= 1000) { rate = { start: now(), count: 0 }; limits.set(connection, rate) }
    if (++rate.count > 256) return reject('Feedback rate exceeded')
    const report = { function: 'receiverFeedback', version: 1, senderID, receiverID,
      epoch: message.epoch, sequence: message.sequence, echo: message.echo }
    for (const key of Object.keys(ranges)) report[key] = message[key]
    const encoded = JSON.stringify(report)
    const destinations = new Set()
    for (const registry of [tokens, apps]) for (const session of Object.values(registry)) {
      if (session.streams && session.streams.includes(senderID) && session.conn) destinations.add(session.conn)
    }
    let delivered = 0
    for (const conn of destinations) {
      if (conn.destroyed || conn.writableLength > 65536 || conn.bufferedAmount > 65536) continue
      if (typeof conn.write === 'function') { conn.write(encoded); ++delivered }
      else if (typeof conn.send === 'function' && conn.readyState === 1) { conn.send(encoded); ++delivered }
    }
    return { statusCode: 0, version: 1, delivered }
  }
}
