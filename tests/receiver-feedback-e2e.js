'use strict'
const net = require('net')
const assert = require('assert')
const port = Number(process.argv[2])
class Client {
  constructor() {
    this.socket = net.connect(port, '127.0.0.1'); this.buffer = ''; this.pending = new Map(); this.reports = []; this.id = 0
    this.socket.on('data', data => {
      this.buffer += data.toString()
      let depth = 0, quoted = false, escaped = false, start = 0
      for (let i = 0; i < this.buffer.length; i++) {
        const ch = this.buffer[i]
        if (quoted) { if (escaped) escaped = false; else if (ch === '\\') escaped = true; else if (ch === '"') quoted = false }
        else if (ch === '"') quoted = true
        else if (ch === '{') depth++
        else if (ch === '}' && --depth === 0) {
          const message = JSON.parse(this.buffer.slice(start, i + 1)); start = i + 1
          if (message.ID && this.pending.has(message.ID)) { this.pending.get(message.ID)(message); this.pending.delete(message.ID) }
          else if (message.function === 'receiverFeedback') this.reports.push(message)
        }
      }
      this.buffer = this.buffer.slice(start)
    })
  }
  request(message) {
    const ID = String(++this.id)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Control response timeout: ' + message.function)), 6000)
      this.pending.set(ID, reply => { clearTimeout(timer); resolve(reply) })
      this.socket.write(JSON.stringify({ ...message, ID, token: this.token }))
    })
  }
  async auth() { const reply = await this.request({ function: 'auth', username: 'admin', password: 'Testpassword' }); assert.equal(reply.statusCode, 0); this.token = reply.token }
}
async function main() {
  const sender = new Client(), receiver = new Client()
  try {
    await sender.auth(); await receiver.auth()
    const s = await sender.request({ function: 'sender', workspace: 'Chalktalk', proto: 'udp', type: 'audio', IP: '127.0.0.1', port: 39001, alert: false })
    assert.equal(s.statusCode, 0)
    const r = await receiver.request({ function: 'receiver', workspace: 'Chalktalk', proto: 'udp', type: ['audio'], streamIDs: [s.streamID], IP: '127.0.0.1', port: 39002, alert: false })
    assert.equal(r.statusCode, 0)
    const sub = await receiver.request({ function: 'subscribe', receiverID: r.streamID, streamIDs: [s.streamID] }); assert.equal(sub.statusCode, 0)
    const report = { function: 'receiverFeedback', version: 1, senderID: s.streamID, receiverID: r.streamID, epoch: '18446744073709551615', sequence: 1, echo: 10, packets: 50, extraDelayMs: 15, jitterMs: 3, gapPercent: 4, latePercent: 2, bufferMs: 10 }
    assert.notEqual((await sender.request(report)).statusCode, 0)
    const reply = await receiver.request(report); assert.equal(reply.statusCode, 0); assert.equal(reply.delivered, 1)
    for (let i = 0; i < 50 && !sender.reports.length; ++i) await new Promise(resolve => setTimeout(resolve, 10))
    assert.equal(sender.reports.length, 1); assert.equal(receiver.reports.length, 0)
    assert.equal(sender.reports[0].epoch, report.epoch); assert.equal(sender.reports[0].latePercent, 2)
    assert.notEqual((await receiver.request({ ...report, gapPercent: 200 })).statusCode, 0)
    const unsub = await receiver.request({ function: 'unsubscribe', receiverID: r.streamID, streamIDs: [s.streamID] }); assert.equal(unsub.statusCode, 0)
    assert.notEqual((await receiver.request({ ...report, sequence: 2 })).statusCode, 0)
    console.log('PASS Corelink TCP E2E: separate authenticated clients, subscription, feedback push to sender only, spoof rejection, validation, unsubscribe')
  } finally { sender.socket.destroy(); receiver.socket.destroy() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
