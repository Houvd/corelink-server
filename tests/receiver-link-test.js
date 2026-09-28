'use strict'
const assert=require('assert'), create=require('../receiver-link')
let time=0
const source={1:{},2:{},3:{}},target={10:{},20:{}},streamRelay={1:{10:true,20:true},2:{10:true},3:{10:true}},events=[],out=[]
const links=create({source,target,streamRelay,emit:(event,data)=>events.push({event,data}),now:()=>time})
const options={simulation:false,adaptive:true,capacityBps:100000000,profile:4,seed:42}
function packet(sid,frame,start,end,total=16){
 const h={sv:1,br:128000,ep:100,a:frame*480,n:480,f:48000,s:start,e:end,t:total,o:Math.sqrt(total)-1,c:2,cg:start+1,i:frame*4+Math.sqrt(start),og:1}
 const json=Buffer.from(JSON.stringify(h)),p=Buffer.alloc(8);p.writeUInt16LE(json.length,0);p.writeUInt16LE(12,2);p.writeUInt32LE(sid,4)
 return Buffer.concat([p,json,Buffer.alloc(12)])
}
function frame(sid,id,n){for(const [s,e] of [[0,1],[1,4],[4,9],[9,16]])links.relay(sid,id,packet(sid,n,s,e),p=>out.push({id,h:JSON.parse(p.toString('utf8',8,8+(p.readUInt16LE(0)&32767)))}))}
links.configure(10,options);links.configure(20,options)
frame(1,10,0);frame(1,20,0)
const initialCodecs=new Map(out.filter(x=>x.id===10).map(x=>[x.h.s,x.h.cg]))
const r=links.links.get(10).routes.get(1)
for(let i=1;i<=20;i++){time=i*250;links.feedback({receiverID:10,senderID:1,epoch:'100',routeID:r.tag,sequence:i,packets:100,latePercent:20,gapPercent:0,bufferMs:0,extraDelayMs:0,jitterMs:0})}
frame(1,10,1);frame(1,20,1)
assert(out.filter(x=>x.id===10).at(-1).h.t<16)
assert.strictEqual(out.filter(x=>x.id===20).at(-1).h.t,16)
let ids=out.filter(x=>x.id===10).map(x=>x.h.i);assert.deepStrictEqual(ids,ids.map((_,i)=>i+1))
const tag=r.tag,last=out.filter(x=>x.id===10).at(-1).h.og
links.stop(10);frame(1,10,2)
assert.strictEqual(out.at(-1).h.t,16);assert(out.at(-1).h.og>last);assert.strictEqual(out.at(-1).h.rt,tag)
assert(out.at(-1).h.cg!==initialCodecs.get(9))
assert.strictEqual(out.filter(x=>x.id===10 && x.h.s===0).at(-1).h.cg,initialCodecs.get(0))
links.configure(10,{...options,capacityBps:3000000});frame(1,10,3);frame(2,10,3);frame(3,10,3);frame(1,10,4)
assert.strictEqual(links.links.get(10).routes.size,3)
assert(out.at(-1).h.t<=4)
links.configure(10,{...options,simulation:true});frame(1,10,5)
assert(links.links.get(10).network.queue.length>0)
const before=out.length;links.stop(10);time+=1000;links.pump();assert.strictEqual(out.length,before)
links.configure(10,{...options,simulation:true});frame(1,10,6);delete streamRelay[1][10];time+=1000;links.pump();assert.strictEqual(out.length,before)
console.log('PASS independent receiver orders, contiguous filtered sequences, stop/reset, shared shares, queue cancellation/unsubscribe')
// Recovery tolerates isolated mild impairment; it is not a run of perfect reports.
{
 let clock=0
 const delivered=[]
 const source={1:{}},target={10:{}},streamRelay={1:{10:true}}
 const engine=create({source,target,streamRelay,emit:()=>{},now:()=>clock})
 engine.configure(10,options)
 const send=n=>engine.relay(1,10,packet(1,n,0,1),p=>delivered.push(JSON.parse(p.toString('utf8',8,8+p.readUInt16LE(0)))))
 send(0); const route=engine.links.get(10).routes.get(1)
 route.controller.desired=4
 let sequence=0
 for(let step=1;step<=280;step++) {
  clock=step*250
  engine.configure(10,options)
  send(step)
  engine.feedback({senderID:1,receiverID:10,epoch:'100',routeID:route.tag,sequence:++sequence,packets:100,gapPercent:step%17===0?1:0,latePercent:0,bufferMs:20,extraDelayMs:10,jitterMs:1})
 }
 assert.strictEqual(delivered.at(-1).t,16)
 const before=route.controller.desired
 engine.feedback({senderID:1,receiverID:10,epoch:'100',routeID:route.tag-1,sequence:++sequence,packets:100,gapPercent:100,latePercent:100,bufferMs:0,extraDelayMs:100,jitterMs:100})
 assert.strictEqual(route.controller.desired,before)
 console.log('PASS rolling recovery to full order and stale route feedback isolation')
}
// All sources consume one serializer, not independent full-capacity links.
{
 let clock=0
 const delivered=[]
 const source={1:{},2:{}},target={10:{}},streamRelay={1:{10:true},2:{10:true}}
 const engine=create({source,target,streamRelay,emit:()=>{},now:()=>clock})
 engine.configure(10,{...options,adaptive:false,simulation:true,profile:0,capacityBps:32000})
 const push=(sid,n)=>engine.relay(sid,10,packet(sid,n,0,1),p=>delivered.push(p))
 for(let i=0;i<10;i++){push(1,i);push(2,i)}
 const link=engine.links.get(10)
 assert(link.counts.overflowBytes>0)
 assert(link.network.queue.length>1)
 assert(link.network.queue[1].due>link.network.queue[0].due)
 clock=6001;engine.pump()
 assert.strictEqual(link.network.queue.length,0)
 assert.strictEqual(link.options.simulation,false)
 assert.strictEqual(delivered.length,0)
 console.log('PASS aggregate receiver bottleneck, bounded overflow and lease expiry cancellation')
}
// Regression: the Sep 25 trace had isolated ~44% late reports followed by
// healthy packets. Their two-second rolling tail must not lower the order.
{
 let clock=0, sequence=0, frameNumber=0
 const decisions=[]
 const engine=create({source:{1:{}},target:{10:{}},streamRelay:{1:{10:true}},emit:(event,data)=>{if(event==='receiver_controller_decision')decisions.push(data)},now:()=>clock})
 engine.configure(10,options)
 const send=()=>engine.relay(1,10,packet(1,frameNumber++,0,1),()=>{})
 send();const r=engine.links.get(10).routes.get(1)
 const report=(overrides={})=>{
  clock+=250;engine.configure(10,options);send()
  engine.feedback({senderID:1,receiverID:10,epoch:'100',routeID:r.tag,sequence:++sequence,packets:50,gapPercent:0,latePercent:0,bufferMs:12,extraDelayMs:12,jitterMs:1,...overrides})
 }
 for(let i=0;i<20;i++)report()
 report({packets:82,latePercent:44,extraDelayMs:17,bufferMs:0})
 for(let i=0;i<12;i++)report()
 assert.strictEqual(r.controller.desired,16,'isolated late burst must not cause delayed downgrade')
 for(let i=0;i<10;i++)report({latePercent:8})
 assert(r.controller.desired<16,'sustained moderate impairment must still lower order')
 assert(decisions.some(d=>d.reason==='sustained_current_impairment'))
 // Start impairment with a new propagation delay: do not reuse the LAN floor.
 engine.configure(10,{...options,simulation:true})
 assert.strictEqual(r.controller.floor,Infinity)
 assert.strictEqual(r.controller.emergency,0)
 assert.strictEqual(r.controller.probeUntil,0)
 // Restore the non-simulated control configuration, then prove a failed probe
 // backs off and a later successful probe clears that historical penalty.
 engine.configure(10,options)
 r.controller.desired=1;r.controller.changed=clock;r.controller.nextProbe=clock+30000
 for(let i=0;i<124;i++)report()
 assert.strictEqual(r.controller.desired,4)
 report({latePercent:50,bufferMs:0});report({latePercent:50,bufferMs:0})
 // Respect the existing minimum one-second hold after the probe.
 report({latePercent:50,bufferMs:0});report({latePercent:50,bufferMs:0})
 assert.strictEqual(r.controller.desired,1)
 assert.strictEqual(r.controller.retry,60000)
 for(let i=0;i<244;i++)report()
 assert.strictEqual(r.controller.desired,4)
 for(let i=0;i<44;i++)report()
 assert.strictEqual(r.controller.retry,30000)
 for(let i=0;i<220;i++)report()
 assert.strictEqual(r.controller.desired,16,'healthy recovery must reach full order')
 console.log('PASS isolated late burst, sustained impairment, delay-floor reset, failed/successful probes and full recovery')
}
