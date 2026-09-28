'use strict'
const assert=require('assert'),crypto=require('crypto')

// Deterministic pre-refactor golden trace: full periods, two recipients, source
// join/leave, feedback degradation/recovery, control restart and lease expiry.
function trace(create,profile) {
 let time=0,serial=0,feedbackSequence=0,delivered=0
 const digest=crypto.createHash('sha256')
 const source={1:{},2:{}},target={10:{},20:{}},streamRelay={1:{10:true,20:true},2:{10:true}}
 const record=value=>digest.update(JSON.stringify(value)+'\n')
 const saved=Date.now;Date.now=()=>1790343896669
 let engine
 try {engine=create({source,target,streamRelay,now:()=>time,emit:(event,data)=>record({event,data}),account:(status,sid,rid,p)=>record({status,sid,rid,p:p.toString('base64')})})} finally {Date.now=saved}
 const options={adaptive:true,simulation:true,capacityBps:6000000,profile,seed:42}
 engine.configure(10,options);engine.configure(20,{...options,capacityBps:12000000})
 function send(sid,id) {
  for(const [s,e] of [[0,1],[1,4],[4,9],[9,16]]) {
   const h={sv:1,br:128000,ep:100,a:time*48,n:480,f:48000,s,e,t:16,o:3,c:2,cg:s+1,i:++serial,og:1}
   const json=Buffer.from(JSON.stringify(h)),header=Buffer.alloc(8),payload=Buffer.alloc((e-s)*160,serial%256)
   header.writeUInt16LE(json.length,0);header.writeUInt16LE(payload.length,2);header.writeUInt32LE(sid,4)
   engine.relay(sid,id,Buffer.concat([header,json,payload]),p=>{delivered++;record({delivered:id,p:p.toString('base64')})})
  }
 }
 for(time=0;time<=150000;time+=10) {
  if(time%1000===0){engine.configure(10,options);engine.configure(20,{...options,capacityBps:12000000})}
  send(1,10);send(1,20)
  if(time>=20000 && time<40000)send(2,10)
  if(time===40000)delete streamRelay[2][10]
  if(time>0 && time%250===0) {
   const r=engine.links.get(10).routes.get(1),bad=time>=6000 && time<7500
   engine.feedback({receiverID:10,senderID:1,epoch:'100',routeID:r.tag,sequence:++feedbackSequence,packets:100,gapPercent:0,latePercent:bad?25:0,bufferMs:bad?0:20,extraDelayMs:bad?40:12,jitterMs:1})
  }
  engine.pump()
 }
 engine.stop(10);send(1,10);time+=6000;engine.pump()
 return {profile,delivered,sha256:digest.digest('hex')}
}
if(require.main===module) {
 const expected=require('./fixtures/receiver-before-refactor.json')
 const actual=expected.map(row=>trace(require('../receiver-link'),row.profile))
 assert.deepStrictEqual(actual,expected)
 console.log('PASS pre-refactor golden traces: identical packets, decisions, queues and byte events for all five scenarios')
}
module.exports=trace
