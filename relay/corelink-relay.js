/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable no-bitwise */
/* eslint-disable no-underscore-dangle */ // this has to be here, since other packages use it


/**
 * @file NodeJS Corelink core relay
 * @author Robert Pahle, Abhishek Khanna
 * @version v7.0.0.0
 */

const serverVersion = 'v7.0.0.0'
// v7.0.0.0
// - separation of relay and controller
// v6.0.0.2
// - tcp proper split of combined packets
// v6.0.0.1
// - removed all references to room replaced with workspace
// v6.0.0.0
// - data protocol changes
// v5.0.0.0
// - new naming convention implemented
// v4.7.0.0
// - add describeServerFunction and listServerFunctions
// v4.6.0.0
// - enable logging to file and to stream
// v4.5.0.0
// - support ID to allow ordering of control packets
// v4.4.0.0
// - ws data streams encryped
// v4.3.0.0
// - ws control connections encrypted
// v4.2.0.0
// - added signaling of subscribed and dropped streams to senders
// v4.1.0.0
// - added signaling of stale streams
// v4.0.0.1
// - handling of pings for time syncronization
// v4.0.0.0
// - first version that incorporates plugins/apps
// v3.5.1.0
// - added metadata for streams
// v3.5.0.1
// - fixed timeouts for streams
// v3.5.0.0
// - added ws connection option for sender and receiver streams
// v3.4.0.0
// - added tcp connection option for sender and receiver streams
// V3.3.0.0
// - added user announcement for listStream, recevier and update functions
// V3.2.0.0
// - added signaling of MTU (clients need to manage splitting of data)
// V3.1.0.0
// - added signaling of new available streams
// V3.0.0.0
// - new version of protocol

// *** ToDo: check logic for reconnecting streams. could someone reconnect to a
// stream they are not authorized to?
const crypto = require('crypto')
const dgram = require('dgram')
const net = require('net')
const Ws = require('ws').Server
const fs = require('fs')
const https = require('https')
const httpStatic = require('node-static')
const config = require('./config/configure')


// should the server output be piped into a corelink stream
// to logging to file copy dockerlog.js.sample to dockerlog.js
const logStream = true
let logFile = true
let logStdOut = true

// Check if the file exists in the current directory, and if it is writable.
fs.access('dockerlog', fs.constants.F_OK, (err) => {
  if (!err) {
    logFile = true
    logStdOut = true
  }
})

const httpsOptions = {
  key: fs.readFileSync(config.key),
  cert: fs.readFileSync(config.cert),
}

// ******** setup default setting
// timeouts for sync server
const controlTimeout = 10 * 60 * 60 * 1000 // (10 hours timeout for the control connection)
const streamTimeout = 30 * 60 * 1000 // (30 minutes stream timeout)
const connectTimeout = 10 * 60 * 1000 // timeout to dump open connections that are not used
const sessionTimeout = 10 * 60 * 60 * 1000 // 10 hours timeout for user token
const testTimeout = 10 * 60 * 1000 // 10 min frequency to test if something timedout

const tokens = [] // holds all token related information
// tokens[token] = [] // information for specific token
// tokens[token]['time'] = 342523; // holds the timeout time stamp for the tokens
// tokens[token]['user'] = 1; // holds the user ID for the token
// tokens[token]['streams'] = []; // stream ID of the stream that the token was used for
// tokens[token]['conn'] = %Socket; // control connection for the tcp control channel
// we can expand other token information with
// tokens[token]['other'] = [];

const globalConfig = {}

const connections = []
// connections[IP][port]['conn'] = handle for the connection
// connections[IP][port]['time'] = creation time for stream, used for timeout

// all source and target streams information is stored in source and target
const source = []
/*
source = [] // holds all source stream information
source[ID] =  [] // stream ID
source[ID]['IP'] = source IP address
source[ID]['port'] = source port
source[ID]['proto'] = ws or tcp or ws
source[ID]['workspace'] = workspace name
source[ID]['type'] = type of stream e.g. 3D, Audio, etc...
source[ID]['alert'] = true/false (alert when new receiver subscribes)
source[ID]['time'] = timeout for stream
source[ID]['meta'] = metadata to send to receivers during negotiation
source[ID]['conn'] = for tcp/ws connections the connection information
 if app works as a user, the from tag is given and therefore derived from another stream
 that from stream can be followed back until we find either the originating user or app
source[ID]['from'] = if derived from other stream
*/

