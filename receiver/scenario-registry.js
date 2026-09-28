'use strict'

/** Registry contract: has(id), get(id), capacity(options, startMs, nowMs).
 * Profiles are validated once and frozen, including stages. Existing numeric
 * IDs remain protocol-compatible. Custom registries may be injected at startup.
 */
function createRegistry(definitions) {
  if(!Array.isArray(definitions) || !definitions.length) throw new TypeError('Scenarios must be a nonempty array')
  const profiles=new Map()
  const probabilities=['rippleAmplitude','backgroundFraction','backgroundDuty','badEntryProbability','badExitProbability','badCapacityFactor','badLossProbability','lossProbability','reorderProbability','duplicateProbability']
  const nonnegative=['rippleFrequency','rippleSeedScale','rippleUntilSeconds','backgroundHigh','backgroundLow','backgroundSeedScale','delayMs','jitterMs','reorderDelayMs','duplicateDelayMs']
  for(const input of definitions) {
    if(!input || !Number.isSafeInteger(input.id) || input.id<0 || profiles.has(input.id) || typeof input.name!=='string' || !input.name) throw new TypeError('Invalid or duplicate scenario ID/name')
    for(const key of probabilities) if(!Number.isFinite(input[key]) || input[key]<0 || input[key]>1) throw new TypeError(`Invalid scenario ${key}`)
    for(const key of nonnegative) if(!Number.isFinite(input[key]) || input[key]<0) throw new TypeError(`Invalid scenario ${key}`)
    for(const key of ['periodSeconds','backgroundPeriodSeconds']) if(!Number.isFinite(input[key]) || input[key]<=0) throw new TypeError(`Invalid scenario ${key}`)
    if(typeof input.backgroundBurst!=='boolean' || typeof input.burstyLoss!=='boolean' || input.jitterMs>input.delayMs || input.rippleUntilSeconds>input.periodSeconds) throw new TypeError('Invalid scenario timing/flags')
    if(!Array.isArray(input.stages) || !input.stages.length) throw new TypeError('Scenario requires stages')
    let previous=0
    const stages=input.stages.map(stage=>{
      if(!Number.isFinite(stage.untilSeconds) || stage.untilSeconds<=previous || stage.untilSeconds>input.periodSeconds || !Number.isFinite(stage.fraction) || stage.fraction<=0 || stage.fraction>1) throw new TypeError('Invalid scenario stage')
      previous=stage.untilSeconds;return Object.freeze({...stage})
    })
    if(previous!==input.periodSeconds) throw new TypeError('Scenario stages must cover its period')
    profiles.set(input.id,Object.freeze({...input,stages:Object.freeze(stages)}))
  }
  function get(id) {
    if(!profiles.has(id)) throw new RangeError(`Unknown receiver scenario: ${id}`)
    return profiles.get(id)
  }
  function capacity(options,start,time) {
    const p=get(options.profile)
    if(!options.simulation) return options.capacityBps
    const elapsed=(time-start)/1000,phase=elapsed%p.periodSeconds
    const fraction=p.stages.find(stage=>phase<stage.untilSeconds).fraction
    const ripple=phase>=p.rippleUntilSeconds ? 1 : 1+p.rippleAmplitude*Math.sin(elapsed*p.rippleFrequency+options.seed*p.rippleSeedScale)
    return options.capacityBps*fraction*ripple
  }
  return Object.freeze({has:id=>profiles.has(id),get,capacity})
}
module.exports={createRegistry,defaults:createRegistry(require('./scenarios.json'))}
