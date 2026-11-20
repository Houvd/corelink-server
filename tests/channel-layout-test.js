'use strict'
const assert = require('assert')
const create = require('../receiver/channel-layout')
const source = {}, layouts = create(source)
const declaration = (channels, order) => layouts.validate({nmLayoutVersion:1,nmMaxChannels:channels,nmMaxOrder:order})
const add = (id, workspace, channels, order) => {
  source[id] = {workspace}
  return layouts.register(id, source[id], declaration(channels, order))
}
const first = add(50000, 'music', 9, 2)
const second = add(3, 'music', 4, 1)
assert.equal(first.firstOutput, 1)
assert.equal(second.firstOutput, 10)
assert(first.joinIndex < second.joinIndex, 'Random stream IDs changed arrival order')
source[3].receivedChannels = 1 // Simulated per-receiver order reduction.
assert.deepStrictEqual(layouts.register(3, source[3], declaration(4, 1)), second)
assert.equal(add(4, 'other', 16, 3).firstOutput, 1)
delete source[50000]
assert.equal(add(6, 'music', 4, 1).firstOutput, 14, 'Departure repacked active slots')
assert.equal(layouts.register(3, source[3], declaration(4, 1)).firstOutput, 10)
const overflow = add(7, 'music', 64, 7)
assert.equal(overflow.firstOutput, 18)
assert.equal(overflow.firstOutput + overflow.maxChannels - 1, 81)
for (const id of [3,6,7]) delete source[id]
assert.equal(add(8, 'music', 4, 1).firstOutput, 1, 'Empty workspace did not reset its slots')
assert.equal(layouts.validate({}), null, 'Legacy sender silently opted into routing')
for (const message of [
  {nmLayoutVersion:2,nmMaxChannels:9,nmMaxOrder:2},
  {nmLayoutVersion:1,nmMaxChannels:9,nmMaxOrder:1},
  {nmLayoutVersion:1,nmMaxChannels:65,nmMaxOrder:-1},
  {nmLayoutVersion:1,nmMaxChannels:4.5,nmMaxOrder:-1},
  {nmLayoutVersion:1,nmMaxChannels:4,nmMaxOrder:8},
]) assert.throws(() => layouts.validate(message))
assert.equal(declaration(13, -1).maxChannels, 13)
console.log('PASS source arrival slots, immutable maxima, departure stability, workspace isolation, overflow and legacy validation')