const target = []
/*
target = [] // holds all target stream information
target[ID] =  [] // stream ID
target[ID]['IP'] = source IP address
target[ID]['port'] = source port
target[ID]['proto'] = udp or tcp or ws
target[ID]['workspace'] = workspace name
target[ID]['alert'] = true/false (Alert if stream of specific type becomse available)
target[ID]['echo'] = true/false (send data to receivers with the same username)
target[ID]['type'] = array of type of stream e.g. 3D, Audio, etc...
target[ID]['meta'] = metadata to send to senders during negotiation
target[ID]['time'] = timeout for stream
target[ID]['conn'] = for tcp/ws connections the connection information
*/

// fast structure to access to future connections
const streamRelay = [] // holds all information to relay
// data from source to targets most effectively
/*
streamRelay[IDs] = [] // source stream ID
streamRelay[IDs][IDt] = conn // connection to send data to
*/

// Allowed packet size
const MTU = 20000 // overall size incl. header is not allowed to be larger than this number
//             in the future server could drop packets that are not complying with this

// Ports for relay
const port = []

port.udp = 20011
port.tcp = 20011
port.ws = 20013

// setting root ca certificate for self signed server certificates
if (typeof config.ca !== 'undefined') {
  httpsOptions.ca = fs.readFileSync(config.ca)
}

//* ****************  Utility functions */
/**
 * generates random string of characters i.e salt
 * @function
 * @param {number} length - Length of the random string.
 *

function genRandomString(length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex') // convert to hexadecimal format
    .slice(0, length) // return required number of characters
}
*/


/*
* hash password with sha512.
* @function
* @param {string} password - List of required fields.
* @param {string} salt - Data to be validated.

function hashSha512(password, salt) {
  const hash = crypto.createHmac('sha512', salt)
  hash.update(password)
  const value = hash.digest('hex')
  return {
    salt,
    passwordHash: value,
  }
}

function saltHashPassword(userPassword) {
  const salt = genRandomString(16) // Gives us salt of length 16
  const passwordData = hashSha512(userPassword, salt)
  return { password: passwordData.passwordHash, salt }
}
*/

/**
* Helper function to create random exponential delay to reconnect
* @param {string} data JSON string to decode.
* @returns {object} Javascript object with the parsed data
* @private
* @module parseJson
*/

function generateInterval(k) {
  let maxInterval = ((2 ** k) - 1) * 1000
  if (maxInterval > 30 * 1000) {
    maxInterval = 30 * 1000
  }
  return Math.random() * maxInterval
}


/**
* Helper function to parse JSON
* @param {string} data JSON string to decode.
* @returns {object} Javascript object with the parsed data
* @private
* @module parseJson
*/

function parseJson(data) {
  return (new Promise((resolve, reject) => {
    try {
      const parsedData = JSON.parse(`[${data.toString().replace(/}{/g, '},{')}]`)
      resolve(parsedData)
    } catch (e) {
      reject(new Error(`Received message not a proper JSON: ${data.toString()}`))
    }
  }))
}

// all control stream functions

const control = {}
control.data = []
control.ID = 0

