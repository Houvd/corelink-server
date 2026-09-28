'use strict'
const assert=require('assert'),dgram=require('dgram'),{Client}=require('./receiver-feedback-e2e')
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))
async function main(){
 const clients=[new Client(),new Client(),new Client()],sockets=[dgram.createSocket('udp4'),dgram.createSocket('udp4'),dgram.createSocket('udp4')]
 const arrivals=[[],[]]
 try {
  for(const socket of sockets)await new Promise(resolve=>socket.bind(0,'127.0.0.1',resolve))
  for(const client of clients)await client.auth()
  const s=await clients[0].request({function:'sender',workspace:'Chalktalk',proto:'udp',type:'audio',IP:'127.0.0.1',port:sockets[0].address().port,alert:false});assert.equal(s.statusCode,0)
  const receivers=[]
  for(let i=1;i<=2;i++){
   const r=await clients[i].request({function:'receiver',workspace:'Chalktalk',proto:'udp',type:['audio'],streamIDs:[s.streamID],IP:'127.0.0.1',port:sockets[i].address().port,alert:false});assert.equal(r.statusCode,0);receivers.push(r)
   assert.equal((await clients[i].request({function:'subscribe',receiverID:r.streamID,streamIDs:[s.streamID]})).statusCode,0)
   sockets[i].on('message',p=>{if(p.length>=8){const h=JSON.parse(p.toString('utf8',8,8+(p.readUInt16LE(0)&32767)));arrivals[i-1].push(h)}})
   assert.equal((await clients[i].request({function:'receiverLink',version:1,receiverID:r.streamID,enabled:true,adaptive:true,simulation:true,capacityBps:i===1?10000000:600000,profile:0,seed:42})).statusCode,0)
  }
  function send(frame){for(const [start,end] of [[0,1],[1,4],[4,9],[9,16]]){
   const h={sv:1,br:128000,ep:123,a:frame*480,n:480,f:48000,s:start,e:end,t:16,o:3,c:2,cg:start+1,i:frame*4+Math.sqrt(start),og:1}
   const json=Buffer.from(JSON.stringify(h)),prefix=Buffer.alloc(8);prefix.writeUInt16LE(json.length,0);prefix.writeUInt16LE(12,2);prefix.writeUInt32LE(s.streamID,4)
   sockets[0].send(Buffer.concat([prefix,json,Buffer.alloc(12)]),s.port,'127.0.0.1')
  }}
  for(let f=0;f<10;f++){send(f);await pause(10)}
  await pause(150)
  assert(arrivals[0].length>0 && arrivals[1].length>0)
  assert(arrivals[0].every(h=>h.t===16))
  assert(arrivals[1].every(h=>h.t<16))
  for(let i=0;i<2;i++){
   const ids=[...new Set(arrivals[i].map(h=>h.i))].sort((a,b)=>a-b)
   assert.deepEqual(ids,ids.map((_,n)=>n+1))
   assert(arrivals[i].every(h=>Number.isSafeInteger(h.rt) && h.rt>0))
  }
  assert.equal((await clients[2].request({function:'receiverLink',version:1,receiverID:receivers[1].streamID,enabled:false})).statusCode,0)
  const last=arrivals[1].at(-1);send(11);await pause(100)
  assert.equal(arrivals[1].at(-1).t,16);assert.equal(arrivals[1].at(-1).rt,last.rt);assert(arrivals[1].at(-1).og>last.og)
  console.log('PASS real Corelink UDP fan-out: independent orders, filtered sequence continuity, stop restores full order without namespace rollback')
 }finally{for(const c of clients)c.socket.destroy();for(const s of sockets)s.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1})
