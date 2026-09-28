'use strict'

/** Simulator contract: create(options, nowMs), reset(state, options, nowMs),
 * enqueue(state, packet, opaqueJob, nowMs, count, account), drain(state, nowMs),
 * cancel(state), setOptions(state, options), capacity(state, nowMs). Owns queue, PRNG and serializer only.
 * drain returns due jobs; the orchestrator validates identities before delivery.
 * Byte callbacks report interval deltas; no socket or subscription access here.
 */
module.exports=function createSimulator(scenarios) {
  const create=(options,time)=>({options,start:time,cursor:time,queue:[],bytes:0,random:options.seed||42,bad:false,stateTick:0})
  const reset=(state,options,time)=>Object.assign(state,create(options,time))
  function random(l) { l.random=(Math.imul(l.random,1664525)+1013904223)>>>0;return (l.random+.5)/4294967296 }
  const setOptions=(state,options)=>{state.options=options}
  const capacity=(l,time)=>scenarios.capacity(l.options,l.start,time)
  function cancel(l) { const bytes=l.bytes;l.bytes=0;l.queue=[];return bytes }
  function drain(l,time) {
    l.queue.sort((a,b)=>a.due-b.due)
    const jobs=[]
    while(l.queue.length && l.queue[0].due<=time) {const job=l.queue.shift();l.bytes-=job.packet.length;jobs.push(job)}
    return jobs
  }
  function enqueue(l,output,job,time,count,account) {
    // Reserve nominal competing traffic in the shared serializer; all audio routes share this queue.
    const elapsed=(time-l.start)/1000, p=scenarios.get(l.options.profile)
    const background=l.options.capacityBps*p.backgroundFraction*(p.backgroundBurst ? (elapsed+l.options.seed*p.backgroundSeedScale)%p.backgroundPeriodSeconds<p.backgroundDuty*p.backgroundPeriodSeconds ? p.backgroundHigh : p.backgroundLow : 1)
    // Bursty state evolves in 10 ms steps, independently of packet count.
    const tick=Math.floor(elapsed*100)
    if(tick-l.stateTick>1000) l.stateTick=tick-1000
    while(l.stateTick<tick) { if(p.burstyLoss) { if(l.bad) { if(random(l)<p.badExitProbability) l.bad=false } else if(random(l)<p.badEntryProbability) l.bad=true } l.stateTick++ }
    const bad=p.burstyLoss && l.bad
    const rate=Math.max(1000,capacity(l,time)*(bad?p.badCapacityFactor:1)-background)
    if(l.bytes+output.length>Math.min(8*1024*1024,Math.max(2000,l.options.capacityBps*.05/8)) || l.queue.length>=8192) { count('overflowBytes',output.length); account('overflow',output); return }
    const serialized=Math.max(time,l.cursor)+(output.length+28)*8*1000/rate; l.cursor=serialized
    if(random(l)<(bad?p.badLossProbability:p.lossProbability)) { count('randomLossBytes',output.length); account('random_loss',output); return }
    const due=serialized+p.delayMs+(random(l)*2*p.jitterMs-p.jitterMs)+(random(l)<p.reorderProbability?random(l)*p.reorderDelayMs:0)
    l.queue.push({due,packet:output,...job}); l.bytes+=output.length
    if(random(l)<p.duplicateProbability && l.queue.length<8192 && l.bytes+output.length<=8*1024*1024) {
      l.queue.push({due:due+p.duplicateDelayMs,packet:output,...job});l.bytes+=output.length;count('duplicateBytes',output.length)
    }
  }
  return {create,reset,setOptions,capacity,cancel,drain,enqueue}
}