control.connect = async (IP, port) => (new Promise(async (resolve, reject) => {
  const URL = `wss://${IP}:${port}/`
  if (debug) console.log(`Trying to connect to: ${URL}`)
  if ((IP === 'localhost' || IP === '127.0.0.1' || IP === '::1') && (typeof connConfig.cert !== 'undefined')) {
    cert.ca = fs.readFileSync(connConfig.cert)
  }
  try {
    control.client = new WebSocket(URL, null, null, null, cert)
  } catch (e) {
    console.error('Not able to connect the websocket.', e)
    reject(e)
  }

  control.client.onopen = () => {
    resolve()
  }

  control.client.onerror = (e) => {
    console.log('Connection Error:', e)
    reject()
  }

  control.request = async (data) => {
    if (debug) console.log('request', data)
    return (new Promise(async (requestResolve, requestReject) => {
      const wdata = data
      wdata.ID = control.ID
      control.ID += 1
      let retries = 5
      control.client.onmessage = (async (content) => {
        const parsed = await parseJson(content.data).catch((e) => requestReject(e))
        if (debug) console.log('parsed all', parsed)
        for (let i = 0; i < parsed.length; i += 1) {
          if ('function' in parsed[i]) {
            if (debug) console.log('call 2nd func')
            control.client.onmessage1(parsed)
          }
          retries -= 1
          if ('ID' in parsed[i] && parsed[i].ID === wdata.ID) {
            delete parsed[i].ID
            if (debug) console.log('parsed', parsed[i])
            if ('statusCode' in parsed[i]) {
              if (parsed[i].statusCode === 0) {
                requestResolve(parsed[i])
                break
              } if ('message' in parsed[i]) reject(new Error(`${parsed[i].message} (${parsed[i].statusCode})`))
              else reject(new Error(`Error (${parsed[i].statusCode}) with out specific message returned.`))
            } reject(new Error('Status code or function not found in answer.'))
          }
          if (retries === 0) requestReject(new Error('Server did not responded with an answer.'))
        }
      })
      control.client.send(JSON.stringify(wdata))
      if (debug) console.log('request sent:', JSON.stringify(wdata))
    }))
  }

  control.client.onmessage1 = (async (data) => {
    if (debug) console.log('onmessage', data)
    for (let i = 0; i < data.length; i += 1) {
      const parsedData = data[i]
      if ('function' in parsedData) {
        if (debug) console.log('function')
        switch (parsedData.function) {
          case 'update':
            if (receiverCb != null) {
              delete parsedData.function
              receiverCb(parsedData)
            } else console.log('No receiver update callback provided.')
            break
          case 'subscriber':
            if (senderCb != null) {
              delete parsedData.function
              senderCb(parsedData)
            } else console.log('No sender update callback provided.')
            break
          case 'stale':
            if (staleCb != null) {
              delete parsedData.function
              staleCb(parsedData)
            } else console.log('No stale update callback provided.')
            break
          case 'dropped':
            if (droppedCb != null) {
              delete parsedData.function
              droppedCb(parsedData)
            } else console.log('No dropped update callback provided.')
            break
          default:
            console.log('Unknown callback. Maybe this library is outdated?')
        }
      }
    }
  })

  control.client.onclose = (e) => {
    if (debug) console.log('onclose:', e)
    console.log('reconnect: ', connConfig.autoReconnect)
    if (connConfig.autoReconnect) {
      if (closeCb != null) closeCb()
      else console.log('No close connection callback provided.')
      console.log(`Control connection lost: Retrying websocket (${attempts})`)
      const time = generateInterval(attempts)
      console.log(`Waiting ${time}ms to reconnect.`)
      setTimeout(() => {
        attempts += 1
        reconnect(attempts)
      }, time)
    } else
    if (closeCb != null) closeCb()
    else {
      console.log('No close connection callback provided.')
    }
  }
}))

/**
 *Login to the corelink server
 *with username and password or token
 *If the credentials are incorrect then it throws an error.
 *The module ends with a
  Promise. A promise is an object which can be returned synchronously from an asynchronous function.
 *@param {String} credentials Refers to all login credentials like username,password and token.
 *@module login
 */

async function login(credentials) {
  return (new Promise(async (resolve, reject) => {
    let request = ''
    if ((typeof credentials.username === 'undefined')
            && (typeof credentials.password === 'undefined')) {
      if ((typeof credentials.token === 'undefined')) reject(new Error('Credentials not found.'))
      else request = `{"function":"auth","token":"${credentials.token}"}`
    } else request = `{"function":"auth","username":"${credentials.username}","password":"${credentials.password}"}`
    if (debug) console.log('Login ', request)
    const content = await control.request(JSON.parse(request)).catch((e) => reject(e))
    if (!content) return
    if (debug) console.log('Login result ', content)
    if ('token' in content) token = content.token
    else reject(new Error('Token not found.'))
    if ('IP' in content) sourceIP = content.IP
    else reject(new Error('SourceIP not found.'))
    resolve(true)
  }))
}


/**
 *Connects with client at the specified Port and IP number after verifying login credentials
 *like username,password and token defined in the 'login' function.
 *If the credentials are incorrect then it throws an error.
 *The 'await' keyword waits for a value of ControlPort and ControlIP. The module ends with a
  Promise. A promise is an object which can be returned synchronously from an asynchronous function.
 *@param {String} credentials Refers to all login credentials like username,password and token.
 *@param {String} config Refers to connection configuration like ControlPort and ControlIP

 *@module connect
 */

