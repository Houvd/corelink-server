/* eslint-disable */

const {PromiseSocket} = require('promise-socket')

const client = new PromiseSocket()

var receiverStream = {}
var senderStreams   = []
var allowedStreams  = []
var token = null

var sourceIP = null
var sourcePort = null

var udpRegistered = false
var udp = null
var targetIP = null
var targetPort = null

var header_size = Buffer.alloc(6);


var data_cb = null
var receiver_cb = null
var stale_cb = null
var close_cb = null

var debug = false

function parseJson(data) {
    return (new Promise((resolve, reject) => {
        try {
            data = JSON.parse(data)
            resolve(data)
        } catch (e) {
            reject(new Error('Received message not a proper JSON:'+data.toString()))
        }
    }))
}

client.stream.on('data', async function(data) {
    data = await parseJson(data)
    if(debug)
        console.log('stream.on',data)
    if('function' in data) {
        switch(data.function) {
            case 'update':
                if(receiver_cb!=null) {
                    delete data.function
                    receiver_cb(data);
                } else
                    console.log('No receiver update callback provided.')
                break
            case 'stale':
                if(stale_cb!=null) {
                    delete data.function
                    stale_cb(data);
                } else
                    console.log('No stale update callback provided.')
                break
        }
    } 
})

client.stream.on('close', () => {
    if(close_cb!=null)
        close_cb();
    else
        console.log('No close connection callback provided.')
})

async function login(credentials) {
    return (new Promise(async (resolve, reject) => {
        if((typeof credentials.username == 'undefined') &&
            (typeof credentials.password == 'undefined'))
            if((typeof credentials.token == 'undefined'))
                reject(new Error('Credentials not found.'))
            else
                var request = '{"function":"auth","token":"'+credentials.token+'"}'
        else 
            var request = '{"function":"auth","username":"'+credentials.username+'","password":"'+credentials.password+'"}'
        if(debug)
            console.log('Login ',request)
        await client.write(request).catch((err) => { console.log(err) })
        var content = await client.read().catch((err) => { console.log(err) })
        content = await parseJson(content).catch((err) => { console.log(err) })
        if('statusCode' in content)
            if(content.statusCode==0) {
                if('token' in content)
                    token = content.token
                else 
                    reject(new Error('Token not found.'))
                if('ip' in content)
                    sourceIP = content.IP
                else 
                    reject(new Error('SourceIP not found.'))
                resolve(true)
            } else
                if('message' in content)
                    reject(new Error(content.message+' ('+content.statusCode+')'))
                else
                    reject(new Error('Error with out specific message returned.'))
        else
            reject(new Error('Status code not found in answer.'))
    }))
}

async function connect(credentials,config) {
    targetIP = config.ControlIP
    await client.connect(config.ControlPort, config.ControlIP).catch((err) => { console.log(err) })
    conn = await login(credentials).catch((err) => { console.log(err) })
    return (new Promise((resolve, reject) => {
        if(conn) {
            resolve(true)
        } else {
            reject(new Error('Problem loggin in'))
        }
    }))
}

async function createSender(workspace, protocol, type, metadata = '', from = '') {
    return (new Promise(async (resolve, reject) => {
        var request = '{"function":"sender","workspace":"'+workspace+'","proto":"'+protocol+'","ip":"'+sourceIP+'","port":0,"type":"'+type+'","meta":'+JSON.stringify(metadata)+',"from":"'+from+'","token":"'+token+'"}';
        await client.write(request).catch((err) => { console.log(err) })
        if(debug)
            console.log('createSender request',request)
        do {
            var content = await client.read().catch((err) => { console.log(err) })
            if(debug)
                console.log('createSender content',content)
            content = await parseJson(content).catch((err) => { console.log(err) })
            if(debug)
                console.log('createSender content',content)
        
            if('statusCode' in content)
                if(content.statusCode==0) {
                    if('streamid' in content)
                        senderStreams[content.streamid] = []
                    else 
                        reject(new Error('StreamID not found.'))
                    if('port' in content)
                        senderStreams[content.streamid]['port'] = content.port
                    else 
                        reject(new Error('Target port not found.'))
                    if('MTU' in content)
                        senderStreams[content.streamid]['MTU'] = content.MTU
                    else 
                        reject(new Error('Target MTU not found.'))
                    senderStreams[content.streamid]['workspace']    = workspace
                    senderStreams[content.streamid]['protocol']     = protocol
                    senderStreams[content.streamid]['type']         = type
                    senderStreams[content.streamid]['metadata']     = metadata
                    if((protocol=='udp') && (!udpRegistered))
                        setupUDP()
                    if(debug)
                        console.log('createSender resolving', content.streamid)
                    resolve(content.streamid)
                    break
                } else
                    if('message' in content)
                        reject(new Error(content.message+' ('+content.statusCode+')'))
                    else
                        reject(new Error('Error with out specific message returned.'))
        } while(('statusCode' in content) || ('function' in content))
        reject(new Error('Status code not found in answer.'))
    }))
}

