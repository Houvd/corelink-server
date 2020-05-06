/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
// V3.0.0.0

// Setup ----
let IPSource = '' // the ip used to run this listener (if there is a nat proxy, the ip of the nat), leave empty for autodetect
// var IPControl  = '128.122.215.23'; // the ip of the sync server to connect to
const IPControl = '127.0.0.1' // the ip of the sync server to connect to
const TCPControl = 20010 // the control port that is used on the server
const sendport = 20011 // the sendport should actually be determined by the server,
// so this has to change
const username = 'admin' // username to connect as
const password = 'Testpassword' // password to coinnect with
// End Setup ---

const results = []

const os = require('os')

const ifaces = os.networkInterfaces()

// pick the first local ip to set as source IP address
Object.keys(ifaces).forEach((ifname) => {
  ifaces[ifname].forEach((iface) => {
    if (iface.family !== 'IPv4' || iface.internal !== false || ifname.indexOf('docker') > -1 || IPSource !== '') { return }
    IPSource = iface.address
  })
})

// check if we got a source ip
if (IPSource === '') {
  console.log('Did not find proper IP address.')
  process.exit()
}


const net = require('net')

const client = new net.Socket()

// const streams = []
let token = ''

let lastfunction = ''
let laststart = 0

const info = []
let lastinfo = ''

// Tests
const tests = []

tests.auth = {
  start() {
    const request = `{"function":"auth","username":"${username}","password":"${password}"}`
    client.write(request)
  },
  process(message) {
    if ('token' in message) {
      token = message.token
      const { ip } = message
      console.log(`  Authentication successful. Token: ${token}, IP: ${ip}`)
    } else { console.log('  Request produced wrong result') }
    return ('continue')
  },
}

tests.listfunctions = {
  start() {
    const request = `{"function":"listFunctions","token":"${token}"}`
    client.write(request)
  },
  process(message) {
    if ('functionList' in message) {
      let functiontext = 'The following functions are available: '
      for (const func in message.functionList) {
        info[message.functionList[func]] = []
        functiontext += `${message.functionList[func]}, `
      }
      console.log(`  ${functiontext}`)
    } else { console.log('  Request produced wrong result') }
    return ('continue')
  },
}

tests.describeFunction = {
  start() {
    if (lastinfo === '') {
      if (typeof info.describeFunction === 'undefined') {
        // eslint-disable-next-line no-use-before-define
        runTests(lastfunction)
        return
      }
      // eslint-disable-next-line prefer-destructuring
      lastinfo = Object.keys(info)[0]
      const request = `{"function":"describeFunction","functionName":"${lastinfo}","token":"${token}"}`
      client.write(request)
    }
  },
  process(message) {
    // console.log(message)
    if ('description' in message) {
      info[lastinfo] = message.description
      console.log(`  Found: ${message.description.name}`)
      let key = null
      const keys = Object.keys(info)
      for (let i = 0; i < keys.length; i += 1) {
        if (keys[i] === lastinfo) {
          key = keys[i + 1]
          break
        }
      }
      if (key != null) {
        lastinfo = key
        const request = `{"function":"describeFunction","functionName":"${key}","token":"${token}"}`
        client.write(request)
        return null
      }
    } else { console.log('  Request produced wrong result') }
    lastinfo = ''
    return ('continue')
  },
}

function createRequest(name) {
  console.log('createRequest', name)
  function replaceSample(sample) {
    const result = sample
    if (Array.isArray(result)) {
      for (const i in result) {
        result[i] = replaceSample(result[i])
      }
    } else {
      let content = results
      console.log('attribute', result, typeof result)
      if ((typeof result === 'string') && (result.indexOf('$$') !== -1)) {
        const k = result.substr(result.indexOf('$$') + 2).split('.')
        for (const j in k) {
          content = content[k[j]]
        }
        return content
      }
    }
    return result
  }

  const request = {}
  for (const i in info[name].arguments) {
    switch (i) {
      case 'token':
        request[i] = token
        break
      case 'ip':
        request[i] = IPSource
        break
      case 'port':
        // get empty port address
        request[i] = sendport
        break
      default:
        if (typeof info[name].arguments[i].sample !== 'undefined') {
          request[i] = replaceSample(info[name].arguments[i].sample)
        }
    }
  }
  // console.log(`  Query function: ${request.function}`)
  console.log(`  Request ${request.function}: ${JSON.stringify(request)}`)
  return (request)
}

// deep check of the responses
function checkResponse(name, message) {
  switch (name) {
    case 'sender':
      // eslint-disable-next-line no-undef
      streamid = message.streamid


      break
    default:
  }
}

tests.autotest = {
  start() {
    if (lastinfo === '') {
      if (typeof info.describeFunction === 'undefined') {
        // eslint-disable-next-line no-use-before-define
        runTests(lastfunction)
        return
      }
      // eslint-disable-next-line prefer-destructuring
      lastinfo = Object.keys(info)[1]

      const request = JSON.stringify(createRequest(lastinfo))
      client.write(request)
    }
  },
  process(message) {
    checkResponse(lastinfo, message)
    console.log(`  Result: ${JSON.stringify(message)}`)
    results[lastinfo] = message
    let key = null
    const keys = Object.keys(info)
    for (let i = 0; i < keys.length; i += 1) {
      if (keys[i] === lastinfo) {
        key = keys[i + 1]
        break
      }
    }
    if (key != null) {
      lastinfo = key
      const request = JSON.stringify(createRequest(key))
      client.write(request)
      return null
    }
    return ('continue')
  },
}
// At this point we could have an automated string test function for all further components


client.on('data', (data) => {
  let message
  try {
    message = JSON.parse(`[${data.toString().replace(/}{/g, '},{')}]`)
  } catch (e) {
    console.log(`Received message not a proper JSON:${data.toString()}`)
    return
  }
  let tmessage = message[0]
  for (let i = 0; i < message.length; i += 1) {
    if (!('function' in message[i])) {
      tmessage = message[i]
    }
  }
  message = tmessage
  if ('function' in message) {
    // processing function send by server for instance to change or close the connection
    console.log('checking for correct function')
    return
  }
  if ('statusCode' in message) {
    if (message.statusCode !== 0) {
      console.log('  Function result was an error.')
      if ('message' in message) {
        console.log(`  ${message.message}`)
        throw new Error(message.message)
      }
      // eslint-disable-next-line no-use-before-define
      runTests(lastfunction)
      return
    }
    // processing result of a request from server
    if (tests[lastfunction].process(message) === 'continue') {
      console.log(`  Test ${lastfunction} ran for ${Date.now() - laststart}ms.`)
      // eslint-disable-next-line no-use-before-define
      runTests(lastfunction)
    }
    return
  }
  console.log(`Message not understood: ${data.toString()}`)
})


client.on('close', () => {
  console.log('Connection closed')
})

client.connect(TCPControl, IPControl, () => {
  console.log('Connected')
  console.log('Starting tests')
  // eslint-disable-next-line no-use-before-define
  runTests()
})

const next = (db, key) => {
  const keys = Object.keys(db)
  if (key == null) { return keys[0] }
  for (let i = 0; i < keys.length; i += 1) {
    if (keys[i] === key) { return keys[i + 1] }
  }
  return null
}

function runTests(func = null) {
  const i = next(tests, func)
  if (typeof i !== 'undefined') {
    console.log(`testing > ${i}`)
    lastfunction = i
    laststart = Date.now()
    tests[i].start()
  } else {
    console.log('Finished tests')
    client.destroy()
  }
}

// client.destroy(); // kill client after server's response
