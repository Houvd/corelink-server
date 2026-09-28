'use strict'

/** Controller contract: create(maximumChannels, nowMs), reset(state, maximumChannels,
 * nowMs), update(state, validatedFeedback, nowMs, maximumChannels) -> decision|null.
 * Owns only state returned by create. No packet, queue, socket or clock access.
 * Channels are HOA squares; all time values are monotonic milliseconds.
 */
function create(maximum, time) {
  return {desired:maximum, changed:time, nextProbe:time+30000, retry:30000,
    window:[], delayMean:0, emergency:0, emergencySince:0, lastSevere:-Infinity,
    previousFeedback:time, floor:Infinity, goodSince:0, badSince:0, bad:0}
}
function reset(state, maximum, time) {
  Object.assign(state, create(maximum,time), {probeUntil:0,previousFeedback:-Infinity})
}
function update(r, m, time, maximum) {
    const continuous=time-r.previousFeedback<=1000
    const growth=continuous?m.extraDelayMs-r.delayMean:0
    const alpha=continuous?1-Math.exp(-(time-r.previousFeedback)/1000):1
    r.delayMean+=alpha*(m.extraDelayMs-r.delayMean)
    const impairment = Math.max(m.gapPercent, m.latePercent)
    if (m.packets && impairment <= 1 && m.bufferMs >= 4 && m.jitterMs < 6) r.floor = Math.min(r.floor, m.extraDelayMs)
    const pressure = m.bufferMs < 4 || m.latePercent > 1 || growth>2
    const delay = pressure ? Math.max(0, m.extraDelayMs - (Number.isFinite(r.floor) ? r.floor : 0)) : 0
    if(time-r.previousFeedback>1000) { r.window=[];r.bad=0;r.badSince=0;r.emergency=0;r.emergencySince=0 }
    r.previousFeedback=time
    const jitter=pressure?m.jitterMs:0
    r.window.push({time,packets:m.packets,impairment,delay,jitter})
    while(r.window.length>1 && r.window[1].time<=time-30000) r.window.shift()
    while(r.window.length>256) r.window.shift()
    const average = list => { const n=list.reduce((s,p)=>s+p.packets,0); return n?list.reduce((s,p)=>s+p.packets*p.impairment,0)/n:100 }
    const recent=average(r.window.filter(p=>p.time>=time-2000))
    const recovery=r.window.length>=80 && time-r.window[0].time>=30000 && average(r.window)<1.5 && recent<2 && r.window.every(p=>p.packets>0) && r.window.reduce((s,p)=>s+p.delay,0)/r.window.length<4 && r.window.reduce((s,p)=>s+p.jitter,0)/r.window.length<4
    // A rolling average remembers an isolated late burst. Require fresh evidence
    // in each report before accumulating sustained degradation.
    const degraded = !m.packets || (impairment>3 && recent>3) || delay > 10 || jitter > 6
    if (degraded) { if (!r.badSince) r.badSince = time; r.goodSince = 0; r.bad++ }
    else { r.bad = 0; r.badSince = 0; if (!r.goodSince) r.goodSince = time }
    if(m.packets && (impairment>15 || delay>40)) { if(!r.emergency) r.emergencySince=time; r.emergency++;r.lastSevere=time }
    else {r.emergency=0;r.emergencySince=0}
    const urgent=r.emergency>=2 && time-r.emergencySince>=250
    let result = null
    const decision = (reason, before) => { result = {
      previousChannels:before, desiredChannels:r.desired, reason,
      impairmentPercent:impairment, recentImpairmentPercent:recent,
      relativeDelayMs:delay, bufferMs:m.bufferMs, jitterMs:m.jitterMs,
      retryMs:r.retry, nextProbeInMs:Math.max(0,r.nextProbe-time)
    } }

    // A successful probe clears old failure penalties; repeated genuine failures
    // still back off. Never classify a single bad report as a failed probe.
    if (r.probeUntil && time>=r.probeUntil && r.goodSince && time-r.goodSince>=5000) {
      r.retry=30000; r.probeUntil=0
    }
    if ((urgent || (r.bad >= 4 && time-r.badSince >= 1000)) && time-r.changed >= (urgent?1000:3000) && r.desired > 1) {
      const before=r.desired
      r.desired = Math.max(1,Math.sqrt(r.desired)-(urgent?2:1))**2; r.changed=time; r.goodSince=0; r.bad=0; r.window=[]
      if (time < r.probeUntil) r.retry = Math.min(300000,r.retry*2)
      r.nextProbe=time+r.retry; r.probeUntil=0
      decision(urgent?'severe_current_impairment':'sustained_current_impairment',before)
    } else if (r.desired<maximum && recovery && time-r.lastSevere>=5000 && impairment<5 && delay<10 && time-r.changed >= 30000 && time >= r.nextProbe) {
      const before=r.desired
      r.desired=Math.min(maximum,(Math.sqrt(r.desired)+1)**2); r.changed=time; r.goodSince=0; r.probeUntil=time+10000; r.window=[]
      decision('recovery_probe',before)
    }
    return result
}
module.exports = {create,reset,update}
