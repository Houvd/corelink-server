'use strict'
const assert = require('assert')
const create = require('../receiver-feedback')
let time = 0
const reports = []
const receiver = {}, stranger = {}, sender = { write: data => reports.push(JSON.parse(data)) }
const tokens = { r: { conn: receiver, streams: [2] }, s: { conn: sender, streams: [1] }, x: { conn: stranger, streams: [3] } }
const source = { 1: {} }, target = { 2: {}, 3: {} }, streamRelay = { 1: { 2: [] } }
const relay = create({ tokens, apps: {}, source, target, streamRelay, now: () => time })
const message = { token: 'r', version: 1, senderID: 1, receiverID: 2, epoch: '18446744073709551615', sequence: 1, echo: 100,
  packets: 50, extraDelayMs: 10, jitterMs: 3, gapPercent: 2, latePercent: 1, bufferMs: 20 }
assert.equal(relay(message, receiver).statusCode, 0)
assert.equal(reports.length, 1)
assert.equal(reports[0].epoch, message.epoch)
assert.equal(reports[0].function, 'receiverFeedback')
assert(!('token' in reports[0]))
assert.notEqual(relay(message, stranger).statusCode, 0)
assert.notEqual(relay({ ...message, receiverID: 3 }, receiver).statusCode, 0)
assert.notEqual(relay({ ...message, token: 'x', receiverID: 3 }, stranger).statusCode, 0)
for (const invalid of [{ version: 2 }, { epoch: 42 }, { gapPercent: 101 }, { jitterMs: NaN }, { echo: Infinity }, { sequence: -1 }])
  assert.notEqual(relay({ ...message, ...invalid }, receiver).statusCode, 0)
sender.writableLength = 100000
assert.equal(relay(message, receiver).delivered, 0)
sender.writableLength = 0
for (let i = 0; i < 300; i++) relay(message, receiver)
assert.notEqual(relay(message, receiver).statusCode, 0)
time = 1001
assert.equal(relay(message, receiver).statusCode, 0)
delete streamRelay[1][2]
assert.notEqual(relay(message, receiver).statusCode, 0)
console.log('PASS real feedback relay: ownership, subscription, exact epoch, metrics, backpressure, rate limit, unsubscribe')