function receiverSetup(streamid,port) {
    var header = {
        id : streamid,
        time: Date.now()
    };
    header = JSON.stringify(header);
    header = Buffer.from(header);
    header_size.writeUInt16LE(header.length,0);
    header_size.writeUInt32LE(0,2);
    var packet = [header_size,header];
    message = Buffer.concat(packet);

    udp.send(message, port, targetIP, (err) => {
        console.log('Initializing Receiver...')
        if (err) {
            console.log('socket error', err);
        }
    });
}

function setupUDP(streamid = null, port = null) {
    var dgram = require('dgram');
    udp = dgram.createSocket('udp4');
    udp.bind();
    udp.on('listening', () => {
        const address = udp.address();
        sourcePort = address.port;
        udpRegistered = true
        if((streamid!=null) && (port!=null))
            receiverSetup(streamid,port)
    });
    udp.on('message', (message, info) => {
        if(data_cb!=null) {
            var header_size = message.readUInt16LE(0);
            var data_size = message.readUInt32LE(2);
            var header = message.toString('ascii',6,header_size+6);
            var datar = Buffer.allocUnsafe(data_size);
            message.copy(datar,0,6+header_size);
            try {
                header = JSON.parse(header);
            } catch (e) {
                console.log('Received message not a proper JSON:'+message.toString());
                return;
            }
            if((info.address==targetIP) && allowedStreams.includes(header.id) && (receiverStream.port==info.port))
                data_cb(header.id, datar, header.time)
            else
                console.log(`packet from unauthorized address ${info.address}:${info.port}`)
        } else
            console.log('Data received, but no callback for data available.')
    });
}

async function createReceiver(workspace, protocol, streamIDs=[], type = [], alert = false, echo = false, receiverid = null) {
    return (new Promise(async function(resolve, reject){
        var request = '{"function":"receiver","workspace":"'+workspace+'","streamid":'+JSON.stringify(streamIDs)+',"proto":"'+protocol+'","ip":"'+sourceIP+'","port":0,"echo":'+echo+',"alert":'+alert+',"type":'+JSON.stringify(type)+',"token":"'+token+'"}';
        if(debug)
            console.log('createReceiver request',request)
        await client.write(request).catch((err) => { console.log(err) })
        var content = await client.read().catch((err) => { console.log(err) })
        content = await parseJson(content).catch((err) => { console.log(err) })
        if(debug)
            console.log('create Receiver content',content)
        if('statusCode' in content)
            if(content.statusCode==0) {
                if('streamid' in content)
                    receiverStream['streamid'] = content.streamid
                else 
                    reject(new Error('StreamID not found.'))
                if(debug)
                    console.log('createReceiver port: '+content.port)
                if('port' in content)
                    receiverStream['port'] = content.port
                else 
                    reject(new Error('Target port not found.'))
                if('proto' in content)
                    receiverStream['proto'] = content.proto
                else 
                    reject(new Error('Target proto not found.'))
                if('streamlist' in content)
                    receiverStream['streamlist'] = content.streamlist
                else 
                    reject(new Error('Target streamlist not found.'))
                if('MTU' in content)
                    receiverStream['MTU'] = content.MTU
                else 
                    reject(new Error('Target MTU not found.'))

                receiverStream['workspace'] = workspace
                receiverStream['protocol']  = protocol
                receiverStream['type']      = type
                receiverStream['alert']     = alert
                receiverStream['echo']      = echo

                for(stream in content.streamlist)
                    if(!allowedStreams.includes(content.streamlist[stream].streamid))
                        allowedStreams.push(content.streamlist[stream].streamid);

                if((protocol=='udp') && (!udpRegistered))
                    setupUDP(content.streamid, content.port)

                if((protocol=='udp') && (udpRegistered))
                    receiverSetup(content.streamid,content.port)

                resolve(content.streamlist)
            } else
                if('message' in content)
                    reject(new Error(content.message+' ('+content.statusCode+')'))
                else
                    reject(new Error('Error with out specific message returned.'))
        else
            reject(new Error('Status code not found in answer.'))    
    }))
}

