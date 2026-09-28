'use strict'

/** Stateless budget contract. Inputs: nominal bit/s and read-only route demand
 * records {maximum, perChannel, headerBudget, packetRate, demand}.
 * allocate returns {shareBps, channels}; it never mutates routes or packets.
 */
function rate(route, channels) {
  return channels*route.perChannel + Math.sqrt(channels)*8*(route.headerBudget+8+28)*route.packetRate
}
const available=capacityBps=>capacityBps*.8
function allocate(capacityBps, routes, route) {
  let remaining=available(capacityBps), pending=[...routes], share=remaining
  while(pending.length) {
    share=remaining/pending.length
    const satisfied=pending.filter(peer=>peer.demand<=share)
    if(!satisfied.length) break
    for(const peer of satisfied) remaining-=peer.demand
    pending=pending.filter(peer=>!satisfied.includes(peer))
  }
  let channels=route.maximum
  while(channels>1 && rate(route,channels)>share) channels=(Math.sqrt(channels)-1)**2
  return {shareBps:share,channels}
}
function minimum(routes) {
  return [...routes].reduce((sum,r)=>sum+(r.perChannel||0)+8*((r.headerBudget||0)+8+28)*(r.packetRate||0),0)
}
module.exports={rate,allocate,minimum,available}
