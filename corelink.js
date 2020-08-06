/* eslint-disable no-underscore-dangle */ // this has to be here, since other packages use it
/* eslint-disable no-restricted-syntax */

/**
 * @file NodeJS Corelink core server
 * @author Robert Pahle, Abhishek Khanna
 * @version V6.0.0.0
 */

const serverVersion = 'v6.0.0.0'
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
const knex = require('./knex/knex.js')


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
// tokens[token]['user'] = 1; // holds the user ID for the token
// tokens[token]['streams'] = []; // stream ID of the stream that the token was used for
// tokens[token]['conn'] = %Socket; // control connection for the tcp control channel
// we can expand other token information with
// tokens[token]['other'] = [];

const globalConfig = {}

const functions = [] // holds all objects for functions in use
// all receiver connections via TCP or WS

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
source[ID]['room'] = workspace name
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
target[ID]['room'] = workspace name
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

// All server initiated functions
const serverFunctions = []

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
// apps[atoken]['streams'] = [] // stream IDs of the stream that the app was used for
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


function saltHashPassword(userPassword) {
  const salt = genRandomString(16) // Gives us salt of length 16
  const passwordData = hashSha512(userPassword, salt)
  return { password: passwordData.passwordHash, salt }
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
  if (logStream) {
    source[0] = []
    source[0].IP = ''
    source[0].port = 0
    source[0].proto = 'local'
    source[0].room = 'Log'
    source[0].type = 'LogStream'
    source[0].alert = false
    source[0].time = Date.now()
    source[0].from = 'LogStream'

    apps['!log'].streams.push(0)
    apps['!log'].conn = []

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
        console.log(`Source: ${s}, User: ${user}, IP: ${source[s].IP}:${source[s].port}, proto: ${source[s].proto}, room: ${source[s].room}, alert: ${source[s].alert}, type: ${source[s].type}, time: ${source[s].time}, from: ${source[s].from}`)
      }
    }

    for (t in target) {
      if (t) {
        console.log(`Target: ${t}, IP: ${target[t].IP}:${target[t].port}, proto: ${target[t].proto}, room: ${target[t].room}, alert: ${target[t].alert}, type: ${target[t].type}, time: ${target[t].time}`)
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

  function findApps(streamID) {
    let user = ''
    // eslint-disable-next-line no-shadow
    let apps
    let userApps
    let token
    if (globalConfig.debug) console.log('findApps', streamID)
    user = ''
    apps = []
    if ((typeof source[streamID] !== 'undefined') && (source[streamID].from !== '')) {
      userApps = findApps(source[streamID].from)
      if (userApps.user !== '') user = userApps.user
      if (userApps.apps.length > 0) apps = userApps.apps
    } else {
      for (token in tokens) {
        if (tokens[token].streams.includes(streamID)) {
          user = users[tokens[token].user].username
          break
        }
      }
    }
    for (token in apps) {
      if (apps[token].streams.includes(streamID)) {
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
      version: '1.0.1.0',
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
        IP: {
          description: 'source IP of the client',
          type: 'string',
        },
        statusCode: {
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
    process: async (message, IP, conn) => {
      let response = {}
      response.statusCode = 0
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
              IP,
              //              port: conn._socket._peername.port,
            })
            .catch((error) => {
              throw error
            })

          response.IP = IP

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
              IP,
              updated_at: knex.fn.now(),
            })
            .catch((error) => {
              throw error
            })
          response.token = message.token
          response.IP = IP

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

  functions.keepAlive = {
    info: {
      name: 'keepAlive',
      description: 'ping the server to keep alive',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'keepAlive',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statusCode: {
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
      console.log('*** keep alive ***')
      const response = {}
      const data = await checkAuth(message)
        .catch((error) => {
          throw error
        })
      response.statusCode = 0
      if (typeof data !== 'object') {
        console.log(response)
        return (response)
      }
      return (data)
    },
  }

  functions.listFunctions = {
    info: {
      name: 'listFunctions',
      description: 'list available client functions',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'listFunctions',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        functionList: {
          description: 'list of functions',
          type: 'string',
          sample: Object.keys(functions),
        },
        statusCode: {
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
      response.statusCode = 0
      if (typeof data !== 'object') {
        response.functionList = Object.keys(functions)
        console.log(response)
        return (response)
      }
      return (data)
    },
  }

  functions.listServerFunctions = {
    info: {
      name: 'listServerFunctions',
      description: 'list available server functions',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'listServerFunctions',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        functionList: {
          description: 'list of server functions',
          type: 'string',
          sample: Object.keys(serverFunctions),
        },
        statusCode: {
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
      response.statusCode = 0
      if (typeof data !== 'object') {
        response.functionList = Object.keys(serverFunctions)
        console.log(response)
        return (response)
      }
      return (data)
    },
  }

  functions.describeFunction = {
    info: {
      name: 'describeFunction',
      description: 'retrieve client initiated function description',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'describeFunction',
        },
        functionName: {
          description: 'function to get info about',
          type: 'string',
          sample: 'listFunctions',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        description: {
          description: 'information about the function',
          type: 'object',
          sample: functions.listFunctions.info,
        },
        statusCode: {
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
        if ('functionName' in message) {
          if (functions[message.functionName] === undefined) response = getErrorMessage(2)
          else {
            response.description = functions[message.functionName].info
            response.statusCode = 0
          }
        } else response = getErrorMessage(1)
        return (response)
      }
      return (data)
    },
  }

  functions.describeServerFunction = {
    info: {
      name: 'describeServerFunction',
      description: 'retrieve description of server initiated function',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'describeServerFunction',
        },
        functionName: {
          description: 'server function to get info about',
          type: 'string',
          sample: 'update',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        description: {
          description: 'information about the function',
          type: 'object',
          sample: functions.listFunctions.info,
        },
        statusCode: {
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
        if ('functionName' in message) {
          if (serverFunctions[message.functionName] === undefined) response = getErrorMessage(2)
          else {
            response.description = serverFunctions[message.functionName].info
            response.statusCode = 0
          }
        } else response = getErrorMessage(1)
        return (response)
      }
      return (data)
    },
  }

  functions.listWorkspaces = {
    info: {
      name: 'listWorkspaces',
      description: 'list existing workspaces',
      version: '1.0.1.0',
      author: 'Robert Pahle , Abhishek Khanna',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'listWorkspaces',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        workspaceList: {
          description: 'array of available workspaces',
          type: 'array',
          sample: [],
        },
        statusCode: {
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
        response.workspaceList = result
        response.statusCode = 0
        return (response)
      }
      return (data)
    },
  }

  functions.addWorkspace = {
    info: {
      name: 'addWorkspace',
      description: 'add a new workspace',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'addWorkspace',
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
        statusCode: {
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
            response.statusCode = 0
            return (response)
          }
          return getErrorMessage(5)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.setDefaultWorkspace = {
    info: {
      name: 'setDefaultWorkspace',
      description: 'set a default workspace',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'setDefaultWorkspace',
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
        statusCode: {
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
          response.statusCode = 0
          return (response)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.getDefaultWorkspace = {
    info: {
      name: 'getDefaultWorkspace',
      description: 'get a default workspace',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'getDefaultWorkspace',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statusCode: {
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

        response.statusCode = 0
        return (response)
      }
      return (data)
    },
  }

  functions.rmWorkspace = {
    info: {
      name: 'rmWorkspace',
      description: 'remove an existing workspace',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'rmWorkspace',
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
        statusCode: {
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

            response.statusCode = 0
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
      version: '1.0.0.2',
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
        statusCode: {
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
        const workMessage = message
        if ('username' in message) {
          const password = saltHashPassword(workMessage.password)
          const oldUser = await knex('users')
            .first('id')
            .where('username', workMessage.username)
            .catch((error) => {
              throw error
            })
          if (typeof oldUser === 'undefined') {
            console.log('no old user found')
            if (typeof message.admin === 'undefined') workMessage.admin = false
            await knex('users').insert({
              // eslint-disable-next-line max-len
              username: workMessage.username, password: password.password, salt: password.salt, email: workMessage.email, first: workMessage.first, last: workMessage.last, admin: workMessage.admin,
            })
              .catch((error) => {
                throw error
              })
            response.statusCode = 0
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
      version: '1.0.0.2',
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
          sample: 'Testpassword',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statusCode: {
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
          const newPassword = saltHashPassword(message.password)
          const command = await knex('users')
            .where('id', tokens[message.token].user)
            .update({ password: newPassword.password, salt: newPassword.salt })
            .catch((error) => {
              throw error
            })
          console.log(command)

          response.statusCode = 0
          return (response)
        }
        return getErrorMessage(15)
      }
      return (data)
    },
  }

  functions.rmUser = {
    info: {
      name: 'rmUser',
      description: 'remove an existing User',
      version: '1.0.0.2',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'rmUser',
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
        statusCode: {
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

          response.statusCode = 0
          return (response)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.listUsers = {
    info: {
      name: 'listUsers',
      description: 'list existing users',
      version: '1.0.0.1',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'listUsers',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        userList: {
          description: 'array of available users',
          type: 'array',
          sample: [],
        },
        statusCode: {
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
        const userList = await knex('users')
          .select('username')
          .catch((error) => {
            throw error
          })
        const result = []
        for (const usr in userList) {
          if (usr) result.push(userList[usr].username)
        }
        response.userList = result
        response.statusCode = 0
        return (response)
      }
      return (data)
    },
  }

  // group functions  :

  functions.addGroup = {
    info: {
      name: 'addGroup ',
      description: 'add a new Group',
      version: '1.0.0.2',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'addGroup',
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
        statusCode: {
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
            response.statusCode = 0
            return (response)
          }
          return getErrorMessage(5)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.addUserGroup = {
    info: {
      name: 'addUserGroup ',
      description: 'add a user to a Group',
      version: '1.0.0.1',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'addUserGroup',
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
        statusCode: {
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
            const oldUser = await knex('users')
              .first('id')
              .where('username', message.user)
              .catch((error) => {
                throw error
              })
            if (typeof oldUser !== 'undefined') {
              const admin = await knex('users')
                .first('admin')
                // ToDo: you can just use data instead of tokens[message.token].user,
                // it has the user id in it, also token could be an app token
                .where('id', tokens[message.token].user)
                .catch((error) => {
                  throw error
                })
              if ((oldGroup.owner_id === tokens[message.token].user) || (admin.admin === 1)) {
                console.log('login user is either the admin or owner')

                await knex('group_user').insert({
                  owner_id: tokens[message.token].user, group_id: oldGroup.id, user_id: oldUser.id,
                })
                  .catch((error) => {
                    throw error
                  })
                response.statusCode = 0
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

  functions.rmUserGroup = {
    info: {
      name: 'rmUserGroup ',
      description: 'remove a user to a Group',
      version: '1.0.0.1',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'rmUserGroup',
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
        statusCode: {
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
            const oldUser = await knex('users')
              .first('id')
              .where('username', message.user)
              .catch((error) => {
                throw error
              })
            if (typeof oldUser !== 'undefined') {
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
                  .where('user_id', oldUser.id).where('group_id', oldGroup.id)
                  .del()
                  .catch((error) => {
                    throw error
                  })
                console.log(command)
                response.statusCode = 0
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

  functions.changeOwner = {
    info: {
      name: 'changeOwner',
      description: 'change an existing Group ownership',
      version: '1.0.0.1',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'changeOwner',
        },
        group: {
          description: 'name of the Group',
          type: 'string',
          sample: 'group',
        },
        username: {
          description: 'name of the new owner',
          type: 'string',
          sample: 'Testuser',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statusCode: {
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
          if (admin.admin === 1) {
            const owner = await knex('users')
              .first('id')
              .where('username', message.username)
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
            response.statusCode = 0
            return (response)
          }
          return getErrorMessage(16)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }


  functions.rmGroup = {
    info: {
      name: 'rmGroup',
      description: 'remove an existing Group',
      version: '1.0.0.1',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'rmGroup',
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
        statusCode: {
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
          const command = await knex('groups')
            .where('groupname', message.group)
            .del()
            .catch((error) => {
              throw error
            })
          console.log(command)
          response.statusCode = 0
          return (response)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.listGroups = {
    info: {
      name: 'listGroups',
      description: 'list existing Group',
      version: '1.0.0.2',
      author: 'Abhishek Khanna',
      email: 'ak7907@nyu.edu',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'listGroups',
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
        statusCode: {
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
        const groupList = await knex('groups')
          .select('groupname')
          .catch((error) => {
            throw error
          })
        const result = []
        for (const grp in groupList) {
          if (grp) result.push(groupList[grp].groupname)
        }
        response.groupList = result
        response.statusCode = 0
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
        senderID: {
          description: 'if one wishes to update a stream, set the existing streamID',
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
        IP: {
          description: 'IP address from which the connection will be made (this is usually the IP one gets from the auth function)',
          type: 'string',
        },
        port: {
          description: 'Port from which the connection will be made, keep the port 0 when the client is behind a firewall.',
          type: 'string',
          default: 0,
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
        statusCode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        streamID: {
          description: 'ID of the new stream',
          type: 'string',
        },
        IP: {
          description: 'IP address to which the connection shall be made',
          type: 'string',
          optional: true,
        },
        port: {
          description: 'Port to which the connection shall be made',
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
      let streamID
      let token
      const response = {}
      if (typeof data !== 'object') {
        console.log('*** sender ***')
        if (('workspace' in message) && ('proto' in message) && ('type' in message) && ((message.proto === 'udp') || (message.proto === 'tcp') || (message.proto === 'ws'))) {
          if (('senderID' in message) && (message.senderID !== '') && (typeof source[message.senderID] !== 'undefined')) {
            streamID = message.senderID
            console.log(`used existing sender streamID: ${streamID}`)
          } else {
            streamID = null
            while ((streamID === null) || (typeof source[streamID] !== 'undefined') || (typeof target[streamID] !== 'undefined')) {
              streamID = Math.floor(Math.random() * 65535 + 1)
              // crypto.createHash('sha256')
              // .update(message.workspace + message.proto + (new Date().getTime()))
              // .digest('hex').substr(0, 7)
            }
            console.log(`created new sender streamID: ${streamID}`)
            streamRelay[streamID] = []
          }
          if ((typeof source[streamID] === 'undefined')
                      || (typeof source[streamID].conn === 'undefined')
                      || (typeof source[streamID].conn.readyState === 'undefined')
                      || (source[streamID].conn.readyState !== 1)) {
            source[streamID] = []
            source[streamID].IP = message.IP
            source[streamID].port = message.port
            source[streamID].proto = message.proto
            source[streamID].room = message.workspace
            source[streamID].type = message.type
            source[streamID].time = Date.now()
            source[streamID].from = ''

            // allow from only if app token, otherwise users could post as another user
            if ((typeof message.from !== 'undefined')
                      && (typeof apps[message.token] !== 'undefined')) source[streamID].from = message.from

            if (('alert' in message) && (message.alert === true)) source[streamID].alert = true
            else source[streamID].alert = false

            source[streamID].meta = ''
            if (typeof message.meta !== 'undefined') source[streamID].meta = message.meta
          }

          // if exists, remove streamID from streams in this tokens streamList
          for (token in tokens) {
            if (token) {
              for (i in tokens[token].streams) {
                if (tokens[token].streams[i] === streamID) tokens[token].streams.splice(i, 1)
              }
            }
          }

          // if exists, remove streamID from streams in this apps streamList
          for (token in apps) {
            if (token) {
              for (i in apps[token].streams) {
                if (apps[token].streams[i] === streamID) apps[token].streams.splice(i, 1)
              }
            }
          }

          // make sure stream is allowed and not rejected
          if (typeof tokens[message.token] !== 'undefined') tokens[message.token].streams.push(streamID)

          // make sure stream is allowed and not rejected in case of an app
          if (typeof apps[message.token] !== 'undefined') apps[message.token].streams.push(streamID)

          if (!(('senderID' in message) && (message.senderID !== '') && (typeof source[message.senderID] !== 'undefined'))) {
            serverFunctions.update.process(streamID)
          }

          response.statusCode = 0
          response.port = port[message.proto]
          response.streamID = streamID
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
          description: 'array of streamID/user/apps/type/meta/workspace of the streams that will be sent',
          type: 'array',
        },
        statusCode: {
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
      const streamListElement = {}
      let userApps
      const workMessage = message
      if (typeof data !== 'object') {
        if (!('workspaces' in workMessage)) workMessage.workspaces = []

        if (typeof workMessage.workspaces === 'string') workMessage.workspaces = [workMessage.workspaces]
        if (!Array.isArray(workMessage.workspaces)) workMessage.workspaces = []

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

        if (workMessage.workspaces.length > 0) {
          for (workspace in userWorkspace) {
            if (!workMessage.workspaces.includes(userWorkspace[workspace])) {
              delete userWorkspace[workspace]
            }
          }
          userWorkspace = userWorkspace.filter((value) => value)
        }

        if (typeof workMessage.types === 'string') workMessage.types = [workMessage.types]
        if (!Array.isArray(workMessage.types)) workMessage.types = []

        response.senderList = []
        for (workspace in userWorkspace) {
          if (workspace) {
            for (const key in source) {
              if (source[key].room === userWorkspace[workspace]) {
                // eslint-disable-next-line max-len
                if ((workMessage.types.length === 0) || (workMessage.types.includes(source[key].type))) {
                  streamListElement.streamID = parseInt(key, 10)
                  // add usernames and app names to the specific streams
                  userApps = findApps(streamListElement.streamID)
                  streamListElement.user = userApps.user
                  streamListElement.apps = userApps.apps
                  streamListElement.type = source[key].type
                  streamListElement.meta = source[key].meta
                  streamListElement.workspace = source[key].room
                  response.senderList.push({ ...streamListElement })
                }
              }
            }
          }
        }
        response.statusCode = 0
        return (response)
      }
      return (data)
    },
  }


  functions.streamInfo = {
    info: {
      name: 'streamInfo',
      description: 'get information about a stream',
      version: '1.0.1.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function to select and run',
          type: 'string',
          sample: 'streamInfo',
        },
        streamID: {
          description: 'ID of the stream to get information about',
          type: 'string',
          sample: '$$sender.streamID',
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statusCode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        info: {
          description: 'information about the stream(streamID/user/apps/type/meta/workspace)',
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
      let streamID
      let response
      let token
      let key
      if (typeof data !== 'object') {
        if (('streamID' in message) && ((typeof source[message.streamID] !== 'undefined') || (typeof target[message.streamID] !== 'undefined'))) {
          streamID = message.streamID
          response = {}
          response.statusCode = 0
          response.info = {}

          for (token in tokens) {
            if (token) {
              for (key in tokens[token].streams) {
                if (tokens[token].streams[key] === streamID) {
                  response.info.user = users[tokens[token].user].username
                  break
                }
              }
            }
          }
          for (token in apps) {
            if (token) {
              for (key in apps[token].streams) {
                if (apps[token].streams[key] === streamID) {
                  response.info.apps = apps[token].name
                  break
                }
              }
            }
          }
          if (typeof source[streamID] !== 'undefined') {
            response.info.proto = source[streamID].proto
            response.info.workspace = source[streamID].room
            response.info.type = source[streamID].type
            response.info.MTU = MTU
            if (typeof response.info.port !== 'undefined') response.info.port = source[streamID].port
            if (typeof response.info.IP !== 'undefined') response.info.IP = source[streamID].IP
            response.info.meta = source[streamID].meta
            response.info.direction = 'source'
          }
          if (typeof target[streamID] !== 'undefined') {
            response.info.proto = target[streamID].proto
            response.info.workspace = target[streamID].room
            response.info.type = target[streamID].type
            response.info.MTU = MTU
            if (typeof response.info.port !== 'undefined') response.info.port = target[streamID].port
            if (typeof response.info.IP !== 'undefined') response.info.IP = target[streamID].IP
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
        receiverID: {
          description: 'if one wishes to update a stream, set the existing streamID',
          type: 'string',
          default: '',
        },
        streamIDs: {
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
        IP: {
          description: 'IP address from which the connection will be made (this is usually the IP one gets from the auth function)',
          type: 'string',
        },
        port: {
          description: 'Port from which the connection will be made. This should be 0 for for cases when the client is behind a firewall.',
          type: 'string',
          default: 0,
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
        statusCode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        streamID: {
          description: 'new streamID that designates the receiver',
          type: 'string',
        },
        streamList: {
          description: 'array of streamID/user/apps [array of app names]/type/meta of the streams that will be sent',
          type: 'array',
        },
        IP: {
          description: 'IP to which the connection of the client shall be made',
          type: 'string',
          optional: true,
        },
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
      let sourceID
      let stream
      let streamListElement = {}
      let userApps
      let streamID
      let token
      let i
      let response = {}
      const workMessage = message

      if (typeof data !== 'object') {
        console.log('*** receiver ***')
        if ((typeof workMessage === 'object') && ('workspace' in workMessage)) {
          // ToDo: check if IP is given
          if (!('port' in workMessage)) workMessage.port = 0

          // get appropriate streamIDs
          if (!('streamIDs' in workMessage) || (workMessage.streamIDs.length === 0)) {
            workMessage.streamIDs = []
            for (sourceID in source) if (!('type' in workMessage) || (workMessage.type.length === 0) || (workMessage.type.includes(source[sourceID].type))) workMessage.streamIDs.push(parseInt(sourceID, 10))
          }

          // remove all streamIDs that are not in source (we silently drop
          // streamID's in case they have disappeared during the time it takes to
          // query and bring them up...)
          for (stream in workMessage.streamIDs) {
            if (typeof source[workMessage.streamIDs[stream]] === 'undefined') workMessage.streamIDs.splice(stream, 1)
          }
          // add usernames to the specific streams
          workMessage.streamList = []
          for (stream in workMessage.streamIDs) {
            if (stream) {
              streamListElement = {}
              streamListElement.streamID = parseInt(workMessage.streamIDs[stream], 10)
              streamListElement.type = source[workMessage.streamIDs[stream]].type
              streamListElement.meta = source[workMessage.streamIDs[stream]].meta

              // add apps processing list for streams that are processed, otherwise leave empty
              // walk through source from tags until we find user, add apps and user
              userApps = findApps(workMessage.streamIDs[stream])
              streamListElement.user = userApps.user
              streamListElement.apps = userApps.apps

              // receive streams of the same user if echo is enabled
              if (((typeof tokens[workMessage.token] !== 'undefined')
                  && (users[tokens[workMessage.token].user].username !== streamListElement.user)
                  && ((!('echo' in workMessage)) || (('echo' in workMessage) && (workMessage.echo !== true))))
                  || (('echo' in workMessage) && (workMessage.echo === true))
                  || ((typeof apps[workMessage.token] !== 'undefined')
                  && ((!('echo' in workMessage)) || (('echo' in workMessage) && (workMessage.echo !== true))))) {
                workMessage.streamList.push(streamListElement)
              } else console.log(`skipping stream from same user ${workMessage.streamIDs[stream]}`)
            }
          }

          // give error message if we dont have a streamID and are also not
          // expecting updates on streams
          // var t =  typeof message['alert'] !== 'undefined';
          if ((workMessage.streamIDs.length < 1) && ((typeof workMessage.alert === 'undefined')
              || !((typeof workMessage.alert !== 'undefined') && (workMessage.alert === true)))) {
            // console.log(message);
            return getErrorMessage(7)
          }

          if (('receiverID' in workMessage) && (workMessage.receiverID !== '') && (typeof target[workMessage.receiverID] !== 'undefined')) {
            streamID = workMessage.receiverID
            console.log(`used existing receiver streamID: ${streamID}`)
            // console.log(target[streamID]);
          } else {
            // create a new target streamID
            streamID = null
            while ((streamID === null) || (typeof source[streamID] !== 'undefined') || (typeof target[streamID] !== 'undefined')) {
              streamID = Math.floor(Math.random() * 65535 + 1)
              // streamID = crypto.createHash('sha256')
              // .update(workMessage.workspace + workMessage.proto + (new Date().getTime()))
              // .digest('hex').substr(0, 7)
            }
            console.log(`created new receiver streamID: ${streamID}`)
          }

          if ((typeof target[streamID] === 'undefined')
                        || ((target[streamID].proto === 'ws')
                      && ((typeof target[streamID].conn === 'undefined')
                        || (typeof target[streamID].conn.readyState === 'undefined')
                        || (target[streamID].conn.readyState !== 1)))
                      || ((target[streamID].proto === 'udp')
                        && (target[streamID].port === 0))
                      || ((target[streamID].proto === 'tcp')
                        && (target[streamID].port === 0))) {
            // put data into the target stream array & overwrite if existing
            target[streamID] = []
            target[streamID].IP = workMessage.IP
            target[streamID].port = workMessage.port
            target[streamID].proto = workMessage.proto
            target[streamID].room = workMessage.workspace
            // console.log(target[streamID]);

            if (('alert' in workMessage) && (workMessage.alert === true)) target[streamID].alert = true
            else target[streamID].alert = false

            if (('echo' in workMessage) && (workMessage.echo === true)) target[streamID].echo = true
            else target[streamID].echo = false

            if ('type' in workMessage) target[streamID].type = workMessage.type
            else target[streamID].type = []

            target[streamID].meta = ''
            if (typeof workMessage.meta !== 'undefined') target[streamID].meta = workMessage.meta

            target[streamID].time = Date.now()
          }

          // if exists, remove streamID from streams in this tokens streamList
          for (token in tokens) {
            if (token) {
              for (i in tokens[token].streams) {
                if (tokens[token].streams[i] === streamID) tokens[token].streams.splice(i, 1)
              }
            }
          }

          // if exists, remove streamID from streams in this apps streamList
          for (token in apps) {
            if (token) {
              for (i in apps[token].streams) {
                if (apps[token].streams[i] === streamID) apps[token].streams.splice(i, 1)
              }
            }
          }

          // make sure stream is allowed and not rejected
          if (typeof tokens[workMessage.token] !== 'undefined') tokens[workMessage.token].streams.push(streamID)

          // make sure stream is allowed and not rejected in case of an app
          if (typeof apps[workMessage.token] !== 'undefined') apps[workMessage.token].streams.push(streamID)

          // designate streams to be directly relayed ot this target
          console.log('streamRelay', streamRelay)
          for (stream in workMessage.streamList) {
            if (stream) {
              // send subscriber message to sender streams that are newly subscribed to
              if (typeof streamRelay[workMessage.streamList[stream].streamID] !== 'undefined') {
                console.log('line 2270', stream)
                console.log('line 2271', workMessage.streamList[stream])
                console.log('line 2272', streamRelay[workMessage.streamList[stream].streamID])
                if (typeof streamRelay[workMessage.streamList[stream].streamID][streamID] === 'undefined') {
                  // eslint-disable-next-line max-len
                  serverFunctions.subscriber.process(workMessage.streamList[stream].streamID, streamID)
                }
                streamRelay[workMessage.streamList[stream].streamID][streamID] = []
              }
            }
          }

          // create result for client to connect as a receiver
          response = {}
          response.statusCode = 0
          response.port = port[workMessage.proto]
          response.proto = workMessage.proto
          response.streamID = streamID
          response.streamList = workMessage.streamList
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
        receiverID: {
          description: 'set the existing receiver streamID',
          type: 'string',
          sample: '$$receiver.streamID',
        },
        streamID: {
          description: 'array of stream IDs to receive. new streams will be added to existing already subscribed streams.',
          type: 'array',
          default: [],
          sample: ['$$sender.streamID'],
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statusCode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        streamList: {
          description: 'array of streamID/user/apps/type/meta of the streams that will be sent',
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
      let sourceID
      let s
      let t
      let stream
      let streamListElement = {}
      let userApps
      // create result for client to connect as a receiver
      let response = {}
      const workMessage = message

      // *** ToDo: Only allow user to get streams with correct access permissions */

      if (typeof data !== 'object') {
        console.log('*** subscribe ***')
        if ((('receiverID' in workMessage) && (workMessage.receiverID !== '') && (typeof target[workMessage.receiverID] !== 'undefined'))) {
          // get all streamIDs if no list is given
          if (!('streamID' in workMessage) || (workMessage.streamID.length === 0)) {
            workMessage.streamID = []
            for (sourceID in source) {
              if (!('type' in workMessage) || (workMessage.type.length === 0) || (workMessage.type.includes(source[sourceID].type))) workMessage.streamID.push(parseInt(sourceID, 10))
            }
          }


          // add the already subscribed streams
          for (s in streamRelay) {
            if (s) {
              s = parseInt(s, 10)
              for (t in streamRelay[s]) {
                if ((parseInt(t, 10) === workMessage.receiverID)
                    && (!workMessage.streamID.includes(s))) {
                  workMessage.streamID.push(s)
                }
              }
            }
          }

          // remove all streamIDs that are not in source (we silently drop
          // streamID's in case they have disappeared during the time it takes
          // to query and bring them up...)
          for (stream in workMessage.streamID) {
            if (!(workMessage.streamID[stream] in source)) {
              workMessage.streamID.splice(stream, 1)
            }
          }

          // add usernames to the specific streams
          workMessage.streamList = []
          for (stream in workMessage.streamID) {
            if (stream) {
              streamListElement = {}
              streamListElement.streamID = parseInt(workMessage.streamID[stream], 10)
              streamListElement.type = source[workMessage.streamID[stream]].type
              streamListElement.meta = source[workMessage.streamID[stream]].meta

              // add apps processing list for streams that are processed, otherwise leave empty
              // walk through source from tags until we find user, add apps and user
              userApps = findApps(workMessage.streamID[stream])
              streamListElement.user = userApps.user
              streamListElement.apps = userApps.apps

              workMessage.streamList.push(streamListElement)
            }
          }

          // designate streams to be directly relayed ot this target
          for (stream in workMessage.streamList) {
            if (stream) {
              // send subscriber message to sender streams that are newly subscribed to
              if (typeof streamRelay[workMessage.streamList[stream].streamID][workMessage.receiverID] === 'undefined') serverFunctions.subscriber.process(workMessage.streamList[stream].streamID, message.receiverID)
              streamRelay[workMessage.streamList[stream].streamID][workMessage.receiverID] = []
            }
          }

          // create result for client to connect as a receiver
          response = {}
          response.statusCode = 0
          response.streamList = workMessage.streamList
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
        receiverID: {
          description: 'set the existing receiver streamID',
          type: 'string',
          sample: '$$receiver.streamID',
        },
        streamID: {
          description: 'array of stream IDs to unsubscribe.',
          type: 'array',
          sample: ['$$sender.streamID'],
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statusCode: {
          description: 'result code of the function',
          type: 'string',
          sample: 0,
        },
        streamList: {
          description: 'array of streamID of the streams that were deleted',
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
      const workMessage = message
      if (typeof data !== 'object') {
        console.log('*** unsubscribe ***')
        if ((('receiverID' in workMessage) && (typeof workMessage.receiverID === 'number') && (typeof target[workMessage.receiverID] !== 'undefined'))
                  && (('streamID' in workMessage) && ((typeof workMessage.streamID === 'number') || (Array.isArray(workMessage.streamID))))) {
          // unsubscribe streams
          workMessage.streamList = []
          for (s in streamRelay) {
            if (s) {
              s = parseInt(s, 10)
              for (t in streamRelay[s]) {
                if (t) {
                  t = parseInt(t, 10)
                  if ((t === workMessage.receiverID) && (workMessage.streamID.includes(s))) {
                    workMessage.streamList.push(s)
                    delete streamRelay[s][t]
                    // send dropped message to sender streams to inform them
                    // the receiver stopped requesting that stream.
                    serverFunctions.dropped.process(s, t)
                    // if (Object.keys(streamRelay[s]).length === 0) delete streamRelay[s]
                  }
                }
              }
            }
          }

          // create result with the list of all removed streams
          response = {}
          response.statusCode = 0
          response.streamList = workMessage.streamList
          return (response)
        }
        return getErrorMessage(3)
      }
      return (data)
    },
  }

  functions.setConfig = {
    info: {
      name: 'setConfig',
      description: 'set a server config',
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
        statusCode: {
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
        const workMessage = message
        if (typeof data === 'number') {
          // check if user
          const admin = await knex('users')
            .first('admin')
            .where('id', data)
            .catch((error) => {
              throw error
            })
          if (admin.admin) {
            switch (workMessage.context) {
              case 'global':
                // Todo: get from database and allow only if exists in database
                // Todo: ACLs?
                switch (workMessage.type) {
                  case 'boolean':
                    // eslint-disable-next-line eqeqeq
                    if (workMessage.value == 'true') workMessage.value = true; else workMessage.value = false
                    break
                  default:
                    break
                }
                console.log('Setting variable: ', workMessage.config, ' to value: ', workMessage.value)
                globalConfig[workMessage.config] = workMessage.value
                break
              default:
                break
            }
          } else return getErrorMessage(16)
        }
        const response = {}
        response.statusCode = 0
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
          description: 'name of the workspace to search for source streams (an empty array indicates all workspaces), it is ignored when specific streamIDs are given',
          type: 'array',
          default: [],
        },
        types: {
          description: 'source stream types to search (an empty array indicates all stream types), it is ignored when specific streamIDs are given',
          type: 'array',
          default: [],
        },
        streamIDs: {
          description: 'ID\'s of the streams to discard (if an empty array is given all source streams that match workspace and type will be discarded)',
          type: 'array',
          default: [],
        },
        token: {
          description: 'token for the user to authenticate',
          type: 'string',
        },
      },
      responses: {
        statusCode: {
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
      let streamIDs = []
      let allStreams = []
      let types = []
      let workspaces = []
      let user
      let token
      let streamID
      let stream
      let streamKey
      let response


      if (typeof data !== 'object') {
        // first find all streamID's that we want to disconnect
        if ((!('streamIDs' in message)) || (Array.isArray(message.streamIDs) && (message.streamIDs.length === 0))) {
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

            // find all streamID's for that user
            for (token in tokens) {
              if (user === tokens[token].user) {
                console.log('streams in token', tokens[token].streams)
                allStreams = allStreams.concat(tokens[token].streams)
              }
            }
            // check if streamID is in correct room and of correct type
            for (streamID in allStreams) {
              if (streamID) {
                if ((typeof source[allStreams[streamID]] !== 'undefined')
                    && (types.includes(source[allStreams[streamID]].type) || types.length === 0)
                    && (workspaces.includes(source[allStreams[streamID]].room)
                    || workspaces.length === 0)) {
                  streamIDs = streamIDs.concat([allStreams[streamID]])
                }
                if ((typeof target[allStreams[streamID]] !== 'undefined')
                    && (types.includes(target[allStreams[streamID]].type) || types.length === 0)
                    && (workspaces.includes(target[allStreams[streamID]].room)
                  || workspaces.length === 0)) streamIDs = streamIDs.concat([allStreams[streamID]])
              }
            }
          }

          // find all streamID's for that app
          if (typeof apps[message.token] !== 'undefined') {
            allStreams = apps[message.token].streams
            for (streamID in allStreams) {
              if (streamID) {
                if (globalConfig.debug) console.log('disconnect streamID', allStreams[streamID])
                // check if streamID is in correct room and of correct type
                if ((typeof source[allStreams[streamID]] !== 'undefined')
                    && (types.includes(source[allStreams[streamID]].type) || types.length === 0)
                    && (workspaces.includes(source[allStreams[streamID]].room)
                  || workspaces.length === 0)) streamIDs = streamIDs.concat([allStreams[streamID]])
                if ((typeof target[allStreams[streamID]] !== 'undefined')
                    && (types.includes(target[allStreams[streamID]].type) || types.length === 0)
                    && (workspaces.includes(target[allStreams[streamID]].room)
                  || workspaces.length === 0)) streamIDs = streamIDs.concat([allStreams[streamID]])
              }
            }
          }
        } else {
          // ToDo: Make sure that the user owns the streamIDs
          if (Array.isArray(message.streamIDs)) streamIDs = message.streamIDs
          if (typeof message.streamIDs === 'string') streamIDs = [message.streamIDs]
        }
        response = {}
        response.statusCode = 0
        response.streamList = streamIDs
        for (streamKey in streamIDs) {
          if (streamKey) {
            streamID = streamIDs[streamKey]
            console.log('deleting', streamID)
            if ((typeof source[streamID] !== 'undefined') || (typeof target[streamID] !== 'undefined')) {
              console.log(`Cleaning up stream ${streamID}`)
              // *** ToDo: in addition,need to make sure that the actual connection is disconnected
              if ((typeof source[streamID] !== 'undefined')
                                && (typeof source[streamID].IP !== 'undefined')
                                && (typeof source[streamID].port !== 'undefined')) {
                if ((typeof connections[source[streamID].IP] !== 'undefined')
                                && (typeof connections[source[streamID].IP][source[streamID].port] !== 'undefined')
                                && (typeof connections[source[streamID].IP][source[streamID].port].conn !== 'undefined')) {
                  delete connections[source[streamID].IP][source[streamID].port].conn
                  delete connections[source[streamID].IP][source[streamID].port].time
                  delete connections[source[streamID].IP][source[streamID].port]
                  if (connections[source[streamID].IP].length === 0) {
                    delete connections[source[streamID].IP]
                  }
                }
                // *** ToDo: disconnect all receivers as well
                // announce to receivers that the stream is stale
                serverFunctions.stale.process(streamID)

                delete streamRelay[streamID]
                delete source[streamID]
                // *** ToDo: also delete all receivers that have only this source?
              }
            }

            // remove stream if it is a target for the stream relay
            if (typeof target[streamID] !== 'undefined') {
              for (stream in streamRelay) {
                if (streamID in streamRelay[stream]) {
                // send dropped message to senders
                  serverFunctions.dropped.process(stream, streamID)
                  delete streamRelay[stream][streamID]
                }
              }
              delete target[streamID]
            }

            // remove streams from user session list
            for (token in tokens) {
              if (tokens[token].streams.indexOf(streamID) !== -1) {
                tokens[token].streams.splice(tokens[token].streams.indexOf(streamID), 1)
              }
            }
            // remove streams from apps session list
            for (token in apps) {
              if (apps[token].streams.indexOf(streamID) !== -1) {
                apps[token].streams.splice(apps[token].streams.indexOf(streamID), 1)
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
        statusCode: {
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
        response.statusCode = 0
        return response
        // make sure to remove all usersessions and streams,also notify clients of now stale streams

        // plugin/app tokens are not removed but all streams are expired
        /*
          var response = {};
          response['statusCode'] = 0;
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
                  response['IP'] = IP;
                  tokens[response['token']] = [];
                  tokens[response['token']]['time'] = Date.now(); // timeout data

                  // holds the user ID for the token
                  tokens[response['token']]['user'] = authenticated;

                  tokens[response['token']]['streams'] = [] // provision for streams that get added
                  tokens[response['token']]['conn'] = conn;
              } else
                  response = getErrorMessage(4);
          } else
              if('token' in message)
                  if(typeof apps[message['token']] !== 'undefined') {
                      response['token'] = message['token']
                      response['IP'] = IP;
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
  serverFunctions.update = {
    info: {
      name: 'update',
      description: 'update a receiver with a new stream from sender',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function that was triggered',
          type: 'string',
          sample: 'update',
        },
        receiverID: {
          description: 'receiverID that matched the new sender',
          type: 'string',
          sample: 0,
        },
        streamID: {
          description: 'streamID that was updated',
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
    async process(streamID) {
      // prep response
      const response = {}
      let update = ''
      let u
      let token

      // add apps processing list for streams that are processed, otherwise leave empty
      // walk through source from tags until we find user, add apps and user
      const userApps = findApps(streamID)
      response.function = 'update'
      response.streamID = streamID
      response.user = userApps.user
      response.apps = userApps.apps

      response.type = source[streamID].type
      response.meta = source[streamID].meta
      console.log('trying to send update ', response)
      // get correct room information
      const { room } = source[streamID]

      // get targets that requested an alert and send update
      // var t = [];
      for (u in target) {
        if (target[u].alert
            && (target[u].room === room)
            && ((target[u].type.length === 0)
            || (target[u].type.includes(source[streamID].type)))) {
          u = parseInt(u, 10)
          response.receiverID = u
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

  serverFunctions.subscriber = {
    info: {
      name: 'subscriber',
      description: 'Update a sender with a new stream that subscribed.',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function that was triggered',
          type: 'string',
          sample: 'subscriber',
        },
        senderID: {
          description: 'senderID that the receiver subscribed to',
          type: 'string',
          sample: 0,
        },
        receiverID: {
          description: 'receiverID that subscribed',
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
    async process(senderID, receiverID) {
      let token
      let userToken
      let appToken
      // prep response
      const response = {}
      response.function = 'subscriber'
      response.receiverID = receiverID
      response.senderID = senderID

      // get user or app name
      for (token in tokens) {
        if (token) {
          if (tokens[token].streams.includes(senderID)) {
            userToken = token
            if (typeof response.user !== 'undefined') break
          }
          if (tokens[token].streams.includes(receiverID)) {
            response.user = users[tokens[token].user].username
            if (typeof userToken !== 'undefined') break
          }
        }
      }


      for (token in apps) {
        if (token) {
          if (apps[token].streams.includes(senderID)) {
            appToken = token
            if (typeof response.app !== 'undefined') break
          }
          if (apps[token].streams.includes(receiverID)) {
            response.app = apps[token].name
            if (typeof appToken !== 'undefined') break
          }
        }
      }

      response.type = target[receiverID].type
      response.meta = target[receiverID].meta
      const update = JSON.stringify(response)
      console.log('trying to send subscriber update ', update)

      // send update to sender
      if (typeof userToken !== 'undefined') {
        console.log(`updating sender: ${userToken} : ${senderID}`)
        if (typeof tokens[userToken].conn.write === 'function') {
          tokens[userToken].conn.write(update)
          console.log('Finished subscriber update (1).')
        }
        if ((typeof tokens[userToken].conn.send === 'function') && (typeof tokens[userToken].conn.readyState !== 'undefined') && (tokens[userToken].conn.readyState === 1)) {
          tokens[userToken].conn.send(update)
          console.log('Finished subscriber update (2).')
        }
      }
      if (typeof appToken !== 'undefined') {
        console.log(`updating app client: ${appToken} : ${senderID}`)
        if (typeof apps[appToken].conn.write === 'function') apps[appToken].conn.write(update)
        if ((typeof apps[appToken].conn.send === 'function') && (typeof apps[appToken].conn.readyState !== 'undefined') && (apps[appToken].conn.readyState === 1)) apps[appToken].conn.send(update)
      }
    },
  }

  serverFunctions.stale = {
    info: {
      name: 'stale',
      description: 'Update a receiver that stream is stale and not in use anymore. A sender might have dropped or the stream might have timed out.',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function that was triggered',
          type: 'string',
          sample: 'stale',
        },
        streamID: {
          description: 'streamID that is stale',
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
    async process(streamID) {
      let u
      let token
      const response = {}
      response.function = 'stale'
      response.streamID = streamID

      const update = JSON.stringify(response)
      console.log('trying to send stale ', update)

      // get correct room information
      const { room } = source[streamID]

      // get subscribed targets and send update (only if receiver wants updates)
      // var t = [];
      for (u in target) {
        if (target[u].alert && (target[u].room === room)
            && ((target[u].type.length === 0)
            || (target[u].type.includes(source[streamID].type)))) {
          u = parseInt(u, 10)
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

  serverFunctions.dropped = {
    info: {
      name: 'dropped',
      description: 'Update a sender that receivers have dropped or unsubscribed.',
      version: '1.0.0.0',
      author: 'Robert Pahle',
      email: 'robert.pahle@gmail.com',
      doc_href: 'https:// dev.nyu-x.org/networktest',
      arguments: {
        function: {
          description: 'function that was triggered',
          type: 'string',
          sample: 'dropped',
        },
        streamID: {
          description: 'receiverID that was dropped',
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
    async process(sourceID, receiverID) {
      let token
      const response = {}
      let userToken
      let appToken
      response.function = 'dropped'
      response.streamID = receiverID

      const update = JSON.stringify(response)
      console.log('trying to send dropped update ', update)

      // get tokens for this stream
      for (token in tokens) {
        if (tokens[token].streams.includes(sourceID)) {
          userToken = token
          break
        }
      }
      for (token in apps) {
        if (apps[token].streams.includes(sourceID)) {
          appToken = token
          break
        }
      }

      // send update to sender
      if (typeof userToken !== 'undefined') {
        console.log(`updating sender: ${userToken} : ${sourceID}`)
        if (typeof tokens[userToken].conn.write === 'function') tokens[userToken].conn.write(update)
        if ((typeof tokens[userToken].conn.send === 'function') && (typeof tokens[userToken].conn.readyState !== 'undefined') && (tokens[userToken].conn.readyState === 1)) tokens[userToken].conn.send(update)
      }
      if (typeof appToken !== 'undefined') {
        console.log(`updating app client: ${appToken} : ${sourceID}`)
        if (typeof apps[appToken].conn.write === 'function') apps[appToken].conn.write(update)
        if ((typeof apps[appToken].conn.send === 'function') && (typeof apps[appToken].conn.readyState !== 'undefined') && (apps[appToken].conn.readyState === 1)) apps[appToken].conn.send(update)
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
          if ('ID' in message) {
            send = JSON.parse(send)
            send.ID = message.ID
            send = JSON.stringify(send)
          }
          console.log(`sending:${send}`)
          conn.write(send)
        } else console.log('Function does not exist.')
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
  functions.listFunctions.info.responses.functionList.sample = Object.keys(functions)
  functions.listWorkspaces.info.responses.workspaceList.sample = Object.keys(rooms)
  functions.listServerFunctions.info.responses.functionList.sample = Object.keys(serverFunctions)

  const userList = []
  users.forEach((user) => {
    userList.push(user.username)
  })
  console.log('Functions: ', functions.listFunctions.info.responses.functionList.sample)
  console.log('Server functions: ', Object.keys(serverFunctions))
  console.log('Workspaces: ', functions.listWorkspaces.info.responses.workspaceList.sample)
  console.log('Users: ', userList)
  console.log('Apps:', apps)


  // TCP control setup
  console.log(`trying to bind TCP control port ${TCPControl}`)

  const TCPControlServer = net.createServer()
  TCPControlServer.on('connection', handleControlConnection)

  TCPControlServer.listen(TCPControl, '0.0.0.0', () => {
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
    // decode header
    let headerSize = msg.readUInt16LE(0)
    const dataSize = msg.readUInt16LE(2)
    const sourceID = msg.readUInt32LE(4)
    // eslint-disable-next-line no-bitwise
    const decodeHeader = !!(headerSize & 32768)
    headerSize = headerSize && 32767


    // console.log('sourceID', sourceID, typeof sourceID)

    const last = Date.now()
    // eslint-disable-next-line no-bitwise
    headerSize &= 32767

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
    // *** ToDo: validate that this message is ttruely a sender message that is authenticated
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
        pointer = calculatedSize
        calculatedSize += 8
        calculatedSize += msg.readUInt16LE(pointer)
        calculatedSize += msg.readUInt16LE(pointer + 2)
        if (msg.readUInt32LE(pointer + 4) !== sourceID) {
          console.log('Wrong source ID\'s in combined packet')
          return console.error('Wrong source ID\'s in combined packet')
        }
      }
      if (msg.length !== calculatedSize) {
        console.log(`Packet has the wrong size (${msg.length} vs. ${8 + headerSize + dataSize}).`)
        return console.error(`Packet has the wrong size (${msg.length} vs. ${8 + headerSize + dataSize}).`)
      }
    }

    // log out debug information
    if (globalConfig.debug && (sourceID !== 0)) {
      // data = Buffer.allocUnsafe(dataSize)
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
        // console.log(target[sourceID])
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

  const fileServer = new httpStatic.Server('./public', { cache: 3600 })

  const httpsControlServer = https.createServer(httpsOptions, (req, res) => {
    if (req.url === '/') {
      res.writeHead(200)
      res.end(`Corelink Server ${serverVersion}`)
    } else {
      console.log(`${req.connection.remoteAddress} ${req.method} ${req.url}`)
      req.addListener('end', () => {
        fileServer.serve(req, res)
      }).resume()
    }
  })
  httpsControlServer.listen(WSControl, '0.0.0.0')

  const wsControlServer = new Ws({ server: httpsControlServer })

  wsControlServer.on('connection', (conn, req) => {
  // const IP = req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
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
        if ('ID' in message) {
          send = JSON.parse(send)
          send.ID = message.ID
          send = JSON.stringify(send)
        }
        console.log(`sending:${send}`)
        conn.send(send)
      } else console.log('Function does not exist.')
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

  TCPDataServer.listen(port.tcp, '0.0.0.0', () => {
    console.log('TCP data server listening to %j:%j', TCPDataServer.address().address, TCPDataServer.address().port)
  })

  // WS data transfer setup
  console.log(`trying to bind WS port ${port.ws}`)

  const httpsDataServer = https.createServer(httpsOptions, (req, res) => {
    console.log(`New Request... ${req.connection.remoteAddress} ${req.method} ${req.url}`)
    res.writeHead(200)
    res.end('Corelink Data Port')
  })
  httpsDataServer.listen(port.ws, '0.0.0.0')

  const WSDataServer = new Ws({ server: httpsDataServer })

  WSDataServer.on('connection', (conn, req) => {
  // const IP = req.headers['x-forwarded-for'].split(/\s*,\s*/)[0];

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
