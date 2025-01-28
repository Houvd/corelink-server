const corelink = require('./corelink.lib.js')

const config = {
  ControlPort: 20012,
  // ControlIP: '127.0.0.1',
  ControlIP: 'corelink.hsrn.nyu.edu',

  /*
  autoReconnect: false,
    for service in a local network please replace the certificate with the appropriate version
  cert: '<corelink-tools-repo>/config/ca-crt.pem'
  */
  cert: '/Users/zack/Documents/repos/corelink-server/config/ca-crt.pem'
}

const username = 'Testuser'
const password = 'Testpassword'

const workspace = 'Holodeck'
const protocol = 'tcp'
const datatype = 'benchmarking'

process.on('SIGINT', () => {
  console.log('Disconnect Corelink gracefully...');
  corelink.disconnect();
  process.exit(0);
});

let receivedCount = 0;
let totalTransitTime = 0;
let jitter = 0;
let lastTransitTime = -1;
let interArrivalTime = -1;
let totalJitter = 0;
let receiving = true;

const run = async () => {
    // corelink.setDebug(true);
    if (await corelink.connect({ username, password }, config).catch((err) => { console.log(err) })) {
    sender = await corelink.createSender({
      workspace,
      protocol,
      type: datatype,
      metadata: { name: 'benchmarking' },
    }).catch((err) => { console.log(err) })

    // Provide the sender update callback.
    corelink.on('sender', (data) => {
      console.log('Sender update:', data)

      const intervalId = setInterval(async () => {
        const buffer = Buffer.from(new Uint8Array(1024));
        corelink.send(sender, buffer, { "timestamp":  Number(process.hrtime.bigint() / 1000n) });
      }, 1);

      // for (let i = 0; i < 100000; i++) {
      //   const buffer = Buffer.from(new Uint8Array(1024));
      //   corelink.send(sender, buffer, { "timestamp":  Number(process.hrtime.bigint() / 1000n) });
      // }

      setTimeout(() => {
        clearInterval(intervalId);
        // console.log(`Average Transit Time = ${totalTransitTime / receivedCount} µs`);
        // console.log(`Average Jitter = ${totalJitter / receivedCount} µs`);
        console.log('End Timer');
      }, 100000);
    })

    await corelink.createReceiver({
      workspace,
      protocol,
      type: datatype,
      echo: true,
      alert: true,
    }).catch((err) => { console.log(err) })

    corelink.on('receiver', async (data) => {
      const options = { streamIDs: [data.streamID] }
      await corelink.subscribe(options)
    })

    corelink.on('data', (streamID, data, header) => {
      if (receivedCount < 25000) {
        if (!isNaN(header.timestamp) && !isNaN(Number(process.hrtime.bigint() / 1000n) - header.timestamp)) {
          console.log(header.timestamp);
          console.log('Transit Time = ',  Number(process.hrtime.bigint() / 1000n) - header.timestamp, " us");
          const newTransitTime = Number(process.hrtime.bigint() / 1000n) - header.timestamp;
          if (lastTransitTime === -1) {
            lastTransitTime = newTransitTime;
          } else {
            interArrivalTime = newTransitTime - lastTransitTime;
            lastTransitTime = newTransitTime;
            jitter = jitter + ((Math.abs(interArrivalTime) - jitter) / 16);
            totalJitter += jitter;
          }
          receivedCount++;
          // console.log('receivedCount = ', receivedCount);
          totalTransitTime += Number(process.hrtime.bigint() / 1000n) - header.timestamp;
        }
      } else if (receiving) {
        // console.log("totalTransitTime = ", totalTransitTime);
        // console.log("totalJitter = ", totalJitter);
        // console.log("receivedCount = ", receivedCount);
        console.log(`Average Transit Time = ${totalTransitTime / receivedCount} µs`);
        console.log(`Average Jitter = ${totalJitter / receivedCount} µs`);
        receiving = false;
      }
    })

  }
}

run()
