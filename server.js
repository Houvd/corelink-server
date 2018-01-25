const dgram = require('dgram');
const server = dgram.createSocket('udp4');

console.log('trying to bind ports');

server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  server.send(Buffer.from('hello back'),rinfo.port,rinfo.address, (err) => {
    if(err) {
      console.lof('socket error', err);
    }
  });
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(20000);