async function subscribe(streamIDs) {
    return (new Promise(async function(resolve, reject){
        var request = '{"function":"subscribe","receiverid":"'+receiverStream.streamid+'","streamid":'+JSON.stringify(streamIDs)+',"token":"'+token+'"}';
        if(debug)
            console.log('subsctibe request',request)
        await client.write(request).catch((err) => { console.log(err) })
        do {
            var content = await client.read().catch((err) => { console.log(err) })
            content = await parseJson(content).catch((err) => { console.log(err) })
            if(debug)
                console.log('subscribe json',content)

            if('statusCode' in content)
                if(content.statusCode==0) {
                    if('streamlist' in content)
                        receiverStream['streamlist'] = content.streamlist
                    else 
                        reject(new Error('Target streamlist not found.'))

                    for(stream in content.streamlist)
                        if(!allowedStreams.includes(content.streamlist[stream].streamid))
                            allowedStreams.push(content.streamlist[stream].streamid);
                    if(debug)
                        console.log('subscribe streamlist',content.streamlist)
                    resolve(content.streamlist)
                    break
                } else
                    if('message' in content)
                        reject(new Error(content.message+' ('+content.statusCode+')'))
                    else
                        reject(new Error('Error with out specific message returned.'))
        } while (('statusCode' in content) || ('function' in content))
        reject(new Error('Status code not found in answer.'))
    }))
}

async function on(type, cb) {
    switch(type) {
        case 'receiver' :
            receiver_cb = cb
            break
        case 'data':
            data_cb = cb
            break
        case 'stale':
            stale_cb = cb
            break
        case 'close':
            close_cb = cb
            break
    }
}

function send(streamID,data) {
    if((typeof senderStreams[streamID] != 'undefined') &&  (senderStreams[streamID]['protocol']=='udp')) {
        var header_size = Buffer.alloc(6);
        var header = {
            id : streamID,
            time: Date.now()
        };
        header = JSON.stringify(header);

        header = Buffer.from(header);
        header_size.writeUInt16LE(header.length,0);
        header_size.writeUInt32LE(data.length, 2);

        var packet = [header_size,header,data];
        var message = Buffer.concat(packet);
        if(udpRegistered) {
            udp.send(message, senderStreams[streamID]['port'], targetIP, (err) => {
                if (err)
                    console.log('socket error', err);
                else 
                    console.log(`sent: h${header.length},d${data.length},${header.toString()}, ${targetIP}:${senderStreams[streamID]['port']}`);
            });
        } else
            console.log('UDP unregistered')
    }
}

async function disconnect(workspace = [], type = [], streamIDs = []) {
    return (new Promise(async function(resolve, reject){
        var request = '{"function":"disconnect","workspace":"'+workspace+'","type":"'+type+'","streamid":'+JSON.stringify(streamIDs)+',"token":"'+token+'"}';
        if(debug)
            console.log('disconnect request',request)
        await client.write(request).catch((err) => { console.log(err) })
        var content = await client.read().catch((err) => { console.log(err) })
        content = await parseJson(content).catch((err) => { console.log(err) })
        if(debug)
            console.log('disconnect content',content)        
        if('statusCode' in content)
            if(content.statusCode==0)
                resolve(true)
            else
                if('message' in content)
                    reject(new Error(content.message+' ('+content.statusCode+')'))
                else
                    reject(new Error('Error with out specific message returned.'))
        else
            reject(new Error('Status code not found in answer.'))    
    }))
}

async function exit() {
    return (new Promise(async function(resolve, reject){
        //get all local streamid's
        streamIDs = []
        if(typeof receiverStream.streamid != 'undefined')
            streamIDs.push(receiverStream.streamid)
        for(var streamid in senderStreams)
            streamIDs.push(streamid)
        var dis = await disconnect([],[],streamIDs)
        if(dis === true)
            resolve(true)
        else
            reject(dis)
    }))
}

module.exports.on = on
module.exports.connect = connect
module.exports.createSender = createSender
module.exports.send = send
module.exports.subscribe = subscribe
module.exports.disconnect = disconnect
module.exports.createReceiver = createReceiver
module.exports.exit = exit