/* eslint-disable no-underscore-dangle */ // this has to be here, since other packages use it
/* eslint-disable no-restricted-syntax */

/**
 * @file NodeJS Corelink core server
 * @author Robert Pahle
 * @version V4.6.0.0
 */
const serverVersion = 'v4.6.0.0'
// v4.6.0.0
// - enable logging to file and to stream
// v4.5.0.0
// - support id to allow ordering of control packets
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
// - added user announcement for liststream, recevier and update functions
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
const config = require('./config/configure')
const knex = require('./knex/knex.js')


// should the server output be piped into a corelink stream
// to logging to file copy dockerlog.js.sample to dockerlog.js
const logstream = true
let logfile = true
let logstdout = true

// Check if the file exists in the current directory, and if it is writable.
fs.access('dockerlog', fs.constants.F_OK, (err) => {
  if (!err) {
    logfile = true
    logstdout = true
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

// Ports for sync server
const TCPControl = 20010
const WSControl = 20012
const port = []
// const rooms = []
// const users = []
// ?? should a token be restricted to a specific IP/Port combination
// users can have several tokens that are in use
// tokens time out separately

const tokens = [] // holds all token related information
// tokens[token] = [] // information for specific token
// tokens[token]['time'] = 342523; // holds the timeout time stamp for the tokens
// tokens[token]['user'] = 1; // holds the user id for the token
// tokens[token]['streams'] = []; // stream id of the stream that the token was used for
// tokens[token]['conn'] = %Socket; // control connection for the tcp control channel
// we can expand other token information with
// tokens[token]['other'] = [];

const globalConfig = {}

const functions = [] // holds all objects for functions in use
// all receiver connections via TCP or WS

const connections = []
// connections[ip][port]['conn'] = handle for the connection
// connections[ip][port]['time'] = creation time for stream, used for timeout

// all source and target streams information is stored in source and target
const source = []
/*
source = [] // holds all source stream information
source[id] =  [] // stream ID
source[id]['ip'] = source ip address
source[id]['port'] = source port
source[id]['proto'] = ws or tcp or ws
source[id]['room'] = workspace name
source[id]['type'] = type of stream e.g. 3D, Audio, etc...
source[id]['alert'] = true/false (alert when new receiver subscribes)
source[id]['time'] = timeout for stream
source[id]['meta'] = metadata to send to receivers during negotiation
source[id]['conn'] = for tcp/ws connections the connection information
 if app works as a user, the from tag is given and therefore derived from another stream
 that from stream can be followed back until we find either the originating user or app
source[id]['from'] = if derived from other stream
*/

const target = []
/*
target = [] // holds all target stream information
target[id] =  [] // stream ID
target[id]['ip'] = source ip address
target[id]['port'] = source port
target[id]['proto'] = udp or tcp or ws
target[id]['room'] = workspace name
target[id]['alert'] = true/false (Alert if stream of specific type becomse available)
target[id]['echo'] = true/false (send data to receivers with the same username)
target[id]['type'] = array of type of stream e.g. 3D, Audio, etc...
target[id]['meta'] = metadata to send to senders during negotiation
target[id]['time'] = timeout for stream
target[id]['conn'] = for tcp/ws connections the connection information
*/

// fast structure to access to future connections
const streamrelay = [] // holds all information to relay
// data from source to targets most effectively
/*
streamrelay[ids] = [] // source stream id
streamrelay[ids][idt] = conn // connection to send data to
*/

// Allowed packet size
const MTU = 20000 // overall size incl. header is not allowed to be larger than this number
//             in the future server could drop packets that are not complying with this

// All server initiated functions
let serverfunctions = []

port.udp = 20011
port.tcp = 20011
port.ws = 20013

// *** ToDo: Remove legacy code once setup was completely changed to database
/*
rooms.Holodeck = []
rooms.Holodeck.users = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14']
rooms.Holodeck.owner = '1'
rooms.Chalktalk = []
rooms.Chalktalk.users = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14']
rooms.Chalktalk.owner = '13'
*/

// initial way to persist changes is loading them from the database
// *** ToDo: Remove legacy code once setup was completely changed to database

// Should there also be groups to manage users better?
// Should there be a web interface to manage users?
// In the future users is partially implemented to come from database,
// but some functions are still using this array, so it is still here
/*
users['1'] = []
users['1'].username = 'Testuser'
users['1'].password = 'Testpassword'
users['2'] = []
users['2'].username = 'Testuser1'
users['2'].password = 'Testpassword'
users['3'] = []
users['3'].username = 'Testuser2'
users['3'].password = 'Testpassword'
users['4'] = []
users['4'].username = 'Testuser3'
users['4'].password = 'Testpassword'
users['5'] = []
users['5'].username = 'Testuser4'
users['5'].password = 'Testpassword'
users['6'] = []
users['6'].username = 'Testuser5'
users['6'].password = 'Testpassword'
users['7'] = []
users['7'].username = 'Testuser6'
users['7'].password = 'Testpassword'
users['8'] = []
users['8'].username = 'Testuser7'
users['8'].password = 'Testpassword'
users['9'] = []
users['9'].username = 'Testuser8'
users['9'].password = 'Testpassword'
users['10'] = []
users['10'].username = 'Testuser9'
users['10'].password = 'Testpassword'
users['11'] = []
users['11'].username = 'Testuser10'
users['11'].password = 'Testpassword'
users['12'] = []
users['12'].username = 'Rob'
users['12'].password = 'Testpassword'
users['13'] = []
users['13'].username = 'Connor'
users['13'].password = 'Testpassword'
users['14'] = []
users['14'].username = 'Zhenyi'
users['14'].password = 'Testpassword'
users['15'] = []
users['15'].username = 'Andrea'
users['15'].password = 'Testpassword'
users['16'] = []
users['16'].username = 'Xavier'
users['16'].password = 'Testpassword'
users['17'] = []
users['17'].username = 'Ben'
users['17'].password = 'Test'
*/

// app can work as a app (e.g. user is the app)
// app can work as a user (e.g. user is the user)

const apps = [] // holds all tokens and related information for apps
// apps[atoken] = [] // information for a specific pre shared app token, always starts with an !
// apps[atoken]['time'] = 0 // holds timeout time stamp for token, 0 for no timeout
// apps[atoken]['name'] = '' // holds app name for the app
// apps[atoken]['streams'] = [] // stream ids of the stream that the app was used for
// apps[atoken]['conn'] = %Socket // control connection for the tcp control channel
// additional information
// apps[atoken]['other'] = []
/*
apps['!dfshdgs'] = []
apps['!dfshdgs'].time = 0
apps['!dfshdgs'].name = 'Test App'
apps['!dfshdgs'].streams = []
apps['!kljhkl'] = []
apps['!kljhkl'].time = 0
apps['!kljhkl'].name = 'Vive Avatar'
apps['!kljhkl'].streams = []
apps['!gfhdgh'] = []
apps['!gfhdgh'].time = 0
apps['!gfhdgh'].name = 'Hanging out on the Holodeck'
apps['!gfhdgh'].streams = []
*/

// setting root ca certificate for self signed server certificates
if (typeof config.ca !== 'undefined') {
  httpsOptions.ca = fs.readFileSync(config.ca)
}

//* ****************  Utility functions */
/**
 * generates random string of characters i.e salt
 * @function
 * @param {number} length - Length of the random string.
 */

function genRandomString(length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex') // convert to hexadecimal format
    .slice(0, length) // return required number of characters
}

/*
* hash password with sha512.
* @function
* @param {string} password - List of required fields.
* @param {string} salt - Data to be validated.
*/
function hashSha512(password, salt) {
  const hash = crypto.createHmac('sha512', salt) /** Hashing algorithm sha512 */
  hash.update(password)
  const value = hash.digest('hex')
  return {
    salt,
    passwordHash: value,
  }
}


function saltHashPassword(userpassword) {
  const salt = genRandomString(16) // Gives us salt of length 16
  const passwordData = hashSha512(userpassword, salt)
  return { password: passwordData.passwordHash, salt }
}


//* **************** Server */
async function run() {
  // setup logging

  // setup file logging of the dockerlog.js file is available
  let log
  let logErr
  if (logfile) {
    const timestamp = new Date(Date.now())
    const timestring = `${timestamp.getFullYear()}_${timestamp
      .getMonth().toString().padStart(2, '0')}_${timestamp
      .getDate().toString().padStart(2, '0')}_${timestamp
      .getHours().toString().padStart(2, '0')}_${timestamp
      .getMinutes().toString().padStart(2, '0')}_${timestamp
      .getSeconds().toString().padStart(2, '0')}`
    log = await fs.createWriteStream(`data/${timestring}_node.access.log`, { flags: 'a' })
    logErr = await fs.createWriteStream(`data/${timestring}_node.error.log`, { flags: 'a' })

    console.log(`Selecting ${timestring}_node.access.log to log.`)
  }

  const stdout = process.stdout.write
  const stderr = process.stderr.write

  function write(...args) {
    if (logstdout) stdout.apply(process.stdout, args)
    if (logfile) log.write(...args)
    const data = Buffer.from(args[0])
    const headerSize = Buffer.alloc(6)
    let header = {
      id: 'log',
      time: Date.now(),
    }
    header = JSON.stringify(header)
    header = Buffer.from(header)

    headerSize.writeUInt16LE(header.length, 0)
    headerSize.writeUInt32LE(data.length, 2)

    const packet = [headerSize, header, data]
    const message = Buffer.concat(packet)
    // eslint-disable-next-line no-use-before-define
    if (logstream) relayData(message)
  }

  function writeErr(...args) {
    if (logstdout) stderr.apply(process.stderr, args)
    if (logfile) logErr.write(...args)
    const data = Buffer.from(args[0])
    const headerSize = Buffer.alloc(6)
    let header = {
      id: 'log',
      time: Date.now(),
    }
    header = JSON.stringify(header)
    header = Buffer.from(header)

    headerSize.writeUInt16LE(header.length, 0)
    headerSize.writeUInt32LE(data.length, 2)

    const packet = [headerSize, header, data]
    const message = Buffer.concat(packet)
    // eslint-disable-next-line no-use-before-define
    if (logstream) relayData(message)
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


  // pre-setting arrays with data while we convert the server to use only the database
  let content = await knex('rooms')
    .select('roomname', 'rooms.owner_id', 'group_user.user_id')
    .leftJoin('group_room', 'room_id', '=', 'rooms.id')
    .leftJoin('group_user', 'group_room.group_id', '=', 'group_user.group_id')
    .catch((err) => console.log(err))

  const rooms = []
  for (const key in content) {
    if (key) {
      if (typeof rooms[content[key].roomname] === 'undefined') {
        rooms[content[key].roomname] = []
      }
      if (typeof rooms[content[key].roomname].users === 'undefined') {
        rooms[content[key].roomname].users = []
      }
      if (content[key].user_id !== null) {
        rooms[content[key].roomname].users.push(content[key].user_id.toString())
      }
      rooms[content[key].roomname].owner = content[key].owner_id.toString()
    }
  }

  const users = []
  content = await knex('users')
    .select('id', 'username')
    .orderBy('id')
    .catch((err) => console.log(err))
  for (const key in content) {
    if (key) {
      const { id, username } = content[key]
      users[id] = []
      users[id].username = username
    }
  }

  content = await knex('apps')
    .select('appname', 'token', 'time')
    .orderBy('id')
    .catch((err) => console.log(err))

  for (const key in content) {
    if (key) {
      const { appname } = content[key]
      const { token } = content[key]
      let { time } = content[key]

      if (time == null) time = 0
      apps[token] = []
      apps[token].time = time
      apps[token].name = appname
      apps[token].streams = []
    }
  }

  // making sure that the apps cannot be overwritten
  if (logstream) {
    source.log = []
    source.log.ip = ''
    source.log.port = 0
    source.log.proto = 'local'
    source.log.room = 'Log'
    source.log.type = 'LogStream'
    source.log.alert = false
    source.log.time = Date.now()
    source.log.from = 'LogStream'

    apps['!log'].streams.push('log')
    apps['!log'].conn = []

    streamrelay.log = []
  }


  // start application
  globalConfig.debug = false

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
    let ip
    let connectionPort

    console.log('Listing Streams')
    // console.log(tokens);
    // console.log(source);
    for (token in tokens) {
      if (token !== '') {
        console.log(`Token: ${token}, user: ${users[tokens[token].user].username}, streams: ${tokens[token].streams.toString()}, time: ${tokens[token].time}`)
      }
    }
    for (token in apps) {
      if (token) {
        console.log(`Token: ${token}, app: ${apps[token].name}, streams: ${apps[token].streams.toString()}, time: ${apps[token].time}`)
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
        console.log(`Source: ${s}, User: ${user}, IP: ${source[s].ip}:${source[s].port}, proto: ${source[s].proto}, room: ${source[s].room}, alert: ${source[s].alert}, type: ${source[s].type}, time: ${source[s].time}, from: ${source[s].from}`)
      }
    }

    for (t in target) {
      if (t) {
        console.log(`Target: ${t}, IP: ${target[t].ip}:${target[t].port}, proto: ${target[t].proto}, room: ${target[t].room}, alert: ${target[t].alert}, type: ${target[t].type}, time: ${target[t].time}`)
      }
    }
    for (sr in streamrelay) {
      if (sr) {
        for (tsr in streamrelay[sr]) if (tsr) console.log(`Relaying ${sr} -> ${tsr}`)
      }
    }

    for (ip in connections) {
      if (ip) {
        for (connectionPort in connections[ip]) {
          if (connectionPort) {
            console.log(`Connection stored for ${ip}:${connectionPort}`)
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

  function findApps(streamid) {
    let user = ''
    // eslint-disable-next-line no-shadow
    let apps
    let userApps
    let token
    if (globalConfig.debug) console.log('findApps', streamid)
    user = ''
    apps = []
    if ((typeof source[streamid] !== 'undefined') && (source[streamid].from !== '')) {
      userApps = findApps(source[streamid].from)
      if (userApps.user !== '') user = userApps.user
      if (userApps.apps.length > 0) apps = userApps.apps
    } else {
      for (token in tokens) {
        if (tokens[token].streams.includes(streamid)) {
          user = users[tokens[token].user].username
          break
        }
      }
    }
    for (token in apps) {
      if (apps[token].streams.includes(streamid)) {
        apps.push(apps[token].name)
        break
      }
    }
    return { user, apps }
  }

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
  errorList[11] = 'user already found in database'
  errorList[12] = 'group doesnt exist in the database'
  errorList[13] = 'login user doesnt have right to add user to the group'
  errorList[14] = 'user does not exist in Database'
  errorList[15] = 'password not provided'
  errorList[16] = 'logined user is not admin'

  function getErrorMessage(code) {
    const response = {}
    response.statuscode = code
    response.message = errorList[code]
    return (response)
  }

  async function checkAuth(message) {
    console.log('token: ', message.token)
    if ('token' in message) {
      // check if token is valid for a user
      const token = await knex('tokens')
        .first('user_id', 'time')
        .where('token', message.token)
        .catch((error) => {
          throw error
        })

      if ((typeof token !== 'undefined') && ((Date.now() - controlTimeout) < token.time)) return token.user_id

      // check if token is valid for an app
      const app = await knex('apps')
        .first('id', 'time')
        .where('token', message.token)
        .catch((error) => {
          throw error
        })
      if (typeof app !== 'undefined') return message.token

      return getErrorMessage(4)
    }
    return getErrorMessage(3)
  }

  // var functions = [] holds all objects for functions in use

  functions.auth = {
    info: {
      name: 'auth',
      description: 'authenticate a user',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'auth',
        },
        username: {
          description: 'User name to authenticate',
          type: 'string',
          sample: 'Testuser',
        },
        password: {
          description: 'Password for this user',
          type: 'string',
          sample: 'Testpassword',
        },
        token: {
          description: 'If no username or password are given an app can authenticate with this token otherwise it can be omitted or left empty',
          type: 'string',
          default: '',
        },
      },
      responses: {
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
        ip: {
          description: 'source IP of the client',
          type: 'string',
        },
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    process: async (message, ip, conn) => {
      let response = {}
      response.statuscode = 0
      if (('username' in message) && ('password' in message)) {
        // check password and username
        // *** ToDo: authenticate via LDAP / oAuth
        // saving function in case of rollback
        // for (var key in users) if ((users[key]['username'] === message['username'])
        //  && (users[key]['password'] === message['password'])) authenticated = key
        const user = await knex('users')
          .first('id', 'password', 'salt')
          .where('username', message.username)
          .catch((error) => {
            throw error
          })

        if ((typeof user !== 'undefined') && (hashSha512(message.password, user.salt).passwordHash === user.password)) {
          response.token = crypto.createHash('sha256')
            .update(message.username + message.password + (new Date().getTime()))
            .digest('hex')

          await knex('tokens')
            .insert({
              user_id: user.id,
              token: response.token,
              time: Date.now(),
              ip,
              //              port: conn._socket._peername.port,
            })
            .catch((error) => {
              throw error
            })

          response.ip = ip

          // *** ToDo: remove legacy token array
          tokens[response.token] = []
          tokens[response.token].time = Date.now() // timeout data
          tokens[response.token].user = user.id // holds the user id for the token
          tokens[response.token].streams = [] // provision for streams that get added
          tokens[response.token].conn = conn
          return (response)
        }
        return (getErrorMessage(4))
      }
      if ('token' in message) {
        const app = await knex('apps')
          .first('id')
          .where('token', message.token)
          .catch((error) => {
            throw error
          })
        // *** ToDo: App can only be run once, since it has only one token...
        if ((typeof app !== 'undefined')) {
          await knex('apps')
            .where({ id: app.id })
            .update({
              time: Date.now(),
              ip,
              updated_at: knex.fn.now(),
            })
            .catch((error) => {
              throw error
            })
          response.token = message.token
          response.ip = ip

          // *** ToDo: remove legacy apps array
          apps[message.token].time = Date.now() // timeout data
          apps[message.token].conn = conn
        } else return (getErrorMessage(8))
      } else {
        response = getErrorMessage(3)
        response.message += ' (username, password or token missing)'
        return (response)
      }
      return (response)
    },
  }

  functions.listfunctions = {
    info: {
      name: 'listfunctions',
      description: 'list available functions',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'array',
          options: ['listfunctions'],
          sample: 'listfunctions',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        functionlist: {
          description: 'list of functions',
          type: 'string',
          sample: Object.keys(functions),
        },
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const response = {}
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      response.statuscode = 0
      if (typeof data !== 'object') {
        response.functionlist = Object.keys(functions)
        console.log(response)
        return (response)
      }
      return (data)
    },
  }

  functions.describefunction = {
    info: {
      name: 'describefunction',
      description: 'retrieve endpoint description',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'describefunction',
        },
        functionname: {
          description: 'function to get info about',
          type: 'string',
          sample: 'listfunctions',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        description: {
          description: 'information about the function',
          type: 'string',
          sample: functions.listfunctions.info,
        },
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      let response = {}
      if (typeof data !== 'object') {
        if ('functionname' in message) {
          if (functions[message.functionname] === undefined) response = getErrorMessage(2)
          else {
            response.description = functions[message.functionname].info
            response.statuscode = 0
          }
        } else response = getErrorMessage(1)
        return (response)
      }
      return (data)
    },
  }

  functions.listworkspaces = {
    info: {
      name: 'listworkspaces',
      description: 'list existing workspaces',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'listworkspaces',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        workspacelist: {
          description: 'array of available workspaces',
          type: 'array',
          sample: [],
        },
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      // *** ToDo: list only workspaces that user has access to.
      if (typeof data !== 'object') {
        const workspaces = await knex('rooms')
          .select('roomname')
          .catch((error) => {
            throw error
          })
        const result = []
        for (const workspace in workspaces) {
          if (workspace) result.push(workspaces[workspace].roomname)
        }
        response.workspacelist = result
        response.statuscode = 0
        return (response)
      }
      return (data)
    },
  }

  functions.addworkspace = {
    info: {
      name: 'addworkspace',
      description: 'add a new workspace',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'addworkspace',
        },
        workspace: {
          description: 'name of the workspace',
          type: 'string',
          sample: 'newworkspace',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      if (typeof data === 'number') {
        if ('workspace' in message) {
          // *** ToDo: remove legacy rooms array
          if (typeof rooms[message.workspace] === 'undefined') {
            rooms[message.workspace] = []
            rooms[message.workspace].owner = data
            rooms[message.workspace].users = [data]
          }

          // *** ToDo: need to sanitize room name befor inserting to database
          const room = await knex('rooms')
            .first('id')
            .where('roomname', message.workspace)
            .catch((error) => {
              throw error
            })
          if (typeof room === 'undefined') {
            await knex('rooms').insert({ owner_id: data, roomname: message.workspace })
              .catch((error) => {
                throw error
              })
            response.statuscode = 0
            return (response)
          }
          return getErrorMessage(5)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.setdefaultworkspace = {
    info: {
      name: 'setdefaultworkspace',
      description: 'set a default workspace',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'setdefaultworkspace',
        },
        workspace: {
          description: 'name of the workspace',
          type: 'string',
          sample: 'newworkspace',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      if (typeof data === 'number') {
        if ('workspace' in message) {
          // *** ToDo: make sure we cannot set default workspace that user has no access to */
          const room = await knex('rooms')
            .first('id')
            .where('roomname', message.workspace)
            .catch((error) => {
              throw error
              // *** ToDo: throw correct error message
              // return getErrorMessage(10)
            })
          if (typeof room === 'undefined') {
            return getErrorMessage(10)
          }
          await knex('users')
            .where({ id: data })
            .update({
              room_id: room.id,
            })
            .catch((error) => {
              throw error
            })
          response.statuscode = 0
          return (response)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.getdefaultworkspace = {
    info: {
      name: 'getdefaultworkspace',
      description: 'get a default workspace',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'getdefaultworkspace',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        workspace: {
          description: 'the default workspace or empty if no default workspace is set',
          type: 'string',
          sample: 'newworkspace',
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      if (typeof data === 'number') {
        const room = await knex('users')
          .select('roomname')
          .where('users.id', '=', data)
          .leftJoin('rooms', 'room_id', '=', 'rooms.id')
          .catch((err) => console.log(err))

        if (typeof room !== 'undefined') {
          response.workspace = room[0].roomname
        } else response.workspace = ''

        response.statuscode = 0
        return (response)
      }
      return (data)
    },
  }

  functions.rmworkspace = {
    info: {
      name: 'rmworkspace',
      description: 'remove an existing workspace',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'rmworkspace',
        },
        workspace: {
          description: 'name of the workspace',
          type: 'string',
          sample: 'newworkspace',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      if (typeof data !== 'object') {
        if ('workspace' in message) {
          const room = await knex('rooms')
            .where('roomname', message.workspace)
            .del()
            .catch((error) => {
              throw error
            })
          console.log(room)
          if (typeof rooms[message.workspace] !== 'undefined') {
            // *** ToDo: make sure that existing connections to this workspace will be terminated
            // *** ToDo: remove legacy rooms array
            delete rooms[message.workspace]

            response.statuscode = 0
            return (response)
          }
          return getErrorMessage(6)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.addUser = {
    info: {
      name: 'addUser',
      description: 'add a new User',
      version: '1.0.0.1',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'addUser',
        },
        username: {
          description: 'name of the user',
          type: 'string',
          sample: 'newuser',
        },
        password: {
          description: 'password of the user',
          type: 'string',
          sample: 'password',
        },
        admin: {
          description: 'user is an admin',
          type: 'boolean',
          default: false,
        },
        first: {
          description: 'first name of the user',
          type: 'string',
          sample: 'firstname',
        },
        last: {
          description: 'last name of the user',
          type: 'string',
          sample: 'lastname',
        },
        email: {
          description: 'email of the user',
          type: 'string',
          sample: 'test@gmail.com',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      if (typeof data !== 'object') {
        const workmessage = message
        if ('username' in message) {
          // todo psspwrd with salt
          const password = saltHashPassword(workmessage.password)
          const olduser = await knex('users')
            .first('id')
            .where('username', workmessage.username)
            .catch((error) => {
              throw error
            })
          if (typeof olduser === 'undefined') {
            console.log('no old user found')
            if (typeof message.admin === 'undefined') workmessage.admin = false
            await knex('users').insert({
              // eslint-disable-next-line max-len
              username: workmessage.username, password: password.password, salt: password.salt, email: workmessage.email, first: workmessage.first, last: workmessage.last, admin: workmessage.admin,
            })
              .catch((error) => {
                throw error
              })
            response.statuscode = 0
            return (response)
          }
          return getErrorMessage(11)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.password = {
    info: {
      name: 'password',
      description: 'change password for an existing User',
      version: '1.0.0.1',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'password',
        },
        password: {
          description: 'new password of the User',
          type: 'string',
          sample: 'password',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      if (typeof data !== 'object') {
        if ('password' in message) {
          const newpassword = saltHashPassword(message.password)
          console.log(message.password)
          console.log(newpassword)
          const command = await knex('users')
            .where('id', tokens[message.token].user)
            .update({ password: newpassword.password, salt: newpassword.salt })
            .catch((error) => {
              throw error
            })
          console.log(command)

          response.statuscode = 0
          return (response)
        }
        return getErrorMessage(15)
      }
      return (data)
    },
  }

  functions.rmuser = {
    info: {
      name: 'rmuser',
      description: 'remove an existing User',
      version: '1.0.0.1',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'rmuser',
        },
        username: {
          description: 'name of the User',
          type: 'string',
          sample: 'newuser',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      if (typeof data !== 'object') {
        if ('username' in message) {
          console.log('Removing User:', message.username)
          const command = await knex('users')
            .where('username', message.username)
            .del()
            .catch((error) => {
              throw error
            })
          console.log(command)

          response.statuscode = 0
          return (response)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.listusers = {
    info: {
      name: 'listusers',
      description: 'list existing users',
      version: '1.0.0.0',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'listusers',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        userlist: {
          description: 'array of available users',
          type: 'array',
          sample: [],
        },
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      // *** ToDo: list only users in DB.
      if (typeof data !== 'object') {
        const userList = await knex('users')
          .select('username')
          .catch((error) => {
            throw error
          })
        const result = []
        for (const usr in userList) {
          if (usr) result.push(userList[usr].username)
        }
        response.userlist = result
        response.statuscode = 0
        return (response)
      }
      return (data)
    },
  }

  // group functions  :

  functions.addgroup = {
    info: {
      name: 'addgroup ',
      description: 'add a new Group',
      version: '1.0.0.1',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'addgroup',
        },
        group: {
          description: 'name of the new Group',
          type: 'string',
          sample: 'group',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      if (typeof data !== 'object') {
        if ('group' in message) {
          const oldGroup = await knex('groups')
            .first('id')
            .where('groupname', message.group)
            .catch((error) => {
              throw error
            })
          if (typeof oldGroup === 'undefined') {
            console.log('no old user found')
            await knex('groups').insert({
              owner_id: tokens[message.token].user, groupname: message.group,
            })
              .catch((error) => {
                throw error
              })
            response.statuscode = 0
            return (response)
          }
          return getErrorMessage(5)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.addusertogroup = {
    info: {
      name: 'addusertogroup ',
      description: 'add a user to a Group',
      version: '1.0.0.0',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'addusertogroup',
        },
        group: {
          description: 'name of the  Group',
          type: 'string',
          sample: 'group',
        },
        user: {
          description: 'name user attached to the Group',
          type: 'string',
          sample: 'admin',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      // ToDo: what happens when the message is an app?
      if (typeof data !== 'object') {
        if ('group' in message) {
          const oldGroup = await knex('groups')
            .first('id', 'owner_id')
            .where('groupname', message.group)
            .catch((error) => {
              throw error
            })

          if (typeof oldGroup !== 'undefined') {
            console.log('group found')
            console.log(oldGroup)
            const olduser = await knex('users')
              .first('id')
              .where('username', message.user)
              .catch((error) => {
                throw error
              })
            if (typeof olduser !== 'undefined') {
              const admin = await knex('users')
                .first('admin')
                // ToDo: you can just use data instead of tokens[message.token].user, it has the user id in it, also token could be an app token
                .where('id', tokens[message.token].user)
                .catch((error) => {
                  throw error
                })
              console.log('owner details')
              console.log(admin)
              // ToDo: you can just use data instead of tokens[message.token].user, it has the user id in it, also token could be an app token
              if ((oldGroup.owner_id === tokens[message.token].user) || (admin.admin === 1)) {
                console.log('login user is either the admin or owner')

                await knex('group_user').insert({
                  owner_id: tokens[message.token].user, group_id: oldGroup.id, user_id: olduser.id,
                })
                  .catch((error) => {
                    throw error
                  })
                response.statuscode = 0
                return (response)
              }
              return getErrorMessage(13)
            }
            return getErrorMessage(14)
          }
          return getErrorMessage(12)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.rmusertogroup = {
    info: {
      name: 'rmusertogroup ',
      description: 'add a user to a Group',
      version: '1.0.0.0',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'rmusertogroup',
        },
        group: {
          description: 'name of the Group',
          type: 'string',
          sample: 'group',
        },
        user: {
          description: ' user that need to remove from that Group',
          type: 'string',
          sample: 'admin',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      if (typeof data !== 'object') {
        if ('group' in message) {
          const oldGroup = await knex('groups')
            .first('id', 'owner_id')
            .where('groupname', message.group)
            .catch((error) => {
              throw error
            })

          if (typeof oldGroup !== 'undefined') {
            console.log('group found')
            console.log(oldGroup)
            const olduser = await knex('users')
              .first('id')
              .where('username', message.user)
              .catch((error) => {
                throw error
              })
            if (typeof olduser !== 'undefined') {
              const admin = await knex('users')
                .first('admin')
                .where('id', tokens[message.token].user)
                .catch((error) => {
                  throw error
                })
              console.log('owner details')
              console.log(admin)
              if ((oldGroup.owner_id === tokens[message.token].user) || (admin.admin === 1)) {
                console.log('login user is either the admin or owner')
                const command = await knex('group_user')
                  .where('user_id', olduser.id).where('group_id', oldGroup.id)
                  .del()
                  .catch((error) => {
                    throw error
                  })
                console.log(command)
                response.statuscode = 0
                return (response)
              }
              return getErrorMessage(13)
            }
            return getErrorMessage(14)
          }
          return getErrorMessage(12)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.changeowner = {
    info: {
      name: 'changeowner',
      description: 'change an existing Group ownership',
      version: '1.0.0.0',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'changeowner',
        },
        group: {
          description: 'name of the Group',
          type: 'string',
          sample: 'group',
        },
        username: {
          description: 'name of the new owner',
          type: 'string',
          sample: 'newuser',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      if (typeof data !== 'object') {
        if ('group' in message) {
          const admin = await knex('users')
            .first('admin')
            .where('id', tokens[message.token].user)
            .catch((error) => {
              throw error
            })
          console.log(admin)
          if (admin.admin === 1) {
            const owner = await knex('users')
              .first('id')
              .where('username', message.user)
              .catch((error) => {
                throw error
              })
            const command = await knex('groups')
              .where('groupname', message.group)
              .update('owner_id', owner.id)
              .catch((error) => {
                throw error
              })
            console.log(command)
            response.statuscode = 0
            return (response)
          }
          return getErrorMessage(16)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }


  functions.rmgroup = {
    info: {
      name: 'rmgroup',
      description: 'remove an existing Group',
      version: '1.0.0.0',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'rmgroup',
        },
        group: {
          description: 'name of the Group',
          type: 'string',
          sample: 'group',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      if (typeof data !== 'object') {
        if ('group' in message) {
          console.log(message.rmGroup)
          const command = await knex('groups')
            .where('groupname', message.group)
            .del()
            .catch((error) => {
              throw error
            })
          console.log(command)
          response.statuscode = 0
          return (response)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.listgroups = {
    info: {
      name: 'listgroups',
      description: 'list existing Group',
      version: '1.0.0.1',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'listgroups',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        listGroup: {
          description: 'array of available Group',
          type: 'array',
          sample: [],
        },
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      const response = {}
      // *** ToDo: list only users in DB.
      if (typeof data !== 'object') {
        const listGroup = await knex('groups')
          .select('groupname')
          .catch((error) => {
            throw error
          })
        const result = []
        for (const grp in listGroup) {
          if (grp) result.push(listGroup[grp].groupname)
        }
        response.listGroups = result
        response.statuscode = 0
        return (response)
      }
      return (data)
    },
  }


  functions.sender = {
    info: {
      name: 'sender',
      description: 'register a new stream as sender',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'sender',
        },
        workspace: {
          description: 'name of the workspace',
          type: 'string',
          sample: 'Holodeck',
        },
        senderid: {
          description: 'if one wishes to update a stream, set the existing streamid',
          type: 'string',
          default: '',
        },
        from: {
          description: 'apps can set a corresponding stream this data came from',
          type: 'string',
          default: '',
        },
        proto: {
          description: 'Protocol for the stream to use (udp/tcp/ws)',
          type: 'string',
          sample: 'udp',
        },
        ip: {
          description: 'IP address from which the connection will be made',
          type: 'string',
        },
        port: {
          description: 'Port from which the connection will be made',
          type: 'string',
        },
        type: {
          description: 'Set the type of stream (e.g. 3d, audio)',
          type: 'string',
          sample: '3d',
        },
        alert: {
          description: 'alerts the client if a new receiver subscribes to this stream',
          default: false,
          type: 'boolen',
        },
        meta: {
          description: 'custom metadata specific to this stream to send to receivers',
          type: 'string',
          default: '',
        },
        token: {
          description: 'Token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        streamid: {
          description: 'ID of the new stream',
          type: 'string',
        },
        port: {
          description: 'Port to which the connection will be made',
          type: 'string',
        },
        MTU: {
          description: 'Size of the MTU incl. header. 0 is unlimited',
          type: 'string',
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      let i
      let streamid
      let token
      const response = {}
      if (typeof data !== 'object') {
        console.log('*** sender ***')
        if (('workspace' in message) && ('proto' in message) && ('type' in message) && ((message.proto === 'udp') || (message.proto === 'tcp') || (message.proto === 'ws'))) {
          if (('senderid' in message) && (message.senderid !== '') && (typeof source[message.senderid] !== 'undefined')) {
            streamid = message.senderid
            console.log(`used existing sender streamid: ${streamid}`)
          } else {
            streamid = null
            while ((streamid === null) || (typeof source[streamid] !== 'undefined')) {
              streamid = crypto.createHash('sha256')
                .update(message.workspace + message.proto + (new Date().getTime()))
                .digest('hex').substr(0, 7)
            }
            console.log(`created new sender streamid: ${streamid}`)
            streamrelay[streamid] = []
          }
          if ((typeof source[streamid] === 'undefined')
                      || (typeof source[streamid].conn === 'undefined')
                      || (typeof source[streamid].conn.readyState === 'undefined')
                      || (source[streamid].conn.readyState !== 1)) {
            source[streamid] = []
            source[streamid].ip = message.ip
            source[streamid].port = message.port
            source[streamid].proto = message.proto
            source[streamid].room = message.workspace
            source[streamid].type = message.type
            source[streamid].time = Date.now()
            source[streamid].from = ''

            // allow from only if app token, otherwise users could post as another user
            if ((typeof message.from !== 'undefined')
                      && (typeof apps[message.token] !== 'undefined')) source[streamid].from = message.from

            if (('alert' in message) && (message.alert === true)) source[streamid].alert = true
            else source[streamid].alert = false

            source[streamid].meta = ''
            if (typeof message.meta !== 'undefined') source[streamid].meta = message.meta
          }

          // if exists, remove streamid from streams in this tokens streamlist
          for (token in tokens) {
            if (token) {
              for (i in tokens[token].streams) {
                if (tokens[token].streams[i] === streamid) tokens[token].streams.splice(i, 1)
              }
            }
          }

          // if exists, remove streamid from streams in this apps streamlist
          for (token in apps) {
            if (token) {
              for (i in apps[token].streams) {
                if (apps[token].streams[i] === streamid) apps[token].streams.splice(i, 1)
              }
            }
          }

          // make sure stream is allowed and not rejected
          if (typeof tokens[message.token] !== 'undefined') tokens[message.token].streams.push(streamid)

          // make sure stream is allowed and not rejected in case of an app
          if (typeof apps[message.token] !== 'undefined') apps[message.token].streams.push(streamid)

          if (!(('senderid' in message) && (message.senderid !== '') && (typeof source[message.senderid] !== 'undefined'))) {
            serverfunctions.update.process(streamid)
          }

          response.statuscode = 0
          response.port = port[message.proto]
          response.streamid = streamid
          response.MTU = MTU
          return (response)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.listStreams = {
    info: {
      name: 'listStreams',
      description: 'list existing stream',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'listStreams',
        },
        workspaces: {
          description: 'Name of the workspace (or an array thereof) see the streams of. Leave empty or omit to search all workspaces.',
          type: 'array',
          default: [],
          sample: ['Holodeck'],
        },
        types: {
          description: 'Restict listing to a particular type of stream (e.g. 3d, audio). If the parameter is omitted all stream types will be listed',
          type: 'array',
          default: [],
          sample: ['3d'],
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        senderList: {
          description: 'array of streamid/user/apps/type/meta/workspace of the streams that will be sent',
          type: 'array',
        },
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })

      console.log('*** listStreams ***')
      const response = {}
      let workspace
      const streamlistelement = {}
      let userApps
      const workmessage = message
      if (typeof data !== 'object') {
        if (!('workspaces' in workmessage)) workmessage.workspaces = []

        if (typeof workmessage.workspaces === 'string') workmessage.workspaces = [workmessage.workspaces]
        if (!Array.isArray(workmessage.workspaces)) workmessage.workspaces = []

        // limit to rooms a user has access to
        let userWorkspace = await knex('group_user')
          .select('rooms.roomname')
          .join('group_room', 'group_user.group_id', '=', 'group_room.group_id')
          .join('rooms', 'group_room.room_id', '=', 'rooms.id')
          .where('user_id', '=', data)
          .catch((error) => {
            throw error
          })
        userWorkspace.forEach((value, key) => { userWorkspace[key] = value.roomname })

        if (workmessage.workspaces.length > 0) {
          for (workspace in userWorkspace) {
            if (!workmessage.workspaces.includes(userWorkspace[workspace])) {
              delete userWorkspace[workspace]
            }
          }
          userWorkspace = userWorkspace.filter((value) => value)
        }

        if (typeof workmessage.types === 'string') workmessage.types = [workmessage.types]
        if (!Array.isArray(workmessage.types)) workmessage.types = []

        response.senderList = []
        for (workspace in userWorkspace) {
          if (workspace) {
            for (const key in source) {
              if (source[key].room === userWorkspace[workspace]) {
                if ((workmessage.types.length === 0) || (workmessage.types.includes(source[key].type))) {
                  streamlistelement.streamid = key
                  // add usernames and app names to the specific streams
                  userApps = findApps(streamlistelement.streamid)
                  streamlistelement.user = userApps.user
                  streamlistelement.apps = userApps.apps
                  streamlistelement.type = source[key].type
                  streamlistelement.meta = source[key].meta
                  streamlistelement.workspace = source[key].room
                  response.senderList.push({ ...streamlistelement })
                }
              }
            }
          }
        }
        response.statuscode = 0
        return (response)
      }
      return (data)
    },
  }


  functions.streaminfo = {
    info: {
      name: 'streaminfo',
      description: 'get information about a stream',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'streaminfo',
        },
        streamid: {
          description: 'ID of the stream to get information about',
          type: 'string',
          sample: '$$sender.streamid',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        info: {
          description: 'information about the stream(streamid/user/apps/type/meta/workspace)',
          type: 'object',
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      let streamid
      let response
      let token
      let key
      if (typeof data !== 'object') {
        if (('streamid' in message) && ((typeof source[message.streamid] !== 'undefined') || (typeof target[message.streamid] !== 'undefined'))) {
          streamid = message.streamid
          response = {}
          response.statuscode = 0
          response.info = {}

          for (token in tokens) {
            if (token) {
              for (key in tokens[token].streams) {
                if (tokens[token].streams[key] === streamid) {
                  response.info.user = users[tokens[token].user].username
                  break
                }
              }
            }
          }
          for (token in apps) {
            if (token) {
              for (key in apps[token].streams) {
                if (apps[token].streams[key] === streamid) {
                  response.info.apps = apps[token].name
                  break
                }
              }
            }
          }
          if (typeof source[streamid] !== 'undefined') {
            response.info.proto = source[streamid].proto
            response.info.workspace = source[streamid].room
            response.info.type = source[streamid].type
            response.info.MTU = MTU
            if (typeof response.info.port !== 'undefined') response.info.port = source[streamid].port
            if (typeof response.info.ip !== 'undefined') response.info.ip = source[streamid].ip
            response.info.meta = source[streamid].meta
            response.info.direction = 'source'
          }
          if (typeof target[streamid] !== 'undefined') {
            response.info.proto = target[streamid].proto
            response.info.workspace = target[streamid].room
            response.info.type = target[streamid].type
            response.info.MTU = MTU
            if (typeof response.info.port !== 'undefined') response.info.port = target[streamid].port
            if (typeof response.info.ip !== 'undefined') response.info.ip = target[streamid].ip
            response.info.direction = 'target'
          }
          return (response)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.receiver = {
    info: {
      name: 'receiver',
      description: 'register a new stream as receiver',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'receiver',
        },
        workspace: {
          description: 'name of the workspace',
          type: 'string',
          sample: 'Holodeck',
        },
        receiverid: {
          description: 'if one wishes to update a stream, set the existing streamid',
          type: 'string',
          default: '',
        },
        streamids: {
          description: 'array of stream IDs to receive. if the argument is omitted all streams of a type will be sent.',
          type: 'array',
          default: [],
        },
        proto: {
          description: 'Protocol for the stream to use (udp/tcp/ws)',
          type: 'string',
          default: 'udp',
          sample: 'udp',
        },
        type: {
          description: 'Restict reception to a particular type of stream (e.g. 3d, audio). An empty array or ommiting the value will receive all streams.',
          type: 'array',
          default: [],
          sample: ['3d'],
        },
        alert: {
          description: 'alerts the client if a new stream of this type is created',
          default: false,
          type: 'boolen',
        },
        echo: {
          description: 'recevies streams of the same user if true',
          default: false,
          type: 'boolen',
        },
        ip: {
          description: 'IP address from which the connection will be made',
          type: 'string',
        },
        port: {
          description: 'Port from which the connection will be made',
          type: 'string',
        },
        meta: {
          description: 'custom metadata specific to this stream to send to senders',
          type: 'string',
          default: '',
        },
        token: {
          description: 'token for the user or app to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        streamid: {
          description: 'new streamid that designates the receiver',
          type: 'string',
        },
        streamlist: {
          description: 'array of streamid/user/apps [array of app names]/type/meta of the streams that will be sent',
          type: 'array',
        },
        /* *** ToDo: IP is not returned at the moment, because the detection of
              the localhost IP is not working perfectly.
              It will be important for load balanced connections with several masters.

              'ip': {
                  'description': 'IP to which the connection will be made',
                  'type':'string',
              },
  */
        port: {
          description: 'Port to which the connection will be made',
          type: 'string',
        },
        proto: {
          description: 'Protocol for the stream to use (udp/tcp/ws)',
          type: 'string',
          sample: 'udp',
        },
        MTU: {
          description: 'Size of the MTU incl. header. 0 is unlimited',
          type: 'integer',
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      let sourceid
      let stream
      let streamlistelement = {}
      let userApps
      let streamid
      let token
      let i
      let response = {}
      const workmessage = message

      if (typeof data !== 'object') {
        console.log('*** receiver ***')
        if (('workspace' in workmessage)) {
          // if(('receiverid' in message) && (message['receiverid']!='')
          //         && (typeof target[message['receiverid']]!='undefined'))
          // process.exit();

          // get appropriate streamids
          if (!('streamids' in workmessage) || (workmessage.streamids.length === 0)) {
            workmessage.streamids = []
            for (sourceid in source) if (!('type' in workmessage) || (workmessage.type.length === 0) || (workmessage.type.includes(source[sourceid].type))) workmessage.streamids.push(sourceid)
          }

          // remove all streamids that are not in source (we silently drop
          // streamID's in case they have disappeared during the time it takes to
          // query and bring them up...)
          for (stream in workmessage.streamids) {
            if (typeof source[workmessage.streamids[stream]] === 'undefined') workmessage.streamids.splice(stream, 1)
          }
          // add usernames to the specific streams
          workmessage.streamlist = []
          for (stream in message.streamids) {
            if (stream) {
              streamlistelement = {}
              streamlistelement.streamid = workmessage.streamids[stream]
              streamlistelement.type = source[workmessage.streamids[stream]].type
              streamlistelement.meta = source[workmessage.streamids[stream]].meta

              // add apps processing list for streams that are processed, otherwise leave empty
              // walk through source from tags until we find user, add apps and user
              userApps = findApps(workmessage.streamids[stream])
              streamlistelement.user = userApps.user
              streamlistelement.apps = userApps.apps

              // receive streams of the same user if echo is enabled
              if (((typeof tokens[workmessage.token] !== 'undefined')
                  && (users[tokens[workmessage.token].user].username !== streamlistelement.user)
                  && ((!('echo' in workmessage)) || (('echo' in workmessage) && (workmessage.echo !== true))))
                  || (('echo' in workmessage) && (workmessage.echo === true))
                  || ((typeof apps[workmessage.token] !== 'undefined')
                  && ((!('echo' in workmessage)) || (('echo' in workmessage) && (workmessage.echo !== true))))) {
                workmessage.streamlist.push(streamlistelement)
              } else console.log(`skipping stream from same user ${workmessage.streamids[stream]}`)
            }
          }

          // give error message if we dont have a streamid and are also not
          // expecting updates on streams
          // var t =  typeof message['alert'] !== 'undefined';
          if ((workmessage.streamids.length < 1) && ((typeof workmessage.alert === 'undefined')
              || !((typeof workmessage.alert !== 'undefined') && (workmessage.alert === true)))) {
            // console.log(message);
            return getErrorMessage(7)
          }

          if (('receiverid' in workmessage) && (workmessage.receiverid !== '') && (typeof target[workmessage.receiverid] !== 'undefined')) {
            streamid = workmessage.receiverid
            console.log(`used existing receiver streamid: ${streamid}`)
            // console.log(target[streamid]);
          } else {
            // create a new target streamID
            streamid = null
            while ((streamid === null) || (typeof target[streamid] !== 'undefined')) {
              streamid = crypto.createHash('sha256')
                .update(workmessage.workspace + workmessage.proto + (new Date().getTime()))
                .digest('hex').substr(0, 7)
            }
            console.log(`created new receiver streamid: ${streamid}`)
          }

          if ((typeof target[streamid] === 'undefined')
                        || ((target[streamid].proto === 'ws')
                      && ((typeof target[streamid].conn === 'undefined')
                        || (typeof target[streamid].conn.readyState === 'undefined')
                        || (target[streamid].conn.readyState !== 1)))
                      || ((target[streamid].proto === 'udp')
                        && (target[streamid].port === 0))
                      || ((target[streamid].proto === 'tcp')
                        && (target[streamid].port === 0))) {
            // put data into the target stream array & overwrite if existing
            target[streamid] = []
            target[streamid].ip = workmessage.ip
            target[streamid].port = workmessage.port
            target[streamid].proto = workmessage.proto
            target[streamid].room = workmessage.workspace
            // console.log(target[streamid]);

            if (('alert' in workmessage) && (workmessage.alert === true)) target[streamid].alert = true
            else target[streamid].alert = false

            if (('echo' in workmessage) && (workmessage.echo === true)) target[streamid].echo = true
            else target[streamid].echo = false

            if ('type' in workmessage) target[streamid].type = workmessage.type
            else target[streamid].type = []

            target[streamid].meta = ''
            if (typeof workmessage.meta !== 'undefined') target[streamid].meta = workmessage.meta

            target[streamid].time = Date.now()
          }

          // if exists, remove streamid from streams in this tokens streamlist
          for (token in tokens) {
            if (token) {
              for (i in tokens[token].streams) {
                if (tokens[token].streams[i] === streamid) tokens[token].streams.splice(i, 1)
              }
            }
          }

          // if exists, remove streamid from streams in this apps streamlist
          for (token in apps) {
            if (token) {
              for (i in apps[token].streams) {
                if (apps[token].streams[i] === streamid) apps[token].streams.splice(i, 1)
              }
            }
          }

          // make sure stream is allowed and not rejected
          if (typeof tokens[workmessage.token] !== 'undefined') tokens[workmessage.token].streams.push(streamid)

          // make sure stream is allowed and not rejected in case of an app
          if (typeof apps[workmessage.token] !== 'undefined') apps[workmessage.token].streams.push(streamid)

          // designate streams to be directly relayed ot this target
          for (stream in workmessage.streamlist) {
            if (stream) {
              // send subscriber message to sender streams that are newly subscribed to
              if (typeof streamrelay[workmessage.streamlist[stream].streamid] !== 'undefined') {
                console.log('line 2270', stream)
                console.log('line 2271', workmessage.streamlist[stream])
                console.log('line 2272', streamrelay[workmessage.streamlist[stream].streamid])
                if (typeof streamrelay[workmessage.streamlist[stream].streamid][streamid] === 'undefined') {
                  // eslint-disable-next-line max-len
                  serverfunctions.subscriber.process(workmessage.streamlist[stream].streamid, streamid)
                }
                streamrelay[workmessage.streamlist[stream].streamid][streamid] = []
              }
            }
          }

          // create result for client to connect as a receiver
          response = {}
          response.statuscode = 0
          response.port = port[message.proto]
          response.proto = message.proto
          response.streamid = streamid
          response.streamlist = message.streamlist
          response.MTU = MTU
          // console.log(message['proto'],port[message['proto']],response);
          // console.log(port);
          return (response)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.subscribe = {
    info: {
      name: 'subscribe',
      description: 'subscribe additional streams to an existing receiver',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'subscribe',
        },
        receiverid: {
          description: 'set the existing receiver streamid',
          type: 'string',
          sample: '$$receiver.streamid',
        },
        streamid: {
          description: 'array of stream IDs to receive. new streams will be added to existing already subscribed streams.',
          type: 'array',
          default: [],
          sample: ['$$sender.streamid'],
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        streamlist: {
          description: 'array of streamid/user/apps/type/meta of the streams that will be sent',
          type: 'array',
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      let sourceid
      let s
      let t
      let stream
      let streamlistelement = {}
      let userApps
      // create result for client to connect as a receiver
      let response = {}
      const workmessage = message

      // *** ToDo: Only allow user to get streams with correct access permissions */

      if (typeof data !== 'object') {
        console.log('*** subscribe ***')
        if ((('receiverid' in workmessage) && (workmessage.receiverid !== '') && (typeof target[workmessage.receiverid] !== 'undefined'))) {
          // get all streamids if no list is given
          if (!('streamid' in workmessage) || (workmessage.streamid.length === 0)) {
            workmessage.streamid = []
            for (sourceid in source) {
              if (!('type' in workmessage) || (workmessage.type.length === 0) || (workmessage.type.includes(source[sourceid].type))) workmessage.streamid.push(sourceid)
            }
          }


          // add the already subscribed streams
          for (s in streamrelay) {
            if (s) {
              for (t in streamrelay[s]) {
                if ((t === workmessage.receiverid) && (!workmessage.streamid.includes(s))) {
                  workmessage.streamid.push(s)
                }
              }
            }
          }

          // remove all streamids that are not in source (we silently drop
          // streamID's in case they have disappeared during the time it takes
          // to query and bring them up...)
          for (stream in workmessage.streamid) {
            if (!(workmessage.streamid[stream] in source)) {
              workmessage.streamid.splice(stream, 1)
            }
          }

          // add usernames to the specific streams
          workmessage.streamlist = []
          for (stream in workmessage.streamid) {
            if (stream) {
              streamlistelement = {}
              streamlistelement.streamid = workmessage.streamid[stream]
              streamlistelement.type = source[workmessage.streamid[stream]].type
              streamlistelement.meta = source[workmessage.streamid[stream]].meta

              // add apps processing list for streams that are processed, otherwise leave empty
              // walk through source from tags until we find user, add apps and user
              userApps = findApps(workmessage.streamid[stream])
              streamlistelement.user = userApps.user
              streamlistelement.apps = userApps.apps

              workmessage.streamlist.push(streamlistelement)
            }
          }

          // designate streams to be directly relayed ot this target
          for (stream in workmessage.streamlist) {
            if (stream) {
              // send subscriber message to sender streams that are newly subscribed to
              if (typeof streamrelay[workmessage.streamlist[stream].streamid][workmessage.receiverid] === 'undefined') serverfunctions.subscriber.process(workmessage.streamlist[stream].streamid, message.receiverid)
              streamrelay[workmessage.streamlist[stream].streamid][workmessage.receiverid] = []
            }
          }

          // create result for client to connect as a receiver
          response = {}
          response.statuscode = 0
          response.streamlist = workmessage.streamlist
          if (globalConfig.debug) console.log(response)
          return (response)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.unsubscribe = {
    info: {
      name: 'unsubscribe',
      description: 'unsubscribe streams from an existing receiver',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'unsubscribe',
        },
        receiverid: {
          description: 'set the existing receiver streamid',
          type: 'string',
          sample: '$$receiver.streamid',
        },
        streamid: {
          description: 'array of stream IDs to unsubscribe.',
          type: 'array',
          sample: ['$$sender.streamid'],
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        streamlist: {
          description: 'array of streamid of the streams that were deleted',
          type: 'array',
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      let s
      let t
      let response = {}
      const workmessage = message
      if (typeof data !== 'object') {
        console.log('*** unsubscribe ***')
        if ((('receiverid' in workmessage) && (workmessage.receiverid !== '') && (typeof target[workmessage.receiverid] !== 'undefined'))
                  && (('streamid' in workmessage) && (workmessage.streamid.length > 0))) {
          // unsubscribe streams
          workmessage.streamlist = []
          for (s in streamrelay) {
            if (s) {
              for (t in streamrelay[s]) {
                if ((t === workmessage.receiverid) && (workmessage.streamid.includes(s))) {
                  workmessage.streamlist.push(s)
                  delete streamrelay[s][t]
                  // send dropped message to sender streams to inform them
                  // the receiver stopped requesting that stream.
                  serverfunctions.dropped.process(s, t)
                  if (Object.keys(streamrelay[s]).length === 0) delete streamrelay[s]
                }
              }
            }
          }

          // create result with the list of all removed streams
          response = {}
          response.statuscode = 0
          response.streamlist = workmessage.streamlist
          return (response)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.setConfig = {
    info: {
      name: 'setParameter',
      description: 'set a server parameter',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'setConfig',
        },
        config: {
          description: 'the parameter that should be set',
          type: 'string',
          sample: 'debug',
        },
        context: {
          description: 'context that this cofiguration applies to global (server global settings), profile (global user specific settings), app (app global settings), or private (app user specific settings), if omitted or empty it is a global configuration parameter',
          type: 'string',
          default: 'global',
        },
        app: {
          description: 'an app name that this cofiguration applies to, can be omitted or empty for global or profile configuration parameters',
          type: 'string',
          default: '',
        },
        user: {
          description: 'an user name that this cofiguration applies to, can be omitted or empty for global or app configuration parameters, only an admin can set this parameter, otherwise the logged in username will be taken.',
          type: 'string',
          default: '',
        },
        value: {
          description: 'value to apply to the parameter, all parameters are stored as strings, but are applied in the defined type',
          type: 'string',
          sample: 'true',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      if (typeof data !== 'object') {
        console.log('*** setGlobalSetting ***')
        const workmessage = message

        let admin
        if (typeof data === 'number') {
          // check if user
          admin = await knex('users')
            .first('admin')
            .where('id', data)
            .catch((error) => {
              throw error
            })
          if (admin.admin) {
            switch (workmessage.context) {
              case 'global':
                // Todo: get from database and allow only if exists in database
                // Todo: ACLs?
                switch (workmessage.type) {
                  case 'boolean':
                    // eslint-disable-next-line eqeqeq
                    if (workmessage.value == 'true') workmessage.value = true; else workmessage.value = false
                    break
                  default:
                    break
                }
                console.log(workmessage)
                console.log(workmessage.value)
                globalConfig[workmessage.config] = workmessage.value
                break
              default:
                break
            }
          }
        }
        const response = {}
        response.statuscode = 0
        return (response)
      }
      return (data)
    },
  }

  functions.disconnect = {
    info: {
      name: 'disconnect',
      description: 'disconnect a stream or several streams for the logged in user',
      version: '1.2.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'disconnect',
        },
        workspaces: {
          description: 'name of the workspace to search for source streams (an empty array indicates all workspaces), it is ignored when specific streamids are given',
          type: 'array',
          default: [],
        },
        types: {
          description: 'source stream types to search (an empty array indicates all stream types), it is ignored when specific streamids are given',
          type: 'array',
          default: [],
        },
        streamids: {
          description: 'id\'s of the streams to discard (if an empty array is given all source streams that match workspace and type will be discarded)',
          type: 'array',
          default: [],
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        streamList: {
          description: 'streams that were disconnected',
          type: 'array',
          sample: [],
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      console.log('*** disconnect ***')
      console.log('message', message)
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      let streamids = []
      let allstreams = []
      let types = []
      let workspaces = []
      let user
      let token
      let streamid
      let stream
      let streamkey
      let response


      if (typeof data !== 'object') {
        // first find all streamid's that we want to disconnect
        if ((!('streamids' in message)) || (Array.isArray(message.streamids) && (message.streamids.length === 0))) {
          // make sure we can use the types and workspaces
          if (('types' in message) && Array.isArray(message.types) && (message.types.length > 0)) types = types.concat(message.types)
          if (('types' in message) && (typeof message.types === 'string')) types.push(message.types)
          if (('workspaces' in message) && Array.isArray(message.workspaces) && (message.workspaces.length > 0)) workspaces = workspaces.concat(message.workspaces)
          if (('workspaces' in message) && (typeof message.workspaces === 'string')) workspaces.push(message.workspaces)

          // limit to rooms a user has access to
          let userWorkspace = await knex('group_user')
            .select('rooms.roomname')
            .join('group_room', 'group_user.group_id', '=', 'group_room.group_id')
            .join('rooms', 'group_room.room_id', '=', 'rooms.id')
            .where('user_id', '=', data)
            .catch((error) => {
              throw error
            })
          userWorkspace.forEach((value, key) => { userWorkspace[key] = value.roomname })

          if (workspaces.length > 0) {
            for (const workspace in userWorkspace) {
              if (!workspaces.includes(userWorkspace[workspace])) {
                delete userWorkspace[workspace]
              }
            }
            userWorkspace = userWorkspace.filter((value) => value)
          }

          workspaces = userWorkspace

          if (typeof tokens[message.token] !== 'undefined') {
            // find user for the submitted token
            user = tokens[message.token].user

            // find all streamid's for that user
            for (token in tokens) {
              if (user === tokens[token].user) {
                console.log('streams in token', tokens[token].streams)
                allstreams = allstreams.concat(tokens[token].streams)
              }
            }
            // check if streamid is in correct room and of correct type
            for (streamid in allstreams) {
              if (streamid) {
                if ((typeof source[allstreams[streamid]] !== 'undefined')
                    && (types.includes(source[allstreams[streamid]].type) || types.length === 0)
                    && (workspaces.includes(source[allstreams[streamid]].room)
                    || workspaces.length === 0)) {
                  streamids = streamids.concat([allstreams[streamid]])
                }
                if ((typeof target[allstreams[streamid]] !== 'undefined')
                    && (types.includes(target[allstreams[streamid]].type) || types.length === 0)
                    && (workspaces.includes(target[allstreams[streamid]].room)
                  || workspaces.length === 0)) streamids = streamids.concat([allstreams[streamid]])
              }
            }
          }

          // find all streamid's for that app
          if (typeof apps[message.token] !== 'undefined') {
            allstreams = apps[message.token].streams
            for (streamid in allstreams) {
              if (streamid) {
                if (globalConfig.debug) console.log('disconnect streamid', allstreams[streamid])
                // check if streamid is in correct room and of correct type
                if ((typeof source[allstreams[streamid]] !== 'undefined')
                    && (types.includes(source[allstreams[streamid]].type) || types.length === 0)
                    && (workspaces.includes(source[allstreams[streamid]].room)
                  || workspaces.length === 0)) streamids = streamids.concat([allstreams[streamid]])
                if ((typeof target[allstreams[streamid]] !== 'undefined')
                    && (types.includes(target[allstreams[streamid]].type) || types.length === 0)
                    && (workspaces.includes(target[allstreams[streamid]].room)
                  || workspaces.length === 0)) streamids = streamids.concat([allstreams[streamid]])
              }
            }
          }
        } else {
          if (Array.isArray(message.streamids)) streamids = message.streamids
          if (typeof message.streamids === 'string') streamids = [message.streamids]
        }
        response = {}
        response.statuscode = 0
        response.streamList = streamids
        for (streamkey in streamids) {
          if (streamkey) {
            streamid = streamids[streamkey]
            console.log('deleting', streamid)
            if ((typeof source[streamid] !== 'undefined') || (typeof target[streamid] !== 'undefined')) {
              console.log(`Cleaning up stream ${streamid}`)
              // *** ToDo: in addition,need to make sure that the actual connection is disconnected
              if ((typeof source[streamid] !== 'undefined')
                                && (typeof source[streamid].ip !== 'undefined')
                                && (typeof source[streamid].port !== 'undefined')) {
                if ((typeof connections[source[streamid].ip] !== 'undefined')
                                && (typeof connections[source[streamid].ip][source[streamid].port] !== 'undefined')
                                && (typeof connections[source[streamid].ip][source[streamid].port].conn !== 'undefined')) {
                  delete connections[source[streamid].ip][source[streamid].port].conn
                  delete connections[source[streamid].ip][source[streamid].port].time
                  delete connections[source[streamid].ip][source[streamid].port]
                  if (connections[source[streamid].ip].length === 0) {
                    delete connections[source[streamid].ip]
                  }
                }
                // *** ToDo: disconnect all receivers as well
                // announce to receivers that the stream is stale
                serverfunctions.stale.process(streamid)

                delete streamrelay[streamid]
                delete source[streamid]
                // *** ToDo: also delete all receivers that have only this source?
              }
            }

            // remove stream if it is a target for the stream relay
            if (typeof target[streamid] !== 'undefined') {
              for (stream in streamrelay) {
                if (streamid in streamrelay[stream]) {
                // send dropped message to senders
                  serverfunctions.dropped.process(stream, streamid)
                  delete streamrelay[stream][streamid]
                }
              }
              delete target[streamid]
            }

            // remove streams from user session list
            for (token in tokens) {
              if (tokens[token].streams.indexOf(streamid) !== -1) {
                tokens[token].streams.splice(tokens[token].streams.indexOf(streamid), 1)
              }
            }
            // remove streams from apps session list
            for (token in apps) {
              if (apps[token].streams.indexOf(streamid) !== -1) {
                apps[token].streams.splice(apps[token].streams.indexOf(streamid), 1)
              }
            }
            listStreams()
          } else return getErrorMessage(3)
        }
        return (response)
      }
      return (data)
    },
  }

  functions.expire = {
    info: {
      name: 'expire',
      description: 'expire a user session',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'expire',
        },
        token: {
          description: 'token of the user session to expire',
          type: 'string',
          default: '',
        },
      },
      responses: {
        statuscode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        message: {
          description: 'optional status message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(message) {
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })

      if (typeof data !== 'object') {
        console.log('*** expire not implemented ***')
        const response = {}
        response.statuscode = 0
        return response
        // make sure to remove all usersessions and streams,also notify clients of now stale streams

        // plugin/app tokens are not removed but all streams are expired
        /*
          var response = {};
          response['statuscode'] = 0;
          if(('username' in message) && ('password' in message)) {
              var authenticated = 0;
  // check password and username
  // *** ToDo: authenticate via LDAP / oAuth
              for(var key in users)
                  if((users[key]['username']==message['username'])
                    && (users[key]['password']==message['password']))
                      authenticated = key;
              if(authenticated!=0) {
                  response['token'] = crypto.createHash('sha256')
                      .update(message['username']+message['passwod']+(new Date().getTime()))
                      .digest('hex');
                  response['ip'] = ip;
                  tokens[response['token']] = [];
                  tokens[response['token']]['time'] = Date.now(); // timeout data

                  // holds the user id for the token
                  tokens[response['token']]['user'] = authenticated;

                  tokens[response['token']]['streams'] = [] // provision for streams that get added
                  tokens[response['token']]['conn'] = conn;
              } else
                  response = getErrorMessage(4);
          } else
              if('token' in message)
                  if(typeof apps[message['token']] !== 'undefined') {
                      response['token'] = message['token']
                      response['ip'] = ip;
                      apps[response['token']]['time'] = Date.now(); // timeout data
                      apps[response['token']]['conn'] = conn;
                  } else
                      response = getErrorMessage(8);
              else {
                  response = getErrorMessage(3);
                  response['message'] = response['message'] + ' (username or password missing)';
              }
          return(response);
  */
      }
      return getErrorMessage(3)
    },
  }

  // All server initiated functions
  serverfunctions = []
  serverfunctions.update = {
    info: {
      name: 'update',
      description: 'update a receiver with a new stream from sender',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      responses: {
        function: {
          description: 'function that was triggered',
          type: 'string',
          sample: 'update',
        },
        receiverid: {
          description: 'receiverid that matched the new sender',
          type: 'string',
          sample: 0,
        },
        streamid: {
          description: 'streamid that was updated',
          type: 'string',
          sample: 0,
        },
        user: {
          description: 'username of for the stream that is announced',
          type: 'string',
          sample: 0,
        },
        apps: {
          description: 'list of app names that have processed this stream',
          type: 'array',
          sample: 0,
        },
        type: {
          description: 'the type of the stream (e.g. 3d, audio) that was updated',
          type: 'string',
        },
        meta: {
          description: 'metadata from the sender stream',
          type: 'string',
        },
        token: {
          description: 'optional token to authenticate the message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(streamid) {
      // prep response
      const response = {}
      let update = ''
      let u
      let token

      // add apps processing list for streams that are processed, otherwise leave empty
      // walk through source from tags until we find user, add apps and user
      const userApps = findApps(streamid)
      response.function = 'update'
      response.streamid = streamid
      response.user = userApps.user
      response.apps = userApps.apps

      response.type = source[streamid].type
      response.meta = source[streamid].meta
      console.log('trying to send update ', response)
      // get correct room information
      const { room } = source[streamid]

      // get targets that requested an alert and send update
      // var t = [];
      for (u in target) {
        if (target[u].alert
            && (target[u].room === room)
            && ((target[u].type.length === 0)
            || (target[u].type.includes(source[streamid].type)))) {
          response.receiverid = u
          update = JSON.stringify(response)
          for (token in tokens) {
            if (tokens[token].streams.includes(u)) {
              if (((users[tokens[token].user].username !== response.user)
                                  && (target[u].echo !== true))
                                  || (target[u].echo === true)) {
                console.log(`updating client: ${token} : ${u}`)
                if (typeof tokens[token].conn.write === 'function') tokens[token].conn.write(update)
                if ((typeof tokens[token].conn.send === 'function') && (typeof tokens[token].conn.readyState !== 'undefined') && (tokens[token].conn.readyState === 1)) tokens[token].conn.send(update)
              } else console.log('skipping stream from same user.')
            }
          }
          for (token in apps) {
            if (apps[token].streams.includes(u)) {
              if ((!response.apps.includes(apps[token].name)
                                  && (target[u].echo !== true))
                                  || (target[u].echo === true)) {
                console.log(`updating app client: ${token} : ${u}`)
                if (typeof apps[token].conn.write === 'function') apps[token].conn.write(update)
                if ((typeof apps[token].conn.send === 'function') && (typeof apps[token].conn.readyState !== 'undefined') && (apps[token].conn.readyState === 1)) apps[token].conn.send(update)
              } else console.log('skipping stream from same app.')
            }
          }
        }
      }
    },
  }

  serverfunctions.subscriber = {
    info: {
      name: 'subscriber',
      description: 'update a sender with a new stream that subscribed',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      responses: {
        function: {
          description: 'function that was triggered',
          type: 'string',
          sample: 'subscriber',
        },
        senderid: {
          description: 'senderid that the receiver subscribed to',
          type: 'string',
          sample: 0,
        },
        receiverid: {
          description: 'receiverid that subscribed',
          type: 'string',
          sample: 0,
        },
        user: {
          description: 'username of for the stream that is subscribed',
          type: 'string',
          sample: 0,
        },
        app: {
          description: 'app name for the stream that subscribed',
          type: 'array',
          sample: 0,
        },
        meta: {
          description: 'metadata from the receiver stream',
          type: 'string',
        },
        token: {
          description: 'optional token to authenticate the message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(senderid, receiverid) {
      let token
      let usertoken
      let apptoken
      // prep response
      const response = {}
      response.function = 'subscriber'
      response.receiverid = receiverid
      response.senderid = senderid

      // get user or app name
      for (token in tokens) {
        if (token) {
          if (tokens[token].streams.includes(senderid)) {
            usertoken = token
            if (typeof response.user !== 'undefined') break
          }
          if (tokens[token].streams.includes(receiverid)) {
            response.user = users[tokens[token].user].username
            if (typeof usertoken !== 'undefined') break
          }
        }
      }


      for (token in apps) {
        if (token) {
          if (apps[token].streams.includes(senderid)) {
            apptoken = token
            if (typeof response.app !== 'undefined') break
          }
          if (apps[token].streams.includes(receiverid)) {
            response.app = apps[token].name
            if (typeof apptoken !== 'undefined') break
          }
        }
      }

      response.type = target[receiverid].type
      response.meta = target[receiverid].meta
      const update = JSON.stringify(response)
      console.log('trying to send subscriber update ', update)

      // send update to sender
      if (typeof usertoken !== 'undefined') {
        console.log(`updating sender: ${usertoken} : ${senderid}`)
        if (typeof tokens[usertoken].conn.write === 'function') {
          tokens[usertoken].conn.write(update)
          console.log('Finished subscriber update (1).')
        }
        if ((typeof tokens[usertoken].conn.send === 'function') && (typeof tokens[usertoken].conn.readyState !== 'undefined') && (tokens[usertoken].conn.readyState === 1)) {
          tokens[usertoken].conn.send(update)
          console.log('Finished subscriber update (2).')
        }
      }
      if (typeof apptoken !== 'undefined') {
        console.log(`updating app client: ${apptoken} : ${senderid}`)
        if (typeof apps[apptoken].conn.write === 'function') apps[apptoken].conn.write(update)
        if ((typeof apps[apptoken].conn.send === 'function') && (typeof apps[apptoken].conn.readyState !== 'undefined') && (apps[apptoken].conn.readyState === 1)) apps[apptoken].conn.send(update)
      }
    },
  }

  serverfunctions.stale = {
    info: {
      name: 'stale',
      description: 'identify a stream as stale',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      responses: {
        function: {
          description: 'function that was triggered',
          type: 'string',
          sample: 'stale',
        },
        streamid: {
          description: 'streamid that is stale',
          type: 'string',
          sample: 0,
        },
        token: {
          description: 'optional token to authenticate message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(streamid) {
      let u
      let token
      const response = {}
      response.function = 'stale'
      response.streamid = streamid

      const update = JSON.stringify(response)
      console.log('trying to send stale ', update)

      // get correct room information
      const { room } = source[streamid]

      // get subscribed targets and send update (only if receiver wants updates)
      // var t = [];
      for (u in target) {
        if (target[u].alert && (target[u].room === room)
            && ((target[u].type.length === 0)
            || (target[u].type.includes(source[streamid].type)))) {
          for (token in tokens) {
            if (tokens[token].streams.includes(u)) {
              if (((users[tokens[token].user].username !== response.user)
                                  && (target[u].echo !== true))
                                  || (target[u].echo === true)) {
                console.log(`updating client: ${token} : ${u}`)
                if (typeof tokens[token].conn.write === 'function') tokens[token].conn.write(update)
                if ((typeof tokens[token].conn.send === 'function') && (typeof tokens[token].conn.readyState !== 'undefined') && (tokens[token].conn.readyState === 1)) tokens[token].conn.send(update)
              } else console.log('skipping stream from same user.')
            }
          }
          for (token in apps) {
            if (apps[token].streams.includes(u)) {
              if ((!response.apps.includes(apps[token].name)
                                  && (target[u].echo !== true))
                                  || (target[u].echo === true)) {
                console.log(`updating app client: ${token} : ${u}`)
                if (typeof apps[token].conn.write === 'function') apps[token].conn.write(update)
                if ((typeof apps[token].conn.send === 'function') && (typeof apps[token].conn.readyState !== 'undefined') && (apps[token].conn.readyState === 1)) apps[token].conn.send(update)
              } else console.log('skipping stream from same app.')
            }
          }
        }
      }
    },
  }

  serverfunctions.dropped = {
    info: {
      name: 'dropped',
      description: 'identify dropped receivers that were subscribed to a sender',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      responses: {
        function: {
          description: 'function that was triggered',
          type: 'string',
          sample: 'dropped',
        },
        streamid: {
          description: 'receiverid that was dropped',
          type: 'string',
          sample: 0,
        },
        token: {
          description: 'optional token to authenticate message',
          optional: true,
          type: 'string',
        },
      },
    },
    async process(sourceid, receiverid) {
      let token
      const response = {}
      let usertoken
      let apptoken
      response.function = 'dropped'
      response.streamid = receiverid

      const update = JSON.stringify(response)
      console.log('trying to send dropped update ', update)

      // get tokens for this stream
      for (token in tokens) {
        if (tokens[token].streams.includes(sourceid)) {
          usertoken = token
          break
        }
      }
      for (token in apps) {
        if (apps[token].streams.includes(sourceid)) {
          apptoken = token
          break
        }
      }

      // send update to sender
      if (typeof usertoken !== 'undefined') {
        console.log(`updating sender: ${usertoken} : ${sourceid}`)
        if (typeof tokens[usertoken].conn.write === 'function') tokens[usertoken].conn.write(update)
        if ((typeof tokens[usertoken].conn.send === 'function') && (typeof tokens[usertoken].conn.readyState !== 'undefined') && (tokens[usertoken].conn.readyState === 1)) tokens[usertoken].conn.send(update)
      }
      if (typeof apptoken !== 'undefined') {
        console.log(`updating app client: ${apptoken} : ${sourceid}`)
        if (typeof apps[apptoken].conn.write === 'function') apps[apptoken].conn.write(update)
        if ((typeof apps[apptoken].conn.send === 'function') && (typeof apps[apptoken].conn.readyState !== 'undefined') && (apps[apptoken].conn.readyState === 1)) apps[apptoken].conn.send(update)
      }
    },
  }

  function handleControlConnection(conn) {
    let message
    if (typeof conn.remoteAddress !== 'undefined') {
      const remoteAddress = conn.remoteAddress.replace(/^.*:/, '')
      const { remotePort } = conn
      let send = ''
      // console.log('saving control connection to ' + remoteAddress + ':' + remotePort);
      // controlConnection[remoteAddress] = [];
      // controlConnection[remoteAddress][remotePort]=conn;
      // console.log(controlConnection[remoteAddress][remotePort]);

      // at this point we have a new connection that is not yet authenticated
      console.log('new client TCP control connection from %s :%s', remoteAddress, remotePort)
      conn.setNoDelay(true)
      conn.setKeepAlive(true)

      conn.on('data', async (data) => {
        console.log('TCP control connection data from %s :%j', remoteAddress, data.toString('utf8'))
        try {
          message = JSON.parse(data)
        } catch (e) {
          console.log(`Received message not a proper JSON:${data.toString()}`)
          return
        }
        if (('function' in message) && (message.function in functions)) {
          if (message.function === 'auth') send = JSON.stringify(await functions[message.function].process(message, remoteAddress, conn))
          else send = JSON.stringify(await functions[message.function].process(message))
          if ('id' in message) {
            send = JSON.parse(send)
            send.id = message.id
            send = JSON.stringify(send)
          }
          console.log(`sending:${send}`)
          conn.write(send)
        } else console.log('Key function not given or wrong.')
      })

      conn.once('close', () => {
        // *** ToDo: unset the array element for the connection
        console.log('TCP control connection from %s closed', remoteAddress)
      })

      conn.on('error', (err) => {
        // *** ToDo: unset the array element for the connection
        console.log('TCP control connection %s error: %s', remoteAddress, err.message)
      })
    }
  }

  // fill data list with available objects
  functions.listfunctions.info.responses.functionlist.sample = Object.keys(functions)
  functions.listworkspaces.info.responses.workspacelist.sample = Object.keys(rooms)

  const userlist = []
  users.forEach((user) => {
    userlist.push(user.username)
  })
  console.log('Functions: ', functions.listfunctions.info.responses.functionlist.sample)
  console.log('Server functions: ', Object.keys(serverfunctions))
  console.log('Workspaces: ', functions.listworkspaces.info.responses.workspacelist.sample)
  console.log('Users: ', userlist)
  console.log('Apps:', apps)


  // TCP control setup
  console.log(`trying to bind TCP control port ${TCPControl}`)

  const TCPControlServer = net.createServer()
  TCPControlServer.on('connection', handleControlConnection)

  TCPControlServer.listen(TCPControl, () => {
    console.log('TCP control server listening to %j:%j', TCPControlServer.address().address, TCPControlServer.address().port)
  })

  // UDP data transfer setup
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
    let headerSize
    let dataSize
    let header
    let data
    let stream
    let headerr
    let headerBuffer
    let types
    let packet
    let message
    const last = Date.now()
    let type
    let targetid
    // *** ToDo: validate that this message is ttruely a sender message that is authenticated
    // console.log(`server got from ${rinfo.address}:${rinfo.port}`);
    // decoding header
    // console.log('message: ',msg);
    if (msg.length > 6) {
      headerSize = msg.readUInt16LE(0)
      dataSize = msg.readUInt32LE(2)
      if (msg.length !== 6 + headerSize + dataSize) {
        console.log(`Packet has the wrong size (${msg.length} vs. ${6 + headerSize + dataSize}).`)
        return console.error(`Packet has the wrong size (${msg.length} vs. ${6 + headerSize + dataSize}).`)
      }
      header = msg.toString('ascii', 6, headerSize + 6)
      // var data = Buffer.allocUnsafe(dataSize);
      // msg.copy(data,0,6+headerSize);
      // console.log('header:', headerSize, '>'+header+'<');
      // console.log('data:', dataSize, data);
    } else {
      console.log('Packet is too small')
      return console.error('Packet is too small')
    }

    try {
      header = JSON.parse(header)
    } catch (e) {
      console.log(`error during parsing ${e}`)
      return console.error(e)
    }
    if (globalConfig.debug && header.id !== 'log') {
      dataSize = msg.readUInt32LE(2)
      data = Buffer.allocUnsafe(dataSize)
      msg.copy(data, 0, 6 + headerSize)
      // console.log('Receiving '+header['id']+` b${msg.length} h${headerSize} d${dataSize},
      // header:${JSON.stringify(header)}to${target[targetid]['ip']}:${target[targetid]['port']}`);
      if (header.id !== 'log') console.log(`Receiving ${header.id} b${msg.length} h${headerSize} d${dataSize}, header: ${JSON.stringify(header)} to `)
      // console.log(data)
    }
    // if we see the 'stamp' variable we will return a ping with the server stamped time
    if (('stamp' in header) && ((header.id in source) || (header.id in target))) {
      if (header.id in source) stream = source[header.id]
      else stream = target[header.id]
      dataSize = msg.readUInt32LE(2)
      data = Buffer.allocUnsafe(dataSize)
      msg.copy(data, 0, 6 + headerSize)

      header.stamp = Date.now()
      headerr = JSON.stringify(header)
      headerr = Buffer.from(headerr)

      headerBuffer = Buffer.alloc(6)
      headerBuffer.writeUInt16LE(headerr.length, 0)
      headerBuffer.writeUInt32LE(data.length, 2)

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
          stream.conn.send(message) // was strem instead of stream @abhishek
          break
        default:
          console.log('wrong stream')
      }
      if (globalConfig.debug) console.log(`sending back ${stream.proto} ping:${JSON.stringify(header)}, ip:${remoteAddress}, port${remotePort}`)
    } else if (header.id in streamrelay) { // console.log(header['id']);
      source[header.id].time = last
      for (targetid in streamrelay[header.id]) {
        if ((typeof target[targetid] !== 'undefined') && (typeof target[targetid].ip !== 'undefined') && (target[targetid].ip !== '')) {
          if ((typeof target[targetid] !== 'undefined') && (typeof target[targetid].port !== 'undefined') && (target[targetid].port !== 0)) {
            if (globalConfig.debug && header.id !== 'log') {
              console.log(`Sending ${header.id} b${msg.length} h${headerSize} d${dataSize}, header: ${JSON.stringify(header)} to ${target[targetid].ip}:${target[targetid].port}`)
              // console.log(data)
            }
            target[targetid].time = last
            if (target[targetid].proto === 'udp') {
              UDPDataServer.send(msg, target[targetid].port, target[targetid].ip, (err) => {
                if (err && (header.id !== 'log')) console.log('socket error', err)
              })
            } else if (target[targetid].proto === 'tcp') {
              if (typeof target[targetid].conn === 'undefined' && (header.id !== 'log')) console.log('!!!! tcp connection not defined, dropping packet')
              else target[targetid].conn.write(msg)
            } else if (((typeof target[targetid].conn === 'undefined') || (target[targetid].conn.readyState !== 1)) && (header.id !== 'log')) console.log('!!!! websocket connection not defined or closed, dropping packet')
            else target[targetid].conn.send(msg)
          } else if (typeof target[targetid] === 'undefined' && (header.id !== 'log')) console.log(`${targetid} is not registered at all`)
          else {
            types = ''
            for (type in target.targetid) {
              if (types === '') types = type
              else types = `${types}, ${type}`
            }
            if (header.id !== 'log') console.log(`no port for stream ${targetid} [${types}], IP:${target[targetid].ip}, Timeout:${target[targetid].time}`)
          }
        } else if (header.id !== 'log') console.log(`no ip for stream ${header.id}`)
      }
    } else if (header.id in target) {
      if (globalConfig.debug && (header.id !== 'log')) console.log(target[header.id].ip)
      console.log(`Trying to assign port and connections for ${header.id}, ${remoteAddress}:${remotePort}`)
      if (remoteAddress === target[header.id].ip) {
        // console.log(target[header.id])
        if (target[header.id].port === 0) {
          if (header.id !== 'log') console.log(`Setting target port for ${remoteAddress} to ${remotePort} protocol ${target[header.id].proto}`)
          target[header.id].port = remotePort
          if ((target[header.id].proto === 'tcp') || (target[header.id].proto === 'ws')) {
            if (header.id !== 'log') console.log(header.id, 'adding the connection')
            target[header.id].conn = connections[remoteAddress][remotePort].conn
            delete connections[remoteAddress][remotePort]
            if (connections[remoteAddress].length === 0) delete connections[remoteAddress]
          }
        }
        if (header.id !== 'log') console.log(`no port for stream ${header.id} [${types}], IP:${target[header.id].ip}, Timeout:${target[header.id].time}`)
      }
    } else if (header.id !== 'log') console.log(`StreamID (${header.id}) not authorized to send`)

    return 'relaydata end'
  }

  UDPDataServer.on('message', (msg, rinfo) => {
    relayData(msg, rinfo.address, rinfo.port)
  })

  function handleDataConnection(conn) {
    const remoteAddress = conn.remoteAddress.replace(/^.*:/, '')
    const { remotePort } = conn

    if (typeof connections[remoteAddress] === 'undefined') connections[remoteAddress] = []
    connections[remoteAddress][remotePort] = []
    connections[remoteAddress][remotePort].conn = conn
    connections[remoteAddress][remotePort].time = Date.now()

    // at this point we have a new connection that is not yet authenticated
    console.log('new TCP data connection from %s', remoteAddress)
    conn.setNoDelay(true)

    conn.on('data', (msg) => {
      relayData(msg, remoteAddress, remotePort)
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


  // WS control setup
  console.log(`trying to bind WS control port ${WSControl}`)

  const httpsControlServer = https.createServer(httpsOptions, (req, res) => {
    console.log(`${req.connection.remoteAddress} ${req.method} ${req.url}`)
    res.writeHead(200)
    res.end(`Corelink Server ${serverVersion}`)
  })
  httpsControlServer.listen(WSControl)

  const wsControlServer = new Ws({ server: httpsControlServer })

  wsControlServer.on('connection', (conn, req) => {
  // const ip = req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
    const { remoteAddress } = req.connection
    const { remotePort } = req.connection
    let send = ''
    let message
    // console.log('saving control connection to ' + remoteAddress + ':' + remotePort);
    // controlConnection[remoteAddress] = [];
    // controlConnection[remoteAddress][remotePort]=conn;
    // console.log(controlConnection[remoteAddress][remotePort]);

    // at this point we have a new connection that is not yet authenticated
    console.log('new client WS control connection from %s:%s', remoteAddress, remotePort)

    conn.on('message', async (data) => {
      console.log('WS connection control from %s: %j', remoteAddress, data.toString('utf8'))
      try {
        message = JSON.parse(data)
      } catch (e) {
        console.log(`Received message not a proper JSON:${data.toString()}`)
        return
      }
      if (('function' in message) && (message.function in functions)) {
        if (message.function === 'auth') send = JSON.stringify(await functions[message.function].process(message, remoteAddress, conn))
        else send = JSON.stringify(await functions[message.function].process(message))
        if ('id' in message) {
          send = JSON.parse(send)
          send.id = message.id
          send = JSON.stringify(send)
        }
        console.log(`sending:${send}`)
        conn.send(send)
      } else console.log('Key function not given or wrong.')
    })

    conn.once('close', () => {
      // *** ToDo: unset the array element for the connection
      console.log('WS control connection from %s closed', remoteAddress)
    })

    conn.on('error', (err) => {
      // *** ToDo: unset the array element for the connection
      console.log('WS control connection %s error: %s', remoteAddress, err.message)
    })
  })

  wsControlServer.on('listening', () => {
    const address = wsControlServer.address()
    console.log(`WS control server listening ${address.address}:${address.port}`)
  })


  // TCP data transfer setup
  console.log(`trying to bind TCP port ${port.tcp}`)


  const TCPDataServer = net.createServer()
  TCPDataServer.on('connection', handleDataConnection)

  TCPDataServer.listen(port.tcp, () => {
    console.log('TCP data server listening to %j:%j', TCPDataServer.address().address, TCPDataServer.address().port)
  })

  // WS data transfer setup
  console.log(`trying to bind WS port ${port.ws}`)

  const httpsDataServer = https.createServer(httpsOptions, (req, res) => {
    console.log(`New Request... ${req.connection.remoteAddress} ${req.method} ${req.url}`)
    res.writeHead(200)
    res.end('Corelink Data Port')
  })
  httpsDataServer.listen(port.ws)

  const WSDataServer = new Ws({ server: httpsDataServer })

  WSDataServer.on('connection', (conn, req) => {
  // const ip = req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];

    const { remoteAddress } = req.connection
    const { remotePort } = req.connection
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
    if (typeof log !== 'undefined') source.log.time = Date.now()

    let ip
    // eslint-disable-next-line no-shadow
    let port
    let token
    let id
    let sid
    let tid
    const currentTime = Date.now()
    for (ip in connections) {
      if (ip) {
        for (port in connections[ip]) {
        // console.log('connections',connections[ip][port]['time'],connectTimeout,currentTime
        //    ,connections[ip][port]['time'] + connectTimeout - currentTime);
          if (connections[ip][port].time + connectTimeout < currentTime) {
            delete connections[ip][port]
            if (connections[ip].length === 0) delete connections[ip]
          }
        }
      }
    }
    for (token in tokens) {
      if (tokens[token].time + sessionTimeout < currentTime) delete tokens[token]
    }

    // Test if sources have timed out
    for (id in source) {
      // console.log('source',id,source[id]['time'],streamTimeout,currentTime,source[id]['time']
      //    + streamTimeout - currentTime);
      if (source[id].time + streamTimeout < currentTime) {
        // notify clients of stale streams
        // streamid not defined  but used
        serverfunctions.stale.process(id)

        // remove stream information from the relay
        delete streamrelay[id]
        delete source[id]
      }
    }

    // Test if targets have timed out
    for (id in target) {
      // console.log('target',id,target[id]['time'],streamTimeout,currentTime,target[id]['time']
      //   +streamTimeout - currentTime);
      if (target[id].time + streamTimeout < currentTime) {
        for (sid in streamrelay) {
          if (sid) {
            for (tid in streamrelay) if (tid === id) delete streamrelay[sid][tid]
            if (streamrelay[sid].length === 0) delete streamrelay[sid]
          }
        }
        delete target[id]
      }
    }
    setTimeout(timeoutConnections, testTimeout)
  }
  timeoutConnections()

  // process.on('SIGINT', process.exit());
}

run()
