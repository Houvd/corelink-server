/* eslint-disable no-console */

const assert = require('assert')
const dgram = require('dgram')
const net = require('net')
const path = require('path')
const { spawn } = require('child_process')
const WebSocket = require('ws')

const HOST = '127.0.0.1'
const CONTROL_TCP_PORT = 20010
const CONTROL_WS_PORT = 20012
const DATA_UDP_PORT = 20011
const WORKSPACE = 'Chalktalk'
const USERNAME = 'admin'
const PASSWORD = 'Testpassword'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fail(message) {
  throw new Error(message)
}

function extractJsonMessagesFromBuffer(buffer) {
  const messages = []
  let index = 0

  while (index < buffer.length) {
    while ((index < buffer.length) && /\s/.test(buffer[index])) index += 1
    if (index >= buffer.length) break

    const first = buffer[index]
    if ((first !== '{') && (first !== '[')) {
      const nextObject = buffer.indexOf('{', index + 1)
      const nextArray = buffer.indexOf('[', index + 1)
      let nextStart = -1
      if (nextObject === -1) nextStart = nextArray
      else if (nextArray === -1) nextStart = nextObject
      else nextStart = Math.min(nextObject, nextArray)

      if (nextStart === -1) return { messages, rest: '' }
      index = nextStart
      continue
    }

    let depth = 0
    let inString = false
    let escaped = false
    let end = -1
    for (let i = index; i < buffer.length; i += 1) {
      const ch = buffer[i]
      if (inString) {
        if (escaped) escaped = false
        else if (ch === '\\') escaped = true
        else if (ch === '"') inString = false
        continue
      }

      if (ch === '"') {
        inString = true
        continue
      }
      if ((ch === '{') || (ch === '[')) depth += 1
      else if ((ch === '}') || (ch === ']')) {
        depth -= 1
        if (depth === 0) {
          end = i + 1
          break
        }
      }
    }

    if (end === -1) {
      return { messages, rest: buffer.slice(index) }
    }

    const raw = buffer.slice(index, end)
    try {
      messages.push(JSON.parse(raw))
    } catch (_) {
      // Skip malformed candidate and continue scanning.
    }
    index = end
  }

  return { messages, rest: '' }
}

async function isTcpPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })
    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => resolve(false))
  })
}

async function waitForTcpPort(host, port, timeoutMs) {
  const start = Date.now()
  while ((Date.now() - start) < timeoutMs) {
    if (await isTcpPortOpen(host, port)) return true
    await sleep(100)
  }
  return false
}

async function ensureServerRunning() {
  if (await isTcpPortOpen(HOST, CONTROL_TCP_PORT)) {
    return { owned: false, proc: null }
  }

  const cwd = path.resolve(__dirname, '..')
  const proc = spawn('node', ['corelink.js'], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let bootLog = ''
  const appendLog = (chunk) => {
    bootLog += chunk.toString('utf8')
    if (bootLog.length > 8000) bootLog = bootLog.slice(-8000)
  }
  proc.stdout.on('data', appendLog)
  proc.stderr.on('data', appendLog)

  const opened = await waitForTcpPort(HOST, CONTROL_TCP_PORT, 10000)
  if (!opened) {
    proc.kill('SIGTERM')
    fail(`Corelink server did not start in time. Partial log:\n${bootLog}`)
  }

  return { owned: true, proc }
}

async function stopOwnedServer(serverState) {
  if (!serverState.owned || !serverState.proc) return
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      serverState.proc.kill('SIGKILL')
      resolve()
    }, 3000)
    serverState.proc.once('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
    serverState.proc.kill('SIGTERM')
  })
}

async function sendTcpChunks(chunks, expectedResponses, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: HOST, port: CONTROL_TCP_PORT })
    socket.setEncoding('utf8')

    let buffer = ''
    const responses = []
    let settled = false

    const done = (err, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      if (err) reject(err)
      else resolve(value)
    }

    const timer = setTimeout(() => {
      done(new Error(`Timed out waiting for ${expectedResponses} response(s). Got ${responses.length}.`))
    }, timeoutMs)

    socket.on('connect', async () => {
      try {
        for (const chunk of chunks) {
          socket.write(chunk)
          await sleep(25)
        }
      } catch (err) {
        done(err)
      }
    })

    socket.on('data', (data) => {
      buffer += data
      const parsed = extractJsonMessagesFromBuffer(buffer)
      buffer = parsed.rest
      parsed.messages.forEach((msg) => responses.push(msg))
      if (responses.length >= expectedResponses) done(null, responses)
    })

    socket.on('error', (err) => done(err))
  })
}

