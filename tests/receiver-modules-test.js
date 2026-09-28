'use strict'
const assert=require('assert')
const create=require('../receiver-link')
const {createRegistry,defaults}=require('../receiver/scenario-registry')
const createSimulator=require('../receiver/link-simulator')
const allocator=require('../receiver/budget-allocator')
const definitions=require('../receiver/scenarios.json')

assert.throws(()=>createRegistry([...definitions,definitions[0]]),/duplicate/)
assert.throws(()=>createRegistry([{...definitions[0],lossProbability:2}]),/lossProbability/)
assert.throws(()=>createRegistry([{...definitions[0],stages:[{untilSeconds:2,fraction:1}]}]),/cover/)
assert.throws(()=>defaults.get(99),/Unknown/)
assert(Object.isFrozen(defaults.get(0).stages[0]))
const custom=createRegistry([{...definitions[0],id:99,name:'custom-clean-delay',backgroundFraction:0,lossProbability:0,duplicateProbability:0,reorderProbability:0,jitterMs:0,delayMs:25}])
const sim=createSimulator(custom),options={profile:99,simulation:true,capacityBps:8000000,seed:42}
const state=sim.create(options,0),packet=Buffer.alloc(972),counts=[]
sim.enqueue(state,packet,{label:'opaque'},0,(...args)=>counts.push(args),()=>{})
assert.strictEqual(sim.drain(state,25).length,0)
const ready=sim.drain(state,26)
assert.strictEqual(ready.length,1);assert.strictEqual(ready[0].label,'opaque');assert.strictEqual(state.bytes,0)
assert.strictEqual(custom.capacity(options,0,1000),8000000)

const large={maximum:16,perChannel:128000,headerBudget:200,packetRate:100}
large.demand=allocator.rate(large,16)
const small={...large,maximum:1};small.demand=allocator.rate(small,1)
const before=JSON.stringify([large,small])
const allocated=allocator.allocate(4000000,[large,small],large)
assert(allocated.shareBps>1600000,'small-source surplus must be redistributed')
assert.strictEqual(JSON.stringify([large,small]),before)

// A replacement controller can choose an order without accessing packet/queue
// internals; the existing wire filter still enforces sequence and HOA metadata.
let time=0,updates=0
const policy={create:maximum=>({desired:maximum}),reset:(s,maximum)=>{s.desired=maximum},update:s=>{updates++;s.desired=4;return {reason:'test-policy',desiredChannels:4}}}
const engine=create({source:{1:{}},target:{10:{}},streamRelay:{1:{10:true}},emit:()=>{},now:()=>time,controller:policy,scenarios:custom})
engine.configure(10,{...options,adaptive:true,simulation:false})
assert(engine.supportsProfile(99));assert(!engine.supportsProfile(1))
const output=[]
function send(frame) {
 const h={sv:1,br:128000,ep:100,a:frame*480,n:480,f:48000,s:0,e:1,t:16,o:3,c:2,cg:1,i:frame+1,og:1}
 const json=Buffer.from(JSON.stringify(h)),prefix=Buffer.alloc(8);prefix.writeUInt16LE(json.length,0);prefix.writeUInt16LE(1,2)
 engine.relay(1,10,Buffer.concat([prefix,json,Buffer.from([7])]),p=>output.push(JSON.parse(p.toString('utf8',8,8+p.readUInt16LE(0)))))
}
send(0);const route=engine.links.get(10).routes.get(1)
engine.feedback({receiverID:10,senderID:1,epoch:'100',routeID:route.tag,sequence:1})
time=10;send(1)
assert.strictEqual(updates,1);assert.strictEqual(output[1].t,4);assert.strictEqual(output[1].i,2)
assert.throws(()=>engine.configure(10,{...options,profile:404}),/Unknown/)
assert.strictEqual(engine.links.get(10).options.profile,99)
console.log('PASS configurable validated scenarios, pure allocation and replaceable controller contract')
