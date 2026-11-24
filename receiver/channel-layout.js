'use strict'

// Workspace-wide source slots: reuse the first sufficiently large free block.
// Active reservations never move or shrink on mute, unsubscribe or HOA changes.
module.exports = function createChannelLayouts(source) {
  const entries = new Map()
  let serial = 0
  function prune() {
    for (const [id, entry] of entries) {
      if (source[id] !== entry.owner) entries.delete(id)
    }
  }
  function validate(message) {
    if (message.nmLayoutVersion === undefined) return null // Legacy sender: manual routing.
    const { nmLayoutVersion: version, nmMaxChannels: maxChannels, nmMaxOrder: maxOrder } = message
    if (version !== 1 || !Number.isInteger(maxChannels) || maxChannels < 1 || maxChannels > 64
        || !Number.isInteger(maxOrder) || maxOrder < -1 || maxOrder > 7
        || (maxOrder >= 0 && (maxOrder + 1) ** 2 !== maxChannels))
      throw new Error('Invalid declared source audio layout')
    return { version, maxChannels, maxOrder }
  }
  function register(id, owner, declaration) {
    id = Number(id)
    prune()
    if (!declaration) return null
    const previous = entries.get(id)
    if (previous) return { ...previous.layout }
    const workspace = owner.workspace
    const occupied = [...entries.values()]
      .filter(e => e.owner.workspace === workspace)
      .map(e => e.layout)
      .sort((a, b) => a.firstOutput - b.firstOutput)
    let next = 1
    for (const block of occupied) {
      if (next + declaration.maxChannels <= block.firstOutput) break
      next = Math.max(next, block.firstOutput + block.maxChannels)
    }
    const layout = { ...declaration, firstOutput: next, joinIndex: ++serial }
    entries.set(id, { owner, layout })
    return { ...layout }
  }
  function remove(id) {
    const entry = entries.get(Number(id))
    if (!entry) return
    entries.delete(Number(id))
  }
  return { validate, register, remove }
}
