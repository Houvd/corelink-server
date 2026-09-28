'use strict'

const defaultController=require('./receiver/hoa-controller')
const defaultBudget=require('./receiver/budget-allocator')
const defaultFilter=require('./receiver/hoa-packet-filter')
const defaultScenarios=require('./receiver/scenario-registry').defaults
const createSimulator=require('./receiver/link-simulator')

/** Receiver service: authenticating requests remains the caller's responsibility.
 * Owns receiver leases and source/recipient lifecycle. Injected modules follow
 * the contracts declared in their files; controller state and simulator state
 * are separate from packet routing state. All clocks use monotonic milliseconds.
 */
module.exports=function createReceiverLinks({source,target,streamRelay,emit,account=()=>{},now=()=>Number(process.hrtime.bigint())/1e6,
  controller=defaultController,budget=defaultBudget,packetFilter=defaultFilter,scenarios=defaultScenarios,simulator=createSimulator(scenarios)}) {
  const links=new Map()
  let routeSerial=Date.now()*1000
  const count=(l,key,bytes)=>{l.counts[key]=(l.counts[key]||0)+bytes}
  function flush(id,l) {
    const time=now(),minimumRequiredBps=budget.minimum(l.routes.values())
    emit('receiver_link_bytes',{receiverID:id,minimumRequiredBps,budgetInsufficient:minimumRequiredBps>budget.available(l.options.capacityBps),
      intervalMs:time-l.lastLog,capacityBps:simulator.capacity(l.network,time),pendingBytes:l.network.bytes,...l.counts})
    l.counts={};l.lastLog=time
  }
  function configure(id,options) {
    scenarios.get(options.profile) // Validate before changing any live state.
    const old=links.get(id),time=now()
    if(old && JSON.stringify(old.options)===JSON.stringify(options)) {old.lease=time;return}
    if(old) {
      count(old,'canceledBytes',simulator.cancel(old.network));flush(id,old)
      old.options={...options};old.lease=time;simulator.reset(old.network,old.options,time)
      for(const r of old.routes.values()) controller.reset(r.controller,r.maximum,time)
      emit('receiver_link_start',{receiverID:id,...options});return
    }
    if(links.size>=256) throw new Error('Receiver link limit reached')
    const saved={...options}
    links.set(id,{options:saved,lease:time,network:simulator.create(saved,time),routes:new Map(),lastLog:time,counts:{}})
    emit('receiver_link_start',{receiverID:id,...options})
  }
  function stop(id) {
    const l=links.get(id);if(!l)return
    count(l,'canceledBytes',simulator.cancel(l.network));flush(id,l)
    l.options={...l.options,simulation:false,adaptive:false};simulator.setOptions(l.network,l.options);l.lease=Infinity
    emit('receiver_link_stop',{receiverID:id})
  }
  function feedback(m) {
    const l=links.get(m.receiverID),r=l&&l.routes.get(m.senderID)
    if(!r || !l.options.adaptive || String(r.epoch)!==m.epoch || m.routeID!==r.tag || m.sequence<=r.feedbackSequence)return
    const time=now();r.feedbackSequence=m.sequence;r.feedbackAt=time
    const decision=controller.update(r.controller,m,time,r.maximum)
    if(decision) emit('receiver_controller_decision',{senderID:m.senderID,receiverID:m.receiverID,routeID:r.tag,...decision})
  }
  function pump() {
    const time=now()
    for(const [id,l] of links) {
      if(!target[id]) {stop(id);links.delete(id);continue}
      if(time-l.lease>5000)stop(id)
      for(const [sid,r] of l.routes)if(!source[sid] || !streamRelay[sid] || !streamRelay[sid][id] || time-r.seen>3000)l.routes.delete(sid)
      for(const job of simulator.drain(l.network,time)) {
        if(links.get(id)!==l || target[id]!==job.target || source[job.sid]!==job.source || (job.route && l.routes.get(job.sid)!==job.route) || !streamRelay[job.sid] || !streamRelay[job.sid][id]) {count(l,'canceledBytes',job.packet.length);continue}
        count(l,'releasedBytes',job.packet.length);job.deliver(job.packet)
      }
      if(time-l.lastLog>=1000 && (l.options.simulation || Object.keys(l.counts).length))flush(id,l)
    }
  }
  function enqueue(l,sid,id,output,deliver,route) {
    if(!l.options.simulation) {count(l,'releasedBytes',output.length);deliver(output);return}
    simulator.enqueue(l.network,output,{deliver,sid,target:target[id],source:source[sid],route},now(),
      (key,bytes)=>count(l,key,bytes),(status,packet)=>account(status,sid,id,packet))
  }
  function relay(sid,id,packet,deliver) {
    const l=links.get(id);if(!l){deliver(packet);return}
    account('offered',sid,id,packet);count(l,'offeredBytes',packet.length)
    const h=packetFilter.parse(packet)
    if(!h){enqueue(l,sid,id,packet,deliver,null);return}
    const time=now();let r=l.routes.get(sid)
    if(!r && l.routes.size>=64){enqueue(l,sid,id,packet,deliver,null);return}
    if(r && h.ep<r.epoch){count(l,'staleBytes',packet.length);return}
    if(!r || r.epoch!==h.ep) {
      r=packetFilter.create(h,++routeSerial,time);r.controller=controller.create(h.t,time)
      l.routes.set(sid,r)
    }
    r.seen=time;r.maximum=h.t
    if(!r.headerBudget)r.headerBudget=Buffer.byteLength(JSON.stringify(Object.fromEntries(Object.entries(h).filter(([key])=>!key.startsWith('dg')))))+64
    r.perChannel=Math.max(1,Number(h.br)||128000);r.packetRate=h.f/h.n;r.demand=budget.rate(r,r.maximum)
    if(h.a<r.frame){count(l,'staleBytes',packet.length);return}
    if(h.a>r.frame) {
      r.frame=h.a
      const allocation=budget.allocate(l.options.capacityBps,l.routes.values(),r)
      const next=l.options.adaptive?Math.min(h.t,r.controller.desired,allocation.channels):h.t
      if(packetFilter.select(r,next))emit('receiver_order_change',{senderID:sid,receiverID:id,epoch:String(h.ep),channels:next,sourceChannels:h.t,frame:h.a,generation:r.generation,shareBps:allocation.shareBps})
    }
    if(h.e>r.channels){count(l,'filteredBytes',packet.length);account('filtered',sid,id,packet);return}
    const output=packetFilter.rewrite(r,h,packet)
    if(!output){count(l,'invalidBytes',packet.length);return}
    count(l,'selectedBytes',output.length);account('selected',sid,id,output)
    enqueue(l,sid,id,output,deliver,r)
  }
  return {configure,stop,relay,feedback,pump,links,supportsProfile:scenarios.has}
}
