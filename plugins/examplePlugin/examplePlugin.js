//V1.0.0.0

//set the token to the value that matches the access token in the Corelink
var token = '!dfshdgs'

var config = require('../../../config/configure');
const control     = require('../../../lib/corelink.lib');

var patched = []
var workspace = 'Holodeck'
var protocol  = 'udp'
var receiverType = ['3d']
var senderType   = 'skeleton'



const run = async () => {
    if(await control.connect({token:token},config).catch((err) => { console.log(err) })) {
        //cleaning all previous streams from this app
        await control.disconnect()

        received = await control.createReceiver(workspace, protocol, [], receiverType, true).catch((err) => { console.log(err) })
        for(var stream in received)
            patched[received[stream].streamid] = await control.createSender(workspace, protocol, senderType, '', received[stream].streamid)

        control.on('close', () => {
            console.log('Control connection closed.')
            process.exit()
        })

        control.on('receiver',async (data) => {
            received = await control.subscribe([data.streamid])
            console.log('New streams announced', received)
            for(var stream in received)
                if(typeof patched[received[stream].streamid] == 'undefined')
                    patched[received[stream].streamid] = await control.createSender(workspace, protocol, senderType, '', received[stream].streamid)
        })

        control.on('data',(streamid, data, timestamp)=> {
            console.log(`received: d${data.length}, stream ${streamid}, t${timestamp}`);
            //here is the actual work that the app is doing... in this case it adds two exclemation marks to the payload
            control.send(patched[streamid], Buffer.from('!!'+data.toString()))
        })

    }
}
  
run();