let requestSocket
let requestBuffer = ''
const requestWaiters = new Map()
async function sendTcpRequest(request, timeoutMs = 5000) {
  // Auth and owned streams belong to a live control connection. Keep that
  // connection across E2E requests and correlate replies by ID, ignoring pushes.
  if (!requestSocket || requestSocket.destroyed) {
    requestBuffer = ''
    requestSocket = net.createConnection({ host: HOST, port: CONTROL_TCP_PORT })
    requestSocket.setEncoding('utf8')
    requestSocket.on('data', data => {
      requestBuffer += data
      const parsed = extractJsonMessagesFromBuffer(requestBuffer); requestBuffer = parsed.rest
      for (const reply of parsed.messages) {
        const waiter = requestWaiters.get(reply.ID)
        if (waiter) { requestWaiters.delete(reply.ID); waiter(null, reply) }
      }
    })
    requestSocket.on('error', error => {
      for (const waiter of requestWaiters.values()) waiter(error)
      requestWaiters.clear()
    })
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { requestWaiters.delete(request.ID); reject(new Error('Control request timed out: ' + request.function)) }, timeoutMs)
    requestWaiters.set(request.ID, (error, reply) => { clearTimeout(timer); if (error) reject(error); else resolve(reply) })
    requestSocket.write(JSON.stringify(request))
  })
}

function createUdpPacket(sourceID, payload) {
  const body = Buffer.from(payload)
  const packet = Buffer.alloc(8 + body.length)
  packet.writeUInt16LE(0, 0)
  packet.writeUInt16LE(body.length, 2)
  packet.writeUInt32LE(sourceID, 4)
  body.copy(packet, 8)
  return packet
}

async function bindUdpSocket() {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4')
    socket.once('error', reject)
    socket.bind(0, HOST, () => {
      socket.removeListener('error', reject)
      resolve(socket)
    })
  })
}

async function receiveUdpMessage(socket, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.removeListener('message', onMessage)
      reject(new Error('Timed out waiting for UDP payload'))
    }, timeoutMs)

    const onMessage = (msg) => {
      clearTimeout(timer)
      resolve(msg)
    }

    socket.once('message', onMessage)
  })
}

async function expectNoUdpMessage(socket, timeoutMs = 700) {
  return new Promise((resolve) => {
    let gotMessage = false
    const onMessage = () => {
      gotMessage = true
    }
    socket.on('message', onMessage)
    setTimeout(() => {
      socket.removeListener('message', onMessage)
      resolve(gotMessage)
    }, timeoutMs)
  })
}

async function sendWssRequest(request, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://${HOST}:${CONTROL_WS_PORT}`, {
      rejectUnauthorized: false,
    })

    let settled = false
    const done = (err, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        ws.close()
      } catch (_) {
        // ignore
      }
      if (err) reject(err)
      else resolve(value)
    }

    const timer = setTimeout(() => done(new Error('Timed out waiting for WS response')), timeoutMs)

    ws.on('open', () => {
      ws.send(JSON.stringify(request))
    })

    ws.on('message', (payload) => {
      try {
        done(null, JSON.parse(payload.toString('utf8')))
      } catch (err) {
        done(err)
      }
    })

    ws.on('error', (err) => done(err))
  })
}

function markResult(results, name, ok, detail) {
  results.push({ name, ok, detail })
  const status = ok ? 'PASS' : 'FAIL'
  console.log(`[${status}] ${name}${detail ? ` - ${detail}` : ''}`)
}

