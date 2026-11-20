'use strict'

// Workspace-wide source slots: every receiver sees the same arrival order.
// Muting, unsubscribing or HOA reductions never repack existing slots. Slots
// restart at one only after all declared senders in that workspace have left.
module.exports = function createChannelLayouts(source) {
  const entries = new Map(), workspaces = new Map()
  let serial = 0
  function prune() {
    for (const [id, entry] of entries) {
      if (source[id] !== entry.owner) entries.delete(id)
    }
    const active = new Set([...entries.values()].map(e => e.owner.workspace))
    for (const workspace of workspaces.keys()) if (!active.has(workspace)) workspaces.delete(workspace)
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
    const next = workspaces.get(workspace) || 1
    const layout = { ...declaration, firstOutput: next, joinIndex: ++serial }
    workspaces.set(workspace, next + declaration.maxChannels)
    entries.set(id, { owner, layout })
    return { ...layout }
  }
  function remove(id) {
    const entry = entries.get(Number(id))
    if (!entry) return
    entries.delete(Number(id))
    const workspace = entry.owner.workspace
    if (![...entries.values()].some(e => e.owner.workspace === workspace)) workspaces.delete(workspace)
  }
  return { validate, register, remove }
}
