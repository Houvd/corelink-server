//V1.0.0.0

const config = require('./config.json');
const control = require('../../../lib/corelink.lib');
// const fs = require('fs');

let patched = [];

let senderStreamid;

const interval = 5.0;
const timeout = 50.0;
const world_switch_timeout = 15.0;
let world_tick = 0.0;

// maybe we should wrap this into a memory datastore of some kind with mutexes and such

// console.log(config);
/*

layout of state

{
    objects: {
        uniqueid: uid of object {
          metadata: {
              color?
              etcetera
              physics....
          },
          type: unique pool id,
          pose: {
              x:,
              y:,
              z:,
              qx:,
              qy:,
              qz:,
              qw:,
          },
          lockid: userid - who owns it
        },
        ...
    }
    ||
    world: {

    }
}
*/

/*
exampleState = {
    object: {
        // userid + objectid (local per user)
        uid: "121_003",
        // pool id 0 to N - 1
        type: 0,
        metadata: {},
        pose: {
            // vector
            translation: [0.0, 0.0, 0.0],
            // quaternion
            orientation: [0.0, 0.0, 0.0, 0.0]
        },
        lockid: "121"
    },
    world: {
        // scene 0 to N - 1
        scene: 0
    }
};
*/

let state = {};
state['objects'] = {};
state['world'] = {};
let object_ttl = {};

const stdin = process.openStdin();
if(stdin.isTTY)
    stdin.setRawMode(true);
// stdin.resume();
stdin.setEncoding( 'utf8' );

stdin.on( 'data', function( key ){
    	// console.log(key);
    //	console.log(key.charCodeAt(1));
    //	console.log(key.charCodeAt(2));
    //	console.log(key.charCodeAt(3));
    
    if ( key === '\u0003' ) {
        process.exit();
    }

    if ( key === ' ') {
        state = {};
        state['objects'] = {};
        state['world'] = {};
        object_ttl = {};

        console.log("clear!!!!!");
    }

    // save session
    // if ( key == 's') {
    //     //const dateString = Date.now().toLocaleString("en-us");
    //     //fs.writeFileSync('savefile' + dateString + '.json', JSON.stringify(state));
    // }

    // // load session
    // if (key == 'l') {
    //     //const file = fs.readFileSync('addbetteravefilehere.json');
    //     //const loaded = JSON.parse(file);
        
    // }
});

const run = async () => {
    
    if(await control.connect({token: config.token}, config).catch((err) => { console.log(err); })) {
        //cleaning all previous streams from this app
        await control.disconnect();

        senderStreamid = await control.createSender(config.workspace, config.protocol, config.senderType);

        received = await control.createReceiver(config.workspace, config.protocol, [], config.receiverType, true).catch((err) => { console.log(err); });
        //for (const stream in received)
        //    patched[received[stream].streamid] = await control.createSender(config.workspace, config.protocol, config.senderType, '', received[stream].streamid);

        control.on('close', () => {
            console.log('Control connection closed.');
            process.exit();
        });

        control.on('receiver', async (data) => {
            received = await control.subscribe([data.streamid]);
            console.log('New streams announced', received);
        //    for (const stream in received)
        //        if(typeof patched[received[stream].streamid] == 'undefined')
        //            patched[received[stream].streamid] = await control.createSender(config.workspace, config.protocol, config.senderType, '', received[stream].streamid)
        });

        control.on('data', (streamid, data, timestamp)=> {
            console.log(`received: d${data.length}, stream ${streamid}, t${timestamp}`);
            
            const json = JSON.parse(data.toString());
            if (json['type'] == 0) {

                if (world_tick > 0.0) {
                    // state['world'] = json['world'];
                    world_tick -= 1.0;
                } else {
                    state['world'] = json['world'];
                    world_tick = world_switch_timeout;
                }

            } else if (json['type'] == 1) {
                state['objects'][json['username']] = json;
            } else {
                if (state['objects'][json['uid']] && state['objects'][json['uid']]['lockid'] != json['lockid'] && state['objects'][json['uid']]['lockid'] != "") {
                    //control.send(patched[streamid], Buffer.from("eet nawt yerz"));
                } else {
                    state['objects'][json['uid']] = json;
                    object_ttl[json['uid']] = 0.0;
                }
            }
            //console.log(patched);
            //control.send(patched[streamid], Buffer.from(JSON.stringify(state)));
        });
        
        // add a timestamp to the world state...server timestamp
        const broadcastLoop = setInterval(() => {
            
            state['time'] = Date.now();
            // console.log(state['time']);
            let dropkeys = [];
            
            for (const key in object_ttl) {
                object_ttl[key] += interval;
                if (object_ttl[key] >= timeout) {
                    state['objects'][key]['lockid'] = "";
                    //delete state['objects'][key];
                    dropkeys.push(key);
                }
            }

            dropkeys.forEach((key) => {
                delete object_ttl[key];
            });
            
            control.send(senderStreamid, Buffer.from(JSON.stringify(state)));
            
        }, interval);
        
    }
};
  
run();
