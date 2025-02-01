const { connect, StringCodec, consumerOpts } = require('nats');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const run = async () => {
  const nc = await connect({ servers: 'nats://corelink.hsrn.nyu.edu:20014' });

  const subject = "benchmarking";
  const totalPackets = 25000;

  let receivedCount = 0;
  let totalTransitTime = 0;
  let jitter = 0;
  let lastTransitTime = -1;
  let interArrivalTime = -1;
  let totalJitter = 0;
  let receiving = true;

  const subscriber = async () => {
    const sub = nc.subscribe(subject);
    console.log(`Subscribed to '${subject}'`);

    let receivedCount = 0;
    let totalTransitTime = 0;
    for await (const msg of sub) {
      const fullBuffer = Buffer.from(msg.data);

      const headerType = fullBuffer.readUInt16LE(0);
      const dataSize = fullBuffer.readUInt32LE(2);
      const timestamp = fullBuffer.readBigUInt64LE(6);

      const payload = fullBuffer.slice(14);

      const newTransitTime = Number(process.hrtime.bigint() / 1000n - timestamp);
      console.log(timestamp);
      console.log('Transit Time = ', Number(process.hrtime.bigint() / 1000n - timestamp), " us");

      if (lastTransitTime === -1) {
        lastTransitTime = newTransitTime;
      } else {
        interArrivalTime = newTransitTime - lastTransitTime;
        lastTransitTime = newTransitTime;
        jitter = jitter + ((Math.abs(interArrivalTime) - jitter) / 16);
        // console.log('Jitter = ', jitter, " us");
        totalJitter += jitter;
      }

      receivedCount++;
      totalTransitTime += newTransitTime;

      if (receivedCount === totalPackets) {
        console.log(`Average Transit Time = ${totalTransitTime / receivedCount} µs`);
        console.log(`Average Jitter = ${totalJitter / receivedCount} µs`);
        break;
      }
    }
  };

  const publisher = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));  // Ensure subscriber is ready

    // Create payload (binary data)
    const payloadData = new Uint8Array(1024).fill(0xAB);
      for (let i = 0; i <= totalPackets; i++) {
      const bufferData = Buffer.from(payloadData);
      const timestamp = process.hrtime.bigint() / 1000n;

      // Create header (8 bytes)
      const header = Buffer.alloc(14);
      header.writeUInt16LE(1, 0);             // Header Type: 1
      header.writeUInt32LE(bufferData.length, 2); // Payload size: 1024
      header.writeBigUInt64LE(timestamp, 6);

      // Combine header + payload into one buffer
      const message = Buffer.concat([header, bufferData]);

      // Publish the combined buffer
      nc.publish(subject, message);
      await sleep(1);
    }
  };

  subscriber();
  publisher();

  setTimeout(async () => {
    await nc.drain();
  }, 100000);
}

run()
