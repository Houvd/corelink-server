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
assert.equal(add(6, 'music', 4, 1).firstOutput, 1, 'First free block was not reused')
assert.equal(layouts.register(3, source[3], declaration(4, 1)).firstOutput, 10)
const overflow = add(7, 'music', 64, 7)
assert.equal(overflow.firstOutput, 14, 'Large source must skip an insufficient gap')
assert.equal(overflow.firstOutput + overflow.maxChannels - 1, 77)
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
// A reconnect has a new stream ID; active sources keep their existing outputs.
const returning = add(100, 'reconnect', 4, 1)
const survivor = add(101, 'reconnect', 4, 1)
layouts.remove(100)
delete source[100]
const rejoined = add(102, 'reconnect', 4, 1)
assert.equal(rejoined.firstOutput, returning.firstOutput)
assert(rejoined.joinIndex > survivor.joinIndex, 'Rejoin must remain a new registration')
assert.deepStrictEqual(layouts.register(101, source[101], declaration(4, 1)), survivor)

// Fragmented free space cannot split one source across separate holes.
add(200, 'fragmented', 4, 1)
const middle = add(201, 'fragmented', 4, 1)
add(202, 'fragmented', 4, 1)
const tail = add(203, 'fragmented', 4, 1)
delete source[200]
delete source[202]
assert.equal(add(204, 'fragmented', 9, 2).firstOutput, 17)
assert.equal(add(205, 'fragmented', 4, 1).firstOutput, 1)
assert.equal(add(206, 'fragmented', 4, 1).firstOutput, 9)
assert.deepStrictEqual(layouts.register(201, source[201], declaration(4, 1)), middle)
assert.deepStrictEqual(layouts.register(203, source[203], declaration(4, 1)), tail)

// Adjacent departed reservations form one reusable block without moving peers.
add(300, 'adjacent', 4, 1)
add(301, 'adjacent', 4, 1)
const afterGap = add(302, 'adjacent', 4, 1)
layouts.remove(300); delete source[300]
layouts.remove(301); delete source[301]
assert.equal(add(303, 'adjacent', 8, -1).firstOutput, 1)
assert.deepStrictEqual(layouts.register(302, source[302], declaration(4, 1)), afterGap)

// An ID reused with a new owner must not inherit a stale reservation/maximum.
source[303] = {workspace: 'adjacent'}
assert.equal(layouts.register(303, source[303], declaration(4, 1)).firstOutput, 1)
assert.equal(add(304, 'adjacent', 4, 1).firstOutput, 5)
console.log('PASS first-fit reuse, reconnects, fragmented/adjacent holes, immutable active blocks, owner replacement, workspace isolation, overflow and legacy validation')
