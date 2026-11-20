'use strict'
const assert = require('assert')
const create = require('../traffic-metrics')
let now = 0
const events = [], metrics = create((event, data) => events.push({ event, data }), () => now)
function packet(channels, bytes) {
  const json = Buffer.from(JSON.stringify({ ep: 1234, og: channels, t: channels }))
  const prefix = Buffer.alloc(8); prefix.writeUInt16LE(json.length | 32768, 0); prefix.writeUInt16LE(bytes, 2)
  return Buffer.concat([prefix, json, Buffer.alloc(bytes)])
}
const full = packet(16, 713), reduced = packet(4, 131)
metrics.observe('ingress', 1, null, full, 'received')
for (const receiver of [2, 3]) metrics.observe('egress', 1, receiver, full)
metrics.observe('egress', 1, 2, full, 'completed')
metrics.observe('egress', 1, 3, full, 'failed')
metrics.observe('ingress', 1, null, reduced, 'received')
metrics.observe('ingress', 1, null, Buffer.alloc(2), 'received')
now = 1000; metrics.flush()
const rows = events.map(e => e.data)
assert.strictEqual(rows.length, 6)
assert.strictEqual(rows.filter(r => r.direction === 'ingress').reduce((s,r) => s+r.audioPayloadBytes,0),844)
assert.strictEqual(rows.filter(r => r.status === 'submitted').reduce((s,r) => s+r.corelinkBytes,0),full.length*2)
for (const row of rows) {
 assert.strictEqual(row.corelinkBytes,row.audioPayloadBytes+row.jsonHeaderBytes+row.corelinkEnvelopeBytes)
 assert.strictEqual(row.intervalMs,1000)
}
assert.strictEqual(rows.filter(r=>r.status==='completed').length,1)
metrics.flush(); assert.strictEqual(events.length,6)
const nullPacket = Buffer.alloc(12); nullPacket.writeUInt16LE(4,0); nullPacket.write('null',8)
metrics.observe('ingress',1,null,nullPacket,'received'); now=2000; metrics.flush()
assert.strictEqual(events[6].data.channels,null)
assert.strictEqual(events[6].data.corelinkBytes,12)
console.log('PASS actual variable payload bytes, fan-out, order boundaries, completion vs errors, interval counters')

// Keep inter-arrival clocks across one-second flushes, separately per receiver.
{
 let time=0;const observed=[];const m=create((event,data)=>observed.push(data),()=>time);
 const make=frame=>{const h=Buffer.from(JSON.stringify({ep:42,t:1,a:frame}));const b=Buffer.alloc(8);b.writeUInt16LE(h.length,0);b.writeUInt16LE(1,2);return Buffer.concat([b,h,Buffer.from([0])]);};
 const a=make(0);m.observe('ingress',1,null,a,'received');time=4;m.observe('egress',1,2,a);time=1000;m.flush();
 const b=make(240);time=1100;m.observe('ingress',1,null,b,'received');time=1104;m.observe('egress',1,2,b);m.flush();
 const incoming=observed.filter(r=>r.direction==='ingress').pop();const outgoing=observed.filter(r=>r.direction==='egress').pop();
 assert.strictEqual(incoming.packetGapMaxMs,1100);assert.strictEqual(incoming.frameGapMaxMs,1100);assert.strictEqual(incoming.packetGapBuckets[6],1);
 assert.strictEqual(outgoing.relayDelayCount,1);assert.strictEqual(outgoing.relayDelayMaxMs,4);
 const rewritten=Buffer.from(b);time=1110;m.observe('egress',1,3,rewritten);m.flush();
 assert.strictEqual(observed[observed.length-1].relayDelayCount,0);
 time=22000;m.flush();const c=make(480);m.observe('ingress',1,null,c,'received');m.flush();assert.strictEqual(observed[observed.length-1].packetGapCount,0);
 console.log('PASS packet/frame cadence across intervals, relay residence, rewritten packets and stale clock expiry');
}