async function connect(credentials, config) {
  return (new Promise(async (resolve, reject) => {
    if (debug) console.log('Connecting...')
    connConfig = config

    connCredentials = credentials

    // dns.lookup(connConfig.ControlIP, (err, address) => {
    //   connConfig.ControlIP = address
    //   if (debug) console.log('address:', address)
    // })

    if (debug) console.log('Target IP:', connConfig.ControlIP, 'target port :', connConfig.ControlPort)
    let conn
    connected = true
    // connect the client
    await control.connect(connConfig.ControlIP, connConfig.ControlPort).catch((e) => {
      connected = false
      if (debug) console.log('not connectd', e)
      reject(e)
    })

    if (connected) {
      // check if there is a token and if it is valid
      // checkToken()

      // login if we dont have a good token
      if (token == null) conn = await login(credentials).catch((e) => reject(e))

      // if all streams are still valid
      // if (conn) checkConnections()
    }
    if (conn) {
      attempts = 1
      resolve(conn)
    } else reject(new Error('Problem loggin in'))
  }))
}

//* **************** Server */
async function run() {
  // setup logging

  // setup file logging of the dockerlog.js file is available
  let log
  let logErr
  if (logFile) {
    const timestamp = new Date(Date.now())
    const timeString = `${timestamp.getFullYear()}_${timestamp
      .getMonth().toString().padStart(2, '0')}_${timestamp
      .getDate().toString().padStart(2, '0')}_${timestamp
      .getHours().toString().padStart(2, '0')}_${timestamp
      .getMinutes().toString().padStart(2, '0')}_${timestamp
      .getSeconds().toString().padStart(2, '0')}`
    log = await fs.createWriteStream(`data/${timeString}_node.access.log`, { flags: 'a' })
    logErr = await fs.createWriteStream(`data/${timeString}_node.error.log`, { flags: 'a' })

    console.log(`Selecting ${timeString}_node.access.log to log.`)
  }

  const stdOut = process.stdout.write
  const stdErr = process.stderr.write

  function write(...args) {
    if (logStdOut) stdOut.apply(process.stdout, args)
    if (logFile) log.write(...args)
    const data = Buffer.from(`${Date.now()} ${args[0]}`)
    const header = Buffer.alloc(8)

    header.writeUInt16LE(0, 0)
    header.writeUInt16LE(data.length, 2)
    header.writeUInt32LE(0, 4)

    const packet = [header, data]
    const message = Buffer.concat(packet)
    // eslint-disable-next-line no-use-before-define
    if (logStream) relayData(message)
  }

  function writeErr(...args) {
    if (logStdOut) stdErr.apply(process.stderr, args)
    if (logFile) logErr.write(...args)
    const data = Buffer.from(`${Date.now()} ${args[0]}`)
    const header = Buffer.alloc(8)
    header.writeUInt16LE(0, 0)
    header.writeUInt16LE(data.length, 2)
    header.writeUInt32LE(0, 4)


    const packet = [header, data]
    const message = Buffer.concat(packet)
    // eslint-disable-next-line no-use-before-define
    if (logStream) relayData(message)
  }

  process.stdout.write = write
  process.stderr.write = writeErr

  // catch exceptions
  process.on('uncaughtException', (e) => {
    console.error((e && e.stack) ? e.stack : e)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error(reason, promise)
  })

  // making sure that the apps cannot be overwritten
  if (logStream) {
    source[0] = []
    source[0].IP = ''
    source[0].port = 0
    source[0].proto = 'local'
    source[0].workspace = 'Log'
    source[0].type = 'LogStream'
    source[0].alert = false
    source[0].time = Date.now()
    source[0].from = 'LogStream'

    streamRelay[0] = []
  }


  // start application
  globalConfig.debug = true

  const stdin = process.openStdin()
  if (stdin.isTTY) stdin.setRawMode(true)
  stdin.resume()
  stdin.setEncoding('utf8')

  function listStreams() {
    let token
    let user
    let s
    let key
    let sr
    let t
    let tsr
    let IP
    let connectionPort

    console.log('Listing Streams')
    // console.log(tokens);
    // console.log(source);
    for (token in tokens) {
      if (token !== '') {
        console.log(`Token: ${token}, user: ${users[tokens[token].user].username}, streams: ${tokens[token].streams.toString()}, time: ${tokens[token].time}`)
      }
    }

    for (s in source) {
      if (s) {
        for (token in tokens) {
          if (token) {
            for (key in tokens[token].streams) {
              if (tokens[token].streams[key] === s) {
                user = users[tokens[token].user].username
                break
              }
            }
          }
        }
        console.log(`Source: ${s}, User: ${user}, IP: ${source[s].IP}:${source[s].port}, proto: ${source[s].proto}, workspace: ${source[s].workspace}, alert: ${source[s].alert}, type: ${source[s].type}, time: ${source[s].time}, from: ${source[s].from}`)
      }
    }

    for (t in target) {
      if (t) {
        console.log(`Target: ${t}, IP: ${target[t].IP}:${target[t].port}, proto: ${target[t].proto}, workspace: ${target[t].workspace}, alert: ${target[t].alert}, type: ${target[t].type}, time: ${target[t].time}`)
      }
    }
    for (sr in streamRelay) {
      if (sr) {
        for (tsr in streamRelay[sr]) if (tsr) console.log(`Relaying ${sr} -> ${tsr}`)
      }
    }
    console.log('Streamrelay:', streamRelay)

    for (IP in connections) {
      if (IP) {
        for (connectionPort in connections[IP]) {
          if (connectionPort) {
            console.log(`Connection stored for ${IP}:${connectionPort}`)
          }
        }
      }
    }
  }

  stdin.on('data', (key) => {
  // console.log(key.charCodeAt(0));
  // console.log(key.charCodeAt(1));
  // console.log(key.charCodeAt(2));
  // console.log(key.charCodeAt(3));
    if (key === '\u0003') process.exit()


    if (key.charCodeAt(0) === 115) listStreams()

    if ((key.charCodeAt(0) === 27) && (key.charCodeAt(1) === 91)) {
      if ((key.charCodeAt(2) === 65)) {
        console.log('Debug on')
        globalConfig.debug = true
      }
      if ((key.charCodeAt(2) === 66)) {
        console.log('Debug off')
        globalConfig.debug = false
      }
    }
  })


  // holds all error messages
  const errorList = []
  errorList[1] = 'Key Functionname not set'
  errorList[2] = 'Function does not exist.'
  errorList[3] = 'Required key not supplied'
  errorList[4] = 'Access denied.'
  errorList[5] = 'Workspace does already exist.'
  errorList[6] = 'Workspace does not exist.'
  errorList[7] = 'Wrong StreamID.'
  errorList[8] = 'Invalid app token, access denied.'
  errorList[9] = 'Database error'
  errorList[10] = 'Cannot update default workspace.'
  errorList[11] = 'User already found in database'
  errorList[12] = 'Group doesnt exist in the database'
  errorList[13] = 'Current user doesnt have right to add user to the group'
  errorList[14] = 'User does not exist in Database'
  errorList[15] = 'Password not provided'
  errorList[16] = 'Current user is not admin'

  function getErrorMessage(code) {
    const response = {}
    response.statusCode = code
    response.message = errorList[code]
    return (response)
  }





  //-------- UDP data transfer setup --------
  console.log(`trying to bind UDP port ${port.udp}`)

  const UDPDataServer = dgram.createSocket('udp4')

  UDPDataServer.on('error', (err) => {
    console.log(`server error:\n${err.stack}`)
    // clean up connection ?
    UDPDataServer.close()
  })

  UDPDataServer.on('listening', () => {
    const address = UDPDataServer.address()
    console.log(`UDP data server listening ${address.address}:${address.port}`)
  })

  UDPDataServer.bind(port.udp)

  function relayData(msg, remoteAddress, remotePort) {
    // decode header
    let headerSize = msg.readUInt16LE(0)
    const dataSize = msg.readUInt16LE(2)
    const sourceID = msg.readUInt32LE(4)
    // eslint-disable-next-line no-bitwise
    const decodeHeader = !!(headerSize & 32768)
    // headerSize = headerSize & 32767


    // console.log('sourceID', sourceID, typeof sourceID)

    const last = Date.now()
    // eslint-disable-next-line no-bitwise
    headerSize &= 32767 // *** ToDo: it seems we are already doing this above

    let header
    let data
    let stream
    let headerr
    let headerBuffer
    let types
    let packet
    let message
    let type
    let targetID
    // *** ToDo: validate that this message is truely a sender message that is authenticated
    // console.log(`server got from ${rinfo.address}:${rinfo.port}`);
    // decoding header
    // console.log('message: ',msg);

    // check for packet too small
    if (msg.length < 8) {
      console.log('Packet is too small')
      return console.error('Packet is too small')
    }
    // check for packet inconsistent size
    if (msg.length !== 8 + headerSize + dataSize) {
      // console.log('message:', remoteAddress, remotePort, msg.toString())
      let calculatedSize = 0
      let pointer = 0
      // for combined packets we need to match the source/federation id and the overall size
      while (msg.length > calculatedSize) {
        calculatedSize += 8
        calculatedSize += msg.readUInt16LE(pointer)
        calculatedSize += msg.readUInt16LE(pointer + 2)
        if (msg.length < calculatedSize) {
          console.log(`Combined packet has wrong size (${msg.length} vs. ${calculatedSize}).`)
          return console.error(`Combined packet has wrong size (${msg.length} vs. ${calculatedSize}).`)
        }
        data = Buffer.allocUnsafe(calculatedSize - pointer)
        msg.copy(data, 0, pointer, calculatedSize)
        relayData(data, remoteAddress, remotePort)
        pointer = calculatedSize
      }

      if (msg.length !== calculatedSize) {
        console.log(`Combined packet has still the wrong size (${msg.length} vs. ${calculatedSize}).`)
        return console.error(`Combined packet has still the wrong size (${msg.length} vs. ${calculatedSize}).`)
      }
      return 'relaydata split end'
    }

    // log out debug information
    if (globalConfig.debug && (sourceID !== 0)) {
      // datadata = Buffer.allocUnsafe(dataSize)
      // msg.copy(data, 0, 8 + headerSize)
      // console.log('Receiving '+header['ID']+` b${msg.length} h${headerSize} d${dataSize}
      // to ${target[targetID]['IP']}:${target[targetID]['port']}`);
      if (sourceID !== 0) {
        if (typeof source[sourceID] !== 'undefined') {
          // console.log('source[sourceID]', source[sourceID])
          // console.log('message', msg.toString())
          console.log(`Receiving ${sourceID} b${msg.length} h${headerSize} d${dataSize} from ${source[sourceID].IP}:${source[sourceID].port}`)
        } else {
          console.log(`Receiving ${sourceID} b${msg.length} h${headerSize} d${dataSize} from unknown source`)
        }
      }
      // console.log(data)
    }

    // decode json header if needed
    if (decodeHeader) {
      header = msg.toString('ascii', 8, headerSize + 8)
      try {
        header = JSON.parse(header)
      } catch (e) {
        console.log(`error during parsing ${e}`)
        return console.error(e)
      }

      // if we see the 'stamp' variable we will return a ping with the server stamped time
      if (('stamp' in header) && ((sourceID in source) || (sourceID in target))) {
        if (sourceID in source) stream = source[sourceID]
        else stream = target[sourceID]
        data = Buffer.allocUnsafe(dataSize)
        msg.copy(data, 0, 8 + headerSize)

        header.stamp = Date.now()
        headerr = JSON.stringify(header)
        headerr = Buffer.from(headerr)

        headerBuffer = Buffer.alloc(8)
        headerBuffer.writeUInt16LE(headerr.length, 0)
        headerBuffer.writeUInt16LE(data.length, 2)
        headerBuffer.writeUInt32LE(sourceID, 4)

        packet = [headerBuffer, headerr, data]
        message = Buffer.concat(packet)

        switch (stream.proto) {
          case 'udp':
            UDPDataServer.send(message, remotePort, remoteAddress, (err) => {
              if (err) console.log('socket error during ping', err)
            })
            break
          case 'tcp':
            stream.conn.write(message)
            break
          case 'ws':
            stream.conn.send(message)
            break
          default:
            console.log('wrong stream')
        }
        if (globalConfig.debug) console.log(`sending back ${stream.proto} ping:${JSON.stringify(header)}, IP:${remoteAddress}, port${remotePort}`)
        return 'done with echo'
      }
    }


    if (sourceID in streamRelay) { // console.log(header['ID']);
      source[sourceID].time = last
      for (targetID in streamRelay[sourceID]) {
        if ((typeof target[targetID] !== 'undefined') && (typeof target[targetID].IP !== 'undefined') && (target[targetID].IP !== '')) {
          if ((typeof target[targetID] !== 'undefined') && (typeof target[targetID].port !== 'undefined') && (target[targetID].port !== 0)) {
            if (globalConfig.debug && sourceID !== 0) {
              console.log(`Sending ${sourceID} b${msg.length} h${headerSize} d${dataSize} to ${target[targetID].IP}:${target[targetID].port}`)
              // console.log(data)
            }
            target[targetID].time = last
            if (target[targetID].proto === 'udp') {
              UDPDataServer.send(msg, target[targetID].port, target[targetID].IP, (err) => {
                if (err && (sourceID !== 0)) console.log('socket error', err)
              })
            } else if (target[targetID].proto === 'tcp') {
              if (typeof target[targetID].conn === 'undefined' && (sourceID !== 0)) console.log('!!!! tcp connection not defined, dropping packet')
              else target[targetID].conn.write(msg)
            } else if (((typeof target[targetID].conn === 'undefined') || (target[targetID].conn.readyState !== 1)) && (sourceID !== 0)) console.log('!!!! websocket connection not defined or closed, dropping packet')
            else target[targetID].conn.send(msg)
          } else if (typeof target[targetID] === 'undefined' && (sourceID !== 0)) console.log(`${targetID} is not registered at all`)
          else {
            types = ''
            for (type in target.targetID) {
              if (types === '') types = type
              else types = `${types}, ${type}`
            }
            if (sourceID !== 0) console.log(`no port for stream ${targetID} [${types}], IP:${target[targetID].IP}, Timeout:${target[targetID].time}`)
          }
        } else if (sourceID !== 0) console.log(`no IP for stream ${sourceID}`)
      }
    } else if (sourceID in target) {
      if (globalConfig.debug && (sourceID !== 0)) console.log(target[sourceID].IP)
      console.log(`Trying to assign port and connections for ${sourceID}, ${remoteAddress}:${remotePort}`)
      if (remoteAddress === target[sourceID].IP) {
        if (globalConfig.debug) console.log('Target info ', target[sourceID])
        if (target[sourceID].port === 0) {
          if (sourceID !== 0) console.log(`Setting target port for ${remoteAddress} to ${remotePort} protocol ${target[sourceID].proto}`)
          target[sourceID].port = remotePort
          if ((target[sourceID].proto === 'tcp') || (target[sourceID].proto === 'ws')) {
            if (sourceID !== 0) console.log(sourceID, 'adding the connection')
            target[sourceID].conn = connections[remoteAddress][remotePort].conn
            delete connections[remoteAddress][remotePort]
            if (connections[remoteAddress].length === 0) delete connections[remoteAddress]
          }
        }
        if (sourceID !== 0) console.log(`no port for stream ${sourceID} [${types}], IP:${target[sourceID].IP}, Timeout:${target[sourceID].time}`)
      }
    } else if (sourceID !== 0) console.log(`StreamID (${sourceID}) not authorized to send`)

    return 'relaydata end'
  }

  UDPDataServer.on('message', (msg, rinfo) => {
    relayData(msg, rinfo.address, rinfo.port)
  })

  function handleDataConnection(conn) {
    const remoteAddress = conn.remoteAddress.replace(/^.*:/, '')
    const { remotePort } = conn
    let buffer = []

    if (typeof connections[remoteAddress] === 'undefined') connections[remoteAddress] = []
    connections[remoteAddress][remotePort] = []
    connections[remoteAddress][remotePort].conn = conn
    connections[remoteAddress][remotePort].time = Date.now()

    // at this point we have a new connection that is not yet authenticated
    console.log('new TCP data connection from %s', remoteAddress)
    conn.setNoDelay(true)

    conn.on('data', (msg) => {
      if (msg.length === 65536) {
        buffer.push(msg)
        return
      }
      if (buffer.length > 0) {
        buffer.push(msg)
        relayData(Buffer.concat(buffer), remoteAddress, remotePort)
        buffer = []
      } else relayData(msg, remoteAddress, remotePort)
    })

    conn.once('close', () => {
      // *** ToDo: unset the array element for the connection
      console.log('TCP data connection from %s closed', remoteAddress)
    })

    conn.on('error', (err) => {
      // *** ToDo: unset the array element for the connection
      console.log('TCP data connection %s error: %s', remoteAddress, err.message)
    })
  }

  //-------- TCP data transfer setup --------
  console.log(`trying to bind TCP port ${port.tcp}`)

  const TCPDataServer = net.createServer()
  TCPDataServer.on('connection', handleDataConnection)

  TCPDataServer.listen(port.tcp, '0.0.0.0', () => {
    console.log('TCP data server listening to %j:%j', TCPDataServer.address().address, TCPDataServer.address().port)
  })

  //-------- WS data transfer setup --------
  console.log(`trying to bind WS port ${port.ws}`)

  const httpsDataServer = https.createServer(httpsOptions, (req, res) => {
    console.log(`New Request... ${req.socket.remoteAddress} ${req.method} ${req.url}`)
    res.writeHead(200)
    res.end('Corelink Data Port')
  })
  httpsDataServer.listen(port.ws, '0.0.0.0')

  const WSDataServer = new Ws({ server: httpsDataServer })

  WSDataServer.on('connection', (conn, req) => {
  // const IP = req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];

    const { remoteAddress } = req.socket
    const { remotePort } = req.socket
    console.log(`Connected new WS client from ${remoteAddress} port ${remotePort}`)

    if (typeof connections[remoteAddress] === 'undefined') connections[remoteAddress] = []
    connections[remoteAddress][remotePort] = []
    connections[remoteAddress][remotePort].conn = conn
    connections[remoteAddress][remotePort].time = Date.now()

    conn.on('message', (msg) => {
      relayData(msg, remoteAddress, remotePort)
    })

    conn.once('close', () => {
      // *** ToDo: unset the array element for the connection
      delete connections[remoteAddress][remotePort]
      if (connections[remoteAddress].length === 0) delete connections[remoteAddress]
      console.log('---------------WS data connection from %s closed', remoteAddress)
    })

    conn.on('error', (err) => {
      // *** ToDo: unset the array element for the connection
      delete connections[remoteAddress][remotePort]
      if (connections[remoteAddress].length === 0) delete connections[remoteAddress]
      console.log('WS data connection %s error: %s', remoteAddress, err.message)
    })
  })

  WSDataServer.on('listening', () => {
    const address = WSDataServer.address()
    console.log(`WS data server listening ${address.address}:${address.port}`)
  })

  function timeoutConnections() {
    if (typeof log !== 'undefined') source[0].time = Date.now()

    let IP
    // eslint-disable-next-line no-shadow
    let port
    let token
    let ID
    let sID
    let tID
    const currentTime = Date.now()
    for (IP in connections) {
      if (IP) {
        for (port in connections[IP]) {
        // console.log('connections',connections[IP][port]['time'],connectTimeout,currentTime
        //    ,connections[IP][port]['time'] + connectTimeout - currentTime);
          if (connections[IP][port].time + connectTimeout < currentTime) {
            delete connections[IP][port]
            if (connections[IP].length === 0) delete connections[IP]
          }
        }
      }
    }
    for (token in tokens) {
      if (tokens[token].time + sessionTimeout < currentTime) delete tokens[token]
    }

    // Test if sources have timed out
    for (ID in source) {
      // console.log('source',ID,source[ID]['time'],streamTimeout,currentTime,source[ID]['time']
      //    + streamTimeout - currentTime);
      if (source[ID].time + streamTimeout < currentTime) {
        // notify clients of stale streams
        // streamID not defined  but used
        serverFunctions.stale.process(ID)

        // remove stream information from the relay
        delete streamRelay[ID]
        delete source[ID]
      }
    }

    // Test if targets have timed out
    for (ID in target) {
      // console.log('target',ID,target[ID]['time'],streamTimeout,currentTime,target[ID]['time']
      //   +streamTimeout - currentTime);
      if (target[ID].time + streamTimeout < currentTime) {
        for (sID in streamRelay) {
          if (sID) {
            for (tID in streamRelay) if (tID === ID) delete streamRelay[sID][tID]
            // dont remove sources that are still available from the relay
            // (let the sources time out separately)
            // if (streamRelay[sID].length === 0) delete streamRelay[sID]
          }
        }
        delete target[ID]
      }
    }
    setTimeout(timeoutConnections, testTimeout)
  }
  timeoutConnections()

  // process.on('SIGINT', process.exit());
}

run()