async function runHardeningSuite() {
  const results = []
  const cleanup = []

  const serverState = await ensureServerRunning()

  try {
    const senderSocketA = await bindUdpSocket()
    const senderSocketB = await bindUdpSocket()
    const receiverSocket = await bindUdpSocket()
    cleanup.push(() => senderSocketA.close())
    cleanup.push(() => senderSocketB.close())
    cleanup.push(() => receiverSocket.close())

    const auth = await sendTcpRequest({
      function: 'auth',
      username: USERNAME,
      password: PASSWORD,
      ID: 'auth-main',
    })
    assert.strictEqual(auth.statusCode, 0, 'Auth failed')
    assert.ok(auth.token, 'Auth did not return token')
    const token = auth.token
    markResult(results, 'E2E auth', true, 'token ottenuto')

    const senderA = await sendTcpRequest({
      function: 'sender',
      workspace: WORKSPACE,
      proto: 'udp',
      type: 'audio',
      IP: HOST,
      port: senderSocketA.address().port,
      token,
      alert: true,
      meta: 'sender-a',
      ID: 'sender-a',
    })
    assert.strictEqual(senderA.statusCode, 0, `Sender A failed: ${JSON.stringify(senderA)}`)
    markResult(results, 'E2E sender register', true, `streamID=${senderA.streamID}`)

    const receiver = await sendTcpRequest({
      function: 'receiver',
      workspace: WORKSPACE,
      proto: 'udp',
      type: ['audio'],
      streamIDs: [senderA.streamID],
      IP: HOST,
      port: receiverSocket.address().port,
      token,
      alert: true,
      meta: 'recv',
      ID: 'receiver-main',
    })
    assert.strictEqual(receiver.statusCode, 0, `Receiver failed: ${JSON.stringify(receiver)}`)
    markResult(results, 'E2E receiver register', true, `streamID=${receiver.streamID}`)

    const subscribe = await sendTcpRequest({
      function: 'subscribe',
      receiverID: receiver.streamID,
      streamIDs: [senderA.streamID],
      token,
      ID: 'subscribe-main',
    })
    assert.strictEqual(subscribe.statusCode, 0, `Subscribe failed: ${JSON.stringify(subscribe)}`)
    markResult(results, 'E2E subscribe sender->receiver', true)

    const payload1 = 'relay-check-1'
    senderSocketA.send(createUdpPacket(senderA.streamID, payload1), DATA_UDP_PORT, HOST)
    const msg1 = await receiveUdpMessage(receiverSocket)
    assert.strictEqual(msg1.readUInt32LE(4), senderA.streamID, 'Unexpected sourceID in relayed packet')
    assert.strictEqual(msg1.slice(8).toString('utf8'), payload1, 'Unexpected relayed payload')
    markResult(results, 'E2E UDP relay', true, 'payload inoltrato al receiver')

    const reconnectSender = await sendTcpRequest({
      function: 'sender',
      workspace: WORKSPACE,
      proto: 'udp',
      type: 'audio',
      senderID: senderA.streamID,
      IP: HOST,
      port: senderSocketB.address().port,
      token,
      alert: true,
      meta: 'sender-b',
      ID: 'sender-reconnect',
    })
    assert.strictEqual(reconnectSender.statusCode, 0, `Sender reconnect failed: ${JSON.stringify(reconnectSender)}`)
    markResult(results, 'E2E sender reconnect', true, 'stesso streamID su nuova porta')

    senderSocketA.send(createUdpPacket(senderA.streamID, 'old-endpoint'), DATA_UDP_PORT, HOST)
    const oldEndpointRelayed = await expectNoUdpMessage(receiverSocket)
    assert.strictEqual(oldEndpointRelayed, false, 'Old sender endpoint should not relay after reconnect')
    markResult(results, 'E2E old endpoint blocked', true, 'endpoint precedente rifiutato')

    const payload2 = 'relay-check-2'
    senderSocketB.send(createUdpPacket(senderA.streamID, payload2), DATA_UDP_PORT, HOST)
    const msg2 = await receiveUdpMessage(receiverSocket)
    assert.strictEqual(msg2.slice(8).toString('utf8'), payload2, 'Reconnected sender payload not relayed')
    markResult(results, 'E2E relay after reconnect', true, 'nuovo endpoint attivo')

    const splitReq = JSON.stringify({
      function: 'auth',
      username: USERNAME,
      password: PASSWORD,
      ID: 'split-auth',
    })
    const splitResponses = await sendTcpChunks([
      splitReq.slice(0, Math.floor(splitReq.length / 2)),
      splitReq.slice(Math.floor(splitReq.length / 2)),
    ], 1)
    assert.strictEqual(splitResponses[0].statusCode, 0, 'Split JSON auth did not succeed')
    markResult(results, 'Regression TCP split JSON', true, 'messaggio frammentato gestito')

    const concatResponses = await sendTcpChunks([
      `${JSON.stringify({ function: 'auth', username: USERNAME, password: PASSWORD, ID: 'concat-1' })}${JSON.stringify({ function: 'listFunctions', token, ID: 'concat-2' })}`,
    ], 2)
    assert.ok(concatResponses.find((r) => r.ID === 'concat-1' && r.statusCode === 0), 'First concatenated response missing')
    assert.ok(concatResponses.find((r) => r.ID === 'concat-2' && r.statusCode === 0), 'Second concatenated response missing')
    markResult(results, 'Regression TCP concatenated JSON', true, 'messaggi multipli in un chunk')

    const garbageResponses = await sendTcpChunks([
      `noise-prefix${JSON.stringify({ function: 'auth', username: USERNAME, password: PASSWORD, ID: 'garbage-auth' })}`,
    ], 1)
    assert.strictEqual(garbageResponses[0].ID, 'garbage-auth', 'Garbage-prefix flow returned wrong response')
    assert.strictEqual(garbageResponses[0].statusCode, 0, 'Garbage-prefix auth did not succeed')
    markResult(results, 'Regression TCP garbage prefix', true, 'prefisso non JSON ignorato')

    const subscribeCrashProbeStart = Date.now()
    const crashProbe = await sendTcpRequest({
      function: 'subscribe',
      receiverID: receiver.streamID,
      streamIDs: null,
      token,
      ID: 'dispatcher-catch',
    }, 3500)
    const crashProbeLatency = Date.now() - subscribeCrashProbeStart
    assert.strictEqual(crashProbe.statusCode, 9, `Expected dispatcher fallback statusCode 9, got ${JSON.stringify(crashProbe)}`)
    assert.ok(crashProbeLatency < 3500, 'Dispatcher fallback took too long')
    markResult(results, 'Regression dispatcher catch fallback (TCP)', true, `statusCode=9 in ${crashProbeLatency}ms`)

    const wsProbeStart = Date.now()
    const wsCrashProbe = await sendWssRequest({
      function: 'subscribe',
      receiverID: receiver.streamID,
      streamIDs: null,
      token,
      ID: 'dispatcher-catch-ws',
    }, 3500)
    const wsProbeLatency = Date.now() - wsProbeStart
    assert.strictEqual(wsCrashProbe.statusCode, 9, `Expected WS dispatcher fallback statusCode 9, got ${JSON.stringify(wsCrashProbe)}`)
    assert.ok(wsProbeLatency < 3500, 'WS dispatcher fallback took too long')
    markResult(results, 'Regression dispatcher catch fallback (WS)', true, `statusCode=9 in ${wsProbeLatency}ms`)

    const disconnect = await sendTcpRequest({
      function: 'disconnect',
      streamIDs: [senderA.streamID, receiver.streamID],
      token,
      ID: 'disconnect-clean',
    })
    assert.strictEqual(disconnect.statusCode, 0, `Disconnect failed: ${JSON.stringify(disconnect)}`)
    markResult(results, 'E2E cleanup disconnect', true)
  } catch (err) {
    markResult(results, 'Hardening suite', false, err.message)
  } finally {
    while (cleanup.length > 0) {
      const fn = cleanup.pop()
      try {
        fn()
      } catch (_) {
        // ignore cleanup failures
      }
    }
    if (requestSocket) requestSocket.destroy()
    await stopOwnedServer(serverState)
  }

  console.log('\n=== Hardening Test Matrix ===')
  results.forEach((r) => {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} | ${r.name}${r.detail ? ` | ${r.detail}` : ''}`)
  })

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    process.exitCode = 1
  }
}

runHardeningSuite().catch((err) => {
  console.error(err)
  process.exit(1)
})
